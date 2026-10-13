// Database access for activities. Used by the loop and by activity modules.
//
// Database layout (see database.rules.json):
//   sessions/{CODE}/current                        { activityId }   – what is running now (only the facilitator writes)
//   sessions/{CODE}/activities/{id}                { type, phase, revealed, createdAt, config, state?, compare? }
//   sessions/{CODE}/responses/{id}/{phase}/{uid}   the participant's answer (tied to the uid, never to a nickname)
import { db, ref, get, set, update, push, onValue, serverTimestamp } from "./firebase.js";

const path = (code, part) => `sessions/${code}/${part}`;

// Creates a new activity and makes it the current one, in a single write.
// extra: more fields some types need from the start (the poll's "state").
export async function startNewActivity(code, type, phase, config, extra = {}) {
  const id = push(ref(db, path(code, "activities"))).key; // a new unique id, nothing is written yet
  await update(ref(db, `sessions/${code}`), {
    [`activities/${id}`]: { ...extra, type, phase, revealed: false, createdAt: serverTimestamp(), config },
    current: { activityId: id }
  });
  return id;
}

// id = null takes everyone back to the waiting screen / QR code.
export function setCurrent(code, id) {
  return set(ref(db, path(code, "current")), id ? { activityId: id } : null);
}

export function updateActivity(code, id, fields) {
  return update(ref(db, path(code, `activities/${id}`)), fields);
}

// Calls callback(activityId or null) every time the facilitator switches.
export function watchCurrent(code, callback, onError) {
  return onValue(ref(db, path(code, "current")), (snap) => callback(snap.val()?.activityId || null), onError);
}

// Calls callback(activity or null) every time this activity changes (phase, reveal…).
export function watchActivity(code, id, callback, onError) {
  return onValue(ref(db, path(code, `activities/${id}`)), (snap) => callback(snap.val()), onError);
}

// Calls callback([{ id, ...activity }]) with all activities, oldest first.
export function watchActivities(code, callback, onError) {
  return onValue(ref(db, path(code, "activities")), (snap) => {
    const list = [];
    snap.forEach((child) => { list.push({ id: child.key, ...child.val() }); });
    list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    callback(list);
  }, onError);
}

export function saveResponse(code, id, phase, uid, answer) {
  return set(ref(db, path(code, `responses/${id}/${phase}/${uid}`)), answer);
}

export async function getOwnResponse(code, id, phase, uid) {
  const snap = await get(ref(db, path(code, `responses/${id}/${phase}/${uid}`)));
  return snap.val();
}

// Calls callback({ phase: { uid: answer } }) every time someone answers.
export function watchResponses(code, id, callback, onError) {
  return onValue(ref(db, path(code, `responses/${id}`)), (snap) => callback(snap.val() || {}), onError);
}
