// Підписка «Дінрейка»: рахунки Monobank, стан підписки, вебхук.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const PLANS: Record<string, { amount: number; title: string }> = {
  week: { amount: 5000, title: "Дінрейка: доступ на 7 днів" },
  month: { amount: 12900, title: "Дінрейка: підписка на 30 днів" },
  year: { amount: 89900, title: "Дінрейка: підписка на 365 днів" },
  life: { amount: 400000, title: "Дінрейка: доступ назавжди" },
};
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://valadymyr.github.io,http://localhost:8080").split(",").map((o) => o.trim()).filter(Boolean);
const APP_PATH = Deno.env.get("APP_PATH") ?? "/dinreika/app/";
const SELF = Deno.env.get("SUPABASE_URL")! + "/functions/v1/billing";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const mono = () => Deno.env.get("MONO_TOKEN") ?? "";

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const reply = (origin: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

async function monoStatus(invoiceId: string) {
  const r = await fetch("https://api.monobank.ua/api/merchant/invoice/status?invoiceId=" + encodeURIComponent(invoiceId), { headers: { "X-Token": mono() } });
  if (!r.ok) throw new Error("mono status " + r.status);
  return await r.json();
}
// Статус беремо лише з API Monobank, тож підробити оплату через вебхук неможливо.
async function sync(invoiceId: string) {
  const s = await monoStatus(invoiceId);
  const { data, error } = await db.rpc("billing_apply", {
    p_invoice: invoiceId, p_status: s.status, p_modified: s.modifiedDate ?? null, p_raw: s, p_card_token: s.walletData?.cardToken ?? null,
  });
  if (error) throw error;
  return { status: s.status, row: Array.isArray(data) ? data[0] : data };
}
async function state(userId: string) {
  const { data, error } = await db.rpc("billing_state", { p_user: userId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) ?? {};
  return { paid_until: row.paid_until ?? null, last_plan: row.last_plan ?? null, pending: row.pending ?? [] };
}
const view = (s: any) => ({ active: !!s.paid_until && new Date(s.paid_until) > new Date(), paid_until: s.paid_until, plan: s.last_plan, lifetime: s.last_plan === "life" });
const PROMO_MSG: Record<string, string> = {
  not_found: "Такого промокоду немає.", expired: "Термін дії промокоду минув.", exhausted: "Промокод уже використали всі, кому він був призначений.",
  used: "Ти вже використав цей промокод.", one_per_account: "На один акаунт діє лише один промокод.",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");

  // Вебхук Monobank: тіло не довіряємо, перепитуємо статус рахунку.
  if (url.searchParams.get("hook") === "mono") {
    try {
      const body = await req.json();
      if (body?.invoiceId && mono()) await sync(String(body.invoiceId));
    } catch (e) { console.error("hook", String(e)); }
    return new Response("ok");
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(origin, 405, { error: "method" });
  if (!origin || !ORIGINS.includes(origin)) return reply(origin, 403, { error: "origin" });

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = jwt ? await db.auth.getUser(jwt) : { data: { user: null } };
  const user = u?.user;
  if (!user) return reply(origin, 401, { error: "auth", message: "Увійди в акаунт." });

  let body: any = {};
  try { body = await req.json(); } catch { /* порожнє тіло */ }

  try {
    if (body.action === "status") {
      let s = await state(user.id);
      if (s.pending.length && mono()) {
        for (const inv of s.pending.slice(0, 3)) { try { await sync(inv); } catch (e) { console.error("sync", String(e)); } }
        s = await state(user.id);
      }
      return reply(origin, 200, view(s));
    }

    if (body.action === "promo") {
      const code = String(body.code ?? "").trim().toUpperCase().slice(0, 40);
      if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return reply(origin, 400, { error: "promo", message: PROMO_MSG.not_found });
      const { data, error } = await db.rpc("promo_redeem", { p_user: user.id, p_code: code });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.ok) return reply(origin, 400, { error: "promo", message: PROMO_MSG[row?.reason] ?? PROMO_MSG.not_found });
      return reply(origin, 200, { ...view(await state(user.id)), days: row.days });
    }

    if (body.action === "create") {
      const plan = PLANS[body.plan];
      if (!plan) return reply(origin, 400, { error: "plan" });
      if (!mono()) return reply(origin, 503, { error: "not_configured", message: "Оплата ще не підключена. Спробуй пізніше." });
      const reference = "dr-" + user.id.slice(0, 8) + "-" + Date.now();
      const r = await fetch("https://api.monobank.ua/api/merchant/invoice/create", {
        method: "POST",
        headers: { "X-Token": mono(), "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.amount, ccy: 980,
          merchantPaymInfo: { reference, destination: plan.title, customerEmails: user.email ? [user.email] : [] },
          redirectUrl: origin + APP_PATH + "?paid=1",
          webHookUrl: SELF + "?hook=mono",
          validity: 3600,
        }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok || !out.invoiceId) {
        console.error("mono create", r.status, JSON.stringify(out).slice(0, 300));
        return reply(origin, 502, { error: "upstream", message: "Не вдалося створити рахунок. Спробуй ще раз." });
      }
      const { error } = await db.rpc("billing_new_invoice", { p_invoice: out.invoiceId, p_user: user.id, p_plan: body.plan, p_amount: plan.amount });
      if (error) throw error;
      return reply(origin, 200, { pageUrl: out.pageUrl, invoiceId: out.invoiceId });
    }
    return reply(origin, 400, { error: "action" });
  } catch (e) {
    console.error("billing", String(e));
    return reply(origin, 500, { error: "server", message: "Помилка сервера оплати." });
  }
});
