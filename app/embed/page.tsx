"use client";
import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string; emergency?: boolean };

const GREETING = "¡Hola! Soy el asistente de Cruz Roja. ¿En qué puedo ayudarte?";
const CONNECTION_ERROR = "Hubo un problema de conexión. Llama al 55 5395 1111.";
const BUSY_ERROR =
  "El asistente está recibiendo muchas consultas en este momento. " +
  "Intenta de nuevo en unos minutos o llámanos al 55 5395 1111.";

function EmbedChat() {
  const params = useSearchParams();
  const pageRef = params.get("ref") || "/";

  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, conversationId: convId, pageRef }),
      });

      // An error status returns an HTML page, not JSON — parsing it would throw
      // and drop the user into the generic catch with no explanation.
      const d = await res.json().catch(() => null);

      if (!res.ok || !d?.reply) {
        // Keep the raw cause in the console: a Gemini quota 429 surfacing as
        // "problema de conexión" is impossible to diagnose from the UI.
        console.error("[embed] chat failed", res.status, d?.error ?? "(no body)");
        const busy = res.status === 429 || /quota|rate limit/i.test(d?.error ?? "");
        setMsgs((m) => [...m, { role: "assistant", content: busy ? BUSY_ERROR : CONNECTION_ERROR }]);
        return;
      }

      setConvId(d.conversationId);
      setMsgs((m) => [...m, { role: "assistant", content: d.reply, emergency: d.emergency }]);
    } catch (err) {
      console.error("[embed] chat failed", err);
      setMsgs((m) => [...m, { role: "assistant", content: CONNECTION_ERROR }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="bg-[#C8102E] text-white p-3.5 font-medium shrink-0">
        Asistente Cruz Roja
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={
              m.emergency
                ? "px-3 py-2 rounded-xl text-sm whitespace-pre-wrap self-start max-w-full bg-amber-50 border border-amber-500 text-amber-900"
                : m.role === "user"
                  ? "px-3 py-2 rounded-xl text-sm whitespace-pre-wrap self-end max-w-[82%] bg-[#C8102E] text-white"
                  : "px-3 py-2 rounded-xl text-sm whitespace-pre-wrap self-start max-w-[82%] bg-gray-100 text-gray-900"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-sm self-start">
            Escribiendo…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex border-t shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          aria-label="Escribe tu pregunta"
          disabled={loading}
          className="flex-1 p-3 outline-none text-sm text-gray-900 bg-white disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Enviar mensaje"
          className="bg-[#C8102E] text-white px-4 disabled:opacity-40"
        >
          ➤
        </button>
      </form>
    </div>
  );
}

export default function Embed() {
  // useSearchParams needs a Suspense boundary or the build fails with a
  // client-side-rendering bailout.
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen bg-white">
          <div className="bg-[#C8102E] text-white p-3.5 font-medium">Asistente Cruz Roja</div>
        </div>
      }
    >
      <EmbedChat />
    </Suspense>
  );
}
