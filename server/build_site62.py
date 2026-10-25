# Сайт: підписка (account.js), авторизація запитів до AI, пейвол на 402.
p = '/home/claude/dinreika-site/app/index.html'
s = open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70]); s = s.replace(a, b, 1)
if 'account.js' not in s:
    rep("headers:{'content-type':'application/json'}, body:JSON.stringify({messages:msgs, tools})",
        "headers:Object.assign({'content-type':'application/json'}, window.DR && DR.token() ? {authorization:'Bearer ' + DR.token()} : {}), body:JSON.stringify({messages:msgs, tools})")
    rep("    if (!res.ok) throw {code:j.error || 'upstream_error'",
        "    if (!res.ok && j.error === 'need_sub' && window.DR) DR.paywall('Безкоштовні запити до AI-помічника на сьогодні закінчились.');\n    if (!res.ok) throw {code:j.error || 'upstream_error'")
    i = s.rindex('</body>')
    s = s[:i] + '<script src="vendor/supabase.js"></script>\n<script src="account.js"></script>\n' + s[i:]
if '· ETEK</div>' not in s and '<div class="bt2">Hager · Eaton · WAGO · ZUBR' in s:
    s = s.replace('<div class="bt2">Hager · Eaton · WAGO · ZUBR', '<div class="bt2">Hager · Eaton · ETEK · WAGO · ZUBR', 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
