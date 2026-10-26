# Сайт: звіти про помилки на сервер і відновлення після збою.
p = '/home/claude/dinreika-site/app/index.html'
s = open(p, encoding='utf-8').read()
if '__drReport' in s:
    print('already'); raise SystemExit
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80]); s = s.replace(a, b, 1)

# Звіт на сервер: одна помилка не частіше разу на 30 с, не більше 10 за сеанс
rep("function showErr(t){ DIAG.boot = 'помилка: ' + t; diag();",
"""window.__drReport = function(msg, stack, kind){ try{ if (!/^https?:$/.test(location.protocol)) return; const k = String(msg).slice(0, 200), now = Date.now(); window.__drSent = window.__drSent || {}; window.__drN = (window.__drN || 0);
  if (window.__drN >= 10 || (window.__drSent[k] && now - window.__drSent[k] < 30000)) return; window.__drSent[k] = now; window.__drN++;
  const tok = window.DR && DR.token ? DR.token() : '', h = {'content-type':'application/json'}; if (tok) h.authorization = 'Bearer ' + tok;
  fetch('https://rezraseoiznvflktyktj.supabase.co/functions/v1/report', {method:'POST', headers:h, keepalive:true, body:JSON.stringify({kind:kind || 'client', message:String(msg).slice(0, 1000), stack:String(stack || '').slice(0, 4000), url:location.pathname + location.search, version:'site-64'})}).catch(() => {}) }catch(e){} };
function showErr(t, stack){ DIAG.boot = 'помилка: ' + t; diag(); try{ window.__drReport(t, stack) }catch(e){}""")
rep("b.firstChild.textContent = 'Помилка сторінки: ' + t + '. Зроби знімок екрана і надішли розробнику.' }catch(e){} }",
"""b.firstChild.textContent = 'Щось пішло не так: ' + t + '. Звіт уже надіслано розробнику. '; if (!b.querySelector('.rb')){ let bak = null; try{ bak = localStorage.getItem('shchytok15-bak') }catch(e){} if (bak){ const rb = document.createElement('button'); rb.className = 'rb'; rb.textContent = 'Відновити попередній стан щита'; rb.onclick = () => { try{ localStorage.setItem('shchytok15', bak); location.reload() }catch(e){} }; b.insertBefore(rb, b.lastChild) } } }catch(e){} }""")
rep("window.addEventListener('error', e => showErr((e.message || 'невідома') + (e.lineno ? ' (рядок ' + e.lineno + ')' : '')));",
"""window.addEventListener('error', e => { if (!e.message && e.target && e.target !== window) return; showErr((e.message || 'невідома') + (e.lineno ? ' (рядок ' + e.lineno + ')' : ''), e.error && e.error.stack) });
window.addEventListener('unhandledrejection', e => { const r = e.reason || {}; if (r && (r.name === 'AbortError' || r.code === 'cancelled')) return; try{ window.__drReport('Promise: ' + (r.message || String(r)).slice(0, 300), r.stack, 'promise') }catch(x){} });""")
# Резервна копія стану щита раз на хвилину: з неї відновлюємось, якщо збережений стан ламає сторінку
rep("function save(){ let ok = true; try{ localStorage.setItem('shchytok15', ser()) }catch(e){ ok = false }",
"function save(){ let ok = true; try{ const prev = localStorage.getItem('shchytok15'), t = +localStorage.getItem('shchytok15-bakt') || 0; if (prev && Date.now() - t > 60000){ localStorage.setItem('shchytok15-bak', prev); localStorage.setItem('shchytok15-bakt', String(Date.now())) } localStorage.setItem('shchytok15', ser()) }catch(e){ ok = false }")
s = s.replace('.errbar button{flex:none;min-height:0;padding:2px 8px}', '.errbar button{flex:none;min-height:0;padding:2px 8px}.errbar .rb{background:var(--panel);font-weight:700}', 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
