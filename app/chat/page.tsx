"use client";
import { useState, type SubmitEvent } from "react";

type Msg = { role: "user" | "assistant"; content: string; score?: number };

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e?: SubmitEvent<HTMLFormElement>) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setError(null);
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, conversationId: convId }),
      });

      // A 404/500 returns an HTML error page, not JSON — reading it as JSON
      // throws and would otherwise leave the UI stuck on "Escribiendo...".
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        throw new Error(json?.error ?? `El servidor respondió ${res.status}`);
      }

      setConvId(json.conversationId);
      setMsgs((m) => [...m, { role: "assistant", content: json.reply, score: json.score }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="space-y-3 mb-4 min-h-[50vh]">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <span className={`inline-block p-3 rounded-lg ${
              m.role === "user" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-900"
            }`}>
              {m.content}
            </span>
            {m.score !== undefined && (
              <div className="text-xs text-gray-400">score: {m.score.toFixed(3)}</div>
            )}
          </div>
        ))}
        {loading && <p className="text-gray-400">Escribiendo...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* a real form, so Enter submits natively instead of relying on onKeyDown */}
      <form onSubmit={send} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta algo..."
          disabled={loading}
          className="flex-1 border p-2 rounded disabled:opacity-50" />
        <button type="submit" disabled={loading || !input.trim()}
          className="bg-red-600 text-white px-4 rounded disabled:opacity-40">
          Enviar
        </button>
      </form>
    </main>
  );
}
