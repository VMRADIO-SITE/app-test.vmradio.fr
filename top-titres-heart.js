(() => {
  'use strict';

  const API='https://admin.vmradio.fr/api/public/top-titres';
  const VOTER_KEY='vmradioTopTitresVoterIdV3';
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
    let n=document.getElementById('notice');
    if(!n){
      n=document.createElement('div');
      n.id='notice';
      n.className='notice';
      document.body.appendChild(n);
    }
    n.textContent=text;
    n.classList.add('show');
    clearTimeout(n.__vmTimer);
    n.__vmTimer=setTimeout(()=>n.classList.remove('show'),3200);
  }
  function heart(){return document.getElementById('heart');}
  function paint(voted){
    const h=heart();if(!h)return;
    h.type='button';
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
    h.type='button';
    h.disabled=false;
    h.removeAttribute('disabled');
    h.style.pointerEvents='auto';
    h.style.opacity='1';
  }
  async function fetchJson(url,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const r=await fetch(url,{...options,signal:controller.signal});
      const d=await r.json().catch(()=>({}));
      return {r,d};
    }finally{clearTimeout(timer);}
  }
  async function status(){
    const t=track();
    if(!t.title||/^vm radio$/i.test(t.title)){votedId='';paint(false);return;}
    const id=idOf(t);
    try{
      const u=new URL(API+'/vote-status');
      u.searchParams.set('voter_id',voterId());u.searchParams.set('track_id',id);u.searchParams.set('_',Date.now());
      const {r,d}=await fetchJson(u,{cache:'no-store',mode:'cors',headers:{Accept:'application/json'}});
      const voted=r.ok&&d?.voted===true;
      votedId=voted?id:'';paint(voted);
    }catch(e){votedId='';paint(false);console.warn('[VM RADIO] état Top Titres',e);}
  }
  async function vote(){
    if(busy)return;
    const t=track();const id=idOf(t);
    toast('Envoi du J’aime…');
    if(!t.title||/^vm radio$/i.test(t.title)){toast('Titre en cours indisponible.');return;}
    if(votedId===id){toast('Ce titre est déjà dans tes J’aime.');paint(true);return;}
    busy=true;unlock();
    try{
      const {r,d}=await fetchJson(API+'/vote',{
        method:'POST',mode:'cors',cache:'no-store',
        headers:{'Content-Type':'text/plain;charset=UTF-8',Accept:'application/json'},
        body:JSON.stringify({title:t.title,artist:t.artist,cover:t.cover,voter_id:voterId()})
      });
      if(!r.ok||d?.ok!==true)throw new Error(d?.details||d?.error||('HTTP '+r.status));
      votedId=id;paint(true);
      toast(d?.already_voted?'Ce titre est déjà dans tes J’aime.':'Ajouté au Top Titres 💜');
      window.dispatchEvent(new CustomEvent('vmradio:top-titres-voted',{detail:d?.item||null}));
    }catch(e){
      votedId='';paint(false);
      const msg=e?.name==='AbortError'?'délai réseau dépassé':String(e?.message||e).slice(0,90);
      toast('Vote impossible : '+msg);
      console.warn('[VM RADIO] vote Top Titres',e);
    }finally{busy=false;unlock();}
  }

  function bindHeart(){
    const h=heart();
    if(!h)return;
    unlock();
    if(h.dataset.vmTopBound==='1')return;
    h.dataset.vmTopBound='1';
    h.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      vote();
    },true);
  }

  function boot(){
    bindHeart();
    status();
    const h=heart();if(h)new MutationObserver(()=>{unlock();bindHeart();}).observe(h,{attributes:true,attributeFilter:['disabled','style']});
    const title=document.getElementById('title');if(title)new MutationObserver(()=>setTimeout(status,80)).observe(title,{childList:true,subtree:true,characterData:true});
    setInterval(()=>{bindHeart();unlock();},500);
    window.addEventListener('focus',status);
    window.addEventListener('pageshow',()=>{bindHeart();unlock();status();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();