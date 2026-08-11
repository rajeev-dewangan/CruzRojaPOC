"use client";
import { useState } from "react";

export default function Admin() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("cursos");
  const [status, setStatus] = useState("");

  async function upload() {
    if (!file) return;
    setStatus("Procesando...");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);

    const res = await fetch("/api/ingest", { method: "POST", body: fd });
    const json = await res.json();
    setStatus(json.error ? `Error: ${json.error}` : `Listo — ${json.chunks} fragmentos`);
  }

  return (
    <main className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Documentos</h1>

      <select value={category} onChange={(e) => setCategory(e.target.value)}
        className="border p-2 rounded w-full">
        <option value="cursos">Cursos</option>
        <option value="hospital">Hospital / Servicios</option>
        <option value="membresia">CR Contigo</option>
        <option value="general">General</option>
      </select>

      <input type="file" accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full" />

      <button onClick={upload} disabled={!file}
        className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-40">
        Subir e indexar
      </button>

      {status && <p className="text-sm">{status}</p>}
    </main>
  );
}