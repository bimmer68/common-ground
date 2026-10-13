// Everything about a session: codes, database paths, create / join / watch.
//
// Database layout (see database.rules.json):
//   sessions/{CODE}/meta              { hostUid, createdAt }  – who owns the session
//   sessions/{CODE}/members/{uid}     true                    – used for counting (no names!)
//   sessions/{CODE}/nicknames/{uid}   "nickname"              – only the facilitator can read
//   sessions/{CODE}/hostPin           "123456"                – only the facilitator can read
//   sessions/{CODE}/pinAttempts/{uid} { pin, at }             – a takeover try, nobody can read
// Activities are in js/activity-store.js.
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

// 6 digits, e.g. "048213". Used to take over the session from another device.
function randomPin() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}

export function isValidPin(pin) {
  return /^[0-9]{6}$/.test(pin);
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

// Creates a new session owned by uid, together with its host PIN.
// The rules refuse to overwrite an existing session, so if a code is taken
// we simply try another one.
export async function createSession(uid) {
  const pin = randomPin();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    if (await getSessionMeta(code)) continue;
    try {
      await update(ref(db, path(code)), {
        meta: { hostUid: uid, createdAt: serverTimestamp() },
        hostPin: pin
      });
      return code;
    } catch (err) {
      // Someone took the same code in the same moment – try again.
      if (attempt === 9) throw err;
    }
  }
  throw new Error("Could not create a session code");
}

// Facilitator only (the rules refuse everyone else).
export async function getHostPin(code) {
  const snap = await get(ref(db, path(code, "hostPin")));
  return snap.val();
}

// Calls callback(meta) when the session's owner changes (e.g. taken over elsewhere).
export function watchMeta(code, callback, onError) {
  return onValue(ref(db, path(code, "meta")), (snap) => callback(snap.val()), onError);
}

const isDenied = (err) => String(err?.code || err?.message || "").toUpperCase().includes("PERMISSION_DENIED");

// Take control of a session from this device with the code and the host PIN.
// Two steps, both checked by the database rules:
//   1. write our try into pinAttempts/{uid}  (allowed at most once every 5 seconds)
//   2. write our uid into meta/hostUid        (allowed only if our try matches hostPin)
// Returns "ok", "notFound", "wait" (too fast) or "wrongPin".
export async function takeOverSession(code, uid, pin) {
  if (!(await getSessionMeta(code))) return "notFound";
  try {
    await set(ref(db, path(code, `pinAttempts/${uid}`)), { pin, at: serverTimestamp() });
  } catch (err) {
    if (isDenied(err)) return "wait";
    throw err;
  }
  try {
    await set(ref(db, path(code, "meta/hostUid")), uid);
  } catch (err) {
    if (isDenied(err)) return "wrongPin";
    throw err;
  }
  return "ok";
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
