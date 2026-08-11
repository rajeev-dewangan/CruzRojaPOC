import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { docEmbeddings } from "@/lib/models";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import crypto from "crypto";

export const runtime = "nodejs";        // pdf-parse needs Node, not Edge
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const category = (form.get("category") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // --- hash for change detection ---
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    const { data: existing } = await supabaseAdmin
      .from("documents")
      .select("id")
      .eq("content_hash", hash)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, skipped: "identical file already ingested" });
    }

    // --- 1. parse + chunk FIRST, so a bad PDF never leaves a half-ingested
    //        document row behind (its content_hash would make every retry
    //        return "identical file already ingested") ---
    const loader = new PDFLoader(new Blob([buffer]), { splitPages: false });
    const rawDocs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 700,
      chunkOverlap: 100,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
    const chunks = await splitter.splitDocuments(rawDocs);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No text could be extracted from this PDF (is it a scan?)" },
        { status: 422 }
      );
    }

    // --- 2. upload raw file to Storage ---
    const storagePath = `${category}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("docs")
      .upload(storagePath, buffer, { contentType: file.type });
    if (upErr) throw upErr;

    // --- 3. record the document ---
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .insert({ filename: file.name, storage_path: storagePath, category, content_hash: hash })
      .select()
      .single();
    if (docErr) {
      await supabaseAdmin.storage.from("docs").remove([storagePath]);
      throw docErr;
    }

    // --- 4. embed + store (batched to respect free-tier rate limits) ---
    const ingestId = crypto.randomUUID();
    chunks.forEach((c) => {
      c.metadata = { document_id: doc.id, filename: file.name, category, ingest_id: ingestId };
    });

    const store = new SupabaseVectorStore(docEmbeddings, {
      client: supabaseAdmin,
      tableName: "doc_chunks",
      queryName: "match_documents",
    });

    try {
      const BATCH = 20;
      for (let i = 0; i < chunks.length; i += BATCH) {
        await store.addDocuments(chunks.slice(i, i + BATCH));
        await new Promise((r) => setTimeout(r, 1000));   // avoid 429s
      }
    } catch (embedErr) {
      // roll back so the file can be re-uploaded cleanly
      await supabaseAdmin.from("doc_chunks").delete().eq("metadata->>ingest_id", ingestId);
      await supabaseAdmin.from("documents").delete().eq("id", doc.id);
      await supabaseAdmin.storage.from("docs").remove([storagePath]);
      throw embedErr;
    }

    // SupabaseVectorStore only writes content/metadata/embedding, so the
    // document_id foreign key has to be backfilled for cascade deletes to work.
    const { error: linkErr } = await supabaseAdmin
      .from("doc_chunks")
      .update({ document_id: doc.id })
      .eq("metadata->>ingest_id", ingestId);
    if (linkErr) console.error("[ingest] could not link chunks to document", linkErr);

    return NextResponse.json({ ok: true, document_id: doc.id, chunks: chunks.length });
  } catch (e: unknown) {
    console.error("[ingest]", e);
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
