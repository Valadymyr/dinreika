// Сервер AI-помічника симулятора щитка: тримає ключ Claude API, обмежує кількість запитів.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const FALLBACK_KEY = "__FALLBACK_KEY__";
const RULES = "Ти помічник електрика всередині програми для збирання розподільчих щитів (Україна). Правила:\n1. Ти НЕ рахуєш і НЕ вирішуєш сам, що відповідає нормам. Усі розрахунки і перевірки робить програма. Стан щита і результати перевірок бери з get_state.\n2. Коли користувач описує об'єкт і споживачів для нового щита: спершу set_object (якщо названо кількість фаз, ввідний автомат, систему заземлення, виробника), потім propose_consumers з ПОВНИМ списком. Не додавай споживачів, яких не називали. Якщо потужність не названа, постав типову і познач assumed:true. Після propose_consumers одним реченням скажи, що список показано на підтвердження, і зупинись: щит збереться після кнопки «Зібрати щит».\n3. Зміни в готовому щиті роби командами add_consumer, update_consumer, remove_consumer, add_device, rebuild, connect_via_contactor. Якщо просять підключити лінію через контактор: переконайся через get_state, що контактор стоїть на щиті (якщо ні — find_products і add_device), потім connect_via_contactor. На питання «як підключити» або «які клеми» відповідай з device_info. Доступу до інтернету в тебе немає: якщо потрібного в довідці немає, так і скажи і порадь паспорт виробника. Після змін викликай get_state і коротко скажи, що змінилось і чи з'явились помилки.\n4. Про товари відповідай лише тим, що повернув find_products. Не вигадуй артикули.\n5. Якщо питають про норми чи монтаж поза тим, що перевіряє програма, скажи прямо, що це вирішує проєктувальник, і не давай власних порад з електробезпеки.\n6. Відповідай українською, коротко, простим текстом без таблиць і без розмітки.\nТипи ліній: sockets — розетки; light — освітлення; appliance — окрема техніка (плита, духовка, кондиціонер, тепла підлога); wet — волога зона (пральна, посудомийна, бойлер, ванна).";
const TOOL_NAMES = new Set(["connect_via_contactor", "device_info", "get_state", "set_object", "propose_consumers", "add_consumer", "update_consumer", "remove_consumer", "rebuild", "find_products", "add_device"]);
const MODEL = Deno.env.get("AI_MODEL") ?? "claude-sonnet-5-5";
const PER_CLIENT = Number(Deno.env.get("AI_DAILY_PER_CLIENT") ?? 80);
const GUEST = Number(Deno.env.get("AI_DAILY_GUEST") ?? 5);
const TOTAL = Number(Deno.env.get("AI_DAILY_TOTAL") ?? 2000);
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://valadymyr.github.io,http://localhost:8080").split(",").map((o) => o.trim()).filter(Boolean);
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const reply = (origin: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

async function clientId(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const data = new TextEncoder().encode("dinreika:" + ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(origin, 405, { error: "method" });
  if (!origin || !ORIGINS.includes(origin)) return reply(origin, 403, { error: "origin", message: "Запити приймаються лише з сайту симулятора." });
  const key = Deno.env.get("ANTHROPIC_API_KEY") || FALLBACK_KEY;
  if (!key) return reply(origin, 503, { error: "not_configured", message: "Ключ Claude API ще не вписаний на сервері." });

  let body: any;
  try { body = await req.json(); } catch { return reply(origin, 400, { error: "bad_json" }); }
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  const tools = Array.isArray(body?.tools) ? body.tools : [];
  if (!messages || !messages.length || messages.length > 60) return reply(origin, 400, { error: "bad_messages" });
  if (JSON.stringify(messages).length > 120_000) return reply(origin, 413, { error: "too_large", message: "Розмова задовга. Почни нову." });
  if (tools.length > 20 || tools.some((t: any) => !TOOL_NAMES.has(t?.name)) || JSON.stringify(tools).length > 40_000) return reply(origin, 400, { error: "bad_tools" });

  // Підписник: ліміт на акаунт; без підписки: демо-ліміт на IP.
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let paid = false, uid = "";
  if (jwt && jwt.split(".").length === 3) {
    const { data: u } = await db.auth.getUser(jwt);
    if (u?.user) {
      uid = u.user.id;
      const { data: st } = await db.rpc("billing_state", { p_user: uid });
      const s = Array.isArray(st) ? st[0] : st;
      paid = !!s?.paid_until && new Date(s.paid_until) > new Date();
    }
  }
  const limit = paid ? PER_CLIENT : GUEST;
  const { data: hit, error } = await db.rpc("ai_hit", { p_client: paid ? "u:" + uid : await clientId(req) });
  if (error) return reply(origin, 500, { error: "db", message: "Лічильник запитів недоступний." });
  const row = Array.isArray(hit) ? hit[0] : hit;
  if (row.client_calls > limit) return reply(origin, paid ? 429 : 402, paid
    ? { error: "rate_limited", message: "На сьогодні ліміт запитів до помічника вичерпано. Спробуй завтра." }
    : { error: "need_sub", message: "Безкоштовні запити до помічника на сьогодні закінчились. Оформи підписку, щоб працювати без обмежень." });
  if (row.total_calls > TOTAL) return reply(origin, 429, { error: "busy", message: "Помічник сьогодні перевантажений. Спробуй завтра." });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: RULES, messages, tools }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("anthropic", r.status, JSON.stringify(out).slice(0, 500));
    return reply(origin, r.status === 429 ? 429 : 502, { error: r.status === 429 ? "rate_limited" : "upstream_error", message: r.status === 429 ? "Claude зараз перевантажений. Спробуй за хвилину." : "Не вдалося отримати відповідь від Claude." });
  }
  return reply(origin, 200, { content: out.content, stop_reason: out.stop_reason, left: Math.max(0, limit - row.client_calls), paid });
});
