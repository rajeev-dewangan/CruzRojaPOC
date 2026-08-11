import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { llm, queryEmbeddings } from "@/lib/models";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { isEmergency, EMERGENCY_REPLY } from "@/lib/emergency";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  "https://cruzrojacdmx-edomex.org",
  "https://www.cruzrojacdmx-edomex.org",
  "http://localhost:3000",
  "http://localhost:5173",      // vite widget dev
];

// TUNE THIS after logging real scores. Start conservative.
const ESCALATION_THRESHOLD = 0.65;

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}




export async function OPTIONS(req: NextRequest) {
  return new Response(null, { headers: cors(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const headers = cors(req.headers.get("origin"));

  try {
    const { question, conversationId } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "Empty question" }, { status: 400, headers });
    }

    // --- ensure a conversation exists ---
    let convId = conversationId;
    if (!convId) {
      const { data } = await supabaseAdmin
        .from("conversations")
        .insert({ channel: "web" })
        .select()
        .single();
      convId = data!.id;
    }

    await supabaseAdmin.from("messages").insert({
      conversation_id: convId, role: "user", content: question,
    });

    // --- EMERGENCY GUARD: before any retrieval ---
    if (isEmergency(question)) {
      await supabaseAdmin.from("messages").insert({
        conversation_id: convId, role: "assistant",
        content: EMERGENCY_REPLY, escalated: true,
      });
      await supabaseAdmin.from("conversations")
        .update({ status: "escalated" }).eq("id", convId);

      return NextResponse.json(
        { reply: EMERGENCY_REPLY, escalated: true, emergency: true, conversationId: convId },
        { headers }
      );
    }

    // --- retrieval ---
    const store = new SupabaseVectorStore(queryEmbeddings, {
      client: supabaseAdmin,
      tableName: "doc_chunks",
      queryName: "match_documents",
    });

    const results = await store.similaritySearchWithScore(question, 4);
    const topScore = results[0]?.[1] ?? 0;

    console.log(`[chat] score=${topScore.toFixed(3)} q="${question}"`);

    // --- escalation gate ---
    if (topScore < ESCALATION_THRESHOLD) {
      const reply =
        "No tengo esa información en mis documentos. " +
        "Te voy a conectar con una persona del equipo de Cruz Roja que puede ayudarte. " +
        "También puedes llamarnos al 55 5395 1111.";

      await supabaseAdmin.from("messages").insert({
        conversation_id: convId, role: "assistant", content: reply,
        similarity_score: topScore, escalated: true,
      });
      await supabaseAdmin.from("conversations")
        .update({ status: "escalated" }).eq("id", convId);

      return NextResponse.json(
        { reply, escalated: true, score: topScore, conversationId: convId },
        { headers }
      );
    }

    // --- generate grounded answer ---
    const context = results.map(([d]) => d.pageContent).join("\n---\n");

    const systemPrompt = `Eres el asistente virtual de Cruz Roja Mexicana CDMX–Edomex.

REGLAS:
- Responde ÚNICAMENTE con información del CONTEXTO.
- Si la respuesta no está en el contexto, di que conectarás al usuario con un agente.
- NUNCA des consejo médico ni diagnósticos.
- Responde en español, en máximo 4 frases, de forma clara y cálida.
- Si preguntan por precios o fechas, cita exactamente lo que dice el contexto.

CONTEXTO:
${context}`;

    const res = await llm.invoke([
      ["system", systemPrompt],
      ["user", question],
    ]);
    const reply = res.content as string;

    await supabaseAdmin.from("messages").insert({
      conversation_id: convId, role: "assistant", content: reply,
      similarity_score: topScore,
    });

    return NextResponse.json(
      { reply, escalated: false, score: topScore, conversationId: convId },
      { headers }
    );
  } catch (e: any) {
    console.error("[chat]", e);
    return NextResponse.json({ error: e.message }, { status: 500, headers });
  }
}