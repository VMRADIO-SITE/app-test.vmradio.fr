/* VM RADIO TEST — popup + jingle maintenance synchronisés localement */
(function(){
  'use strict';
  if(window.__VMRADIO_APP_MAINTENANCE_GATE_V4__)return;
  window.__VMRADIO_APP_MAINTENANCE_GATE_V4__=true;

  var STATE_ENDPOINT='https://admin.vmradio.fr/api/public/maintenance';
  var MAINTENANCE_AUDIO='https://radio.vmradio.fr/engine/media-file?file='+encodeURIComponent('La Musique Revient.mp3');
  var POLL_MS=250;

  var overlay=null;
  var active=false;
  var busy=false;
  var liveWasMuted=false;
  var liveWasPlaying=false;
  var startedFromMaintenanceButton=false;
  var maintenancePrimed=false;

  var maintenanceAudio=new Audio();
  maintenanceAudio.src=MAINTENANCE_AUDIO;
  maintenanceAudio.preload='auto';
  maintenanceAudio.loop=true;
  maintenanceAudio.playsInline=true;
  maintenanceAudio.setAttribute('playsinline','');
  maintenanceAudio.setAttribute('webkit-playsinline','');
  maintenanceAudio.muted=true;

  function getLiveAudio(){
    return window.VMRadioPlayer?.audio||document.getElementById('audio')||document.querySelector('audio');
  }

  function safePlay(audio){
    try{
      var p=audio.play();
      if(p&&typeof p.catch==='function')p.catch(function(){});
    }catch(_){}
  }

  function primeMaintenanceAudio(){
    if(maintenancePrimed)return;
    maintenanceAudio.muted=true;
    maintenanceAudio.volume=1;
    try{maintenanceAudio.currentTime=0;}catch(_){}
    try{
      var p=maintenanceAudio.play();
      if(p&&typeof p.then==='function'){
        p.then(function(){maintenancePrimed=true;}).catch(function(){});
      }else{
        maintenancePrimed=true;
      }
    }catch(_){}
  }

  function blockEvent(event){
    if(!active)return;
    if(overlay&&overlay.contains(event.target))return;
    event.preventDefault();
    event.stopPropagation();
    if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  }

  ['click','dblclick','submit','touchstart','touchend','pointerdown','pointerup','keydown'].forEach(function(name){
    document.addEventListener(name,blockEvent,true);
  });

  function maybePrimeFromPlayerGesture(event){
    if(active)return;
    var target=event.target;
    var button=target&&target.closest?target.closest('#play,#playBtn,.play-btn,[data-play-player]'):null;
    if(button)primeMaintenanceAudio();
  }

  document.addEventListener('pointerdown',maybePrimeFromPlayerGesture,true);
  document.addEventListener('touchstart',maybePrimeFromPlayerGesture,true);

  function startLocalMaintenanceAudio(force){
    var live=getLiveAudio();

    if(live){
      if(!active){
        liveWasMuted=!!live.muted;
        liveWasPlaying=!live.paused&&!live.ended;
      }

      if(liveWasPlaying||force){
        try{live.muted=true;}catch(_){}
      }
    }

    if(!(liveWasPlaying||force)){
      maintenanceAudio.muted=true;
      return;
    }

    if(live){
      try{maintenanceAudio.volume=Number.isFinite(live.volume)?live.volume:1;}catch(_){maintenanceAudio.volume=1;}
    }

    try{maintenanceAudio.currentTime=0;}catch(_){}
    maintenanceAudio.muted=false;
    safePlay(maintenanceAudio);
  }

  function stopLocalMaintenanceAudio(){
    maintenanceAudio.muted=true;

    var live=getLiveAudio();
    if(live){
      try{live.muted=liveWasMuted;}catch(_){}

      if(startedFromMaintenanceButton&&live.paused){
        try{
          var p=live.play();
          if(p&&typeof p.catch==='function')p.catch(function(){});
        }catch(_){}
      }
    }

    liveWasPlaying=false;
    startedFromMaintenanceButton=false;
  }

  function listenDuringMaintenance(){
    var live=getLiveAudio();
    startedFromMaintenanceButton=true;
    liveWasPlaying=true;

    if(live){
      try{live.muted=true;}catch(_){}
      safePlay(live);
      try{maintenanceAudio.volume=Number.isFinite(live.volume)?live.volume:1;}catch(_){maintenanceAudio.volume=1;}
    }

    try{maintenanceAudio.currentTime=0;}catch(_){}
    maintenanceAudio.muted=false;
    safePlay(maintenanceAudio);
  }

  function buildOverlay(){
    if(overlay&&document.documentElement.contains(overlay))return overlay;
    if(!document.body)return null;

    overlay=document.createElement('div');
    overlay.id='vmradioMaintenanceGate';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Maintenance VM RADIO');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 0%,#32164d 0,#150a21 38%,#07050d 100%);color:#fff;font-family:Arial,Helvetica,sans-serif;text-align:center;overflow:auto;touch-action:none;overscroll-behavior:none';

    overlay.innerHTML='<div style="width:min(520px,100%);padding:38px 28px;border:1px solid rgba(184,92,255,.4);border-radius:28px;background:linear-gradient(145deg,rgba(28,15,42,.97),rgba(10,7,15,.98));box-shadow:0 30px 90px rgba(0,0,0,.55)">'+
      '<div style="font-size:48px;line-height:1">🛠️</div>'+ 
      '<h1 style="margin:16px 0 10px;font-size:30px;line-height:1.15">Maintenance en cours</h1>'+ 
      '<p style="margin:0;color:#d6c9e4;font-size:15px;line-height:1.6">L’application VM RADIO est temporairement indisponible pendant une intervention technique.</p>'+ 
      '<div style="margin-top:20px;color:#c477f3;font-size:13px;font-weight:900;letter-spacing:.2px">La musique continue.</div>'+ 
      '<button id="vmMaintenanceListen" type="button" style="margin-top:16px;border:0;border-radius:14px;padding:11px 16px;background:#8f42e6;color:#fff;font-weight:800;cursor:pointer">Écouter le jingle</button>'+ 
      '</div>';

    document.body.appendChild(overlay);

    var listen=overlay.querySelector('#vmMaintenanceListen');
    if(listen){
      listen.addEventListener('click',function(event){
        event.preventDefault();
        event.stopPropagation();
        listenDuringMaintenance();
      });
    }

    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
    return overlay;
  }

  function removeOverlay(){
    if(overlay){
      overlay.remove();
      overlay=null;
    }
    document.documentElement.style.overflow='';
    if(document.body)document.body.style.overflow='';
  }

  function enterMaintenance(){
    if(active){
      buildOverlay();
      return;
    }

    var live=getLiveAudio();
    liveWasMuted=live?!!live.muted:false;
    liveWasPlaying=live?!live.paused&&!live.ended:false;

    active=true;
    document.documentElement.dataset.vmMaintenance='on';

    /* Le jingle local et le popup basculent dans le même tour JS. */
    startLocalMaintenanceAudio(false);
    buildOverlay();
  }

  function leaveMaintenance(){
    if(!active){
      removeOverlay();
      return;
    }

    stopLocalMaintenanceAudio();
    active=false;
    document.documentElement.dataset.vmMaintenance='off';
    removeOverlay();
  }

  async function getState(){
    var response=await fetch(STATE_ENDPOINT+'?_vm='+Date.now(),{
      method:'GET',
      cache:'no-store',
      credentials:'omit',
      headers:{Accept:'application/json','Cache-Control':'no-cache'}
    });
    var data=await response.json().catch(function(){return null;});
    if(!response.ok||!data||data.ok===false)throw new Error('VM RADIO API');
    return data;
  }

  async function check(){
    if(busy)return;
    busy=true;
    try{
      var state=await getState();
      if(state.app===true)enterMaintenance();
      else leaveMaintenance();
    }catch(_){}
    finally{busy=false;}
  }

  function start(){
    try{maintenanceAudio.load();}catch(_){}
    check();
    setInterval(check,POLL_MS);
    setInterval(function(){if(active)buildOverlay();},1000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }

  window.addEventListener('focus',check);
  window.addEventListener('pageshow',check);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)check();});
})();
