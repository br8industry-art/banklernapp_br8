'use strict';
/* ===== Bank Lernplattform: eine Codebasis für Web-App (PWA) und Artifact ===== */
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DAY=864e5,DAYS=[0,1,3,7,14,30];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const dkey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

/* ---------- Inhalte ---------- */
const PLANS=[
 {id:'lp1',name:'LP1_JG26_Bank',short:'Lernplan 1',start:'04.09.2026',end:'2026-10-21',endTxt:'21.10.2026'},
 {id:'lp2',name:'LP2_JG26_Bank',short:'Lernplan 2',start:'04.09.2026',end:'2026-11-15',endTxt:'15.11.2026'},
 {id:'lp3',name:'LP3_JG26_Bank',short:'Lernplan 3',start:'04.09.2026',end:'2027-01-17',endTxt:'17.01.2027',
  pre:[{t:'Kontomodelle und Verwaltungsprozesse',topics:[['Privatkundschaft',17],['Firmenkundschaft',43],['Gemeinschaftskonten',18],['Treuhandkonten',36],['Kontenarten',18]]}]}];
const BLOCK1=['Zusammenarbeit und Präsentation','Zusammenarbeit und Präsentation','Zusammenarbeit und Präsentation','Ausbildung und Lernen','Ausbildung und Lernen','Ausbildung und Lernen','Arbeit, Geld und Mitbestimmung','Arbeit, Geld und Mitbestimmung','Arbeit, Geld und Mitbestimmung','Privatrecht','Privatrecht','Staat und Wirtschaft','Staat und Wirtschaft','Staat und Wirtschaft'];
const TOPICS=[];
M.forEach((m,i)=>TOPICS.push({key:'lp1-'+i,plan:'lp1',block:BLOCK1[i],t:m.t,s:m.s,
  q:m.q.map((q,j)=>({id:'lp1-'+i+'-q'+j,q:q[0],o:q[1],e:q[2]})),
  c:D1.filter(c=>c[0]===i).map((c,j)=>({id:'lp1-'+i+'-c'+j,f:c[1],b:c[2]}))}));
if(typeof EXTRA!=='undefined')EXTRA.forEach((m,i)=>{const k=m.plan+'-'+i;TOPICS.push({key:k,plan:m.plan,block:m.block,t:m.t,s:m.s,
  q:m.q.map((q,j)=>({id:k+'-q'+j,q:q[0],o:q[1],e:q[2]})),c:(m.c||[]).map((c,j)=>({id:k+'-c'+j,f:c[0],b:c[1]}))})});
const T=k=>TOPICS.find(x=>x.key===k);
const planTopics=p=>TOPICS.filter(t=>t.plan===p);
const isOpen=p=>planTopics(p).length>0;
const allQ=()=>TOPICS.flatMap(t=>t.q.map(q=>({...q,tk:t.key})));
const allC=()=>TOPICS.flatMap(t=>t.c.map(c=>({...c,tk:t.key})));

/* ---------- Zustand ---------- */
const LS='bank-lern-v3';
let S={v:3,q:{},d:{},best:{},exam:[],xp:{},log:[],last:null,goal:50,theme:'auto',stats:{rev:0,ans:0,ok:0},updated:0};
try{const r=localStorage.getItem(LS);if(r)Object.assign(S,JSON.parse(r));else{
  const old=JSON.parse(localStorage.getItem('lern2')||'null');
  if(old){Object.entries(old.cards||{}).forEach(([k,v])=>{const [i,j]=k.split('-');S.q['lp1-'+i+'-q'+j]={l:v.level,due:v.due}});S.xp=old.xp||{};S.log=old.log||[];S.exam=old.exam||[]}}}catch(e){}
let dbDoc=null,dbTimer=null;
function save(){S.updated=Date.now();try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}
  if(dbDoc){clearTimeout(dbTimer);dbTimer=setTimeout(pushDb,2000)}}
function summary(){
  const due=dueC().length+dueQ().length;
  return {due_cards:dueC().length,due_questions:dueQ().length,overall:overall(),streak:streak(),xp_today:xpToday(),goal:S.goal,
    weakest:TOPICS.map(t=>({t:t.t,p:mastery(t.key)})).sort((a,b)=>a.p-b.p).slice(0,3),
    plans:PLANS.map(p=>({plan:p.name,end:p.end,days_left:daysLeft(p.end),open:isOpen(p.id),progress:planProg(p.id)})),
    last_active:Object.keys(S.xp).sort().pop()||null,due_total:due};
}
async function pushDb(){try{await dbDoc.set({updated:S.updated,summary:summary(),state:S})}catch(e){}}
async function initDb(){
  try{
    if(!window.claude||!claude.use)return;
    const db=await claude.use('db');if(!db)return;
    dbDoc=db.doc('state/main');
    const snap=await dbDoc.get();
    if(snap.exists){const r=snap.data();if(r&&r.state&&r.updated>S.updated){Object.assign(S,r.state);try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}applyTheme();render()}}
    else if(S.updated)pushDb();
  }catch(e){dbDoc=null}
}

/* ---------- Lernlogik ---------- */
const addXp=n=>{if(!n)return;const k=dkey();S.xp[k]=(S.xp[k]||0)+n;save()};
const xpToday=()=>S.xp[dkey()]||0;
const streak=()=>{let n=0;const d=new Date();if(!S.xp[dkey(d)])d.setDate(d.getDate()-1);while(S.xp[dkey(d)]){n++;d.setDate(d.getDate()-1)}return n};
const logAdd=(label,res)=>{S.log.unshift({t:Date.now(),label,res});S.log=S.log.slice(0,60);save()};
const lv=(m,id)=>(m[id]||{l:0}).l;
const due=(m,id)=>{const c=m[id];return !c||c.due<=Date.now()};
const dueQ=()=>allQ().filter(q=>due(S.q,q.id)),dueC=()=>allC().filter(c=>due(S.d,c.id));
function setLevel(m,id,l,days){m[id]={l,due:Date.now()+days*DAY};S.stats.rev++;save()}
function gradeQ(id,ok){const l=ok?Math.min(lv(S.q,id)+1,5):0;S.q[id]={l,due:Date.now()+DAYS[l]*DAY};S.stats.ans++;if(ok)S.stats.ok++;save()}
function rateC(id,r){const l0=lv(S.d,id);let l,x;
  if(r==='again'){l=0;x=0}else if(r==='hard'){l=Math.max(1,l0);x=2}else if(r==='good'){l=Math.min(5,l0+1);x=5}else{l=Math.min(5,l0+2);x=6}
  S.d[id]={l,due:r==='again'?Date.now():Date.now()+Math.max(1,DAYS[l])*DAY};S.stats.rev++;save();addXp(x)}
const avgL=(m,items)=>items.length?items.reduce((a,x)=>a+lv(m,x.id),0)/(5*items.length):null;
function mastery(k){const t=T(k),a=avgL(S.q,t.q),b=avgL(S.d,t.c),p=[a,b].filter(x=>x!==null);return p.length?Math.round(p.reduce((x,y)=>x+y,0)/p.length*100):0}
const nStars=k=>{const m=mastery(k);return m>=70?3:m>=40?2:m>=15?1:0};
const planProg=id=>{const t=planTopics(id);return t.length?Math.round(t.reduce((a,x)=>a+mastery(x.key),0)/t.length):0};
const overall=()=>{const t=TOPICS;return t.length?Math.round(t.reduce((a,x)=>a+mastery(x.key),0)/t.length):0};
const daysLeft=end=>Math.max(0,Math.ceil((new Date(end+'T23:59:59')-Date.now())/DAY));
const words=t=>t.s.reduce((a,[h,l])=>a+l.join(' ').split(/\s+/).length,0);
const mins=t=>Math.max(5,Math.round(words(t)/110+t.q.length*1.2+t.c.length*.3));
const fmtMin=m=>Math.floor(m/60)+' Std '+Math.round(m%60)+' min';
const hue=k=>'hsl('+([...k].reduce((a,c)=>a+c.charCodeAt(0),0)*37%360)+' 55% 42%)';
const starsHtml=n=>'<span class="stars" aria-label="'+n+' von 3 Sternen">'+'★'.repeat(n)+'<s>'+'★'.repeat(3-n)+'</s></span>';
const ICONS={home:'M3 11l9-8 9 8v10h-6v-6h-6v6H3z',lib:'M4 5h6a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-6a2 2 0 00-2 2v12a2 2 0 012-2h6z',cards:'M4 8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z',prog:'M4 20V10M10 20V4M16 20v-7M22 20H2',more:'M5 12h.01M12 12h.01M19 12h.01'};

/* ---------- Navigation ---------- */
let view={v:'home'},tm=null,deferredInstall=null;
function go(v){view=v;if(tm){clearInterval(tm);tm=null}render();window.scrollTo({top:0})}
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g&&!g.disabled){try{go(JSON.parse(g.dataset.go))}catch(x){}}});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-go][tabindex]')){e.preventDefault();e.target.click()}});
function applyTheme(){const r=document.documentElement;if(S.theme==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',S.theme)}
function renderTop(){$('#top').innerHTML=`<span class="brand">Bank Lernplattform</span><span class="chips"><span class="chip">Serie <b>${streak()}</b></span><span class="chip">XP <b>${xpToday()}</b>/${S.goal}</span></span>`}
function renderNav(){
  const g={home:'home',lib:'lib',plan:'lib',topic:'lib',learn:'lib',practice:'lib',cards:'cards',deck:'cards',prog:'prog'}[view.v]||'more';
  const d=dueC().length;
  $('#navin').innerHTML=[['home','Home'],['lib','Pläne'],['cards','Karten'],['prog','Fortschritt'],['more','Mehr']].map(([k,l])=>`<button data-go='{"v":"${k==='cards'?'deck':k}"}' ${g===k?'aria-current="true"':''}><svg viewBox="0 0 24 24"><path d="${ICONS[k==='prog'?'prog':k]}"/></svg>${l}${k==='cards'&&d?`<span class="dot">${d>99?'99+':d}</span>`:''}</button>`).join('');
}
function render(){renderTop();renderNav();app.innerHTML='';({home,lib,plan,topic,learn,practice,cards,deck,exam,prog,gloss,more,settings}[view.v])()}

/* ---------- Bausteine ---------- */
function topicCard(k){const t=T(k),m=mastery(k);
  return `<div class="card tcard" tabindex="0" role="button" data-go='{"v":"topic","k":"${k}"}'><div class="ico" style="background:${hue(k)}">${esc(t.t[0])}</div><div class="mid"><span class="tt">${esc(t.t)}</span><div class="row nw"><span class="meter"><i style="width:${m}%"></i></span><span class="sub">${m} %</span>${starsHtml(nStars(k))}</div></div></div>`}
function planCard(p){const o=isOpen(p.id),pr=planProg(p.id);
  return `<div class="card tcard plan" tabindex="0" role="button" data-go='{"v":"plan","id":"${p.id}"}'><div class="mid"><span class="tt">${p.name}</span><span class="sub">${p.start} bis ${p.endTxt}${o?'':' · Inhalte folgen'}</span><div class="row nw"><span class="meter"><i style="width:${pr}%"></i></span><span class="sub">${pr} %</span></div></div><span class="tag">${daysLeft(p.end)} Tage</span></div>`}
const ring=(p,label,sub,size=84)=>{const C=2*Math.PI*34;return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 84 84" style="width:${size}px;height:${size}px"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--panel2)" stroke-width="8"/><circle cx="42" cy="42" r="34" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C*Math.min(1,p)} ${C}"/></svg><span><div>${label}<small>${sub}</small></div></span></div>`};

/* ---------- Home ---------- */
function home(){
  let next=S.last&&T(S.last)&&mastery(S.last)<100?S.last:(TOPICS.find(t=>mastery(t.key)<70)||TOPICS[0]).key;
  const weak=TOPICS.slice().sort((a,b)=>mastery(a.key)-mastery(b.key)).slice(0,3).map(t=>t.key);
  const dc=dueC().length,dq=dueQ().length;
  const open=PLANS.filter(p=>isOpen(p.id));
  app.innerHTML=`<div class="stack">
  <div class="hero"><div><h1>Hallo Yoshi</h1><p class="sub" style="margin:4px 0 0">${xpToday()>=S.goal?'Tagesziel erreicht. Stark.':'Noch '+(S.goal-xpToday())+' XP bis zum Tagesziel.'}</p></div>${ring(xpToday()/S.goal,xpToday(),'von '+S.goal+' XP')}</div>
  <h2 style="margin-top:6px">Weitermachen</h2>${topicCard(next)}
  <div class="card sp"><div><b>${dc} Karteikarten fällig</b><div class="sub">${dq} Testfragen zur Wiederholung bereit</div></div><button class="btn" data-go='{"v":"deck"}'>Üben</button></div>
  <h2>Deine Lernpläne</h2>${PLANS.slice(0,3).map(planCard).join('')}
  <h2>Schwächste Themen</h2>${weak.map(topicCard).join('')}</div>`;
}

/* ---------- Lernpläne ---------- */
function lib(){app.innerHTML=`<h1>Lernpläne</h1><p class="sub" style="margin:4px 0 14px">Alle Pläne der Ausbildung</p><div class="stack">${PLANS.slice().reverse().map(planCard).join('')}</div>`}
function plan(){
  const p=PLANS.find(x=>x.id===view.id)||PLANS[0],tab=view.tab||'t',tt=planTopics(p.id);
  const left=tt.reduce((a,t)=>a+mins(t)*(1-mastery(t.key)/100),0);let body='';
  if(!tt.length){
    body=(p.pre?p.pre.map(b=>`<div class="blk">${b.t}</div><div class="stack">${b.topics.map(([n,m])=>`<div class="card tcard lock"><div class="ico" style="background:${hue(n)}">${n[0]}</div><div class="mid"><span class="tt">${n}</span><span class="sub">${m} min · Inhalt folgt</span></div></div>`).join('')}</div>`).join(''):'')+'<p class="sub" style="margin-top:16px">Dieser Plan ist noch nicht eingelesen. Zusammenfassung, Karten und Tests entstehen, sobald die Inhalte da sind.</p>';
  }else if(tab==='t'){
    const blocks=[...new Set(tt.map(t=>t.block))];
    body=blocks.map(b=>`<div class="blk">${esc(b)}</div><div class="stack">${tt.filter(t=>t.block===b).map(t=>topicCard(t.key)).join('')}</div>`).join('');
  }else{
    const dl=Math.max(1,daysLeft(p.end)),per=Math.ceil(tt.length/dl),rows=[];
    for(let k=0;k<tt.length;k+=per){const d=new Date();d.setDate(d.getDate()+k/per);rows.push([d,tt.slice(k,k+per)])}
    body=`<p class="sub">${tt.length} Themen, gleichmäßig bis zum ${p.endTxt} verteilt.</p><div class="stack">${rows.map(([d,ix])=>`<div class="card"><b>${d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})}</b>${ix.map(t=>`<div class="sp" style="margin-top:8px"><span class="tt link" tabindex="0" role="button" data-go='{"v":"topic","k":"${t.key}"}'>${esc(t.t)}</span>${nStars(t.key)>=2?'<span class="tag">erledigt</span>':`<span class="tag">${mins(t)} min</span>`}</div>`).join('')}</div>`).join('')}</div>`;
  }
  app.innerHTML=`<button class="back" data-go='{"v":"lib"}'>‹ Lernpläne</button><h1>${p.name}</h1>
  <div class="row" style="margin:8px 0 14px"><span class="tag">Noch ${daysLeft(p.end)} Tage</span><span class="tag">${tt.length?fmtMin(left)+' übrig':'Inhalte folgen'}</span><span class="tag">${planProg(p.id)} % gelernt</span></div>
  ${tt.length?`<button class="btn block" data-go='{"v":"exam","plan":"${p.id}"}'>Übungstest</button><div class="tabs"><button data-go='{"v":"plan","id":"${p.id}","tab":"t"}' aria-selected="${tab==='t'}">Themen</button><button data-go='{"v":"plan","id":"${p.id}","tab":"z"}' aria-selected="${tab==='z'}">Zeitplan</button></div>`:''}${body}`;
}

/* ---------- Thema ---------- */
function topic(){
  const t=T(view.k),k=t.key;
  app.innerHTML=`<button class="back" data-go='{"v":"plan","id":"${t.plan}"}'>‹ ${PLANS.find(p=>p.id===t.plan).short}</button>
  <div class="row nw" style="margin:6px 0"><div class="ico" style="background:${hue(k)}">${esc(t.t[0])}</div><div><h1 style="font-size:1.4rem">${esc(t.t)}</h1><div class="row" style="gap:8px">${starsHtml(nStars(k))}<span class="sub">${mastery(k)} % gelernt · ${mins(t)} min</span></div></div></div>
  <div class="split"><div><div class="sub">Karteikarten</div><div class="meter"><i style="width:${Math.round((avgL(S.d,t.c)||0)*100)}%"></i></div></div><div><div class="sub">Testfragen</div><div class="meter"><i style="width:${Math.round((avgL(S.q,t.q)||0)*100)}%"></i></div></div></div>
  <div class="stack" style="margin:16px 0">
   <button class="btn block" data-go='{"v":"learn","k":"${k}","p":0}'>Lernen</button>
   <button class="btn alt block" data-go='{"v":"practice","k":"${k}"}'>Üben (${t.q.length} Fragen)</button>
   <button class="btn alt block" data-go='{"v":"deck","k":"${k}"}'>Karteikarten (${t.c.length})</button></div>
  <h2>Nachlesen</h2><div class="card page">${t.s.map(([h,l])=>`<h3 style="font-size:1.05rem;margin:14px 0 6px">${esc(h)}</h3><ul style="font-size:.98rem;gap:6px">${l.map(x=>`<li>${x}</li>`).join('')}</ul>`).join('')}</div>`;
}
function learn(){
  const t=T(view.k),n=t.s.length,pg=view.p,last=pg>=n;S.last=t.key;save();
  app.innerHTML=`<div class="sp"><button class="back" data-go='{"v":"topic","k":"${t.key}"}'>✕ Schließen</button><span class="sub">${Math.min(pg+1,n+1)} von ${n+1}</span></div><div class="bar"><i style="width:${(pg+1)/(n+1)*100}%"></i></div>
  <div class="page card" style="padding:22px">${last?`<h3>Bereit für die Übung</h3><p>Du hast ${n} Abschnitte zu „${esc(t.t)}“ gelesen. Schreib dir gern selbst Stichpunkte auf, bevor du startest.</p>`:`<h3>${esc(t.s[pg][0])}</h3><ul>${t.s[pg][1].map(x=>`<li>${x}</li>`).join('')}</ul>`}</div>
  <div class="row" style="margin-top:16px">${pg>0?`<button class="btn alt" data-go='{"v":"learn","k":"${t.key}","p":${pg-1}}'>Zurück</button>`:''}
  ${last?`<button class="btn" data-go='{"v":"practice","k":"${t.key}"}'>Übung starten</button>`:`<button class="btn" data-go='{"v":"learn","k":"${t.key}","p":${pg+1}}'>Weiter</button>`}</div>`;
}

/* ---------- Quiz ---------- */
function quizRun(box,items,fin){
  let k=0,right=0;
  const step=()=>{
    if(k>=items.length){fin(right);return}
    const it=items[k];
    box.innerHTML=`<div class="bar"><i style="width:${k/items.length*100}%"></i></div><p class="sub">Frage ${k+1} von ${items.length}</p><p class="qt">${esc(it.q)}</p><div class="opts"></div><div class="fb"></div><div class="nx"></div>`;
    const o=box.querySelector('.opts'),fb=box.querySelector('.fb'),nx=box.querySelector('.nx');let done=false;
    shuffle(it.o.map((x,j)=>[x,j===0])).forEach(([txt,ok])=>{
      const b=document.createElement('button');b.className='opt';b.textContent=txt;if(ok)b.dataset.c=1;
      b.onclick=()=>{
        if(done)return;done=true;o.querySelectorAll('.opt').forEach(x=>x.setAttribute('aria-disabled','true'));gradeQ(it.id,ok);
        if(ok){b.classList.add('ok');right++;addXp(10);fb.innerHTML='<b>Richtig.</b> '+esc(it.e)}
        else{b.classList.add('bad');o.querySelector('[data-c]').classList.add('ok');fb.innerHTML='<b>Nicht ganz.</b> '+esc(it.e)}
        const n=document.createElement('button');n.className='btn block';n.textContent=k+1<items.length?'Weiter':'Ergebnis';n.onclick=()=>{k++;step()};nx.appendChild(n);renderTop();renderNav()};
      o.appendChild(b)});
  };step();
}
function practice(){
  const t=T(view.k);S.last=t.key;save();
  app.innerHTML=`<div class="sp"><button class="back" data-go='{"v":"topic","k":"${t.key}"}'>✕ Schließen</button><span class="sub">${esc(t.t)}</span></div><div id="qz"></div>`;
  quizRun($('#qz'),shuffle(t.q),r=>{
    if(!(S.best[t.key]>=r))S.best[t.key]=r;logAdd('Übung: '+t.t,r+' von '+t.q.length);renderTop();renderNav();
    $('#qz').innerHTML=`<div class="big">${r} von ${t.q.length} richtig</div><p class="sub">${starsHtml(nStars(t.key))} · ${r*10} XP</p><div class="stack" style="margin-top:16px"><button class="btn block" data-go='{"v":"practice","k":"${t.key}"}'>Nochmal</button><button class="btn alt block" data-go='{"v":"deck","k":"${t.key}"}'>Karteikarten</button><button class="btn alt block" data-go='{"v":"topic","k":"${t.key}"}'>Zurück zum Thema</button></div>`;
  });
}

/* ---------- Karteikarten (Stapel mit 4 Bewertungen) ---------- */
const cardStatus=c=>!S.d[c.id]?'neu':lv(S.d,c.id)>=4?'sicher':'lernt';
function cards(){go({v:'deck'})}
function deck(){
  const scope=view.k?[T(view.k)]:TOPICS,list=scope.flatMap(t=>t.c.map(c=>({...c,tk:t.key})));
  const n={neu:0,lernt:0,sicher:0};list.forEach(c=>n[cardStatus(c)]++);
  const dueL=list.filter(c=>due(S.d,c.id)&&S.d[c.id]),newL=list.filter(c=>!S.d[c.id]);
  if(view.run){return runDeck(view.run==='due'?shuffle(dueL).slice(0,20):view.run==='new'?newL.slice(0,10):shuffle(list).slice(0,20))}
  const back=view.k?`<button class="back" data-go='{"v":"topic","k":"${view.k}"}'>‹ ${esc(T(view.k).t)}</button>`:'';
  app.innerHTML=`${back}<h1>Karteikarten</h1><p class="sub" style="margin:4px 0 14px">${view.k?esc(T(view.k).t):'Alle Themen'} · ${list.length} Karten</p>
  <div class="tiles"><div class="tile"><b>${n.neu}</b><span>neu</span></div><div class="tile"><b>${n.lernt}</b><span>in Arbeit</span></div><div class="tile"><b>${n.sicher}</b><span>sicher</span></div><div class="tile"><b>${dueL.length}</b><span>fällig</span></div></div>
  <div class="stack"><button class="btn block" data-go='{"v":"deck","k":${view.k?'"'+view.k+'"':'null'},"run":"due"}' ${dueL.length?'':'disabled'}>Fällige wiederholen (${Math.min(20,dueL.length)})</button>
  <button class="btn alt block" data-go='{"v":"deck","k":${view.k?'"'+view.k+'"':'null'},"run":"new"}' ${newL.length?'':'disabled'}>Neue lernen (${Math.min(10,newL.length)})</button>
  <button class="btn alt block" data-go='{"v":"deck","k":${view.k?'"'+view.k+'"':'null'},"run":"mix"}' ${list.length?'':'disabled'}>Gemischte Runde (${Math.min(20,list.length)})</button></div>
  <p class="sub" style="margin-top:16px">Bewertung nach dem Aufdecken: Nochmal kommt gleich wieder, Schwer bleibt auf der Stufe, Gut steigt um eine Stufe, Leicht um zwei. Je höher die Stufe, desto später kommt die Karte wieder (bis 30 Tage).</p>`;
}
function runDeck(list){
  const k0=view.k;let queue=list.slice(),seen=new Set(),know=0,again={};
  app.innerHTML=`<div class="sp"><button class="back" id="x">✕ Beenden</button><span class="sub" id="cnt"></span></div><div id="cs"></div>`;
  $('#x').onclick=()=>go({v:'deck',k:k0||null});
  const box=$('#cs');
  const show=()=>{
    $('#cnt').textContent=seen.size+' von '+list.length;
    if(!queue.length){logAdd('Karten'+(k0?': '+T(k0).t:''),know+' von '+list.length+' sofort gewusst');renderTop();renderNav();
      box.innerHTML=`<div class="big">${know} von ${list.length} sofort gewusst</div><p class="sub">Die Runde ist geschafft.</p><div class="stack" style="margin-top:16px"><button class="btn block" data-go='{"v":"deck","k":${k0?'"'+k0+'"':'null'}}'>Zurück zum Stapel</button><button class="btn alt block" data-go='{"v":"home"}'>Home</button></div>`;return}
    const c=queue[0],t=T(c.tk);
    box.innerHTML=`<div class="bar"><i style="width:${seen.size/list.length*100}%"></i></div><div class="fc"><span class="sub">${esc(t.t)} · ${cardStatus(c)}</span><b class="fq">${esc(c.f)}</b><div class="ans"></div></div>`;
    const ans=box.querySelector('.ans'),b=document.createElement('button');b.className='btn block';b.textContent='Antwort zeigen';
    const reveal=()=>{
      ans.innerHTML=`<div class="a">${esc(c.b)}</div><div class="rate"></div>`;
      const r=ans.querySelector('.rate');
      [['again','Nochmal','alt'],['hard','Schwer','alt'],['good','Gut','ok'],['easy','Leicht','ok']].forEach(([id,l,cl])=>{
        const x=document.createElement('button');x.className='btn '+cl;x.textContent=l;
        x.onclick=()=>{rateC(c.id,id);queue.shift();
          if(id==='again'){again[c.id]=(again[c.id]||0)+1;if(again[c.id]<3)queue.splice(Math.min(3,queue.length),0,c)}
          else{if(!seen.has(c.id)){seen.add(c.id);if(!again[c.id]&&id!=='hard')know++}}
          if(id==='again'&&again[c.id]>=3)seen.add(c.id);
          renderTop();renderNav();show()};
        r.appendChild(x)});
    };
    b.onclick=()=>{reveal();b.remove()};ans.appendChild(b);
  };show();
}

/* ---------- Tests ---------- */
function exam(){
  const plan=view.plan||null,pool=allQ().filter(q=>!plan||T(q.tk).plan===plan);
  app.innerHTML=`<h1>Tests</h1><p class="sub" style="margin:4px 0 14px">${plan?PLANS.find(p=>p.id===plan).short:'Alle Pläne'} · ${pool.length} Fragen im Pool. Aufgelöst wird erst nach dem Abgeben, pro Frage gibt es 75 Sekunden.</p><div class="stack">${[10,20,30].map(n=>`<button class="btn ${n===20?'':'alt'} block" data-n="${n}">${n} Fragen${n===20?' (Standard)':''}</button>`).join('')}</div>`;
  app.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>runExam(pool,Math.min(+b.dataset.n,pool.length)));
}
function runExam(pool,n){
  const qs=shuffle(pool).slice(0,n).map(c=>({...c,opts:shuffle(c.o.map((x,k)=>[x,k===0])),pick:-1}));
  let left=n*75,done=false;
  app.innerHTML=`<div class="sp"><span class="timer" id="tm"></span><span class="sub">${n} Fragen</span></div><div id="res"></div><div id="qs" class="stack" style="margin-top:14px"></div>`;
  const wrap=$('#qs');
  qs.forEach((q,qi)=>{
    const d=document.createElement('div');d.className='card';d.innerHTML=`<p class="qt" style="font-size:1rem">${qi+1}. ${esc(q.q)}</p><div class="opts"></div><div class="fb"></div>`;
    q.opts.forEach(([t],k)=>{const b=document.createElement('button');b.className='opt';b.textContent=t;
      b.onclick=()=>{if(done)return;q.pick=k;d.querySelectorAll('.opt').forEach((x,y)=>x.classList.toggle('sel',y===k))};d.querySelector('.opts').appendChild(b)});
    q.el=d;wrap.appendChild(d)});
  const sub=document.createElement('button');sub.className='btn block';sub.textContent='Abgeben';wrap.appendChild(sub);
  const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  const tick=()=>{$('#tm').textContent=fmt(Math.max(0,left));if(left<=0)finish();left--};
  function finish(){
    if(done)return;done=true;clearInterval(tm);tm=null;sub.remove();
    let right=0;const by={};
    qs.forEach(q=>{
      const ok=q.pick>=0&&q.opts[q.pick][1];if(ok)right++;gradeQ(q.id,ok);
      by[q.tk]=by[q.tk]||[0,0];by[q.tk][1]++;if(ok)by[q.tk][0]++;
      q.el.querySelectorAll('.opt').forEach((x,k)=>{x.setAttribute('aria-disabled','true');x.classList.remove('sel');if(q.opts[k][1])x.classList.add('ok');else if(k===q.pick)x.classList.add('bad')});
      q.el.querySelector('.fb').innerHTML=(ok?'<b>Richtig.</b> ':q.pick<0?'<b>Nicht beantwortet.</b> ':'<b>Nicht ganz.</b> ')+esc(q.e)});
    addXp(right*10);S.exam.push({right,total:n,date:Date.now()});logAdd('Test',right+' von '+n);renderTop();renderNav();
    const rows=Object.keys(by).map(k=>`<tr><td>${esc(T(k).t)}</td><td>${by[k][0]} von ${by[k][1]}</td></tr>`).join('');
    $('#res').innerHTML=`<div class="card" style="margin-top:12px"><div class="big">${right} von ${n} richtig</div><p class="sub">${Math.round(right/n*100)} % · ${right*10} XP</p><table><tr><th>Thema</th><th>Ergebnis</th></tr>${rows}</table><button class="btn block" style="margin-top:14px" data-go='{"v":"exam"}'>Neuer Test</button></div>`;
    window.scrollTo({top:0})}
  sub.onclick=finish;tick();tm=setInterval(tick,1000);
}

/* ---------- Fortschritt ---------- */
const BADGES=[
 ['Erster Schritt','Sammle 50 XP',()=>Object.values(S.xp).reduce((a,b)=>a+b,0)>=50],
 ['Dranbleiber','3 Tage in Folge lernen',()=>streak()>=3],
 ['Wochenserie','7 Tage in Folge lernen',()=>streak()>=7],
 ['Kartenprofi','100 Karten bewertet',()=>S.stats.rev>=100],
 ['Treffsicher','50 Fragen richtig',()=>S.stats.ok>=50],
 ['Prüfungsreif','Test mit mindestens 80 %',()=>S.exam.some(e=>e.right/e.total>=.8)],
 ['Dreisterne','Ein Thema mit 3 Sternen',()=>TOPICS.some(t=>nStars(t.key)===3)],
 ['Rundum','Jedes Thema mindestens 1 Stern',()=>TOPICS.length&&TOPICS.every(t=>nStars(t.key)>=1)]];
function forecast(){
  const days=Object.keys(S.xp).sort();if(!days.length)return {txt:'Starte eine Runde, dann kann ich dein Tempo berechnen.',cls:''};
  const since=Math.max(1,Math.ceil((Date.now()-new Date(days[0]+'T00:00:00'))/DAY)+1),o=overall();
  if(o>=70)return {txt:'Du bist über 70 %. Weiter wiederholen, damit es hält.',cls:'ok'};
  const rate=o/since;if(rate<=0)return {txt:'Noch kein messbarer Fortschritt.',cls:''};
  const need=Math.ceil((70-o)/rate),end=new Date(Date.now()+need*DAY),dl=PLANS.filter(p=>isOpen(p.id)).map(p=>daysLeft(p.end)).sort((a,b)=>a-b)[0];
  const okTxt=dl==null?'':need<=dl?' Das passt vor den nächsten Termin.':' Das ist knapp, ein paar Minuten mehr pro Tag helfen.';
  return {txt:`Bei deinem Tempo erreichst du 70 % am ${end.toLocaleDateString('de-DE')}.${okTxt}`,cls:need<=(dl??99)?'ok':'warn'};
}
function prog(){
  const cells=[];const today=new Date();today.setHours(0,0,0,0);
  const start=new Date(today);start.setDate(start.getDate()-83-((today.getDay()+6)%7));
  for(let i=0;i<84+((today.getDay()+6)%7)+1;i++){const d=new Date(start);d.setDate(start.getDate()+i);if(d>today)break;const x=S.xp[dkey(d)]||0;cells.push([d,x])}
  const lvl=x=>x<=0?0:x<S.goal*.5?1:x<S.goal?2:x<S.goal*2?3:4;
  const fc=forecast();
  const rows=TOPICS.slice().sort((a,b)=>mastery(a.key)-mastery(b.key)).map(t=>`<tr class="link" tabindex="0" role="button" data-go='{"v":"topic","k":"${t.key}"}'><td>${esc(t.t)}</td><td class="num">${Math.round((avgL(S.d,t.c)||0)*100)}%</td><td class="num">${Math.round((avgL(S.q,t.q)||0)*100)}%</td><td>${starsHtml(nStars(t.key))}</td></tr>`).join('');
  const wk=[];for(let k=6;k>=0;k--){const d=new Date();d.setDate(d.getDate()-k);wk.push([d.toLocaleDateString('de-DE',{weekday:'short'}),S.xp[dkey(d)]||0])}
  const mx=Math.max(S.goal,...wk.map(w=>w[1])),total=Object.values(S.xp).reduce((a,b)=>a+b,0);
  const acc=S.stats.ans?Math.round(S.stats.ok/S.stats.ans*100):0;
  app.innerHTML=`<h1>Fortschritt</h1>
  <div class="card hero" style="margin:14px 0"><div><b>Gesamtstand</b><p class="sub" style="margin:4px 0 0">${TOPICS.length} Themen · ${allC().length} Karten · ${allQ().length} Fragen</p></div>${ring(overall()/100,overall()+' %','gelernt')}</div>
  <div class="card ${fc.cls}"><b>Prognose</b><p class="sub" style="margin:4px 0 0">${fc.txt}</p></div>
  <div class="tiles" style="margin-top:12px"><div class="tile"><b>${streak()}</b><span>Tage Serie</span></div><div class="tile"><b>${total}</b><span>XP gesamt</span></div><div class="tile"><b>${S.stats.rev}</b><span>Karten bewertet</span></div><div class="tile"><b>${acc} %</b><span>Trefferquote Quiz</span></div></div>
  <h2>Pläne</h2><div class="stack">${PLANS.map(planCard).join('')}</div>
  <h2>Lerntage</h2><div class="card"><div class="heat">${cells.map(([d,x])=>`<i class="h${lvl(x)}" title="${d.toLocaleDateString('de-DE')}: ${x} XP"></i>`).join('')}</div><p class="sub" style="margin:8px 0 0">Die letzten 12 Wochen. Je dunkler, desto mehr XP.</p></div>
  <h2>Diese Woche</h2><div class="card"><div class="wk">${wk.map(([l,x])=>`<div><span>${x}</span><i style="height:${x/mx*60}px"></i><span>${l}</span></div>`).join('')}</div></div>
  <h2>Themen im Detail</h2><div class="card scroll"><table><tr><th>Thema</th><th>Karten</th><th>Quiz</th><th>Sterne</th></tr>${rows}</table></div>
  <h2>Abzeichen</h2><div class="badges">${BADGES.map(([n,d,f])=>{const u=f();return `<div class="badge ${u?'on':''}"><b>${u?'★ ':''}${n}</b><span>${d}</span></div>`}).join('')}</div>
  <h2>Aktivität</h2>${S.log.length?`<div class="stack">${S.log.slice(0,12).map(e=>`<div class="card sp"><div><b>${esc(e.label)}</b><div class="sub">${new Date(e.t).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div></div><span class="tag">${esc(e.res)}</span></div>`).join('')}</div>`:'<p class="sub">Noch keine Aktivität.</p>'}`;
}

/* ---------- Glossar ---------- */
function gloss(){
  app.innerHTML=`<button class="back" data-go='{"v":"more"}'>‹ Mehr</button><h1>Glossar</h1><input id="gs" class="inp" type="search" placeholder="Begriff suchen" autocomplete="off"><div id="gl" class="stack" style="margin-top:14px"></div>`;
  const all=allC(),draw=q=>{q=q.trim().toLowerCase();const r=all.filter(c=>!q||c.f.toLowerCase().includes(q)||c.b.toLowerCase().includes(q));
    $('#gl').innerHTML=r.length?r.map(c=>`<div class="card"><b>${esc(c.f)}</b><p style="margin:4px 0 6px">${esc(c.b)}</p><span class="tag">${esc(T(c.tk).t)}</span></div>`).join(''):'<p class="sub">Nichts gefunden.</p>'};
  $('#gs').oninput=e=>draw(e.target.value);draw('');
}

/* ---------- Mehr und Einstellungen ---------- */
function more(){
  app.innerHTML=`<h1>Mehr</h1><div class="stack" style="margin-top:14px">
  <div class="card tcard lnk" tabindex="0" role="button" data-go='{"v":"exam"}'><div class="mid"><span class="tt">Tests</span><span class="sub">Gemischte Prüfung mit Zeitlimit</span></div></div>
  <div class="card tcard lnk" tabindex="0" role="button" data-go='{"v":"gloss"}'><div class="mid"><span class="tt">Glossar</span><span class="sub">Alle Begriffe durchsuchen</span></div></div>
  <div class="card tcard lnk" tabindex="0" role="button" data-go='{"v":"settings"}'><div class="mid"><span class="tt">Einstellungen</span><span class="sub">Tagesziel, Darstellung, Sicherung</span></div></div></div>`;
}
function settings(){
  app.innerHTML=`<button class="back" data-go='{"v":"more"}'>‹ Mehr</button><h1>Einstellungen</h1>
  <h2>Tagesziel</h2><div class="seg" id="goal">${[30,50,100].map(g=>`<button data-g="${g}" aria-pressed="${S.goal===g}">${g} XP</button>`).join('')}</div>
  <h2>Darstellung</h2><div class="seg" id="theme">${[['auto','Automatisch'],['light','Hell'],['dark','Dunkel']].map(([k,l])=>`<button data-t="${k}" aria-pressed="${S.theme===k}">${l}</button>`).join('')}</div>
  <h2>Sicherung</h2><p class="sub">Dein Fortschritt liegt auf diesem Gerät. Kopiere die Sicherung, um ihn auf ein anderes Gerät zu übertragen.</p>
  <div class="row"><button class="btn alt" id="exp">Sicherung kopieren</button><button class="btn alt" id="imp">Sicherung einlesen</button></div>
  <textarea id="bk" class="inp" rows="4" placeholder="Hier steht die Sicherung. Zum Einlesen einfügen und auf Einlesen tippen." style="margin-top:10px"></textarea><p class="sub" id="msg"></p>
  <div id="inst"></div>
  <h2>Zurücksetzen</h2><button class="btn alt" id="rst">Gesamten Fortschritt löschen</button>`;
  $('#goal').onclick=e=>{const g=+e.target.dataset.g;if(g){S.goal=g;save();settings();renderTop()}};
  $('#theme').onclick=e=>{const t=e.target.dataset.t;if(t){S.theme=t;save();applyTheme();settings()}};
  $('#exp').onclick=async()=>{const s=JSON.stringify(S);$('#bk').value=s;$('#bk').select();try{await navigator.clipboard.writeText(s);$('#msg').textContent='Sicherung kopiert.'}catch(e){$('#msg').textContent='Markiert, bitte selbst kopieren.'}};
  $('#imp').onclick=()=>{try{const o=JSON.parse($('#bk').value);if(!o||typeof o.q!=='object'||typeof o.xp!=='object')throw 0;Object.assign(S,o);save();$('#msg').textContent='Sicherung eingelesen.';renderTop();renderNav()}catch(e){$('#msg').textContent='Das war keine gültige Sicherung.'}};
  let armed=false;$('#rst').onclick=e=>{if(!armed){armed=true;e.target.textContent='Wirklich alles löschen? Nochmal tippen.';return}
    S={v:3,q:{},d:{},best:{},exam:[],xp:{},log:[],last:null,goal:S.goal,theme:S.theme,stats:{rev:0,ans:0,ok:0},updated:0};save();go({v:'home'})};
  const inst=$('#inst');
  if(deferredInstall){inst.innerHTML='<h2>Installieren</h2><button class="btn" id="ib">Als App installieren</button>';$('#ib').onclick=async()=>{deferredInstall.prompt();deferredInstall=null;inst.innerHTML=''}}
  else if(/iPad|iPhone|iPod/.test(navigator.userAgent))inst.innerHTML='<h2>Installieren</h2><p class="sub">In Safari auf Teilen tippen und „Zum Home-Bildschirm“ wählen.</p>';
}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});
applyTheme();render();initDb();
try{if('serviceWorker' in navigator&&location.protocol.startsWith('http')&&!window.claude)navigator.serviceWorker.register('sw.js')}catch(e){}
