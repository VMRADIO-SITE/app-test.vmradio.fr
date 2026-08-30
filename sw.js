importScripts("./web-push-sw-handler.js?v=1");

// v57 : controles audio natifs iPhone sur le vrai element audio DOM.
const CACHE_NAME = "vm-radio-app-v58-logo2";
const APP_SHELL = [
  "./vm-radio-appli-logo.png",
  "./",
  "./index.html",
  "./dedicaces.html",
  "./infos.html",
  "./tiktok.html",
  "./conditions.html",
  "./vm-radio-home-logo.png",
  "./vmradio-app-icon-192.png",
  "./vmradio-app-icon-512.png",
  "./manifest.webmanifest",
  "./notifications.js?v=native1",
  "./dedications-feed.js?v=5",
  "./audio-recovery.js?v=6",
  "./pwa-install-tracker.js?v=20260828-topd1",
  "./top-titres-heart.js?v=20260828-1",
  "./player-source-badge.js?v=20260829-sourcehalo1",
  "./web-push-sw-handler.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || notificationData.link || "./";
  const absoluteTarget = new URL(targetUrl, self.location.href).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(absoluteTarget);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(absoluteTarget);
    })
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/telecharger.html")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  if (/radio|stream|audio/i.test(url.pathname)) return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" }).then(async response => {
      if (!response || !response.ok) return response;

      if (url.pathname.endsWith("/index.html") || url.pathname === "/") {
        const type = response.headers.get("content-type") || "";
        if (type.includes("text/html")) {
          const html = await response.text();
          let injected = html;

          injected = injected.replace(/<meta[^>]+name=["']viewport["'][^>]*>/i, '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">');
          if (!injected.includes("vm-radio-no-pinch-zoom")) {
            injected = injected.replace(/<\/head>/i, '<style id="vm-radio-no-pinch-zoom">html,body{touch-action:pan-x pan-y;overscroll-behavior-x:none}body{-webkit-text-size-adjust:100%}button,a,input,select,textarea{touch-action:manipulation}</style></head>');
          }

          // Aucun ancien controleur Media Session ne doit rester : iOS pilote le vrai <audio> nativement.
          injected = injected.replace(/<script[^>]+id=["']vm-radio-media-session["'][^>]*>[\s\S]*?<\/script>/gi, '');
          injected = injected.replace(/<script[^>]+id=["']vm-radio-background-media-session["'][^>]*>[\s\S]*?<\/script>/gi, '');
          injected = injected.replace(/<script[^>]+id=["']vm-radio-top-titres-firebase["'][^>]*>[\s\S]*?<\/script>/i, '');
          injected = injected.replace(/\s*<script[^>]+src=["'][^"']*pwa-install-tracker\.js[^"']*["'][^>]*><\/script>/gi, '');
          injected = injected.replace(/\s*<script[^>]+src=["'][^"']*top-titres-heart\.js[^"']*["'][^>]*><\/script>/gi, '');
          injected = injected.replace(/\s*<script[^>]+src=["'][^"']*notifications\.js[^"']*["'][^>]*><\/script>/gi, '');
          injected = injected.replace(/\s*<script[^>]+src=["'][^"']*fcm-token-sync\.js[^"']*["'][^>]*><\/script>/gi, '');
          injected = injected.replace(/\s*<script[^>]+src=["'][^"']*web-push-client\.js[^"']*["'][^>]*><\/script>/gi, '');
          injected = injected.replace(/\s*<script[^>]+src=["'][^"']*web-push-prompt\.js[^"']*["'][^>]*><\/script>/gi, '');

          injected = injected.replace(/vm-radio-flux-central\.js(?:\?[^"']*)?/gi, 'vm-radio-flux-central.js?v=20260829-lockscreen-native1');
          injected = injected.replace(/audio-recovery\.js(?:\?[^"']*)?/gi, 'audio-recovery.js?v=6');
          injected = injected.replace(/player-source-badge\.js(?:\?[^"']*)?/gi, 'player-source-badge.js?v=20260829-sourcehalo1');

          if (!injected.includes("./dedications-feed.js")) injected = injected.replace(/<\/body>/i, '<script src="./dedications-feed.js?v=5"></script></body>');
          if (!injected.includes("./audio-recovery.js")) injected = injected.replace(/<\/body>/i, '<script src="./audio-recovery.js?v=6"></script></body>');
          if (!injected.includes("player-source-badge.js")) injected = injected.replace(/<\/body>/i, '<script src="./player-source-badge.js?v=20260829-sourcehalo1"></script></body>');
          injected = injected.replace(/<\/body>/i, '<script src="./pwa-install-tracker.js?v=20260828-topd1"></script><script src="./top-titres-heart.js?v=20260828-1"></script><script src="./notifications.js?v=native1"></script></body>');

          const headers = new Headers(response.headers);
          headers.delete("content-length");
          return new Response(injected, { status: response.status, statusText: response.statusText, headers });
        }
      }

      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});