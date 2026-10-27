import re
r=lambda f:open(f,encoding='utf-8').read()
css=r('style.css');js=r('content-lp1.js')+'\n'+r('cards-lp1.js')+'\n'+r('app.js')
import os
pre=''
for extra in ('content-lp2.js','cards-lp2.js','content-lp3.js','content-bs1.js','content-bs2.js'):
    if os.path.exists(extra): pre+=r(extra)+'\n'
js=pre+js
html=f'''<title>Bank Lernplattform</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>{css}</style>
<div id="shell"><div id="top"></div><main id="app"></main></div>
<div id="nav"><div class="in" id="navin"></div></div>
<script>{js}</script>'''
open('/tmp/claude-0/-home-claude/495d00ae-f7d5-5bf5-b527-64d4439441f7/scratchpad/plattform.html','w',encoding='utf-8').write(html)
print(len(html))
