(() => {
  'use strict';

  const API='https://admin.vmradio.fr/api/app-auth';
  const USER_KEY='vmradioAccountUserV1';
  const TOP_NAME_KEY='vmradioTopTitresVoterNameV1';
  let currentUser=null;

  const clean=v=>String(v??'').trim();
  const displayName=u=>clean(u?.name||u?.display_name||u?.email?.split('@')?.[0]||'VM RADIO');
  const normalizeUser=u=>u?{...u,display_name:displayName(u)}:null;

  function syncAccountNameFields(user=currentUser){
    if(!user)return;
    const name=displayName(user);
    if(!name)return;
    const selectors=['#dedName','#vmreqName'];
    selectors.forEach(selector=>{
      const input=document.querySelector(selector);
      if(!input)return;
      if(!clean(input.value))input.value=name;
      input.dataset.vmAccountDefaultName=name;
    });
  }

  const saveSession=(user)=>{
    user=normalizeUser(user);
    try{
      localStorage.setItem(USER_KEY,JSON.stringify(user));
      localStorage.setItem(TOP_NAME_KEY,displayName(user));
    }catch{}
    currentUser=user;
    personalize(user);
    syncAccountNameFields(user);
  };
  const clearSession=()=>{try{localStorage.removeItem(USER_KEY)}catch{}currentUser=null};

  async function api(path,options={}){
    const headers={Accept:'application/json',...(options.headers||{})};
    if(options.body&&!headers['Content-Type'])headers['Content-Type']='application/json';
    const r=await fetch(API+path,{credentials:'include',cache:'no-store',...options,headers});
    const d=await r.json().catch(()=>({}));
    return{r,d};
  }

  function styles(){if(document.getElementById('vm-account-style'))return;const s=document.createElement('style');s.id='vm-account-style';s.textContent=`
#vm-account-overlay{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.78);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);font-family:Arial,Helvetica,sans-serif}#vm-account-overlay.open{display:flex}
#vm-account-card{width:min(100%,430px);padding:24px;border:1px solid rgba(184,92,255,.7);border-radius:24px;background:radial-gradient(circle at 50% 0,rgba(184,92,255,.16),transparent 42%),linear-gradient(145deg,#12091c,#07050c);box-shadow:0 20px 70px rgba(0,0,0,.65),0 0 30px rgba(184,92,255,.2);color:#fff}
#vm-account-card h2{margin:0;text-align:center;font-size:24px}#vm-account-card .sub{margin:8px 0 18px;text-align:center;color:#bdb4c8;font-size:12px;line-height:1.45}
.vm-account-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:15px;padding:4px;border:1px solid #352342;border-radius:12px;background:#09070e}.vm-account-tab{border:0;border-radius:9px;padding:10px;background:transparent;color:#a89faf;font-weight:800;cursor:pointer}.vm-account-tab.active{background:linear-gradient(135deg,#b85cff,#7428d5);color:#fff}
.vm-account-field{display:block;margin:10px 0}.vm-account-field span{display:block;margin:0 0 5px;color:#cfc7d6;font-size:10px}.vm-account-field input{width:100%;height:46px;border:1px solid #4d315d;border-radius:12px;background:#09070e;color:#fff;padding:0 13px;outline:none;box-sizing:border-box}.vm-account-field input:focus{border-color:#b85cff;box-shadow:0 0 0 3px rgba(184,92,255,.12)}
#vm-account-name-wrap.hidden{display:none}.vm-account-main{width:100%;margin-top:14px;border:0;border-radius:12px;padding:13px;background:linear-gradient(135deg,#c05cff,#7026d4);color:#fff;font-weight:900;cursor:pointer}.vm-account-main:disabled{opacity:.55;cursor:wait}#vm-account-status{min-height:18px;margin-top:10px;text-align:center;color:#d9a7ff;font-size:11px}.vm-account-note{margin-top:12px;color:#766e7e;text-align:center;font-size:9px;line-height:1.4}
#vm-account-badge{display:inline-flex;align-items:center;gap:6px;margin:7px auto 0;padding:6px 10px;border:1px solid rgba(184,92,255,.4);border-radius:999px;background:rgba(12,7,18,.82);color:#eadfff;font:800 10px/1 Arial,sans-serif;box-shadow:0 0 15px rgba(184,92,255,.12)}#vm-account-badge:before{content:'●';color:#b85cff;font-size:8px}
#vm-account-welcome-line{margin:8px 0 0;text-align:center;color:#d9a7ff;font-weight:900;font-size:14px}
`;document.head.appendChild(s)}

  function createModal(){
    styles();
    let o=document.getElementById('vm-account-overlay');if(o)return o;
    o=document.createElement('div');o.id='vm-account-overlay';
    o.innerHTML=`<section id="vm-account-card" role="dialog" aria-modal="true"><h2>Ton espace VM RADIO 💜</h2><p class="sub">Crée ton mini compte pour retrouver ton prénom, tes J’aime et tes notifications après une réinstallation.</p><div class="vm-account-tabs"><button class="vm-account-tab active" data-mode="register" type="button">Créer mon compte</button><button class="vm-account-tab" data-mode="login" type="button">Me connecter</button></div><label class="vm-account-field" id="vm-account-name-wrap"><span>Prénom ou pseudo</span><input id="vm-account-name" maxlength="40" autocomplete="nickname" placeholder="Ex. Valentin"></label><label class="vm-account-field"><span>Email</span><input id="vm-account-email" type="email" maxlength="180" autocomplete="email" placeholder="ton@email.fr"></label><label class="vm-account-field"><span>Mot de passe</span><input id="vm-account-password" type="password" minlength="8" autocomplete="current-password" placeholder="6 caractères minimum"></label><button class="vm-account-main" id="vm-account-submit" type="button">Créer mon compte</button><div id="vm-account-status"></div><div class="vm-account-note">Ton email sert uniquement à retrouver ton mini compte VM RADIO. Ton prénom/pseudo est celui affiché dans l'appli.</div></section>`;
    document.body.appendChild(o);
    let mode='register';
    const tabs=[...o.querySelectorAll('.vm-account-tab')],nameWrap=o.querySelector('#vm-account-name-wrap'),submit=o.querySelector('#vm-account-submit'),status=o.querySelector('#vm-account-status');
    function setMode(next){mode=next;tabs.forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));nameWrap.classList.toggle('hidden',mode==='login');submit.textContent=mode==='register'?'Créer mon compte':'Me connecter';status.textContent=''}
    tabs.forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
    submit.onclick=async()=>{
      const name=clean(o.querySelector('#vm-account-name').value),email=clean(o.querySelector('#vm-account-email').value),password=String(o.querySelector('#vm-account-password').value||'');
      if(mode==='register'&&name.length<2){status.textContent='Entre ton prénom ou ton pseudo.';return}
      if(!email||!password){status.textContent='Complète ton email et ton mot de passe.';return}
      submit.disabled=true;status.textContent=mode==='register'?'Création du compte…':'Connexion…';
      try{
        const payload=mode==='register'?{name,email,password}:{email,password};
        const {r,d}=await api(mode==='register'?'/register':'/login',{method:'POST',body:JSON.stringify(payload)});
        if(!r.ok||!d.ok)throw Error(d.error||'Impossible de continuer.');
        saveSession(d.user);
        o.classList.remove('open');
        showPersonalWelcome(d.user);
      }catch(e){status.textContent=String(e?.message||e)}finally{submit.disabled=false}
    };
    return o;
  }

  function openModal(){createModal().classList.add('open')}

  function personalize(user){
    if(!user)return;styles();
    const name=displayName(user);
    try{localStorage.setItem(TOP_NAME_KEY,name)}catch{}
    let badge=document.getElementById('vm-account-badge');
    if(!badge){badge=document.createElement('div');badge.id='vm-account-badge';const logo=document.querySelector('header img,.brand img,.logo img,img[alt*="VM RADIO" i]');const host=logo?.parentElement||document.querySelector('header,.brand,.logo')||document.body;if(host===document.body){badge.style.cssText+='position:fixed;top:8px;right:10px;z-index:9999'}host.appendChild(badge)}
    badge.textContent=name;
    const splash=document.getElementById('vmWelcomeSplash');
    if(splash&&!document.getElementById('vm-account-welcome-line')){const line=document.createElement('div');line.id='vm-account-welcome-line';line.textContent='Bienvenue '+name+' 💜';const target=splash.querySelector('h1,h2,.title')||splash.firstElementChild||splash;target.insertAdjacentElement('afterend',line)}
    syncAccountNameFields(user);
  }

  function showPersonalWelcome(user){
    const name=displayName(user);if(!name)return;
    let p=document.getElementById('vm-account-mini-welcome');if(p)p.remove();
    p=document.createElement('div');p.id='vm-account-mini-welcome';p.style.cssText='position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;padding:11px 16px;border:1px solid #8d3bcb;border-radius:14px;background:#100817;color:#fff;box-shadow:0 0 24px rgba(184,92,255,.28);font:900 13px Arial,sans-serif';p.textContent='Bienvenue sur VM RADIO, '+name+' 💜';document.body.appendChild(p);setTimeout(()=>p.remove(),3500)
  }

  async function restore(){
    try{
      const {r,d}=await api('/session');
      if(!r.ok||!d.ok||!d.authenticated||!d.user){clearSession();return false}
      saveSession(d.user);return true;
    }catch{clearSession();return false}
  }

  async function afterNotifications(){
    for(let i=0;i<120;i++){const n=document.getElementById('vm-notification-overlay');if(!n||!n.classList.contains('vm-show'))break;await new Promise(r=>setTimeout(r,250))}
    if(!await restore())openModal()
  }

  async function boot(){
    styles();
    let cached=null;try{cached=JSON.parse(localStorage.getItem(USER_KEY)||'null')}catch{}
    if(cached){currentUser=normalizeUser(cached);personalize(currentUser);syncAccountNameFields(currentUser)}
    setTimeout(afterNotifications,600)
  }

  const accountFieldObserver=new MutationObserver(()=>syncAccountNameFields());
  accountFieldObserver.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('vmradio:pagechange',()=>setTimeout(()=>syncAccountNameFields(),0));

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
