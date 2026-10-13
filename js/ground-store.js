// Database access for the Common Ground activity (Faza 8): the "signatures".
//
//   sessions/{CODE}/signs/{id}/{pid}/{v}/{uid}   0 | 1 | 2
//        0 = "I can sign", 1 = "With a change", 2 = "I can't sign"
//
// {pid} is the statement (an approved text), {v} its version: "v0" is the
// text as it was proposed, "v1", "v2" … are the facilitator's new versions.
// Every version keeps its own signatures, so an old version and its result
// stay in the history when a new version is put to the vote.
//
// Like every other answer, a signature is tied only to the anonymous uid,
// never to a nickname.
import { db, ref, set, onValue } from "./firebase.js";

const path = (code, part) => `sessions/${code}/${part}`;

// Calls callback({ pid: { v: { uid: 0 | 1 | 2 } } }) with all signatures of the activity.
export function watchSigns(code, id, callback, onError) {
  return onValue(ref(db, path(code, `signs/${id}`)), (snap) => callback(snap.val() || {}), onError);
}

// Calls callback(0 | 1 | 2 | null) with my own signature for one version.
export function watchMySign(code, id, pid, v, uid, callback, onError) {
  return onValue(ref(db, path(code, `signs/${id}/${pid}/${v}/${uid}`)), (snap) => {
    const value = snap.val();
    callback(value === 0 || value === 1 || value === 2 ? value : null);
  }, onError);
}

export function saveSign(code, id, pid, v, uid, choice) {
  return set(ref(db, path(code, `signs/${id}/${pid}/${v}/${uid}`)), choice);
}
