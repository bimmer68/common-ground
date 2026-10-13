// One place that loads Firebase (fixed version from the official CDN)
// and signs the browser in anonymously.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export { ref, get, set, update, push, onValue, serverTimestamp };

// Resolves with the anonymous user. Firebase remembers the user in the
// browser, so after a page refresh we get the SAME uid back instead of a new one.
export function ensureSignedIn() {
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) {
        stop();
        resolve(user);
      }
    }, reject);
    // Wait until Firebase has checked for a remembered user before creating a new one.
    auth.authStateReady().then(() => {
      if (!auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          stop();
          reject(err);
        });
      }
    });
  });
}

// The difference between this device's clock and the database server's clock.
// Firebase measures it when it connects and keeps it in ".info/serverTimeOffset".
// serverNow() = "what time is it on the server right now", even if the clock
// on this phone or laptop is a few seconds (or minutes) wrong.
let serverOffset = 0;
onValue(ref(db, ".info/serverTimeOffset"), (snap) => { serverOffset = Number(snap.val()) || 0; });

export function serverNow() {
  return Date.now() + serverOffset;
}

// Calls callback(true/false) whenever the connection to the database changes.
export function watchConnection(callback) {
  return onValue(ref(db, ".info/connected"), (snap) => callback(snap.val() === true));
}
