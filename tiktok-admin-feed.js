(()=>{
  'use strict';
  const API='https://admin.vmradio.fr/api/public/tiktok-videos';
  const POLL_MS=5000;
  let lastSignature='';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function renderVideo(v){
    const title=esc(v.title||'Vidéo TikTok');
    if(v.type==='mp4')return `<article class="tiktok-video" data-admin-video="${Number(v.id)||0}"><div class="tiktok-player"><video controls playsinline preload="metadata" src="${esc(v.url)}" title="${title}"></video></div></article>`;
    return `<article class="tiktok-video" data-admin-video="${Number(v.id)||0}"><div class="tiktok-player"><iframe allow="autoplay; fullscreen" allowfullscreen loading="lazy" title="${title}" src="${esc(v.embedUrl||v.url)}"></iframe></div></article>`;
  }

  function signature(videos){
    return videos.map(v=>[Number(v.id)||0,Number(v.updatedAt)||0,String(v.url||''),String(v.embedUrl||''),String(v.type||'')].join('|')).join(';;');
  }

  async function refresh(force=false){
    const box=document.querySelector('.tiktok-videos');
    if(!box)return;
    try{
      const r=await fetch(API+'?v='+Date.now(),{
        cache:'no-store',
        mode:'cors',
        headers:{'Accept':'application/json','Cache-Control':'no-cache'}
      });
      const d=await r.json();
      if(!r.ok||!d.ok||!Array.isArray(d.videos))throw Error('Flux TikTok indisponible');
      const sig=signature(d.videos);
      if(!force&&sig===lastSignature)return;
      lastSignature=sig;
      if(d.videos.length)box.innerHTML=d.videos.map(renderVideo).join('');
      else box.innerHTML='<div class="tiktok-empty" style="grid-column:1/-1;text-align:center;color:#aaa5b4;padding:24px">Aucune vidéo publiée pour le moment.</div>';
    }catch(e){console.warn('VM RADIO TikTok Manager:',e)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(true),{once:true});else refresh(true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
  window.addEventListener('focus',()=>refresh(true));
  setInterval(()=>{if(!document.hidden)refresh(false)},POLL_MS);
})();
