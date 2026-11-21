import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,updateDoc,addDoc,deleteDoc,collection,query,where,onSnapshot,getDocs} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";

const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lbl=n=>({1:'A',11:'V',12:'D',13:'R'}[n]||n);
const store=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}};
const load=k=>{try{return localStorage.getItem(k)}catch(e){return null}};

const S={user:null,name:'',view:'auth',mode:'login',code:null,game:null,players:[],losses:[],showReus:false,flash:null,stats:null,subs:[],ready:false};
const configured=!String(firebaseConfig.apiKey).startsWith('PLAK');
let auth,db;
if(configured){const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app)}

const toEmail=u=>u+'@beurzen.game';
const toPass=p=>p+'-beurzen';           // vult korte codes aan tot Firebase's minimum van 6 tekens
const validName=s=>/^[a-z0-9_]{3,16}$/.test(s);
const errMsg=x=>({
  'auth/email-already-in-use':'Die gebruikersnaam bestaat al.',
  'auth/invalid-credential':'Onbekende gebruiker of fout wachtwoord.',
  'auth/user-not-found':'Onbekende gebruiker.','auth/wrong-password':'Fout wachtwoord.',
  'auth/too-many-requests':'Te veel pogingen. Probeer later opnieuw.',
  'auth/network-request-failed':'Geen internet.',
  'permission-denied':'Geen toegang. Controleer de Firestore-regels.'
}[x.code]||('Er ging iets mis: '+(x.code||x.message)));

function unsubAll(){S.subs.forEach(f=>f());S.subs=[]}

if(configured){
  onAuthStateChanged(auth,u=>{
    unsubAll();S.ready=true;S.user=u;
    if(!u){S.view='auth';S.code=null;render();return}
    S.name=u.email.split('@')[0];
    const saved=load('beurzen-game');
    if(saved){getDoc(doc(db,'games',saved)).then(g=>g.exists()?enterGame(saved):(S.view='lobby',render())).catch(()=>{S.view='lobby';render()})}
    else{S.view='lobby';render()}
  });
}

function bar(){return `<div class="bar"><span>Ingelogd als <b>${esc(S.name)}</b></span><span class="row"><button data-act="stats">Mijn verliezen</button><button data-act="logout">Uitloggen</button></span></div>`}

function render(){
  const a=$('app');
  if(!configured){a.innerHTML=`<h1>Beurzen</h1><p>Firebase is nog niet ingesteld. Vul <b>firebase-config.js</b> in (zie SETUP.md).</p>`;return}
  if(!S.ready){a.innerHTML='<h1>Beurzen</h1><p>Laden…</p>';return}
  if(S.view==='auth'){
    const reg=S.mode==='register';
    a.innerHTML=`<h1>Beurzen</h1><p>${reg?'Maak een account met een gebruikersnaam en een korte code.':'Log in om mee te spelen en je verliezen bij te houden.'}</p>
    <div class="seg"><button data-act="mode" data-m="login" class="${reg?'':'pri'}">Inloggen</button><button data-act="mode" data-m="register" class="${reg?'pri':''}">Account maken</button></div>
    <input id="u" placeholder="Gebruikersnaam" autocapitalize="none" autocomplete="username" maxlength="16">
    <input id="p" type="password" placeholder="Korte code (min. 4 tekens)" autocomplete="${reg?'new-password':'current-password'}" style="margin-top:8px;width:100%">
    <div class="err" id="err"></div>
    <button class="pri full" data-act="auth">${reg?'Account maken':'Inloggen'}</button>`;
  }else if(S.view==='lobby'){
    a.innerHTML=`${bar()}<h1>Spel</h1><p>Start een nieuw spel of voer de code van een vriend in.</p>
    <button class="pri full" data-act="create">Nieuw spel starten</button>
    <h2>Of doe mee</h2><div class="row"><input id="c" placeholder="Spelcode" maxlength="4" autocapitalize="characters" autocomplete="off"><button data-act="join">Meedoen</button></div>
    <div class="err" id="err"></div>`;
  }else if(S.view==='game'){
    const counts={};S.losses.forEach(l=>counts[l.uid]=(counts[l.uid]||0)+1);
    const r=S.game&&S.game.reus;
    a.innerHTML=`${bar()}<div class="top"><div><small style="color:var(--mu)">Spelcode</small><div class="code">${esc(S.code)}</div></div>
    <button class="reus" data-act="reus"><small>Beursreus</small><span class="big">${r?lbl(r):'kies'}</span></button></div>
    ${S.players.map(p=>`<button class="pl ${S.flash===p.uid?'flash':''}" data-act="lose" data-uid="${p.uid}"><span class="nm">${esc(p.username)}${p.uid===S.user.uid?' (jij)':''}</span><span class="n">${counts[p.uid]||0}</span></button>`).join('')}
    <div class="foot"><button data-act="undo">Ongedaan maken</button><button data-act="leave">Spel verlaten</button></div>
    ${S.showReus?`<div class="sheet" data-act="closereus"><div><h2 style="margin-top:0">Kies de beursreus</h2><div class="grid">${Array.from({length:13},(_,i)=>i+1).map(n=>`<button data-act="setreus" data-n="${n}" class="${r===n?'sel':''}">${lbl(n)}</button>`).join('')}</div><button class="full" data-act="setreus" data-n="0">Geen beursreus</button></div></div>`:''}`;
  }else if(S.view==='stats'){
    const s=S.stats;
    a.innerHTML=`${bar()}<h1>Mijn verliezen</h1>${!s?'<p>Laden…</p>':`<div class="tot">${s.total}</div><p>verliezen in totaal, ${s.games.length} spel(len)</p>
    <h2>Per spel</h2>${s.games.length?s.games.map(g=>`<div class="stat"><span>${esc(g.code)} <small style="color:var(--mu)">${g.date}</small></span><b>${g.n}</b></div>`).join(''):'<p>Nog geen verliezen. Dat is een goed teken.</p>'}`}
    <button class="full" data-act="back">Terug</button>`;
  }
}

async function submitAuth(){
  const u=$('u').value.trim().toLowerCase(),p=$('p').value,e=$('err');
  if(!validName(u)){e.textContent='Gebruikersnaam: 3 tot 16 tekens, enkel letters, cijfers of _.';return}
  if(p.length<4){e.textContent='De code moet minstens 4 tekens hebben.';return}
  e.textContent='';
  try{
    if(S.mode==='register'){
      const c=await createUserWithEmailAndPassword(auth,toEmail(u),toPass(p));
      await setDoc(doc(db,'users',c.user.uid),{username:u,createdAt:Date.now()}).catch(()=>{});
    }else await signInWithEmailAndPassword(auth,toEmail(u),toPass(p));
  }catch(x){e.textContent=errMsg(x)}
}

async function joinGame(code){
  const e=$('err');
  try{
    const g=await getDoc(doc(db,'games',code));
    if(!g.exists()){if(e)e.textContent='Spel niet gevonden.';return}
    const pr=doc(db,'games',code,'players',S.user.uid);
    if(!(await getDoc(pr)).exists())await setDoc(pr,{username:S.name,joinedAt:Date.now()});
    enterGame(code);
  }catch(x){if(e)e.textContent=errMsg(x)}
}

async function createGame(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  try{
    for(let t=0;t<5;t++){
      const code=Array.from({length:4},()=>A[Math.floor(Math.random()*A.length)]).join('');
      if((await getDoc(doc(db,'games',code))).exists())continue;
      await setDoc(doc(db,'games',code),{code,host:S.user.uid,reus:null,createdAt:Date.now()});
      return joinGame(code);
    }
  }catch(x){const e=$('err');if(e)e.textContent=errMsg(x)}
}

function enterGame(code){
  unsubAll();S.code=code;store('beurzen-game',code);S.view='game';S.game=null;S.players=[];S.losses=[];S.showReus=false;
  S.subs.push(onSnapshot(doc(db,'games',code),s=>{S.game=s.data()||null;render()}));
  S.subs.push(onSnapshot(collection(db,'games',code,'players'),s=>{S.players=s.docs.map(d=>({uid:d.id,...d.data()})).sort((a,b)=>a.joinedAt-b.joinedAt);render()}));
  S.subs.push(onSnapshot(query(collection(db,'losses'),where('gameCode','==',code)),s=>{S.losses=s.docs.map(d=>({id:d.id,...d.data()}));render()}));
  render();
}

function leave(){unsubAll();store('beurzen-game',null);S.code=null;S.view='lobby';render()}

async function lose(uid){
  const p=S.players.find(x=>x.uid===uid);if(!p)return;
  S.flash=uid;render();setTimeout(()=>{S.flash=null;render()},350);
  if(navigator.vibrate)try{navigator.vibrate(40)}catch(e){}
  try{await addDoc(collection(db,'losses'),{by:S.user.uid,uid,username:p.username,gameCode:S.code,at:Date.now()})}catch(x){alert(errMsg(x))}
}
async function undo(){
  const mine=S.losses.filter(l=>l.by===S.user.uid).sort((a,b)=>b.at-a.at)[0];
  if(mine)try{await deleteDoc(doc(db,'losses',mine.id))}catch(x){alert(errMsg(x))}
}

async function showStats(){
  unsubAll();S.view='stats';S.stats=null;render();
  try{
    const s=await getDocs(query(collection(db,'losses'),where('uid','==',S.user.uid)));
    const by={};
    s.docs.forEach(d=>{const l=d.data();const g=by[l.gameCode]||(by[l.gameCode]={code:l.gameCode,n:0,at:0});g.n++;g.at=Math.max(g.at,l.at)});
    const games=Object.values(by).sort((a,b)=>b.at-a.at).map(g=>({...g,date:new Date(g.at).toLocaleDateString('nl-BE')}));
    S.stats={total:s.size,games};
  }catch(x){S.stats={total:0,games:[]};alert(errMsg(x))}
  render();
}

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t)return;
  if(t.classList.contains('sheet')&&e.target!==t)return;
  const a=t.dataset.act;
  if(a==='mode'){S.mode=t.dataset.m;render()}
  else if(a==='auth')submitAuth();
  else if(a==='logout'){store('beurzen-game',null);signOut(auth)}
  else if(a==='create')createGame();
  else if(a==='join'){const c=$('c').value.trim().toUpperCase();if(c)joinGame(c)}
  else if(a==='lose')lose(t.dataset.uid);
  else if(a==='undo')undo();
  else if(a==='leave')leave();
  else if(a==='stats')showStats();
  else if(a==='back'){S.view=S.code?'game':'lobby';S.code?enterGame(S.code):render()}
  else if(a==='reus'){S.showReus=true;render()}
  else if(a==='closereus'){S.showReus=false;render()}
  else if(a==='setreus'){const n=+t.dataset.n;S.showReus=false;updateDoc(doc(db,'games',S.code),{reus:n||null}).catch(x=>alert(errMsg(x)));render()}
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  if(e.target.id==='p')submitAuth();
  else if(e.target.id==='c'){const c=e.target.value.trim().toUpperCase();if(c)joinGame(c)}
});
render();
