/* VM RADIO — blocage maintenance application */
(function(){
  'use strict';
  if (window.__VMRADIO_APP_MAINTENANCE_GATE_V2__) return;
  window.__VMRADIO_APP_MAINTENANCE_GATE_V2__ = true;

  var ENDPOINT = 'https://admin.vmradio.fr/api/public/maintenance';
  var overlay = null;
  var busy = false;

  function stopMedia(){
    document.querySelectorAll('audio,video').forEach(function(el){
      try { el.pause(); } catch (_) {}
    });
    try {
      if (window.VMRadioPlayer && typeof window.VMRadioPlayer.pause === 'function') {
        window.VMRadioPlayer.pause();
      }
    } catch (_) {}
  }

  function buildOverlay(){
    if (overlay || !document.body) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'vmradioMaintenanceGate';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Maintenance VM RADIO');
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:2147483647',
      'display:flex','align-items:center','justify-content:center',
      'padding:24px','background:radial-gradient(circle at 50% 0%,#32164d 0,#150a21 38%,#07050d 100%)',
      'color:#fff','font-family:Arial,Helvetica,sans-serif','text-align:center',
      'overflow:auto','touch-action:none','overscroll-behavior:none'
    ].join(';');

    overlay.innerHTML = '<div style="width:min(520px,100%);padding:38px 28px;border:1px solid rgba(184,92,255,.4);border-radius:28px;background:linear-gradient(145deg,rgba(28,15,42,.97),rgba(10,7,15,.98));box-shadow:0 30px 90px rgba(0,0,0,.55)">'+
      '<div style="font-size:48px;line-height:1">🛠️</div>'+ 
      '<h1 style="margin:16px 0 10px;font-size:30px;line-height:1.15">Maintenance en cours</h1>'+ 
      '<p style="margin:0;color:#d6c9e4;font-size:15px;line-height:1.6">L’application VM RADIO est temporairement indisponible pendant une intervention technique.</p>'+ 
      '<div style="margin-top:20px;color:#c477f3;font-size:13px;font-weight:900;letter-spacing:.2px">Nous revenons très vite.</div>'+ 
      '</div>';

    overlay.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); }, true);
    overlay.addEventListener('touchstart', function(e){ e.stopPropagation(); }, {capture:true, passive:true});
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    stopMedia();
    return overlay;
  }

  function removeOverlay(){
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  async function check(){
    if (busy) return;
    busy = true;
    try {
      var r = await fetch(ENDPOINT + '?_=' + Date.now(), {
        cache:'no-store',
        credentials:'omit',
        headers:{'Accept':'application/json'}
      });
      var d = await r.json().catch(function(){ return null; });
      if (!r.ok || !d || d.ok === false) return;

      if (d.app === true) {
        buildOverlay();
        stopMedia();
      } else {
        removeOverlay();
      }
    } catch (_) {
      /* On ne bloque pas l'application si l'API de maintenance est momentanément indisponible. */
    } finally {
      busy = false;
    }
  }

  function start(){
    check();
    setInterval(check, 2000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) check(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
})();
