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
//
// Proposed changes ("With a change" + what to change), like the texts on a wall:
//   sessions/{CODE}/amends/{id}/{pid}/{v}/{aid}     { text, at }   NO author;
//                                                   only the facilitator (and the author) can read it
//   sessions/{CODE}/myAmends/{id}/{pid}/{v}/{uid}   aid    "this proposal is mine" – only that uid can read it
// One proposal per person and version. The rules accept it only while that
// version is on the vote and only from someone whose vote is "With a change".
import { db, ref, get, set, update, push, onValue, serverTimestamp } from "./firebase.js";

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

// removeAmend: the id of my proposed change, deleted in the same step (when
// I change my vote away from "With a change", the proposal goes too).
export function saveSign(code, id, pid, v, uid, choice, removeAmend = null) {
  if (!removeAmend) return set(ref(db, path(code, `signs/${id}/${pid}/${v}/${uid}`)), choice);
  return update(ref(db, `sessions/${code}`), {
    [`signs/${id}/${pid}/${v}/${uid}`]: choice,
    [`myAmends/${id}/${pid}/${v}/${uid}`]: null,
    [`amends/${id}/${pid}/${v}/${removeAmend}`]: null
  });
}

// ----- Proposed changes -----

// Facilitator: calls callback({ pid: { v: { aid: { text, at } } } }) with all proposals of the activity.
export function watchAmends(code, id, callback, onError) {
  return onValue(ref(db, path(code, `amends/${id}`)), (snap) => callback(snap.val() || {}), onError);
}

// Participant: calls callback({ aid, text } or null) with my own proposal for one version.
export function watchMyAmend(code, id, pid, v, uid, callback, onError) {
  let reading = 0;
  return onValue(ref(db, path(code, `myAmends/${id}/${pid}/${v}/${uid}`)), async (snap) => {
    const aid = typeof snap.val() === "string" ? snap.val() : null;
    const mine = ++reading;
    if (!aid) return callback(null);
    try {
      const item = (await get(ref(db, path(code, `amends/${id}/${pid}/${v}/${aid}`)))).val();
      if (mine === reading) callback({ aid, text: item?.text || "" });
    } catch (err) {
      if (onError) onError(err);
    }
  }, onError);
}

// New proposal (aid = null) or a change of my proposal. The text and
// "this is mine" are written together, in one step.
export function saveAmend(code, id, pid, v, uid, aid, text) {
  if (aid) return set(ref(db, path(code, `amends/${id}/${pid}/${v}/${aid}`)), { text, at: serverTimestamp() });
  const newId = push(ref(db, path(code, `amends/${id}/${pid}/${v}`))).key;
  return update(ref(db, `sessions/${code}`), {
    [`myAmends/${id}/${pid}/${v}/${uid}`]: newId,
    [`amends/${id}/${pid}/${v}/${newId}`]: { text, at: serverTimestamp() }
  });
}

export function deleteAmend(code, id, pid, v, uid, aid) {
  return update(ref(db, `sessions/${code}`), {
    [`myAmends/${id}/${pid}/${v}/${uid}`]: null,
    [`amends/${id}/${pid}/${v}/${aid}`]: null
  });
}
