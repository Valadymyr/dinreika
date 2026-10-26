// Звіти про помилки зі сторінок сайту «Дінрейка».
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://valadymyr.github.io,http://localhost:8080").split(",").map((o) => o.trim()).filter(Boolean);
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST" || !origin || !ORIGINS.includes(origin)) return new Response("no", { status: 403, headers: cors(origin) });
  try {
    const b = await req.json();
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("dinreika-err:" + ip));
    const ipHash = Array.from(new Uint8Array(h)).slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
    let userId: string | null = null;
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (jwt.split(".").length === 3) { const { data } = await db.auth.getUser(jwt); userId = data?.user?.id ?? null; }
    const { error } = await db.rpc("err_log", {
      p_kind: s(b.kind, 20) ?? "client", p_msg: s(b.message, 1000) ?? "?", p_stack: s(b.stack, 4000), p_url: s(b.url, 500),
      p_ua: s(req.headers.get("user-agent"), 300), p_ver: s(b.version, 40), p_user: userId, p_ip: ipHash,
    });
    if (error) console.error("err_log", error.message);
  } catch (e) { console.error("report", String(e)); }
  return new Response("ok", { headers: cors(origin) });
});
