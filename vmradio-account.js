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
    try{window.dispatchEvent(new CustomEvent('vmradio:accountchange',{detail:{user}}))}catch{}
  };
  const clearSession=()=>{try{localStorage.removeItem(USER_KEY)}catch{}currentUser=null;try{window.dispatchEvent(new CustomEvent('vmradio:accountchange',{detail:{user:null}}))}catch{}};

  async function api(path,options={}){
    const headers={Accept:'application/json',...(options.headers||{})};
    if(options.body&&!headers['Content-Type'])headers['Content-Type']='application/json';
    const r=await fetch(API+path,{credentials:'include',cache:'no-store',...options,headers});
    const d=await r.json().catch(()=>({}));
    return{r,d};
  }

  function styles(){if(document.getElementById('vm-account-style'))return;const s=document.createElement('style');s.id='vm-account-style';s.textContent=`
#vm-account-overlay{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(24,12,32,.74);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:Arial,Helvetica,sans-serif}#vm-account-overlay.open{display:flex}
#vm-account-card{width:min(100%,430px);max-height:calc(100vh - 32px);overflow:auto;padding:24px;border:1px solid rgba(216,180,254,.9);border-radius:24px;background:radial-gradient(circle at 50% 0,rgba(216,180,254,.28),transparent 44%),linear-gradient(145deg,#2a1738,#170e20);box-shadow:0 20px 70px rgba(0,0,0,.58),0 0 32px rgba(216,180,254,.30);color:#fff}
#vm-account-card h2{margin:0;text-align:center;font-size:24px;color:#f7efff;text-shadow:0 0 16px rgba(216,180,254,.28)}#vm-account-card .sub{margin:8px 0 18px;text-align:center;color:#dbcdea;font-size:12px;line-height:1.45}
.vm-account-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:15px;padding:4px;border:1px solid rgba(216,180,254,.34);border-radius:12px;background:rgba(26,14,35,.75)}.vm-account-tab{border:0;border-radius:9px;padding:10px;background:transparent;color:#d7c5e4;font-weight:800;cursor:pointer}.vm-account-tab.active{background:linear-gradient(135deg,#d8b4fe,#b76cf2);color:#2b1736;box-shadow:0 0 18px rgba(216,180,254,.28)}
.vm-account-field{display:block;margin:10px 0}.vm-account-field span{display:block;margin:0 0 5px;color:#eadff1;font-size:10px}.vm-account-field input{width:100%;height:46px;border:1px solid rgba(216,180,254,.42);border-radius:12px;background:rgba(18,10,24,.82);color:#fff;padding:0 13px;outline:none;box-sizing:border-box}.vm-account-field input::placeholder{color:#967fa5}.vm-account-field input:focus{border-color:#d8b4fe;box-shadow:0 0 0 3px rgba(216,180,254,.14)}
#vm-account-name-wrap.hidden{display:none}.vm-account-main{width:100%;margin-top:14px;border:0;border-radius:12px;padding:13px;background:linear-gradient(135deg,#e0c3fc,#c084fc);color:#281532;font-weight:900;cursor:pointer;box-shadow:0 0 20px rgba(216,180,254,.25)}.vm-account-main:hover{filter:brightness(1.04)}.vm-account-main:disabled{opacity:.55;cursor:wait}#vm-account-status{min-height:18px;margin-top:10px;text-align:center;color:#e2c7ff;font-size:11px}.vm-account-note{margin-top:12px;color:#bcaec5;text-align:center;font-size:9px;line-height:1.45}
.vm-account-privacy{margin-top:12px;border:1px solid rgba(216,180,254,.28);border-radius:12px;background:rgba(216,180,254,.07);overflow:hidden}.vm-account-privacy summary{list-style:none;cursor:pointer;padding:10px 11px;color:#ead6ff;font-size:10px;font-weight:900;text-align:center}.vm-account-privacy summary::-webkit-details-marker{display:none}.vm-account-privacy summary:before{content:'🔒 ';}.vm-account-privacy[open] summary{border-bottom:1px solid rgba(216,180,254,.18)}.vm-account-privacy-body{padding:10px 12px;color:#c8b9d1;font-size:9px;line-height:1.55}.vm-account-privacy-body p{margin:0 0 8px}.vm-account-privacy-body p:last-child{margin-bottom:0}.vm-account-privacy-body strong{color:#f1e6f7}.vm-account-privacy-body a{color:#e0c3fc;text-decoration:underline;text-underline-offset:2px}.vm-account-legal-mini{margin-top:9px;text-align:center;color:#94859f;font-size:8px;line-height:1.4}
#vm-account-badge{display:inline-flex;align-items:center;gap:6px;margin:7px auto 0;padding:6px 10px;border:1px solid rgba(216,180,254,.42);border-radius:999px;background:rgba(36,20,47,.88);color:#f0e3ff;font:800 10px/1 Arial,sans-serif;box-shadow:0 0 15px rgba(216,180,254,.16)}#vm-account-badge:before{content:'●';color:#d8b4fe;font-size:8px}
#vm-account-welcome-line{margin:8px 0 0;text-align:center;color:#e0c3fc;font-weight:900;font-size:14px}
`;document.head.appendChild(s)}

  function createModal(){
    styles();
    let o=document.getElementById('vm-account-overlay');if(o)return o;
    o=document.createElement('div');o.id='vm-account-overlay';
    o.innerHTML=`<section id="vm-account-card" role="dialog" aria-modal="true"><h2>Ton espace VM RADIO 💜</h2><p class="sub">Crée ton mini compte pour retrouver ton prénom, tes J’aime et tes notifications après une réinstallation.</p><div class="vm-account-tabs"><button class="vm-account-tab active" data-mode="register" type="button">Créer mon compte</button><button class="vm-account-tab" data-mode="login" type="button">Me connecter</button></div><label class="vm-account-field" id="vm-account-name-wrap"><span>Prénom ou pseudo</span><input id="vm-account-name" maxlength="40" autocomplete="nickname" placeholder="Ex. Valentin"></label><label class="vm-account-field"><span>Email</span><input id="vm-account-email" type="email" maxlength="180" autocomplete="email" placeholder="ton@email.fr"></label><label class="vm-account-field"><span>Mot de passe</span><input id="vm-account-password" type="password" minlength="8" autocomplete="current-password" placeholder="8 caractères minimum"></label><button class="vm-account-main" id="vm-account-submit" type="button">Créer mon compte</button><div id="vm-account-status"></div><div class="vm-account-note">Ton adresse e-mail sert à créer et retrouver ton compte. Ton prénom/pseudo personnalise l’application. Le mot de passe est conservé sous forme sécurisée et non en clair.</div><details class="vm-account-privacy"><summary>Protection de vos données</summary><div class="vm-account-privacy-body"><p><strong>Responsable du traitement :</strong> VM RADIO — contact@vmradio.fr.</p><p><strong>Données utilisées :</strong> prénom ou pseudo, adresse e-mail, données nécessaires à l’authentification et informations liées au compte.</p><p><strong>Finalités :</strong> création, sécurisation et gestion du compte, personnalisation de l’application et conservation des préférences associées au compte.</p><p><strong>Durée :</strong> les données du compte sont conservées tant que le compte existe, sauf obligation légale imposant une conservation différente.</p><p><strong>Vos droits :</strong> vous pouvez demander l’accès, la rectification, l’effacement, la limitation ou, lorsque les conditions sont réunies, la portabilité de vos données. Vous pouvez modifier ou supprimer votre compte depuis l’application et contacter VM RADIO à contact@vmradio.fr.</p><p>Vous pouvez également introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.</p><p>Le traitement des données personnelles est encadré notamment par le <strong>Règlement (UE) 2016/679 (RGPD)</strong> et la <strong>loi n° 78-17 du 6 janvier 1978 modifiée, dite « Informatique et Libertés »</strong>.</p></div></details><div class="vm-account-legal-mini">En créant un compte, vous reconnaissez avoir pris connaissance des informations relatives au traitement de vos données personnelles.</div></section>`;
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
    p=document.createElement('div');p.id='vm-account-mini-welcome';p.style.cssText='position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;padding:11px 16px;border:1px solid #d8b4fe;border-radius:14px;background:#271631;color:#fff;box-shadow:0 0 24px rgba(216,180,254,.28);font:900 13px Arial,sans-serif';p.textContent='Bienvenue sur VM RADIO, '+name+' 💜';document.body.appendChild(p);setTimeout(()=>p.remove(),3500)
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
