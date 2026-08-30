(() => {
  'use strict';

  if (window.__VMRADIO_ACCOUNT_LIVE_SYNC__) return;
  window.__VMRADIO_ACCOUNT_LIVE_SYNC__ = true;

  const USER_KEY = 'vmradioAccountUserV1';
  const MENU_SRC = './vmradio-account-menu.js?v=20260831-live-sync1';
  let reloadingMenu = false;
  let lastHadUser = false;

  function readUser() {
    try {
      const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      return u && (u.id || u.email || u.name) ? u : null;
    } catch {
      return null;
    }
  }

  function injectLavenderTheme() {
    if (document.getElementById('vm-account-lavender-theme')) return;
    const style = document.createElement('style');
    style.id = 'vm-account-lavender-theme';
    style.textContent = `
#vm-account-card{
  border-color:rgba(218,180,255,.86)!important;
  background:
    radial-gradient(circle at 50% 0,rgba(221,183,255,.24),transparent 43%),
    linear-gradient(145deg,#21102f 0%,#12091d 55%,#09060e 100%)!important;
  box-shadow:0 22px 72px rgba(0,0,0,.65),0 0 34px rgba(205,155,255,.28)!important;
}
#vm-account-card h2{color:#f3e8ff!important;text-shadow:0 0 14px rgba(216,174,255,.18)}
#vm-account-card .sub{color:#cfc0dc!important}
.vm-account-tabs{border-color:rgba(214,174,255,.32)!important;background:rgba(22,10,31,.86)!important}
.vm-account-tab{color:#c9b6d8!important}
.vm-account-tab.active{
  background:linear-gradient(135deg,#d7a7ff 0%,#b56cf0 48%,#9349d7 100%)!important;
  color:#1a0b25!important;
  box-shadow:0 0 18px rgba(215,167,255,.28)!important;
}
.vm-account-field span{color:#dfcdee!important}
.vm-account-field input{
  border-color:rgba(208,164,243,.44)!important;
  background:#12091b!important;
  color:#fff!important;
}
.vm-account-field input:focus{
  border-color:#d6a5ff!important;
  box-shadow:0 0 0 3px rgba(214,165,255,.16),0 0 18px rgba(214,165,255,.12)!important;
}
.vm-account-main{
  background:linear-gradient(135deg,#d9adff 0%,#b66ff0 48%,#944bd9 100%)!important;
  color:#1b0b27!important;
  box-shadow:0 0 22px rgba(210,160,255,.24)!important;
}
#vm-account-status{color:#e0bdff!important}
.vm-account-note{color:#aa99b7!important}
.vm-account-privacy{
  border-color:rgba(217,173,255,.34)!important;
  background:rgba(205,154,255,.08)!important;
}
.vm-account-privacy summary{color:#e3c4ff!important}
.vm-account-privacy[open] summary{border-bottom-color:rgba(219,180,255,.2)!important}
.vm-account-privacy-body{color:#b9a7c6!important}
.vm-account-privacy-body strong{color:#f0e2f8!important}
.vm-account-privacy-body a{color:#ddaaff!important}
.vm-account-legal-mini{color:#95849f!important}
`;
    document.head.appendChild(style);
  }

  function loadActiveMenu() {
    const user = readUser();
    if (!user || document.getElementById('vm-account-home') || reloadingMenu) return;

    reloadingMenu = true;
    window.__VMRADIO_ACCOUNT_MENU__ = false;

    const script = document.createElement('script');
    script.src = MENU_SRC + '&_=' + Date.now();
    script.async = false;
    script.onload = () => { reloadingMenu = false; };
    script.onerror = () => { reloadingMenu = false; };
    document.head.appendChild(script);
  }

  function sync() {
    injectLavenderTheme();
    const hasUser = !!readUser();

    // Dès qu'une connexion vient d'être enregistrée, relance le menu compte
    // afin qu'il apparaisse immédiatement, sans recharger toute l'application.
    if (hasUser && (!lastHadUser || !document.getElementById('vm-account-home'))) {
      loadActiveMenu();
    }
    lastHadUser = hasUser;
  }

  function boot() {
    injectLavenderTheme();
    lastHadUser = !!readUser();
    sync();
    setInterval(sync, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
