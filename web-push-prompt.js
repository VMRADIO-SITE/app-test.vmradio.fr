(()=>{
  const API='https://admin.vmradio.fr/api/public/push';
  const STYLE_ID='vm-native-push-style';
  const BTN_ID='vm-native-push-button';
  const MODAL_ID='vm-native-push-modal';
  let busy=false;

  function keyBytes(value){
    const s=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(s+'='.repeat((4-s.length%4)%4));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
#${BTN_ID}{position:fixed;right:14px;bottom:92px;z-index:2147483000;border:1px solid rgba(186,104,255,.7);border-radius:999px;background:linear-gradient(135deg,#23112f,#7c2cff);color:#fff;box-shadow:0 8px 26px rgba(108,34,190,.45);padding:11px 15px;font:800 14px Arial,sans-serif;display:flex;align-items:center;gap:8px;cursor:pointer}
#${BTN_ID}.ready{background:linear-gradient(135deg,#141018,#3b2450)}
#${MODAL_ID}{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.78);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Arial,sans-serif}
#${MODAL_ID} .card{width:min(100%,470px);border:2px solid #a64cff;border-radius:26px;background:linear-gradient(145deg,#07040b,#160b20);box-shadow:0 0 36px rgba(154,61,255,.45);padding:26px;color:#fff;text-align:center}
#${MODAL_ID} .bell{font-size:48px;margin-bottom:8px}#${MODAL_ID} h2{margin:0 0 12px;font-size:28px}#${MODAL_ID} p{margin:0;color:#d8d0df;line-height:1.5;font-size:16px}
#${MODAL_ID} .actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px}#${MODAL_ID} button{border-radius:15px;padding:13px 12px;font-weight:850;font-size:15px;cursor:pointer}
#${MODAL_ID} .later{background:#120d18;color:#fff;border:1px solid #754092}#${MODAL_ID} .activate{border:0;background:linear-gradient(135deg,#c05cff,#6d20ed);color:#fff}#${MODAL_ID} .activate:disabled{opacity:.55;cursor:wait}
#${MODAL_ID} .status{min-height:22px;margin-top:14px;font-weight:700;color:#d9b7ff;font-size:14px}
@media(max-width:520px){#${BTN_ID}{right:10px;bottom:82px;padding:10px 13px;font-size:13px}#${MODAL_ID} .card{padding:22px 17px;border-radius:22px}#${MODAL_ID} h2{font-size:24px}}
`;
    document.head.appendChild(style);
  }

  async function currentSubscription(){
    if(!('serviceWorker'in navigator))return null;
    const reg=await navigator.serviceWorker.ready.catch(()=>null);
    return reg?.pushManager?.getSubscription?.()||null;
  }

  async function syncButton(){
    const btn=document.getElementById(BTN_ID);if(!btn)return;
    const sub=await currentSubscription().catch(()=>null);
    const ready=Notification.permission==='granted'&&!!sub;
    btn.classList.toggle('ready',ready);
    btn.innerHTML=ready?'🔔 <span>Notifications activées</span>':'🔔 <span>Activer les notifications</span>';
  }

  function closeModal(){document.getElementById(MODAL_ID)?.remove()}

  function showModal(){
    closeModal();
    const modal=document.createElement('div');modal.id=MODAL_ID;
    modal.innerHTML=`<div class="card"><div class="bell">🔔</div><h2>Notifications VM RADIO</h2><p>Active les notifications pour recevoir les nouveautés, informations, mises à jour et alertes de VM RADIO.</p><div class="status" id="vm-native-push-status"></div><div class="actions"><button type="button" class="later">Plus tard</button><button type="button" class="activate">Activer</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.later').onclick=closeModal;
    modal.querySelector('.activate').onclick=e=>activate(e.currentTarget);
  }

  async function activate(button){
    if(busy)return;busy=true;
    const status=document.getElementById('vm-native-push-status');
    try{
      button.disabled=true;button.textContent='Activation…';
      if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw Error('Notifications non disponibles sur cet appareil.');
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw Error('Autorisation des notifications refusée.');
      const cfgResponse=await fetch(API+'/config',{cache:'no-store'});
      const cfg=await cfgResponse.json().catch(()=>({}));
      if(!cfgResponse.ok||!cfg.ok||!cfg.publicKey)throw Error(cfg.error||'Configuration Push indisponible.');
      const reg=await navigator.serviceWorker.register('./sw.js?vm=48',{scope:'./'});
      await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(cfg.publicKey)});
      const r=await fetch(API+'/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),source:'app-test'})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok)throw Error(d.error||'Enregistrement impossible.');
      localStorage.setItem('vmradioNativePushReady','1');
      if(status)status.textContent='Notifications activées ✅';
      await syncButton();
      setTimeout(closeModal,800);
    }catch(error){
      console.error('VM RADIO Web Push',error);
      if(status)status.textContent=String(error?.message||error);
      button.disabled=false;button.textContent='Réessayer';
    }finally{busy=false}
  }

  async function boot(){
    if(location.hostname!=='app-test.vmradio.fr')return;
    installStyle();
    if(!document.getElementById(BTN_ID)){
      const btn=document.createElement('button');btn.id=BTN_ID;btn.type='button';btn.onclick=showModal;document.body.appendChild(btn);
    }
    await syncButton();
    const sub=await currentSubscription().catch(()=>null);
    if(Notification.permission!=='granted'||!sub)showModal();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',syncButton);
})();
