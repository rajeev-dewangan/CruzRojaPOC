import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
import { TaskType } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Must match the `vector(768)` column on `doc_chunks.embedding`. */
export const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_MODEL = "gemini-embedding-001";

export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-flash-latest",
  apiKey: API_KEY,
  temperature: 0.2,          // low = stick to the docs
  // gemini-flash-latest is a thinking model and its reasoning tokens are billed
  // against maxOutputTokens. At 500 the model spent the whole budget checking
  // itself against the RULES list and the reply came back truncated mid-thought
  // (finishReason MAX_TOKENS, ~20 visible tokens). Cap the reasoning and leave
  // real headroom; "máximo 4 frases" in the prompt is what keeps replies short.
  maxOutputTokens: 2048,
  thinkingConfig: { thinkingLevel: "LOW" },
});

interface GeminiEmbeddingsParams extends EmbeddingsParams {
  taskType: TaskType;
}

/**
 * gemini-embedding-001 returns 3072 dimensions by default, and
 * `GoogleGenerativeAIEmbeddings` from @langchain/google-genai gives no way to
 * request fewer. Our pgvector column is vector(768), so we call the REST API
 * directly to pass `outputDimensionality`.
 *
 * The model is Matryoshka-style: truncated vectors carry the right information
 * but are no longer unit length, so we renormalise as Google's docs require.
 */
class GeminiEmbeddings extends Embeddings {
  private readonly taskType: TaskType;

  constructor(fields: GeminiEmbeddingsParams) {
    super(fields);
    this.taskType = fields.taskType;
  }

  private normalize(values: number[]): number[] {
    const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? values : values.map((v) => v / norm);
  }

  private request(text: string) {
    return {
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: this.taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    };
  }

  private async call<T>(method: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/${EMBEDDING_MODEL}:${method}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`Gemini ${method} failed (${res.status}): ${json?.error?.message ?? "unknown error"}`);
    }
    return json as T;
  }

  async embedQuery(text: string): Promise<number[]> {
    const json = await this.call<{ embedding: { values: number[] } }>(
      "embedContent",
      this.request(text)
    );
    return this.normalize(json.embedding.values);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const json = await this.call<{ embeddings: { values: number[] }[] }>(
      "batchEmbedContents",
      { requests: texts.map((t) => this.request(t)) }
    );
    return json.embeddings.map((e) => this.normalize(e.values));
  }
}

// for indexing documents
export const docEmbeddings = new GeminiEmbeddings({
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

// for embedding user questions
export const queryEmbeddings = new GeminiEmbeddings({
  taskType: TaskType.RETRIEVAL_QUERY,
});
