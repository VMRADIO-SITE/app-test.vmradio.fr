(()=>{
  const API='https://admin.vmradio.fr/api/public/push';
  let busy=false;
  function decodeKey(value){
    const s=String(value).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(s+'='.repeat((4-s.length%4)%4));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  async function subscribe(){
    if(busy||location.hostname!=='app-test.vmradio.fr')return;
    if(!('serviceWorker'in navigator)||!('PushManager'in window)||Notification.permission!=='granted')return;
    busy=true;
    try{
      const config=await fetch(API+'/config',{cache:'no-store'}).then(r=>r.json());
      const registration=await navigator.serviceWorker.register('./sw.js?vm=47',{scope:'./'});
      let sub=await registration.pushManager.getSubscription();
      if(!sub)sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});
      const response=await fetch(API+'/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),source:'app-test'})});
      const data=await response.json();
      if(!response.ok||!data.ok)throw Error(data.error||'Abonnement impossible');
      localStorage.setItem('vmradioNativePushReady','1');
      console.log('VM RADIO Web Push activé');
    }catch(error){console.warn('VM RADIO Web Push',error)}finally{busy=false}
  }
  document.addEventListener('click',e=>{if(e.target.closest?.('#vm-notification-accept')){setTimeout(subscribe,1000);setTimeout(subscribe,2500)}},true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)subscribe()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',subscribe,{once:true});else subscribe();
})();
