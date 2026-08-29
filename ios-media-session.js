(() => {
  'use strict';

  if (window.__VMRADIO_IOS_MEDIA_SESSION_V1__) return;
  window.__VMRADIO_IOS_MEDIA_SESSION_V1__ = true;

  const DEFAULT_ARTIST = 'Music IA By Valentin';

  function getAudio() {
    const audio = window.VMRadioPlayer?.audio;
    return audio && typeof audio.play === 'function' && typeof audio.pause === 'function' ? audio : null;
  }

  function setPlaybackAudioSession() {
    try {
      if ('audioSession' in navigator && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch (_) {}
  }

  function absoluteArtwork(src) {
    if (!src) return [];
    try { return [{ src: new URL(String(src), location.href).href }]; }
    catch (_) { return [{ src: String(src) }]; }
  }

  function updateMetadata() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const title = (document.getElementById('title')?.textContent || document.querySelector('[data-current-title]')?.textContent || 'VM RADIO').trim();
    const artist = (document.getElementById('artist')?.textContent || document.querySelector('[data-current-artist]')?.textContent || DEFAULT_ARTIST).trim();
    const cover = document.getElementById('cover')?.src || document.querySelector('[data-current-cover]')?.src || '';
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'VM RADIO',
        artist: artist || DEFAULT_ARTIST,
        album: 'VM RADIO',
        artwork: absoluteArtwork(cover)
      });
    } catch (_) {}
  }

  function install() {
    const audio = getAudio();
    if (!audio) {
      setTimeout(install, 250);
      return;
    }

    setPlaybackAudioSession();

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', async () => {
          setPlaybackAudioSession();
          try { await audio.play(); } catch (_) {}
        });
      } catch (_) {}

      try {
        navigator.mediaSession.setActionHandler('pause', () => {
          try { audio.pause(); } catch (_) {}
        });
      } catch (_) {}

      try {
        navigator.mediaSession.setActionHandler('stop', () => {
          try { audio.pause(); } catch (_) {}
        });
      } catch (_) {}

      for (const action of ['seekbackward', 'seekforward', 'previoustrack', 'nexttrack']) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch (_) {}
      }
    }

    audio.addEventListener('play', setPlaybackAudioSession);
    audio.addEventListener('playing', setPlaybackAudioSession);
    audio.addEventListener('play', updateMetadata);
    audio.addEventListener('playing', updateMetadata);

    const metadataRoot = document.querySelector('.player-shell') || document.body;
    if (metadataRoot) {
      new MutationObserver(updateMetadata).observe(metadataRoot, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['src']
      });
    }

    updateMetadata();
  }

  install();
})();
