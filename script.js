const KEY='beurzen-v2';
let S={players:[],edit:true,reus:null,hist:[],flash:-1};
try{const r=localStorage.getItem(KEY);if(r)S=Object.assign(S,JSON.parse(r))}catch(e){}
S.flash=-1;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const $=id=>document.getElementById(id);
const esc=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lbl=n=>({1:'A',11:'V',12:'D',13:'R'}[n]||n);
function set(f){f();save();render()}

function render(){
  const a=$('app');
  if(S.edit||S.players.length<2){
    a.innerHTML=`<h1>Beurzen</h1><p>Wie speelt er mee? Tot 5 spelers.</p>
    <div class="row" style="margin-top:12px"><input id="nm" placeholder="Naam" maxlength="14" autocomplete="off" onkeydown="if(event.key==='Enter')addP()"><button class="pri" onclick="addP()">Toevoegen</button></div>
    ${S.players.map((p,i)=>`<div class="ed"><span>${esc(p.name)}</span><button onclick="delP(${i})" aria-label="Verwijder ${esc(p.name)}">✕</button></div>`).join('')}
    <button class="pri full" ${S.players.length<2?'disabled style="opacity:.4"':''} onclick="set(()=>S.edit=false)">Klaar</button>`;
    return;
  }
  a.innerHTML=`<div class="top"><h1>Verliezers</h1>
    <button class="reus" onclick="reusSheet()"><small>Beursreus</small><span class="big">${S.reus?lbl(S.reus):'kies'}</span></button></div>
    ${S.players.map((p,i)=>`<button class="pl ${S.flash===i?'flash':''}" onclick="lose(${i})"><span class="nm">${esc(p.name)}</span><span class="n">${p.v}</span></button>`).join('')}
    <div class="foot"><button onclick="undo()" ${S.hist.length?'':'style="opacity:.4"'}>Ongedaan maken</button><button onclick="set(()=>S.edit=true)">Spelers</button></div>
    <div class="foot"><button onclick="if(confirm('Alle verliezen op 0 zetten?'))set(()=>{S.players.forEach(p=>p.v=0);S.hist=[];S.reus=null})">Alles op 0</button></div>`;
}
function addP(){const v=$('nm').value.trim();if(!v||S.players.length>=5)return;set(()=>S.players.push({name:v,v:0}))}
function delP(i){set(()=>{S.players.splice(i,1);S.hist=[]})}
function lose(i){
  S.players[i].v++;S.hist.push(i);S.flash=i;save();render();
  if(navigator.vibrate)try{navigator.vibrate(40)}catch(e){}
  setTimeout(()=>{S.flash=-1;render()},350);
}
function undo(){if(!S.hist.length)return;set(()=>{const i=S.hist.pop();if(S.players[i])S.players[i].v=Math.max(0,S.players[i].v-1)})}
function reusSheet(){
  $('sheet').innerHTML=`<div class="sheet" onclick="if(event.target===this)$('sheet').innerHTML=''"><div>
  <h2 style="margin-top:0">Kies de beursreus</h2><p>Eindigt de verliezer op dit nummer, dan mag die zijn verliezen doorgeven.</p>
  <div class="grid">${Array.from({length:13},(_,i)=>i+1).map(n=>`<button class="${S.reus===n?'sel':''}" onclick="$('sheet').innerHTML='';set(()=>S.reus=${n})">${lbl(n)}</button>`).join('')}</div>
  <button class="full" onclick="$('sheet').innerHTML='';set(()=>S.reus=null)">Geen beursreus</button></div></div>`;
}
render();
