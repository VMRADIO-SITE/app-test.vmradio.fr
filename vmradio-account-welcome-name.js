(() => {
  'use strict';

  if (window.__VMRADIO_ACCOUNT_WELCOME_NAME__) return;
  window.__VMRADIO_ACCOUNT_WELCOME_NAME__ = true;

  const API = 'https://admin.vmradio.fr/api/app-auth/session';
  const USER_KEY = 'vmradioAccountUserV1';
  let user = null;

  const clean = v => String(v ?? '').trim();
  const displayName = u => clean(u?.name || u?.display_name || u?.email?.split('@')?.[0] || '');

  function cachedUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  }

  function ensureStyle() {
    if (document.getElementById('vm-account-welcome-name-style')) return;
    const style = document.createElement('style');
    style.id = 'vm-account-welcome-name-style';
    style.textContent = `
#vm-account-welcome-line{
  display:block!important;
  width:100%!important;
  margin:8px auto 0!important;
  text-align:center!important;
  color:#d9a7ff!important;
  font:900 14px/1.25 Arial,sans-serif!important;
}
`;
    document.head.appendChild(style);
  }

  function render() {
    const splash = document.getElementById('vmWelcomeSplash');
    if (!splash || !user) return;
    const name = displayName(user);
    if (!name) return;

    ensureStyle();

    let line = document.getElementById('vm-account-welcome-line');
    if (!line) {
      line = document.createElement('div');
      line.id = 'vm-account-welcome-line';

      const card = splash.querySelector('.vmWelcomeCard') || splash.firstElementChild || splash;
      const title = splash.querySelector('.vmWelcomeTitle') || splash.querySelector('h1,h2,.title');
      if (title && title.parentElement === card) title.insertAdjacentElement('afterend', line);
      else card.appendChild(line);
    }

    line.textContent = 'Bienvenue ' + name + ' 💜';
  }

  async function syncSession() {
    const local = cachedUser();
    if (local) {
      user = local;
      render();
    }

    try {
      const response = await fetch(API, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.authenticated && data?.user) {
        user = data.user;
        try { localStorage.setItem(USER_KEY, JSON.stringify(data.user)); } catch {}
        render();
      }
    } catch {}
  }

  const observer = new MutationObserver(() => render());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('vmradio:pagechange', () => setTimeout(render, 0));
  window.addEventListener('storage', event => {
    if (event.key === USER_KEY) {
      user = cachedUser();
      render();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncSession, { once: true });
  } else {
    syncSession();
  }
})();
