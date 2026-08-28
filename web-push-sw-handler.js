self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch{try{payload={body:event.data?.text()||''}}catch{payload={}}}
  const title=String(payload.title||'VM RADIO');
  const body=String(payload.body||'Une nouvelle information est disponible.');
  const icon=String(payload.icon||'./vmradio-app-icon-192.png');
  const tag=String(payload.tag||'vm-radio-native');
  const url=String(payload.url||'./');
  event.waitUntil(self.registration.showNotification(title,{body,icon,badge:icon,tag,renotify:true,data:{url}}));
});
