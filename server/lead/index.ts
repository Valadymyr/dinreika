// Заявки на ETEK з сайту «Дінрейка».
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://valadymyr.github.io,http://localhost:8080").split(",").map((o) => o.trim()).filter(Boolean);
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ROLES = new Set(["electrician", "foreman", "shop", "wholesale", "other"]);
const INTERESTS = new Set(["rcd_a", "rcd_b", "rcd_ev", "rcbo", "afdd", "mcb", "switch", "spd", "relay", "pv"]);

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const reply = (origin: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

async function ipHash(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("dinreika-lead:" + ip));
  return Array.from(new Uint8Array(h)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(origin, 405, { error: "method" });
  if (!origin || !ORIGINS.includes(origin)) return reply(origin, 403, { error: "origin" });
  let b: any = {};
  try { b = await req.json(); } catch { return reply(origin, 400, { error: "bad_json" }); }
  if (str(b.website, 100)) return reply(origin, 200, { ok: true }); // пастка для ботів
  const name = str(b.name, 120), phone = str(b.phone, 40);
  const digits = phone.replace(/\D/g, "");
  if (name.length < 2) return reply(origin, 400, { error: "name", message: "Вкажи ім'я." });
  if (digits.length < 9 || digits.length > 15) return reply(origin, 400, { error: "phone", message: "Перевір номер телефону." });
  const role = ROLES.has(b.role) ? b.role : "other";
  const interest = Array.isArray(b.interest) ? b.interest.filter((x: string) => INTERESTS.has(x)).slice(0, 12) : [];
  const { data, error } = await db.rpc("lead_add", {
    p_name: name, p_phone: phone, p_city: str(b.city, 120), p_role: role, p_interest: interest,
    p_volume: str(b.volume, 40), p_comment: str(b.comment, 2000), p_source: str(b.source, 60) || "etek", p_ip: await ipHash(req),
  });
  if (error) { console.error("lead", error.message); return reply(origin, 500, { error: "db", message: "Не вдалося зберегти заявку. Спробуй ще раз." }); }
  if (data === -1) return reply(origin, 429, { error: "limit", message: "Забагато заявок з цього пристрою. Спробуй завтра." });
  return reply(origin, 200, { ok: true });
});
