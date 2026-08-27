(() => {
  const TOKEN_KEY = "vmRadioFcmToken";
  const CONFIG = {
    apiKey: "AIzaSyB0LSbKdAAEfLg48c4DJO2hdyvjx0TySko",
    authDomain: "vm-radio-notifications.firebaseapp.com",
    projectId: "vm-radio-notifications",
    storageBucket: "vm-radio-notifications.firebasestorage.app",
    messagingSenderId: "573483400068",
    appId: "1:573483400068:web:5e3b80a9ac49dc284ebbd1",
    measurementId: "G-ZJPS49DKG3"
  };

  const removeLegacyUpdatePopup = () => {
    const legacy = document.getElementById("vm-radio-update-notice");
    if (legacy) legacy.remove();

    document.querySelectorAll("body *").forEach(el => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text.includes("Nouvelle mise à jour disponible") || !text.includes("Mettre à jour") || text.includes("Plus tard")) return;

      let target = el;
      for (let i = 0; i < 6 && target.parentElement; i++) {
        const parent = target.parentElement;
        const position = getComputedStyle(parent).position;
        if (position === "fixed" || position === "absolute") target = parent;
        else break;
      }
      if (target !== document.body && target !== document.documentElement) target.remove();
    });
  };

  removeLegacyUpdatePopup();
  const observer = new MutationObserver(removeLegacyUpdatePopup);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  async function syncToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const [{ initializeApp }, { getFirestore, doc, setDoc, serverTimestamp }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js")
      ]);
      const app = initializeApp(CONFIG, "vmRadioTokenSync");
      const db = getFirestore(app);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const id = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      await setDoc(doc(db, "fcmTokens", id), {
        token,
        platform: "web",
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn("VM RADIO token sync indisponible:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncToken, { once: true });
  } else {
    syncToken();
  }
})();
