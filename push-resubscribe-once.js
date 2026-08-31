(()=>{
'use strict';

const API='https://admin.vmradio.fr/api/public/push';
const RESET_KEY='vmRadioPushResubscribe20260831V2';
const DEVICE_ID_KEY='vmRadioPushDeviceIdV1';
const SW_VERSION='20260831-push-resubscribe2';

function decodeKey(value){
  const s=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(s+'='.repeat((4-s.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}

function deviceId(){
  try{return String(localStorage.getItem(DEVICE_ID_KEY)||'').trim()}catch(_){return''}
}

async function run(){
  if(localStorage.getItem(RESET_KEY)==='done')return;
  if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
  if(!('serviceWorker'in navigator)||!('PushManager'in window))return;

  try{
    console.info('[VM RADIO] Réinitialisation Push V2 : démarrage');

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
    localStorage.removeItem('vmRadioNotificationsLastErrorV2');
    localStorage.setItem('vmRadioNotificationsNativeV1','activated');

    console.info('[VM RADIO] Réinitialisation Push V2 : OK',{
      endpoint:subscription.endpoint,
      id:data.id||null
    });
  }catch(error){
    console.error('[VM RADIO] Réinitialisation Push V2 : erreur',error);
    try{localStorage.removeItem(RESET_KEY)}catch(_){}
  }
}

window.addEventListener('load',()=>setTimeout(run,1800),{once:true});
})();
