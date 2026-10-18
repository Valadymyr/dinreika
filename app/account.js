/* Дінрейка: акаунт, підписка і демо-обмеження. Працює лише на сайті. */
(function () {
  'use strict';
  var SB_URL = 'https://rezraseoiznvflktyktj.supabase.co';
  var SB_KEY = 'sb_publishable_QY5BGXy4c_aSDvSh9riyuw_ChnE0_z3';
  var BILL = SB_URL + '/functions/v1/billing';
  var PLANS = { month: { price: 129, label: 'Місяць', sub: '30 днів доступу' }, year: { price: 1200, label: 'Рік', sub: '365 днів доступу · економія 348 грн' } };
  var LOCKED = { 'btn-printnow': 'Друк документів', 'btn-print': 'Документи файлом', 'btn-lblnow': 'Друк наклейок', 'btn-lbl': 'Наклейки файлом', 'btn-copy': 'Копіювання специфікації', 'pj-exp': 'Збереження проєкту у файл' };

  var sb = null, TOKEN = '', USER = null, SUB = { active: false, paid_until: null }, google = false;
  var ui = {}, view = 'auth', email = '', reason = '', busy = false, note = '', noteKind = '';

  function $(id) { return document.getElementById(id); }
  function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  function fmtDate(s) { try { return new Date(s).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return s; } }
  function shortDate(s) { try { return new Date(s).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch (e) { return ''; } }

  /* ---------- стилі ---------- */
  var css = '' +
    '#btn-acc.on{background:var(--ok);color:#fff;border-color:var(--ok)}' +
    '#btn-acc.off{background:var(--signal);color:var(--signal-ink);border-color:var(--signal)}' +
    '#acc .instr-b{display:grid;gap:14px}' +
    '#acc .why{margin:0;padding:10px 12px;border-radius:8px;background:var(--soft);border-left:3px solid var(--signal);font-weight:600}' +
    '#acc .row{display:flex;gap:8px;flex-wrap:wrap}' +
    '#acc input[type=email],#acc input[inputmode=numeric]{flex:1 1 220px;min-width:0;font:inherit;font-size:16px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink)}' +
    '#acc button{font:inherit;font-weight:600;padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:var(--soft);color:var(--ink);cursor:pointer}' +
    '#acc button.go{background:var(--signal);color:var(--signal-ink);border-color:var(--signal)}' +
    '#acc button:disabled{opacity:.55;cursor:wait}' +
    '#acc .gbtn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:var(--panel)}' +
    '#acc .or{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px}#acc .or:before,#acc .or:after{content:"";flex:1;height:1px;background:var(--line)}' +
    '#acc .plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}' +
    '#acc .plan{display:grid;justify-items:start;align-content:start;gap:4px;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--panel);text-align:left}' +
    '#acc .plan.best{border:2px solid var(--signal)}' +
    '#acc .plan b{font-family:var(--display);font-size:24px;font-weight:600}#acc .plan .pl{font-weight:700}#acc .plan small{color:var(--muted);font-weight:500}' +
    '#acc .plan .tag{justify-self:start;font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px;background:var(--signal);color:var(--signal-ink)}' +
    '#acc ul.inc{margin:0;padding-left:18px;display:grid;gap:4px}' +
    '#acc .msg{margin:0;min-height:1.2em}#acc .msg.bad{color:var(--bad)}#acc .msg.ok{color:var(--ok)}' +
    '#acc .who{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;color:var(--muted)}' +
    '#acc .who button{padding:6px 10px;font-weight:500}' +
    '#acc .status{padding:12px;border-radius:8px;background:var(--soft)}#acc .status.on{border-left:3px solid var(--ok)}' +
    '#acc .fine{font-size:12px;color:var(--muted);margin:0}#acc .fine a{color:var(--link)}' +
    '.drlock{position:relative}.drlock:after{content:"Pro";margin-left:6px;font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:var(--signal);color:var(--signal-ink);vertical-align:1px}';
  var st = el('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- розмітка ---------- */
  function build() {
    var d = el('dialog', 'instr'); d.id = 'acc'; d.setAttribute('aria-labelledby', 'acc-t');
    var h = el('div', 'instr-h'), t = el('h2', '', 'Акаунт'); t.id = 'acc-t';
    var x = el('button', '', 'Закрити'); x.onclick = function () { d.close(); };
    h.append(t, x); var b = el('div', 'instr-b'); d.append(h, b); document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    ui.d = d; ui.t = t; ui.b = b;
    var btn = el('button', '', 'Увійти'); btn.id = 'btn-acc'; btn.title = 'Акаунт і підписка';
    btn.onclick = function () { reason = ''; open(); };
    var anchor = $('btn-pro') || $('btn-ai');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor); else document.body.appendChild(btn);
    ui.btn = btn;
  }

  function setNote(t, k) { note = t || ''; noteKind = k || ''; if (ui.msg) { ui.msg.textContent = note; ui.msg.className = 'msg' + (noteKind ? ' ' + noteKind : ''); } }
  function msgEl() { var m = el('p', 'msg'); m.setAttribute('role', 'status'); ui.msg = m; setNote(note, noteKind); return m; }

  function render() {
    if (!ui.b) return;
    var b = ui.b; b.replaceChildren(); ui.msg = null;
    if (reason) b.append(el('p', 'why', reason));
    if (!USER) return renderAuth(b);
    ui.t.textContent = SUB.active ? 'Підписка' : 'Оформити підписку';
    var who = el('div', 'who'); who.append(el('span', '', USER.email || 'Акаунт'));
    var out = el('button', '', 'Вийти'); out.onclick = logout; who.append(out); b.append(who);
    if (SUB.active) {
      var s = el('div', 'status on'); s.append(el('b', '', 'Підписка діє до ' + fmtDate(SUB.paid_until)), el('div', '', 'Усі можливості відкриті. Можна продовжити заздалегідь: дні додадуться до поточного терміну.'));
      b.append(s);
    } else {
      var inc = el('ul', 'inc');
      ['Скільки завгодно щитів і збережених проєктів', 'Друк наклейок і документів, специфікація', 'AI-помічник до 80 запитів на день', 'Нові бренди й оновлення бази без доплат'].forEach(function (x) { inc.append(el('li', '', x)); });
      b.append(inc);
    }
    var pl = el('div', 'plans');
    ['month', 'year'].forEach(function (k) {
      var p = PLANS[k], c = el('button', 'plan' + (k === 'year' ? ' best' : '')); c.type = 'button';
      if (k === 'year') c.append(el('span', 'tag', 'Вигідніше'));
      c.append(el('span', 'pl', p.label), el('b', '', p.price + ' грн'), el('small', '', p.sub));
      c.onclick = function () { pay(k, c); };
      pl.append(c);
    });
    b.append(pl, msgEl());
    var f = el('p', 'fine'); f.innerHTML = 'Оплата карткою через monobank. Підписка не продовжується автоматично: коли термін закінчиться, оплатиш знову. <a href="../oferta.html" target="_blank" rel="noopener">Публічна оферта</a> · <a href="../privacy.html" target="_blank" rel="noopener">Конфіденційність</a>';
    b.append(f);
  }

  function renderAuth(b) {
    ui.t.textContent = 'Вхід';
    if (view === 'code') {
      b.append(el('p', '', 'Надіслали лист на ' + email + '. Відкрий посилання з листа на цьому пристрої або введи код із листа.'));
      var r = el('div', 'row'), i = el('input'); i.inputMode = 'numeric'; i.autocomplete = 'one-time-code'; i.placeholder = 'Код із листа'; i.maxLength = 10;
      var go = el('button', 'go', 'Увійти'); go.onclick = function () { verify(i.value, go); };
      i.onkeydown = function (e) { if (e.key === 'Enter') go.click(); };
      r.append(i, go); b.append(r, msgEl());
      var back = el('button', '', 'Інша пошта'); back.onclick = function () { view = 'auth'; setNote(''); render(); }; b.append(back);
      setTimeout(function () { i.focus(); }, 50);
      return;
    }
    b.append(el('p', '', 'Увійди, щоб оформити підписку. Пароль не потрібен.'));
    if (google) {
      var g = el('button', 'gbtn'); g.type = 'button';
      g.innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg><span>Увійти через Google</span>';
      g.onclick = googleLogin; b.append(g, el('div', 'or', 'або поштою'));
    }
    var r2 = el('div', 'row'), e = el('input'); e.type = 'email'; e.autocomplete = 'email'; e.placeholder = 'Твоя пошта'; e.value = email;
    var s = el('button', 'go', 'Надіслати код'); s.onclick = function () { sendCode(e.value, s); };
    e.onkeydown = function (ev) { if (ev.key === 'Enter') s.click(); };
    r2.append(e, s); b.append(r2, msgEl());
  }

  function open(r) { if (r != null) reason = r; if (!ui.d) return; render(); if (!ui.d.open) { try { ui.d.showModal(); } catch (e) { ui.d.setAttribute('open', ''); } } }
  function paint() {
    if (!ui.btn) return;
    ui.btn.className = USER ? (SUB.active ? 'on' : 'off') : '';
    ui.btn.textContent = !USER ? 'Увійти' : SUB.active ? 'Pro до ' + shortDate(SUB.paid_until) : 'Підписка';
    Object.keys(LOCKED).forEach(function (id) { var x = $(id); if (x) x.classList.toggle('drlock', !SUB.active); });
  }

  /* ---------- вхід ---------- */
  function sendCode(v, btn) {
    v = String(v || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return setNote('Перевір адресу пошти.', 'bad');
    btn.disabled = true; setNote('Надсилаю…');
    sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
      btn.disabled = false;
      if (r.error) return setNote(/rate|limit|seconds/i.test(r.error.message) ? 'Забагато спроб. Зачекай хвилину і спробуй ще.' : 'Не вдалося надіслати лист: ' + r.error.message, 'bad');
      email = v; view = 'code'; setNote(''); render();
    });
  }
  function verify(code, btn) {
    code = String(code || '').replace(/\D/g, '');
    if (code.length < 6) return setNote('Введи код із листа.', 'bad');
    btn.disabled = true; setNote('Перевіряю…');
    sb.auth.verifyOtp({ email: email, token: code, type: 'email' }).then(function (r) {
      btn.disabled = false;
      if (r.error) return setNote('Код не підійшов або застарів. Надішли новий.', 'bad');
      setNote(''); view = 'auth';
    });
  }
  function googleLogin() { sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); }
  function logout() { sb.auth.signOut().then(function () { USER = null; TOKEN = ''; SUB = { active: false }; paint(); render(); }); }

  /* ---------- підписка ---------- */
  function call(body) {
    return fetch(BILL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }
  function refresh() {
    if (!TOKEN) return Promise.resolve();
    return call({ action: 'status' }).then(function (j) {
      if (j._status === 200) { SUB = { active: !!j.active, paid_until: j.paid_until, plan: j.plan }; paint(); if (ui.d && ui.d.open) render(); }
    }).catch(function () {});
  }
  function pay(plan, btn) {
    if (busy) return; busy = true; btn.disabled = true; setNote('Створюю рахунок…');
    call({ action: 'create', plan: plan }).then(function (j) {
      busy = false; btn.disabled = false;
      if (j.pageUrl) { setNote('Переходимо на сторінку оплати monobank…', 'ok'); location.href = j.pageUrl; return; }
      setNote(j.message || 'Не вдалося створити рахунок. Спробуй ще раз.', 'bad');
    }).catch(function () { busy = false; btn.disabled = false; setNote('Немає зв\'язку з сервером оплати.', 'bad'); });
  }
  function afterPay() {
    var q = new URLSearchParams(location.search); if (q.get('paid') !== '1') return;
    q.delete('paid'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    reason = ''; open(); setNote('Перевіряю оплату…');
    var n = 0; (function poll() {
      refresh().then(function () {
        if (SUB.active) { reason = ''; render(); setNote('Оплату отримано. Дякую!', 'ok'); return; }
        if (++n < 20) { setNote('Чекаємо підтвердження від банку…'); setTimeout(poll, n < 3 ? 1500 : 3000); }
        else setNote('Банк ще не підтвердив оплату. Якщо гроші списано, онови сторінку за кілька хвилин.', 'bad');
      });
    })();
  }

  /* ---------- демо-обмеження ---------- */
  document.addEventListener('click', function (e) {
    if (SUB.active) return;
    var t = e.target && e.target.closest ? e.target.closest('button') : null; if (!t) return;
    var why = LOCKED[t.id];
    if (!why && t.id === 'pj-save') {
      var all = {}; try { all = JSON.parse(localStorage.getItem('shchytok-projects')) || {}; } catch (er) {}
      var name = (($('pname') || {}).value || '').trim() || 'Без назви';
      if (Object.keys(all).length >= 1 && !all[name]) why = 'Більше одного збереженого проєкту';
    }
    if (!why) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open(why + ' — у підписці «Дінрейка». Без підписки можна зібрати й перевірити щит, зберегти один проєкт і спробувати AI-помічника (5 запитів на день).');
  }, true);

  /* ---------- старт ---------- */
  window.DR = {
    token: function () { return TOKEN; },
    active: function () { return SUB.active; },
    paywall: function (r) { open(r || ''); }
  };
  function start() {
    build(); paint();
    if (!window.supabase || !window.supabase.createClient) return;
    sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });
    fetch(SB_URL + '/auth/v1/settings', { headers: { apikey: SB_KEY } }).then(function (r) { return r.json(); }).then(function (j) { google = !!(j && j.external && j.external.google); if (ui.d && ui.d.open && !USER) render(); }).catch(function () {});
    sb.auth.onAuthStateChange(function (ev, session) {
      var was = USER && USER.id;
      USER = session ? session.user : null; TOKEN = session ? session.access_token : '';
      paint();
      if (USER && USER.id !== was) refresh().then(function () { if (ui.d && ui.d.open) render(); });
      if (!USER) SUB = { active: false };
      if (ui.d && ui.d.open) render();
      if (ev === 'SIGNED_IN' && location.hash.indexOf('access_token') >= 0) history.replaceState(null, '', location.pathname + location.search);
    });
    afterPay();
    try { var qb = new URLSearchParams(location.search).get('brand'), sel = $('ab-brand'); if (qb && sel && [].some.call(sel.options, function (o) { return o.value === qb; })) { sel.value = qb; if (sel.onchange) sel.onchange(); } } catch (e) {}
    if (location.hash === '#pay') { history.replaceState(null, '', location.pathname + location.search); open(''); }
    setInterval(refresh, 30 * 60 * 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
