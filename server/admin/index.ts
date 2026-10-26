// Суперадмінка «Дінрейка»: лише для адміністраторів зі списку ADMIN_EMAILS.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://valadymyr.github.io,http://localhost:8080").split(",").map((o) => o.trim()).filter(Boolean);
const ADMINS = (Deno.env.get("ADMIN_EMAILS") ?? "info@snastik.com").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const reply = (origin: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
const rpc = async (fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(fn + ": " + error.message);
  return data;
};
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(origin, 405, { error: "method" });
  if (!origin || !ORIGINS.includes(origin)) return reply(origin, 403, { error: "origin" });

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = jwt ? await db.auth.getUser(jwt) : { data: { user: null } };
  const me = u?.user;
  if (!me) return reply(origin, 401, { error: "auth", message: "Увійди в акаунт адміністратора." });
  if (!ADMINS.includes((me.email ?? "").toLowerCase())) return reply(origin, 403, { error: "forbidden", message: "Цей акаунт не має доступу до адмінки." });

  let b: any = {};
  try { b = await req.json(); } catch { /* */ }
  try {
    switch (b.action) {
      case "overview": return reply(origin, 200, await rpc("admin_overview"));
      case "users": return reply(origin, 200, await rpc("admin_users", { p_q: String(b.q ?? "").slice(0, 80), p_limit: Number(b.limit) || 50, p_offset: Number(b.offset) || 0 }));
      case "block": {
        const id = uuid(b.user); if (!id) return reply(origin, 400, { error: "user" });
        if (id === me.id) return reply(origin, 400, { error: "self", message: "Себе заблокувати не можна." });
        const block = !!b.block;
        await rpc("admin_set_block", { p_user: id, p_block: block, p_reason: String(b.reason ?? "").slice(0, 300) || null });
        // Заборона входу: блокування в системі авторизації на ~100 років або зняття
        const { error } = await db.auth.admin.updateUserById(id, { ban_duration: block ? "876000h" : "none" } as any);
        if (error) console.error("ban", error.message);
        return reply(origin, 200, { ok: true });
      }
      case "grant": {
        const id = uuid(b.user), days = Math.round(Number(b.days)); if (!id || !(days >= 1 && days <= 3650)) return reply(origin, 400, { error: "grant" });
        return reply(origin, 200, { paid_until: await rpc("admin_grant", { p_user: id, p_days: days }) });
      }
      case "errors": return reply(origin, 200, await rpc("admin_errors", { p_limit: Number(b.limit) || 100 }));
      case "leads": return reply(origin, 200, await rpc("admin_leads", { p_limit: Number(b.limit) || 100 }));
      case "lead_status": await rpc("admin_lead_status", { p_id: Number(b.id), p_status: String(b.status ?? "new") }); return reply(origin, 200, { ok: true });
      case "promos": return reply(origin, 200, await rpc("admin_promos"));
      case "promo_save": {
        const code = String(b.code ?? "").trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return reply(origin, 400, { error: "code", message: "Код: 3–40 латинських літер, цифр, - або _." });
        const days = Math.round(Number(b.days)); if (!(days >= 1 && days <= 365)) return reply(origin, 400, { error: "days", message: "Днів: від 1 до 365." });
        await rpc("admin_promo_save", { p_code: code, p_days: days, p_max: b.max ? Math.round(Number(b.max)) : null, p_expires: b.expires || null, p_active: b.active !== false, p_note: String(b.note ?? "") });
        return reply(origin, 200, { ok: true });
      }
      default: return reply(origin, 400, { error: "action" });
    }
  } catch (e) {
    console.error("admin", String(e));
    return reply(origin, 500, { error: "server", message: String(e).slice(0, 200) });
  }
});
