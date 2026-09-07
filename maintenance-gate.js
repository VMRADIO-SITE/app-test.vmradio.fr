/* VM RADIO TEST — maintenance synchronisée avec l'antenne VPS, audio conservé */
(function(){
  'use strict';
  if(window.__VMRADIO_APP_MAINTENANCE_GATE_V3__)return;
  window.__VMRADIO_APP_MAINTENANCE_GATE_V3__=true;

  var STATE_ENDPOINT='https://admin.vmradio.fr/api/public/maintenance';
  var NOWPLAYING_ENDPOINT='https://admin.vmradio.fr/api/public/radio/nowplaying';
  var POLL_MS=250;

  var overlay=null;
  var active=false;
  var busy=false;

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

  function getAudio(){
    return window.VMRadioPlayer?.audio||document.getElementById('audio')||document.querySelector('audio');
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
      '<div style="margin-top:20px;color:#c477f3;font-size:13px;font-weight:900;letter-spacing:.2px">La musique continue sur VM RADIO.</div>'+ 
      '<button id="vmMaintenanceListen" type="button" style="margin-top:16px;border:0;border-radius:14px;padding:11px 16px;background:#8f42e6;color:#fff;font-weight:800;cursor:pointer">Écouter VM RADIO</button>'+ 
      '</div>';

    document.body.appendChild(overlay);

    var listen=overlay.querySelector('#vmMaintenanceListen');
    if(listen){
      listen.addEventListener('click',function(event){
        event.preventDefault();
        event.stopPropagation();
        try{
          if(window.VMRadioPlayer&&typeof window.VMRadioPlayer.play==='function'){
            window.VMRadioPlayer.play();
            return;
          }
          var audio=getAudio();
          if(audio){
            var p=audio.play();
            if(p&&typeof p.catch==='function')p.catch(function(){});
          }
        }catch(_){}
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

  function showMaintenance(){
    active=true;
    document.documentElement.dataset.vmMaintenance='on';
    buildOverlay();
  }

  function hideMaintenance(){
    active=false;
    document.documentElement.dataset.vmMaintenance='off';
    removeOverlay();
  }

  function radioMode(data){
    return String(
      data?.raw?.engine?.current?.type||
      data?.engine?.current?.type||
      data?.now_playing?.playlist||
      data?.playlist||
      ''
    ).trim().toLowerCase();
  }

  async function getJson(url){
    var response=await fetch(url+(url.includes('?')?'&':'?')+'_vm='+Date.now(),{
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
      var values=await Promise.all([
        getJson(STATE_ENDPOINT),
        getJson(NOWPLAYING_ENDPOINT)
      ]);

      var state=values[0];
      var now=values[1];
      var requested=state.app===true;
      var mode=radioMode(now);
      var radioMaintenance=mode==='maintenance'||mode.indexOf('maintenance')!==-1;

      if(requested&&radioMaintenance){
        showMaintenance();
        return;
      }

      if(!requested&&!radioMaintenance){
        hideMaintenance();
        return;
      }

      if(active)buildOverlay();
    }catch(_){}
    finally{busy=false;}
  }

  function start(){
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
