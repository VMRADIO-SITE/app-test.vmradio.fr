(()=>{
'use strict';

const API='https://admin.vmradio.fr/api/public/push';
const RESET_KEY='vmRadioPushResubscribe20260831V3';
const DEVICE_ID_KEY='vmRadioPushDeviceIdV1';
const SW_VERSION='20260831-push-resubscribe3';

function decodeKey(value){
  const s=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(s+'='.repeat((4-s.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}

function deviceId(){
  try{return String(localStorage.getItem(DEVICE_ID_KEY)||'').trim()}catch(_){return''}
}

function removePrompt(){
  document.getElementById('vm-push-resubscribe-overlay')?.remove();
}

function setStatus(text,error=false){
  const el=document.getElementById('vm-push-resubscribe-status');
  if(!el)return;
  el.textContent=text||'';
  el.style.color=error?'#ff9aa9':'#d9b8ff';
}

async function resubscribe(){
  if(typeof Notification==='undefined')throw new Error('Notifications indisponibles sur ce navigateur.');
  if(!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('Web Push indisponible sur cet appareil.');

  let permission=Notification.permission;
  if(permission==='default')permission=await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Autorisation refusée. Active les notifications dans Réglages > Notifications > VM RADIO.');

  console.info('[VM RADIO] Réinitialisation Push V3 : démarrage');

  const configResponse=await fetch(API+'/config',{cache:'no-store'});
  const config=await configResponse.json().catch(()=>({}));
  if(!configResponse.ok||!config.ok||!config.publicKey)throw new Error(config.error||'Configuration Push indisponible');

  await navigator.serviceWorker.register(`./sw.js?vm=${SW_VERSION}`,{scope:'./'});
  const registration=await navigator.serviceWorker.ready;

  const previous=await registration.pushManager.getSubscription();
  if(previous){
    try{
      await fetch(API+'/unsubscribe',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({endpoint:previous.endpoint})
      });
    }catch(_){}
    try{await previous.unsubscribe()}catch(_){}
  }

  const subscription=await registration.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey:decodeKey(config.publicKey)
  });

  const response=await fetch(API+'/subscribe',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      subscription:subscription.toJSON(),
      source:'app',
      deviceId:deviceId(),
      userAgent:navigator.userAgent||''
    })
  });

  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw new Error(data.error||'Réabonnement Push impossible');

  localStorage.setItem(RESET_KEY,'done');
  localStorage.removeItem('vmRadioPushResubscribe20260831V1');
  localStorage.removeItem('vmRadioPushResubscribe20260831V2');
  localStorage.removeItem('vmRadioNotificationsLastErrorV2');
  localStorage.setItem('vmRadioNotificationsNativeV1','activated');

  console.info('[VM RADIO] Réinitialisation Push V3 : OK',{
    endpoint:subscription.endpoint,
    id:data.id||null
  });

  return data;
}

function showPrompt(){
  if(localStorage.getItem(RESET_KEY)==='done')return;
  if(document.getElementById('vm-push-resubscribe-overlay'))return;

  const overlay=document.createElement('div');
  overlay.id='vm-push-resubscribe-overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.82);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Arial,Helvetica,sans-serif';
  overlay.innerHTML=`
    <section style="width:min(100%,430px);padding:28px 22px;border:2px solid #b85cff;border-radius:26px;background:linear-gradient(145deg,#09050e,#170a22);box-shadow:0 0 34px rgba(151,48,255,.52);color:#fff;text-align:center">
      <img src="./vmradio-app-logo.png?v=15" alt="VM RADIO" style="width:92px;height:92px;object-fit:contain;margin:0 auto 12px;display:block">
      <h2 style="margin:0;font-size:27px">Réactiver les notifications</h2>
      <p style="margin:12px 0 18px;color:#d5ccdd;line-height:1.45;font-size:15px">Suite à la mise à jour de VM RADIO, ton appareil doit renouveler son abonnement aux notifications.</p>
      <div id="vm-push-resubscribe-status" style="min-height:21px;margin:0 0 12px;color:#d9b8ff;font-weight:700;font-size:13px"></div>
      <button id="vm-push-resubscribe-button" type="button" style="width:100%;border:0;border-radius:16px;padding:15px;background:linear-gradient(135deg,#c05cff,#6d20ed);color:#fff;font-weight:900;font-size:16px;cursor:pointer">🔔 Réactiver les notifications</button>
    </section>`;
  document.body.appendChild(overlay);

  const button=document.getElementById('vm-push-resubscribe-button');
  button.onclick=async()=>{
    button.disabled=true;
    button.textContent='Activation…';
    setStatus('Connexion au service de notifications…');
    try{
      await resubscribe();
      setStatus('Notifications réactivées ✅');
      button.textContent='Activé ✅';
      setTimeout(removePrompt,900);
    }catch(error){
      console.error('[VM RADIO] Réinitialisation Push V3 : erreur',error);
      setStatus(String(error?.message||error),true);
      button.disabled=false;
      button.textContent='🔔 Réessayer';
      try{localStorage.removeItem(RESET_KEY)}catch(_){}
    }
  };
}

window.addEventListener('load',()=>setTimeout(showPrompt,1200),{once:true});
})();
