// Everything about a session: codes, database paths, create / join / watch.
//
// Database layout (see database.rules.json):
//   sessions/{CODE}/meta              { hostUid, createdAt }  – who owns the session
//   sessions/{CODE}/members/{uid}     true                    – used for counting (no names!)
//   sessions/{CODE}/nicknames/{uid}   "nickname"              – only the facilitator can read
import { db, ref, get, set, update, onValue, serverTimestamp } from "./firebase.js";

// No I and O, so nobody confuses them with 1 and 0.
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const NICKNAME_MAX = 24;

export function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function isValidCode(code) {
  return /^[A-Z]{4}$/.test(code);
}

export function normalizeNickname(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function isValidNickname(nickname) {
  return nickname.length >= 1 && nickname.length <= NICKNAME_MAX;
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => LETTERS[b % LETTERS.length]).join("");
}

// Code from the address bar, e.g. index.html?s=ROND -> "ROND".
export function codeFromUrl() {
  const code = normalizeCode(new URLSearchParams(location.search).get("s"));
  return isValidCode(code) ? code : null;
}

// Builds a link to another page of the app, next to the current one
// (works on GitHub Pages, where the app lives in a sub-folder).
export function pageUrl(page, code) {
  const url = new URL(page, location.href);
  url.search = code ? `?s=${code}` : "";
  url.hash = "";
  return url.toString();
}

const path = (code, part = "") => `sessions/${code}${part ? "/" + part : ""}`;

export async function getSessionMeta(code) {
  const snap = await get(ref(db, path(code, "meta")));
  return snap.exists() ? snap.val() : null;
}

// Creates a new session owned by uid. The rules refuse to overwrite an
// existing session, so if a code is taken we simply try another one.
export async function createSession(uid) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    if (await getSessionMeta(code)) continue;
    try {
      await set(ref(db, path(code, "meta")), { hostUid: uid, createdAt: serverTimestamp() });
      return code;
    } catch (err) {
      // Someone took the same code in the same moment – try again.
      if (attempt === 9) throw err;
    }
  }
  throw new Error("Could not create a session code");
}

// Participant joins: nickname and membership are written together.
export function joinSession(code, uid, nickname) {
  return update(ref(db, path(code)), {
    [`nicknames/${uid}`]: nickname,
    [`members/${uid}`]: true
  });
}

export async function isMember(code, uid) {
  const snap = await get(ref(db, path(code, `members/${uid}`)));
  return snap.val() === true;
}

// A participant may read back only their own nickname.
export async function getOwnNickname(code, uid) {
  const snap = await get(ref(db, path(code, `nicknames/${uid}`)));
  return snap.val() || "";
}

// Calls callback(number) every time someone joins.
export function watchMemberCount(code, callback) {
  return onValue(ref(db, path(code, "members")), (snap) => callback(snap.size));
}

// Facilitator only: calls callback([{ uid, nickname }]) every time the list changes.
export function watchNicknames(code, callback, onError) {
  return onValue(ref(db, path(code, "nicknames")), (snap) => {
    const list = [];
    snap.forEach((child) => {
      list.push({ uid: child.key, nickname: child.val() });
    });
    callback(list);
  }, onError);
}
