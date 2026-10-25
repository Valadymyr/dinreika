# Сайт, нова версія робочого екрана: шапка з проєктом і «Збережено», Опис/Позначення,
# перевірки в правій колонці з переходом до апарата і кнопкою «Виправити кабель»,
# швидкий вибір номіналу в інспекторі, рядок AI під щитом.
p = '/home/claude/dinreika-site/app/index.html'
s = open(p, encoding='utf-8').read()
if 'id="wschk"' in s:
    print('already'); raise SystemExit
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80]); s = s.replace(a, b, 1)

# ---------- розмітка ----------
rep('<div class="bt1">Симулятор щитка <span class="kbd">CAD</span></div>', '<div class="bt1">Дінрейка</div>')
rep('<nav class="nav2" aria-label="Кроки">',
    '<div class="projchip"><button id="pj-chip" type="button" title="Назва і параметри об\'єкта">Без назви</button><span id="savedot" class="saved" role="status">Збережено</span></div>\n  <nav class="nav2" aria-label="Кроки">')
rep('    <button id="btn-mob">Мобільна версія</button>',
    '    <div class="segdes" role="group" aria-label="Підписи на щиті"><button type="button" id="sd-opis" aria-pressed="true">Опис</button><button type="button" id="sd-des" aria-pressed="false">Позначення</button></div>\n    <button id="btn-docs" type="button" title="Наклейки, специфікація, схема, друк">Документи</button>\n    <button id="btn-mob">Мобільна версія</button>')
rep('      <div id="detail"></div>\n    </section>',
    '      <div class="wschk"><div class="insp-h"><span>Перевірки</span><span class="kbd" id="wschk-n">0</span></div><ul class="checks" id="wschk"></ul></div>\n      <div id="detail"></div>\n    </section>')
rep('      <div class="box" id="board"></div>',
    '      <div class="box" id="board"></div>\n      <form class="aibar" id="aibar" hidden><span class="aitag">AI</span><label class="aiinput" for="aibar-in"><span class="sr" style="position:absolute;left:-9999px">Команда помічнику</span><input id="aibar-in" type="text" autocomplete="off" placeholder="Скажи, що змінити: «додай кондиціонер у спальню, 2,5 кВт, 15 метрів»"></label><button type="button" id="aibar-mic" class="sq" aria-label="Диктувати" hidden><svg class="i" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M3 8a5 5 0 0 0 10 0M8 13v2" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button><button class="go" type="submit">Надіслати</button></form>')

# ---------- стилі ----------
s = s.replace('</style>', r'''
.projchip{display:flex;align-items:center;gap:10px;min-width:0}
#pj-chip{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.saved{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--ok);white-space:nowrap}
.saved::before{content:'';width:8px;height:8px;border-radius:50%;background:currentColor}
.saved.err{color:var(--bad)}
.segdes{display:inline-flex;padding:3px;gap:2px;border:1px solid var(--line);border-radius:8px;background:var(--soft)}
.segdes button{border:0;border-radius:6px;padding:5px 10px;min-height:0;background:transparent;font-weight:600}
.segdes button[aria-pressed=true]{background:var(--ink);color:var(--panel)}
.wschk{margin:4px 0 18px}
.wschk .checks{margin-top:8px}
#wschk li,#checks li.go2{cursor:pointer}
#wschk li{font-size:13px}
.checks li .fixb{display:inline-block;margin-left:6px;padding:3px 8px;min-height:0;font-size:12px;font-weight:700;border-radius:6px;border:1px solid var(--bad);color:var(--bad);background:var(--panel);cursor:pointer}
.checks li .seeb{display:inline-block;margin-left:6px;font-size:12px;font-weight:700;color:var(--link)}
.qrate{display:flex;flex-wrap:wrap;gap:6px}
.qrate button{min-width:52px;min-height:40px;padding:6px 10px;border-radius:8px;font-weight:700;font-variant-numeric:tabular-nums}
.qrate button[aria-pressed=true]{background:var(--signal);color:var(--signal-ink);border-color:var(--signal)}
.aibar{display:flex;gap:8px;align-items:center;margin-top:12px;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
.aibar .aitag{font:700 11px/1 var(--mono);padding:5px 7px;border-radius:6px;background:var(--ink);color:var(--signal)}
.aibar .aiinput{flex:1;min-width:0;display:flex}
.aibar input{width:100%;min-width:0;font:inherit;font-size:15px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--soft);color:var(--ink)}
.aibar .sq.rec{background:var(--bad);color:#fff;border-color:var(--bad)}
body:not([data-step="5"]) .aibar{display:none!important}
@media (max-height:500px) and (orientation:landscape){.appbar{position:static}.appbar .bt2{display:none}.stepbar{padding-block:4px}.stepbar button{min-height:36px;padding-block:4px}.grid > .side{position:static;max-height:none}}
@media (max-width:1120px){.projchip .saved{display:none}}
@media (max-width:740px){
  .nav2{display:none!important}
  .appbar .bt1{display:none}
  .projchip{flex:1 1 0;justify-content:space-between}.projchip .saved{display:inline-flex}#pj-chip{max-width:58vw}
  .segdes,#btn-docs{display:none}
  .wschk{display:none}
  .aibar{position:fixed;left:0;right:0;bottom:calc(60px + env(safe-area-inset-bottom,0px));margin:0;border-radius:0;border-width:1px 0 0;z-index:56;padding:8px 10px}
  .aibar .aitag,.aibar button[type=submit]{display:none}
  .aibar input{font-size:16px}
  body[data-step="5"] .mfab{bottom:calc(132px + env(safe-area-inset-bottom,0px))}
  body[data-step="5"] .grid .stage{padding-bottom:150px}
  body.sheet-cat .aibar,body.sheet-insp .aibar{display:none}
}
</style>''', 1)

# ---------- логіка ----------
# «Збережено» і назва проєкту після кожного збереження
rep("function save(){ try{ localStorage.setItem('shchytok15', ser()) }catch(e){} }",
    "function save(){ let ok = true; try{ localStorage.setItem('shchytok15', ser()) }catch(e){ ok = false } try{ wsUpd(ok) }catch(e){} }\n"
    "function wsUpd(ok){ const c = document.getElementById('pj-chip'), d = document.getElementById('savedot'); if (c) c.textContent = (state.pname || '').trim() || 'Без назви'; if (d){ d.textContent = ok === false ? 'Не збережено' : 'Збережено'; d.classList.toggle('err', ok === false) }\n"
    "  const a = document.getElementById('sd-opis'), b = document.getElementById('sd-des'); if (a && b){ a.setAttribute('aria-pressed', !SHOWDES); b.setAttribute('aria-pressed', !!SHOWDES) } }")

# Перевірки: прив'язка до апарата, клік веде до нього, «Виправити кабель»
rep("""  const ul = $('checks'); ul.replaceChildren(); const C = {bad:'var(--bad)', warn:'var(--warn)', info:'var(--muted)'}, order = {bad:0, warn:1, info:2};
  for (const [lvl, t] of out.sort((a,b) => order[a[0]] - order[b[0]])){ const li = el('li', '', t); li.style.setProperty('--c', C[lvl]); ul.append(li) }""",
"""  const ul = $('checks'); ul.replaceChildren(); const C = {bad:'var(--bad)', warn:'var(--warn)', info:'var(--muted)'}, order = {bad:0, warn:1, info:2};
  const DS = Object.entries(des).filter(([id, d]) => d).sort((a, b) => b[1].length - a[1].length), idOf = t => { for (const [id, d] of DS) if (t.startsWith(d + ':') || t.startsWith(d + ' ')) return +id; return null };
  const ws = $('wschk'); if (ws) ws.replaceChildren(); let nb = 0;
  for (const [lvl, t] of out.sort((a,b) => order[a[0]] - order[b[0]])){ const id = idOf(t), it = id != null ? state.items.find(i => i.id === id) : null, cableBad = it && lvl !== 'info' && /не захищений|In ≤ Iz|формально проходить/.test(t);
    const mk = small => { const li = el('li', '', t); li.style.setProperty('--c', C[lvl]);
      if (it){ li.classList.add('go2'); li.title = 'Показати апарат на щиті'; li.tabIndex = 0; const goTo = () => wsShow(it.id); li.onclick = goTo; li.onkeydown = ev => { if (ev.key === 'Enter') goTo() }; li.append(el('span', 'seeb', ' Показати'));
        if (cableBad){ const fb = el('button', 'fixb', 'Виправити кабель'); fb.type = 'button'; fb.onclick = ev => { ev.stopPropagation(); if (fixCable(it)){ say('Кабель лінії ' + (des[it.id] || '') + ' замінено на ' + cableName(it.cable) + ' мм².'); state.sel = it.id; render() } else say('Підходящого кабелю тієї ж марки в базі немає. Вибери кабель вручну в картці апарата.') }; li.append(fb) } }
      return li };
    ul.append(mk(false)); if (ws && lvl !== 'info'){ ws.append(mk(true)); nb++ } }
  if (ws){ if (!nb){ const li = el('li', '', 'Помилок і попереджень немає.'); li.style.setProperty('--c', 'var(--ok)'); ws.append(li) } const n = $('wschk-n'); if (n){ n.textContent = nb; n.style.background = out.some(o => o[0] === 'bad') ? 'var(--bad)' : nb ? 'var(--warn)' : 'var(--ok)'; n.style.color = '#fff' } }""")

# Допоміжні: показати апарат, виправити кабель, швидкі номінали
rep("function renderDetail(des, G){",
"""function wsShow(id){ state.sel = id; if (state.step !== 5) go(5); else render(); requestAnimationFrame(() => { const m = document.querySelector('#board .mod.sel'); if (m && m.scrollIntoView) m.scrollIntoView({block:'center', inline:'center', behavior:'smooth'}) }) }
function fixCable(it){ const r = REF[it.ref], I = r.rating_a, cur = CABLES[it.cable]; if (!I || !cur) return false;
  const C = DB.cables.filter(c => c.mark === cur.mark && c.cores === cur.cores && c.cross_section_mm2 > cur.cross_section_mm2).sort((a, b) => a.cross_section_mm2 - b.cross_section_mm2), old = it.cable;
  for (const c of C){ it.cable = c.id; const lc = lineCalc(it), lim = LIM[c.cross_section_mm2]; const ok = (lc && lc.Iz ? I <= lc.Iz : true) && (!lim || I <= lim); if (ok){ const l = state.loads.find(l => l.item === it.id); if (l) l.cable = c.id; return true } }
  it.cable = old; return false }
function rateSibs(r){ if (!r.rating_a || !['mcb','rcbo','rccb'].includes(r.cat)) return [];
  return Object.values(REF).filter(x => x.cat === r.cat && x.brand === r.brand && x.series === r.series && (x.curve || '') === (r.curve || '') && x.poles === r.poles && x.w === r.w && (x.sensitivity_ma || 0) === (r.sensitivity_ma || 0) && (x.rcd_type || '') === (r.rcd_type || '') && x.rating_a)
    .filter(x => STD.includes(x.rating_a) || x.rating_a === r.rating_a).sort((a, b) => a.rating_a - b.rating_a).filter((x, i, a) => i === 0 || a[i - 1].rating_a !== x.rating_a) }
function renderDetail(des, G){""")
rep("const pb = (r.brand || 'Hager') === 'Hager' ? photoBox(r.code) : null; col.append(head, ...(pb ? [pb] : []), dl, lab, loadBox, btns);",
"""const pb = (r.brand || 'Hager') === 'Hager' ? photoBox(r.code) : null, sib = rateSibs(r), qr = [];
  if (sib.length > 1){ const box2 = el('div', 'qrate'); box2.setAttribute('role', 'group'); box2.setAttribute('aria-label', 'Номінал'); for (const x of sib){ const b = el('button', '', (r.cat === 'rccb' ? '' : (x.curve || '')) + x.rating_a + (r.cat === 'rccb' ? ' A' : '')); b.type = 'button'; b.setAttribute('aria-pressed', x.key === r.key); b.title = (x.code || '') + ' ' + (x.name || ''); b.onclick = () => { if (x.key === it.ref) return; it.ref = x.key; render() }; box2.append(b) } qr.push(el('h3', '', 'Номінал'), box2) }
  col.append(head, ...qr, ...(pb ? [pb] : []), dl, lab, loadBox, btns);""")

# Шапка: назва проєкту, Опис/Позначення, Документи; рядок AI
rep("$('showdes').checked = SHOWDES;",
"""$('pj-chip').onclick = () => { go(1); setTimeout(() => { try{ $('pname').focus() }catch(e){} }, 60) };
  $('btn-docs').onclick = () => go(7);
  const sdSet = v => { $('showdes').checked = v; $('showdes').onchange() }; $('sd-opis').onclick = () => sdSet(false); $('sd-des').onclick = () => sdSet(true);
  $('showdes').checked = SHOWDES;""")
rep("function aiInit(){ $('btn-ai').hidden = false;",
"""function aiInit(){ $('btn-ai').hidden = false; $('aibar').hidden = false;
  $('aibar').onsubmit = ev => { ev.preventDefault(); const v = $('aibar-in').value.trim(); if (!v) return $('aibar-in').focus(); $('aibar-in').value = ''; $('aichat').hidden = false; aiSend(v) };
  { const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $('aibar-mic'); if (AI === aiBackend && SR){ mic.hidden = false; let rec = null;
    mic.onclick = () => { if (rec){ rec.stop(); return } rec = new SR(); rec.lang = 'uk-UA'; rec.interimResults = true; rec.continuous = false; const base = $('aibar-in').value ? $('aibar-in').value.trim() + ' ' : '';
      rec.onresult = e => { let t = ''; for (const x of e.results) t += x[0].transcript; $('aibar-in').value = base + t }; rec.onend = () => { rec = null; mic.classList.remove('rec'); if ($('aibar-in').value.trim()) $('aibar').requestSubmit ? $('aibar').requestSubmit() : $('aibar').onsubmit(new Event('submit')) }; rec.onerror = () => { rec = null; mic.classList.remove('rec') };
      try{ rec.start(); mic.classList.add('rec') }catch(e){ rec = null } } } }""")

# ---------- доступність (аудит WCAG 2.1 AA) ----------
rep('--g1:#1f8a55', '--g1:#1b7a4b')
rep('id="btn-arrange" data-step="5">', 'id="btn-arrange" data-step="5" aria-label="Розставити по групах">')
rep('<select id="enc">', '<select id="enc" aria-label="Корпус">')
rep('<select id="phases">', '<select id="phases" aria-label="Ввід">')
s = s.replace('.qrate button{min-width:52px;min-height:40px;', '.qrate button{min-width:52px;min-height:44px;', 1)
s = s.replace('.segdes button{border:0;border-radius:6px;padding:5px 10px;min-height:0;', '.segdes button{border:0;border-radius:6px;padding:7px 12px;min-height:32px;', 1)
s = s.replace('#wschk li,#checks li.go2{cursor:pointer}', '#wschk li,#checks li.go2{cursor:pointer}\n.checks li.go2:focus-visible{outline:3px solid var(--link);outline-offset:2px}', 1)
rep("$('pj-chip').onclick = () => {", "document.querySelectorAll('.scroll, #stats, .circ').forEach(e => { if (!e.hasAttribute('tabindex')) e.tabIndex = 0 });\n  $('pj-chip').onclick = () => {")

open(p, 'w', encoding='utf-8').write(s)
print('ok')
