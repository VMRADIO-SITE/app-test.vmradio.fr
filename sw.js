importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyB0LSkBdAAEfLg48c4DJO2hdyvjx0TySko",
  authDomain: "vm-radio-notifications.firebaseapp.com",
  projectId: "vm-radio-notifications",
  storageBucket: "vm-radio-notifications.firebasestorage.app",
  messagingSenderId: "573483400068",
  appId: "1:573483400068:web:5e3b80a9ac49dc284ebbd1",
  measurementId: "G-ZJPS49DKG3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

self.addEventListener("push", event => {
  console.log("VM RADIO FCM PUSH EVENT", event.data ? event.data.text() : "<no payload>");
});

messaging.onBackgroundMessage(payload => {
  console.log("VM RADIO FCM BACKGROUND MESSAGE", payload);
  if (payload && payload.notification) return;
  const data = payload?.data || {};
  const title = data.title || "VM RADIO";
  const body = data.body || "Une nouvelle information est disponible.";
  const link = data.url || data.link || data.click_action || "./";
  const icon = data.icon || "./vmradio-app-icon-192.png";
  const tag = data.tag || "vm-radio";
  self.registration.showNotification(title, { body, icon, badge: icon, tag, data: { url: link } });
});

// v46 : Top Titres D1 avec handler coeur dédié injecté en dernier.
const CACHE_NAME = "vm-radio-app-v46";
const APP_SHELL = [
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
  "./notifications.js",
  "./dedications-feed.js?v=5",
  "./fcm-token-sync.js",
  "./audio-recovery.js",
  "./pwa-install-tracker.js?v=20260828-topd1",
  "./top-titres-heart.js?v=20260828-1"
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
  const fcmMessage = notificationData.FCM_MSG || notificationData.fcmMessage || {};
  const fcmOptions = fcmMessage.notification?.click_action ? { link: fcmMessage.notification.click_action } : (fcmMessage.fcmOptions || {});
  const targetUrl = notificationData.url || notificationData.link || fcmOptions.link || fcmOptions.click_action || "./";
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

          // L'ancien Top Titres Firebase ne doit plus manipuler le coeur sur app-test.
          injected = injected.replace(/<script[^>]+id=["']vm-radio-top-titres-firebase["'][^>]*>[\s\S]*?<\/script>/i, '');

          // Une seule version du moteur D1 et une seule version du handler coeur.
          injected = injected.replace(/\s*<script[^>]+src=["'][^"']*pwa-install-tracker\.js[^"']*["'][^>]*><\/script>/gi, '');
          injected = injected.replace(/\s*<script[^>]+src=["'][^"']*top-titres-heart\.js[^"']*["'][^>]*><\/script>/gi, '');

          if (!injected.includes("./dedications-feed.js")) injected = injected.replace(/<\/body>/i, '<script src="./dedications-feed.js?v=5"></script></body>');
          if (!injected.includes("./notifications.js")) injected = injected.replace(/<\/body>/i, '<script type="module" src="./notifications.js?v=vm27"></script></body>');
          if (!injected.includes("./fcm-token-sync.js")) injected = injected.replace(/<\/body>/i, '<script type="module" src="./fcm-token-sync.js?v=1"></script></body>');
          if (!injected.includes("./audio-recovery.js")) injected = injected.replace(/<\/body>/i, '<script src="./audio-recovery.js?v=3"></script></body>');
          injected = injected.replace(/<\/body>/i, '<script src="./pwa-install-tracker.js?v=20260828-topd1"></script><script src="./top-titres-heart.js?v=20260828-1"></script></body>');

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
