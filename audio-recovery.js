(() => {
  'use strict';

  const STREAM_URL = 'https://radio.vmradio.fr/radio.mp3';
  const AUDIO_SELECTORS = ['#audio', 'audio'];
  const KEY = 'vmradio-audio-wanted';
  const STALL_DELAY = 9000;
  const RECOVERY_COOLDOWN = 12000;

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
    if (!a || a.dataset.vmAudioRecoveryV4) return !!a;
    a.dataset.vmAudioRecoveryV4 = '1';

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
    });

    a.addEventListener('canplay', () => clearTimeout(stallTimer));

    a.addEventListener('pause', () => {
      clearTimers();
      if (internalPause) return;
      // A spontaneous pause while playback was requested can be recovered.
      if (wanted && !manualPause) setTimeout(() => recover('pause inattendue'), 1200);
    });

    a.addEventListener('stalled', () => armStallRecovery('stalled'));
    a.addEventListener('waiting', () => armStallRecovery('waiting'));
    a.addEventListener('error', () => recover('error'));
    a.addEventListener('ended', () => recover('ended'));

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && wanted && !manualPause) {
        setTimeout(() => {
          const current = getAudio();
          if (!current || !wanted || manualPause) return;
          if (current.paused && !reconnecting) recover('retour au premier plan');
        }, 700);
      }
    });

    window.addEventListener('pageshow', () => {
      if (wanted && !manualPause) {
        setTimeout(() => {
          const current = getAudio();
          if (current && current.paused) recover('retour dans l’application');
        }, 1000);
      }
    });

    window.addEventListener('online', () => {
      if (wanted && !manualPause) recover('connexion rétablie');
    });

    return true;
  };

  const patchPlayerControls = () => {
    const a = getAudio();
    if (!a || a.dataset.vmAudioControlsV4) return;
    a.dataset.vmAudioControlsV4 = '1';
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
