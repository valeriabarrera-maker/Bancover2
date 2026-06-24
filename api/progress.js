// Estado compartido de los checkboxes (requerimientos "revisados") entre dispositivos.
// Guarda un único documento JSON en Vercel Blob (gratis, incluido en la cuenta de Vercel).
// GET  /api/progress  -> devuelve el estado guardado { mi: [ri, ...], ... }
// POST /api/progress  -> guarda el estado enviado en el body (JSON)
import { put, list } from "@vercel/blob";

const KEY = "sgdea-progreso.json";

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  }
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); }
    });
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { blobs } = await list({ prefix: KEY, limit: 1 });
      const found = blobs.find((b) => b.pathname === KEY);
      if (!found) return res.status(200).json({});
      // cache-buster para leer siempre la versión más reciente
      const r = await fetch(found.url + "?t=" + new Date().getTime(), { cache: "no-store" });
      if (!r.ok) return res.status(200).json({});
      return res.status(200).json(await r.json());
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      await put(KEY, JSON.stringify(body || {}), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
