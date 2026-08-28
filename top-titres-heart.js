(() => {
  'use strict';
  if (location.hostname !== 'app-test.vmradio.fr') return;

  const API='https://admin.vmradio.fr/api/public/top-titres';
  const VOTER_KEY='vmradioTopTitresVoterIdV2';
  const FALLBACK='https://valentinrasle7070vr-debug.github.io/VM-RADIO/assets/vm-radio-default-cover.jpeg';
  let busy=false;
  let votedId='';

  function clean(v){return String(v??'').trim();}
  function slug(v){return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);}
  function track(){
    return {
      title:clean(document.getElementById('title')?.textContent),
      artist:clean(document.getElementById('artist')?.textContent)||'Music IA By Valentin',
      cover:document.getElementById('cover')?.src||FALLBACK
    };
  }
  function idOf(t){return slug(`${t.artist}-${t.title}`)||slug(t.title)||'titre';}
  function voterId(){
    let id=localStorage.getItem(VOTER_KEY);
    if(id)return id;
    const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
    id=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(VOTER_KEY,id);return id;
  }
  function toast(text){
    const n=document.getElementById('notice');
    if(n){n.textContent=text;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),3200);return;}
    console.log('[VM RADIO Top Titres]',text);
  }
  function heart(){return document.getElementById('heart');}
  function paint(voted){
    const h=heart();if(!h)return;
    h.disabled=false;
    h.removeAttribute('disabled');
    h.style.pointerEvents='auto';
    h.style.opacity='1';
    h.classList.toggle('active',!!voted);
    h.textContent=voted?'♥':'♡';
    h.setAttribute('aria-pressed',voted?'true':'false');
    h.dataset.vmTopD1='1';
  }
  function unlock(){
    const h=heart();if(!h)return;
    if(h.disabled)h.disabled=false;
    h.removeAttribute('disabled');
    h.style.pointerEvents='auto';
    h.style.opacity='1';
  }
  async function status(){
    const t=track();
    if(!t.title||/^vm radio$/i.test(t.title)){votedId='';paint(false);return;}
    const id=idOf(t);
    try{
      const u=new URL(API+'/vote-status');
      u.searchParams.set('voter_id',voterId());u.searchParams.set('track_id',id);u.searchParams.set('_',Date.now());
      const r=await fetch(u,{cache:'no-store',mode:'cors',headers:{Accept:'application/json'}});
      const d=await r.json().catch(()=>({}));
      const voted=r.ok&&d?.voted===true;
      votedId=voted?id:'';paint(voted);
    }catch(e){votedId='';paint(false);console.warn('[VM RADIO] état Top Titres',e);}
  }
  async function vote(){
    if(busy)return;
    const t=track();const id=idOf(t);
    if(!t.title||/^vm radio$/i.test(t.title)){toast('Titre en cours indisponible.');return;}
    if(votedId===id){toast('Ce titre est déjà dans tes J’aime.');paint(true);return;}
    busy=true;unlock();
    try{
      const r=await fetch(API+'/vote',{
        method:'POST',mode:'cors',cache:'no-store',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({title:t.title,artist:t.artist,cover:t.cover,voter_id:voterId()})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d?.ok!==true)throw new Error((d?.details||d?.error||'HTTP '+r.status));
      votedId=id;paint(true);
      toast(d?.already_voted?'Ce titre est déjà dans tes J’aime.':'Ajouté au Top Titres 💜');
      window.dispatchEvent(new CustomEvent('vmradio:top-titres-voted',{detail:d?.item||null}));
    }catch(e){
      votedId='';paint(false);
      toast('Vote impossible : '+String(e?.message||e).slice(0,90));
      console.warn('[VM RADIO] vote Top Titres',e);
    }finally{busy=false;unlock();}
  }

  document.addEventListener('click',e=>{
    const h=e.target?.closest?.('#heart');if(!h)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();vote();
  },true);

  function boot(){
    unlock();status();
    const h=heart();if(h)new MutationObserver(unlock).observe(h,{attributes:true,attributeFilter:['disabled','style']});
    const title=document.getElementById('title');if(title)new MutationObserver(()=>setTimeout(status,80)).observe(title,{childList:true,subtree:true,characterData:true});
    setInterval(unlock,250);
    window.addEventListener('focus',status);
    window.addEventListener('pageshow',()=>{unlock();status();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
