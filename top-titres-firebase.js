import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, doc, runTransaction, query, orderBy, limit, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBng0eLDl7Pv05Wrx3U07rV3pxLMRGIpfk",
  authDomain: "vmradio-d07e1.firebaseapp.com",
  projectId: "vmradio-d07e1",
  storageBucket: "vmradio-d07e1.firebasestorage.app",
  messagingSenderId: "178955924208",
  appId: "1:178955924208:web:ba7ae54d489951d56ec835"
};

const app = initializeApp(firebaseConfig, "vmRadioTopTitres");
const db = getFirestore(app);
const auth = getAuth(app);

const normalize = value => String(value || "").trim();
const trackIdFor = (title, artist) => {
  const raw = `${normalize(artist)}-${normalize(title)}`.toLowerCase();
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "titre-inconnu";
};

export function getTopTitresAuth() { return auth; }
export function trackIdFromNowPlaying(title, artist) { return trackIdFor(title, artist); }

export async function voteForCurrentTrack({ title, artist, cover = "" }) {
  const user = auth.currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");

  title = normalize(title);
  artist = normalize(artist);
  cover = normalize(cover);
  if (!title || !artist) throw new Error("TRACK_REQUIRED");

  const trackId = trackIdFor(title, artist);
  const topRef = doc(db, "topTitres", trackId);
  const voteRef = doc(db, "votes", user.uid, "tracks", trackId);

  await runTransaction(db, async transaction => {
    const voteSnap = await transaction.get(voteRef);
    if (voteSnap.exists()) throw new Error("ALREADY_VOTED");

    const topSnap = await transaction.get(topRef);
    if (topSnap.exists()) {
      const current = topSnap.data();
      transaction.update(topRef, {
        title,
        artist,
        cover,
        votes: Number(current.votes || 0) + 1,
        updatedAt: serverTimestamp()
      });
    } else {
      transaction.set(topRef, {
        title,
        artist,
        cover,
        votes: 1,
        updatedAt: serverTimestamp()
      });
    }

    transaction.set(voteRef, {
      trackId,
      title,
      artist,
      cover,
      createdAt: serverTimestamp()
    });
  });

  return { trackId, title, artist, cover };
}

export async function getTopTitres(max = 20) {
  const q = query(collection(db, "topTitres"), orderBy("votes", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((item, index) => ({ rank: index + 1, id: item.id, ...item.data() }));
}

export function onTopTitresAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

window.VMRadioTopTitres = { voteForCurrentTrack, getTopTitres, getTopTitresAuth, trackIdFromNowPlaying };
