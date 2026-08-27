(() => {
  const API_URL = 'https://api.radioking.io/widget/radio/vm-radio2/track/current';
  const POLL_MS = 10000;
  const MARKER = 'vm-radioking-live-info';
  const FALLBACK = 'https://image.radioking.io/radios/917591/cover/custom/73962df6-7c51-4f8a-a9d0-801882271ca1.png';

  function esc(value) {
    return String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  }

  function first(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function normalize(raw) {
    let x = Array.isArray(raw) ? raw[0] : raw;
    if (!x) return null;
    if (x.track) x = x.track;
    if (x.data && x.data.track) x = x.data.track;
    const title = first(x.title, x.name, x.song, x.track_title);
    if (!title) return null;
    return {
      id: String(first(x.id, x.track_id, title)),
      title: String(title).trim(),
      artist: String(first(x.artist, x.author, x.track_artist) || 'Music IA By Valentin').trim(),
      cover: String(first(x.cover, x.cover_url, x.artwork, x.artwork_url, x.image, x.picture) || FALLBACK),
      time: first(x.started_at, x.start_at, x.played_at, x.scheduled_at, x.time)
    };
  }

  function placeInsideRadio() {
    const radioCard = document.querySelector('.info-grid .info-card');
    if (!radioCard) return null;

    let root = document.getElementById(MARKER);
    if (!root) {
      root = document.createElement('div');
      root.id = MARKER;
      radioCard.appendChild(root);
    } else if (root.parentElement !== radioCard) {
      radioCard.appendChild(root);
    }
    return root;
  }

  function installFrameStyle() {
    if (document.getElementById('vm-radioking-live-frame-style')) return;
    const style = document.createElement('style');
    style.id = 'vm-radioking-live-frame-style';
    style.textContent = `
      #${MARKER}{position:relative;overflow:hidden;margin:14px 0 2px;padding:13px;border:1px solid rgba(184,92,255,.72);border-radius:14px;background:linear-gradient(145deg,rgba(24,13,37,.98),rgba(8,7,14,.98));box-shadow:0 0 0 1px rgba(184,92,255,.10),0 0 18px rgba(121,44,188,.16),inset 0 1px rgba(255,255,255,.04)}
      #${MARKER}::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#b85cff,#e39aff,transparent)}
      #${MARKER} .vmrk-badge{display:flex;align-items:center;gap:7px;color:#d68cff;font-size:10px;font-weight:800;letter-spacing:.45px;margin-bottom:10px}
      #${MARKER} .vmrk-badge span{width:7px;height:7px;border-radius:50%;background:#31d17b;box-shadow:0 0 8px #31d17b;flex:0 0 7px}
      #${MARKER} .vmrk-main{display:flex;align-items:center;gap:11px}
      #${MARKER} .vmrk-cover{width:58px;height:58px;flex:0 0 58px;border-radius:9px;object-fit:cover;border:1px solid #6d2a95;background:#0b0711;box-shadow:0 0 10px rgba(121,44,188,.16)}
      #${MARKER} .vmrk-info{min-width:0;flex:1}
      #${MARKER} .vmrk-label{font-size:9px;color:#aaa5b4;margin-bottom:3px}
      #${MARKER} .vmrk-title{font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
      #${MARKER} .vmrk-artist{font-size:10px;color:#b85cff;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${MARKER} .vmrk-date{font-size:8px;color:#777080;margin-top:5px}
      #${MARKER} .vmrk-empty{text-align:center;color:#aaa5b4;font-size:9px;padding:5px}
    `;
    document.head.appendChild(style);
  }

  async function refresh() {
    const root = placeInsideRadio();
    if (!root) return;

    try {
      const response = await fetch(`${API_URL}?_=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('Flux indisponible');
      const data = normalize(await response.json());

      if (!data || !data.title) {
        root.innerHTML = '<div class="vmrk-empty">Aucun titre en direct pour le moment.</div>';
        return;
      }

      root.innerHTML = `
        <div class="vmrk-badge"><span></span> EN DIRECT — VM RADIO</div>
        <div class="vmrk-main">
          <img class="vmrk-cover" src="${esc(data.cover)}" alt="Pochette du titre" onerror="this.onerror=null;this.src='${FALLBACK}'">
          <div class="vmrk-info">
            <div class="vmrk-label">Titre actuellement diffusé 🎵</div>
            <div class="vmrk-title">${esc(data.title)}</div>
            <div class="vmrk-artist">${esc(data.artist)}</div>
            <div class="vmrk-date">Mis à jour : ${esc(formatDate(data.time))}</div>
          </div>
        </div>`;
    } catch (_) {
      root.innerHTML = '<div class="vmrk-empty">Connexion au direct en cours…</div>';
    }
  }

  function start() {
    installFrameStyle();
    refresh();
    setInterval(refresh, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
