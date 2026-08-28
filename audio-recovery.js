(() => {
  'use strict';

  const STREAM_URL = 'https://radio.vmradio.fr/radio.mp3';
  const AUDIO_SELECTORS = ['#audio', 'audio'];
  const KEY = 'vmradio-audio-wanted';
  const STALL_DELAY = 9000;
  const RECOVERY_COOLDOWN = 12000;

  const LISTENER_ENDPOINT = 'https://admin.vmradio.fr/api/public/listeners';
  const LISTENER_ID_KEY = 'vmradio_listener_id';
  const LISTENER_HEARTBEAT_MS = 15000;
  let listenerTimer = 0;
  let listenerActive = false;

  let audio = null;
  let wanted = false;
  let reconnectTimer = 0;
  let stallTimer = 0;
  let reconnecting = false;
  let attempts = 0;
  let manualPause = false;
  let internalPause = false;
  let lastRecovery = 0;

  const getAudio = () => {
    if (audio && document.contains(audio)) return audio;
    for (const selector of AUDIO_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) return (audio = el);
    }
    return null;
  };

  const getListenerId = () => {
    let id = '';
    try { id = localStorage.getItem(LISTENER_ID_KEY) || ''; } catch (_) {}
    if (!/^vm_listener_[A-Za-z0-9_-]{12,96}$/.test(id)) {
      const raw = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36);
      id = 'vm_listener_' + raw;
      try { localStorage.setItem(LISTENER_ID_KEY, id); } catch (_) {}
    }
    return id;
  };

  const sendListener = action => {
    try {
      return fetch(LISTENER_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getListenerId(), source: 'app', action })
      }).catch(() => {});
    } catch (_) {}
  };

  const stopListenerPresence = () => {
    clearInterval(listenerTimer);
    listenerTimer = 0;
    if (listenerActive) sendListener('stop');
    listenerActive = false;
  };

  const startListenerPresence = () => {
    const a = getAudio();
    if (!a || a.paused || a.ended) return;
    listenerActive = true;
    sendListener('heartbeat');
    clearInterval(listenerTimer);
    listenerTimer = setInterval(() => {
      const current = getAudio();
      if (!current || current.paused || current.ended) return stopListenerPresence();
      sendListener('heartbeat');
    }, LISTENER_HEARTBEAT_MS);
  };

  const saveWanted = value => {
    wanted = value;
    try { localStorage.setItem(KEY, value ? '1' : '0'); } catch (_) {}
  };

  const readWanted = () => {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  };

  const clearTimers = () => {
    clearTimeout(reconnectTimer);
    clearTimeout(stallTimer);
    reconnectTimer = 0;
    stallTimer = 0;
  };

  const recover = reason => {
    const a = getAudio();
    const now = Date.now();
    if (!a || !wanted || manualPause || reconnecting) return;
    if (now - lastRecovery < RECOVERY_COOLDOWN) return;

    lastRecovery = now;
    reconnecting = true;
    attempts = Math.min(attempts + 1, 6);
    const delay = Math.min(9000, 900 * Math.pow(1.5, attempts - 1));

    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnecting = false;
      if (!wanted || manualPause) return;

      internalPause = true;
      const wasPlaying = !a.paused;
      try { a.pause(); } catch (_) {}
      a.src = STREAM_URL + '?vm_watchdog=' + Date.now();
      a.load();

      if (wasPlaying || wanted) {
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      setTimeout(() => { internalPause = false; }, 400);
    }, delay);

    console.warn('[VM RADIO] watchdog flux:', reason, 'tentative', attempts);
  };

  const armStallRecovery = reason => {
    if (!wanted || manualPause || reconnecting) return;
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      const a = getAudio();
      if (!a || !wanted || manualPause) return;
      if (a.paused || a.readyState < 2) recover(reason);
    }, STALL_DELAY);
  };

  const bind = () => {
    const a = getAudio();
    if (!a || a.dataset.vmAudioRecoveryV5) return !!a;
    a.dataset.vmAudioRecoveryV5 = '1';

    if (readWanted() && !a.paused) wanted = true;

    a.addEventListener('play', () => {
      manualPause = false;
      saveWanted(true);
      attempts = 0;
      clearTimeout(stallTimer);
    });

    a.addEventListener('playing', () => {
      reconnecting = false;
      internalPause = false;
      attempts = 0;
      clearTimers();
      startListenerPresence();
    });

    a.addEventListener('canplay', () => clearTimeout(stallTimer));

    a.addEventListener('pause', () => {
      clearTimers();
      if (!internalPause) stopListenerPresence();
      if (internalPause) return;
      if (wanted && !manualPause) setTimeout(() => recover('pause inattendue'), 1200);
    });

    a.addEventListener('stalled', () => armStallRecovery('stalled'));
    a.addEventListener('waiting', () => armStallRecovery('waiting'));
    a.addEventListener('error', () => { stopListenerPresence(); recover('error'); });
    a.addEventListener('ended', () => { stopListenerPresence(); recover('ended'); });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && wanted && !manualPause) {
        setTimeout(() => {
          const current = getAudio();
          if (!current || !wanted || manualPause) return;
          if (!current.paused && !current.ended) startListenerPresence();
          else if (!reconnecting) recover('retour au premier plan');
        }, 700);
      }
    });

    window.addEventListener('pageshow', () => {
      if (wanted && !manualPause) {
        setTimeout(() => {
          const current = getAudio();
          if (!current) return;
          if (!current.paused && !current.ended) startListenerPresence();
          else recover('retour dans l’application');
        }, 1000);
      }
    });

    window.addEventListener('online', () => {
      const current = getAudio();
      if (current && !current.paused && !current.ended) startListenerPresence();
      else if (wanted && !manualPause) recover('connexion rétablie');
    });

    window.addEventListener('pagehide', stopListenerPresence);
    window.addEventListener('beforeunload', stopListenerPresence);

    if (!a.paused && !a.ended) startListenerPresence();
    return true;
  };

  const patchPlayerControls = () => {
    const a = getAudio();
    if (!a || a.dataset.vmAudioControlsV5) return;
    a.dataset.vmAudioControlsV5 = '1';
    a.addEventListener('pause', () => {
      if (internalPause) return;
      if (document.visibilityState === 'visible') {
        manualPause = true;
        saveWanted(false);
      }
    }, true);
  };

  const init = () => {
    bind();
    patchPlayerControls();
    if (!audio) setTimeout(init, 500);
  };

  init();
})();
