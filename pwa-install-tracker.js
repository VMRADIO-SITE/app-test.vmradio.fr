(() => {
  'use strict';

  const KEY = 'vmradioPwaInstallReportedV3';
  const INSTALL_ID_KEY = 'vmradioPwaInstallIdV2';
  const ADMIN_INSTALL_ENDPOINT = 'https://admin.vmradio.fr/api/pwa/install';

  function isVmRadioApp() {
    return location.hostname === 'app.vmradio.fr' || location.hostname === 'www.app.vmradio.fr' || location.hostname === 'app-test.vmradio.fr';
  }

  function getInstallId() {
    let id = localStorage.getItem(INSTALL_ID_KEY);
    if (id) return id;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(INSTALL_ID_KEY, id);
    return id;
  }

  async function relayInstall() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const payload = JSON.stringify({
        installId: getInstallId(),
        platform: 'web',
        version: document.querySelector('meta[name="vm-radio-version"]')?.content || '',
        source: location.hostname === 'app-test.vmradio.fr' ? 'APP-TEST' : 'APPLIVMRADIO'
      });
      const response = await fetch(ADMIN_INSTALL_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: payload,
        signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        console.warn('[VM RADIO] PWA relay rejected', response.status, result);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('[VM RADIO] PWA relay failed', error);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function reportInstall() {
    if (!isVmRadioApp()) return;
    if (localStorage.getItem(KEY) === '1') return;
    const success = await relayInstall();
    if (!success) return;
    localStorage.setItem(KEY, '1');
    window.dispatchEvent(new CustomEvent('vmradio:pwa-installed', {
      detail: { installed: true, timestamp: new Date().toISOString() }
    }));
    console.info('[VM RADIO] App installation relayed successfully');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reportInstall, { once: true });
  } else {
    reportInstall();
  }
  window.addEventListener('pageshow', reportInstall);
})();

// VM RADIO — Top Titres propriétaire (API Admin + D1), actif uniquement sur le domaine de test.
(() => {
  'use strict';
  if (location.hostname !== 'app-test.vmradio.fr') return;

  const API = 'https://admin.vmradio.fr/api/public/top-titres';
  const CACHE_KEY = 'vmradioTopTitresD1CacheV1';
  const VOTER_KEY = 'vmradioTopTitresVoterIdV1';
  const FALLBACK = 'https://valentinrasle7070vr-debug.github.io/VM-RADIO/assets/vm-radio-default-cover.jpeg';
  let items = [];
  let votedTrack = '';
  let rendering = false;

  function voterId() {
    let id = localStorage.getItem(VOTER_KEY);
    if (id) return id;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(VOTER_KEY, id);
    return id;
  }
  function clean(v){return String(v??'').trim();}
  function slug(v){return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);}
  function current(){
    return {
      title: clean(document.getElementById('title')?.textContent),
      artist: clean(document.getElementById('artist')?.textContent) || 'Music IA By Valentin',
      cover: document.getElementById('cover')?.src || FALLBACK
    };
  }
  function currentId(){const t=current();return slug(`${t.artist}-${t.title}`)||slug(t.title)||'titre';}

  function render() {
    const box = document.querySelector('[data-favorites]');
    if (!box) return;
    rendering = true;
    box.innerHTML = '';
    if (!items.length) {
      box.innerHTML = '<div class="vm-home-list-card"><div class="vm-home-list-info"><strong>Aucun titre aimé</strong><span>Appuyez sur ❤️ dans le player pour ajouter un titre.</span></div></div>';
    } else {
      items.slice(0,10).forEach(t => {
        const row = document.createElement('div');
        row.className = 'vm-home-list-card';
        row.dataset.vmD1Top = '1';
        row.innerHTML = '<img alt=""><div class="vm-home-list-info"><strong></strong><span></span><small></small></div>';
        const im = row.querySelector('img');
        im.src = t.cover || FALLBACK;
        im.onerror = () => { im.onerror = null; im.src = FALLBACK; };
        row.querySelector('strong').textContent = t.title || 'Titre';
        row.querySelector('span').textContent = t.artist || 'Music IA By Valentin';
        row.querySelector('small').textContent = `♥ ${Number(t.votes || 0)}`;
        box.appendChild(row);
      });
    }
    box.dataset.vmD1Rendered = '1';
    rendering = false;
  }

  function saveCache(){try{localStorage.setItem(CACHE_KEY,JSON.stringify(items.slice(0,10)));}catch(_){}}
  function loadCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      if (Array.isArray(cached) && cached.length) { items = cached; render(); }
    } catch(_) {}
  }

  async function refresh() {
    try {
      const r = await fetch(API + '?limit=10&_=' + Date.now(), { cache:'no-store', mode:'cors', headers:{Accept:'application/json'} });
      const d = await r.json();
      if (!r.ok || d?.ok !== true) throw new Error(d?.error || `API ${r.status}`);
      items = Array.isArray(d.items) ? d.items : [];
      saveCache();
      render();
      await syncHeart();
    } catch (e) {
      console.warn('[VM RADIO] Top Titres D1 indisponible', e);
    }
  }

  async function syncHeart() {
    const heart = document.getElementById('heart');
    if (!heart) return;
    const t = current();
    if (!t.title || /^vm radio$/i.test(t.title)) {
      heart.textContent = '♡'; heart.classList.remove('active'); heart.disabled = true; return;
    }
    const id = currentId();
    try {
      const u = new URL(API + '/vote-status');
      u.searchParams.set('voter_id', voterId());
      u.searchParams.set('track_id', id);
      u.searchParams.set('_', Date.now());
      const r = await fetch(u, {cache:'no-store',mode:'cors',headers:{Accept:'application/json'}});
      const d = await r.json();
      const voted = r.ok && d?.voted === true;
      votedTrack = voted ? id : '';
      heart.classList.toggle('active', voted);
      heart.textContent = voted ? '♥' : '♡';
      heart.setAttribute('aria-pressed', voted ? 'true' : 'false');
      heart.disabled = voted;
    } catch(_) {
      heart.disabled = false;
    }
  }

  async function vote() {
    const heart = document.getElementById('heart');
    const t = current();
    const id = currentId();
    if (!t.title || /^vm radio$/i.test(t.title) || votedTrack === id) return;
    if (heart) heart.disabled = true;
    try {
      const r = await fetch(API + '/vote', {
        method:'POST', mode:'cors', cache:'no-store',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({ title:t.title, artist:t.artist, cover:t.cover, voter_id:voterId() })
      });
      const d = await r.json();
      if (!r.ok || d?.ok !== true) throw new Error(d?.error || `API ${r.status}`);
      votedTrack = id;
      if (heart) { heart.classList.add('active'); heart.textContent='♥'; heart.disabled=true; }
      await refresh();
    } catch(e) {
      console.warn('[VM RADIO] Vote Top Titres D1 refusé',e);
      if (heart) heart.disabled=false;
    }
  }

  // Intercepte le coeur avant l'ancien listener Firebase : aucun nouveau vote Firebase depuis app-test.
  document.addEventListener('click', e => {
    const heart = e.target?.closest?.('#heart');
    if (!heart) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    vote();
  }, true);

  function boot() {
    loadCache();
    refresh();
    const title = document.getElementById('title');
    if (title) new MutationObserver(() => setTimeout(syncHeart, 50)).observe(title,{childList:true,subtree:true,characterData:true});
    const box = document.querySelector('[data-favorites]');
    if (box) new MutationObserver(() => {
      if (rendering) return;
      // Si l'ancien snapshot Firebase réécrit la carte, notre source D1 reprend immédiatement la main.
      if (box.dataset.vmD1Rendered !== '1' || !box.querySelector('[data-vm-d1-top]') && items.length) queueMicrotask(render);
    }).observe(box,{childList:true,subtree:true});
    setInterval(refresh, 5000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    window.addEventListener('focus',refresh);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
