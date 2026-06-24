// Estado compartido de los checkboxes (requerimientos "revisados") entre dispositivos.
// Guarda un único documento JSON en Upstash Redis (Vercel KV) bajo una sola clave global.
// GET  /api/progress   -> devuelve el estado guardado { mi: [ri, ...], ... }
// POST /api/progress   -> guarda el estado enviado en el body (JSON)

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "sgdea-progreso-v1";

async function redis(cmd) {
  const r = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("redis " + r.status);
  return r.json();
}

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
  if (!URL || !TOKEN) {
    return res.status(500).json({ error: "Almacenamiento no configurado (faltan variables de entorno de Upstash/KV)" });
  }
  try {
    if (req.method === "GET") {
      const { result } = await redis(["GET", KEY]);
      return res.status(200).json(result ? JSON.parse(result) : {});
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      await redis(["SET", KEY, JSON.stringify(body || {})]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
