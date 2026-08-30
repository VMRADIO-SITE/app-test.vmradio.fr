(() => {
  'use strict';

  if(window.__VMRADIO_ACCOUNT_MENU__)return;
  window.__VMRADIO_ACCOUNT_MENU__=true;

  const API='https://admin.vmradio.fr/api/app-auth';
  const USER_KEY='vmradioAccountUserV1';
  const TOP_NAME_KEY='vmradioTopTitresVoterNameV1';
  let user=null;

  const clean=v=>String(v??'').trim();
  const displayName=u=>clean(u?.name||u?.display_name||u?.email?.split('@')?.[0]||'VM RADIO');

  function readUser(){
    try{return JSON.parse(localStorage.getItem(USER_KEY)||'null')}catch{return null}
  }

  function saveUser(next){
    if(!next)return;
    user={...next,display_name:displayName(next)};
    try{
      localStorage.setItem(USER_KEY,JSON.stringify(user));
      localStorage.setItem(TOP_NAME_KEY,displayName(user));
    }catch{}
  }

  function clearLocalAccount(){
    try{
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOP_NAME_KEY);
    }catch{}
  }

  async function api(path,options={}){
    const headers={Accept:'application/json',...(options.headers||{})};
    if(options.body&&!headers['Content-Type'])headers['Content-Type']='application/json';
    const r=await fetch(API+path,{credentials:'include',cache:'no-store',...options,headers});
    const d=await r.json().catch(()=>({}));
    return{r,d};
  }

  function injectStyles(){
    if(document.getElementById('vm-account-menu-style'))return;
    const s=document.createElement('style');
    s.id='vm-account-menu-style';
    s.textContent=`
#vm-account-home{width:100%;display:flex;flex-direction:column;align-items:center;position:relative;margin:-1px auto 9px;z-index:30}
#vm-account-home-trigger{appearance:none;border:1px solid rgba(184,92,255,.36);border-radius:999px;background:rgba(12,7,18,.84);color:#eadfff;display:inline-flex;align-items:center;gap:7px;padding:7px 11px;box-shadow:0 0 16px rgba(184,92,255,.13);font:800 10px/1 Arial,sans-serif;cursor:pointer;max-width:90%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vm-account-home-trigger .vm-dot{width:7px;height:7px;border-radius:50%;background:#b85cff;box-shadow:0 0 8px rgba(184,92,255,.8);flex:0 0 auto}
#vm-account-home-trigger .vm-chevron{font-size:10px;opacity:.75;transition:transform .22s ease}
#vm-account-home.open #vm-account-home-trigger .vm-chevron{transform:rotate(180deg)}
#vm-account-home-panel{width:min(92%,360px);max-height:0;opacity:0;overflow:hidden;transform:translateY(-6px);pointer-events:none;transition:max-height .28s ease,opacity .22s ease,transform .28s ease;margin-top:0}
#vm-account-home.open #vm-account-home-panel{max-height:500px;opacity:1;transform:translateY(0);pointer-events:auto;margin-top:8px}
.vm-account-panel-card{border:1px solid rgba(184,92,255,.36);border-radius:17px;background:linear-gradient(155deg,#160b21,#09060f);box-shadow:0 18px 45px rgba(0,0,0,.42),0 0 22px rgba(184,92,255,.12);padding:12px;color:#fff}
.vm-account-summary{text-align:center;padding:3px 4px 10px;border-bottom:1px solid rgba(255,255,255,.07)}
.vm-account-summary b{display:block;font-size:13px;color:#f1e8f7}.vm-account-summary small{display:block;margin-top:4px;color:#9f95a7;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vm-account-actions{display:grid;gap:7px;margin-top:9px}.vm-account-action{width:100%;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.045);color:#fff;padding:10px 11px;text-align:left;font:800 10px Arial,sans-serif;cursor:pointer}.vm-account-action:hover{background:rgba(184,92,255,.11)}.vm-account-action.danger{color:#ffb9c5;border-color:rgba(255,90,120,.22)}.vm-account-action.delete{color:#ff8fa4;border-color:rgba(255,72,105,.35);background:rgba(105,18,38,.13)}.vm-account-action.delete:hover{background:rgba(145,24,51,.2)}
#vm-account-edit{display:none;margin-top:9px;padding-top:9px;border-top:1px solid rgba(255,255,255,.07)}#vm-account-edit.open{display:block}
#vm-account-edit label{display:block;margin:7px 0;color:#cfc7d6;font:700 9px Arial,sans-serif}#vm-account-edit input{width:100%;height:39px;margin-top:4px;border:1px solid #493057;border-radius:10px;background:#08060d;color:#fff;padding:0 10px;outline:none;font-size:11px;box-sizing:border-box}#vm-account-edit input:focus{border-color:#b85cff;box-shadow:0 0 0 3px rgba(184,92,255,.1)}
.vm-account-edit-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.vm-account-edit-buttons button{border:0;border-radius:10px;padding:9px;font:800 9px Arial,sans-serif;cursor:pointer}.vm-account-save{background:linear-gradient(135deg,#c05cff,#7026d4);color:#fff}.vm-account-cancel{background:#211629;color:#d9d0df}
#vm-account-menu-status{min-height:14px;text-align:center;margin-top:7px;color:#d9a7ff;font:700 9px Arial,sans-serif}
#vm-account-badge{display:none!important}
`;
    document.head.appendChild(s);
  }

  function homeLogo(){
    const candidates=[
      document.querySelector('.top img'),
      document.querySelector('header img'),
      document.querySelector('.brand img'),
      document.querySelector('.logo img'),
      [...document.querySelectorAll('img')].find(img=>/vm\s*radio/i.test(img.alt||'')&&!img.closest('#vmWelcomeSplash'))
    ].filter(Boolean);
    return candidates[0]||null;
  }

  function ensureMenu(){
    injectStyles();
    if(!user)user=readUser();
    if(!user)return null;

    let root=document.getElementById('vm-account-home');
    if(!root){
      root=document.createElement('div');
      root.id='vm-account-home';
      root.innerHTML=`
        <button id="vm-account-home-trigger" type="button" aria-expanded="false">
          <span class="vm-dot"></span><span id="vm-account-home-name"></span><span class="vm-chevron">⌄</span>
        </button>
        <div id="vm-account-home-panel">
          <div class="vm-account-panel-card">
            <div class="vm-account-summary"><b id="vm-account-panel-name"></b><small id="vm-account-panel-email"></small></div>
            <div class="vm-account-actions">
              <button class="vm-account-action" id="vm-account-edit-open" type="button">✎ Modifier mes informations</button>
              <button class="vm-account-action danger" id="vm-account-logout" type="button">↪ Se déconnecter</button>
              <button class="vm-account-action delete" id="vm-account-delete" type="button">🗑 Supprimer mon compte</button>
            </div>
            <div id="vm-account-edit">
              <label>Prénom ou pseudo<input id="vm-account-edit-name" maxlength="40" autocomplete="nickname"></label>
              <label>Adresse e-mail<input id="vm-account-edit-email" type="email" maxlength="180" autocomplete="email"></label>
              <div class="vm-account-edit-buttons"><button class="vm-account-cancel" type="button">Annuler</button><button class="vm-account-save" type="button">Enregistrer</button></div>
            </div>
            <div id="vm-account-menu-status"></div>
          </div>
        </div>`;

      const logo=homeLogo();
      const host=logo?.parentElement;
      if(host)host.insertAdjacentElement('afterend',root);else document.querySelector('.app')?.prepend(root);

      const trigger=root.querySelector('#vm-account-home-trigger');
      const edit=root.querySelector('#vm-account-edit');
      const status=root.querySelector('#vm-account-menu-status');
      trigger.onclick=()=>{
        const open=!root.classList.contains('open');
        root.classList.toggle('open',open);
        trigger.setAttribute('aria-expanded',open?'true':'false');
        if(!open){edit.classList.remove('open');status.textContent=''}
      };
      root.querySelector('#vm-account-edit-open').onclick=()=>{
        edit.classList.add('open');
        root.querySelector('#vm-account-edit-name').value=displayName(user);
        root.querySelector('#vm-account-edit-email').value=clean(user?.email);
        status.textContent='';
      };
      root.querySelector('.vm-account-cancel').onclick=()=>{edit.classList.remove('open');status.textContent=''};
      root.querySelector('.vm-account-save').onclick=async()=>{
        const name=clean(root.querySelector('#vm-account-edit-name').value);
        const email=clean(root.querySelector('#vm-account-edit-email').value).toLowerCase();
        const btn=root.querySelector('.vm-account-save');
        if(name.length<2){status.textContent='Entre un prénom ou pseudo valide.';return}
        if(!email||!email.includes('@')){status.textContent='Adresse e-mail invalide.';return}
        btn.disabled=true;status.textContent='Enregistrement…';
        try{
          const {r,d}=await api('/profile',{method:'POST',body:JSON.stringify({name,email})});
          if(!r.ok||!d.ok)throw Error(d.error||'Impossible de modifier le compte.');
          saveUser(d.user);
          render();
          edit.classList.remove('open');
          status.textContent='✓ Informations mises à jour';
        }catch(e){status.textContent=String(e?.message||e)}finally{btn.disabled=false}
      };
      root.querySelector('#vm-account-logout').onclick=async()=>{
        const btn=root.querySelector('#vm-account-logout');
        btn.disabled=true;status.textContent='Déconnexion…';
        try{await api('/logout',{method:'POST'})}catch{}
        clearLocalAccount();
        user=null;
        root.remove();
        location.reload();
      };
      root.querySelector('#vm-account-delete').onclick=async()=>{
        const btn=root.querySelector('#vm-account-delete');
        if(String(user?.role||'').toLowerCase()==='owner'){
          status.textContent='Le compte propriétaire est protégé.';
          return;
        }
        if(!confirm('Supprimer définitivement ton compte VM RADIO ? Cette action est irréversible.'))return;
        const confirmation=prompt('Pour confirmer, écris SUPPRIMER');
        if(confirmation!=='SUPPRIMER'){
          status.textContent='Suppression annulée.';
          return;
        }
        btn.disabled=true;
        status.textContent='Suppression du compte…';
        try{
          const {r,d}=await api('/delete-account',{method:'POST',body:JSON.stringify({confirm:'SUPPRIMER'})});
          if(!r.ok||!d.ok)throw Error(d.error||'Impossible de supprimer le compte.');
          clearLocalAccount();
          user=null;
          root.remove();
          location.reload();
        }catch(e){
          status.textContent=String(e?.message||e);
          btn.disabled=false;
        }
      };
    }
    render();
    return root;
  }

  function render(){
    const root=document.getElementById('vm-account-home');
    if(!root||!user)return;
    const name=displayName(user);
    root.querySelector('#vm-account-home-name').textContent=name;
    root.querySelector('#vm-account-panel-name').textContent=name;
    root.querySelector('#vm-account-panel-email').textContent=clean(user?.email);
    const deleteButton=root.querySelector('#vm-account-delete');
    if(deleteButton)deleteButton.style.display=String(user?.role||'').toLowerCase()==='owner'?'none':'';
    const oldBadge=document.getElementById('vm-account-badge');if(oldBadge)oldBadge.textContent=name;
    document.querySelectorAll('#dedName,#vmreqName').forEach(input=>{if(!clean(input.value)||input.dataset.vmAccountDefaultName)input.value=name;input.dataset.vmAccountDefaultName=name});
  }

  async function sync(){
    try{
      const {r,d}=await api('/session');
      if(r.ok&&d?.authenticated&&d?.user){saveUser(d.user);ensureMenu();return true}
    }catch{}
    user=readUser();if(user){ensureMenu();return true}
    return false;
  }

  function boot(){
    user=readUser();
    if(user)ensureMenu();
    sync();
    new MutationObserver(()=>{if(user&&!document.getElementById('vm-account-home'))ensureMenu()}).observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('vmradio:pagechange',()=>setTimeout(()=>{if(user)ensureMenu()},0));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
