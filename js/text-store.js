// Database access for TEXT answers (Faza 4 and 5): word cloud, wall and
// moderated wall all use the same pieces.
//
//   sessions/{CODE}/posts/{id}/{round}/{pid}        { text, group?, at }   PUBLIC: projector and phones read it
//   sessions/{CODE}/inbox/{id}/{round}/{pid}        { text, group?, label?, at }
//                                                   moderated wall only, NOT approved yet:
//                                                   only the facilitator (and the author) can read it
//   sessions/{CODE}/mine/{id}/{round}/{uid}/{slot}  pid    "this text is mine" – only that uid can read it
//   sessions/{CODE}/votes/{id}/{uid}/{slot}         pid    wall voting, one slot per vote
//   sessions/{CODE}/guesses/{id}/{pid}/{uid}        0 | 1  "Who wrote this?" guesses
//
// A text (post) has NO author field. The only link between a person and their
// text is "mine", and that only the person themselves can read. So the
// projector and the facilitator never know who wrote what.
//
// {round}: the word cloud has one round per prompt ("q0", "q1" …), a wall has
// one round ("main"). {slot}: "0", "1" or "2" – this is how the rules count
// "at most N texts per person".
import { db, ref, get, update, push, onValue, serverTimestamp } from "./firebase.js";

const path = (code, part) => `sessions/${code}/${part}`;

// Calls callback({ pid: { text, group?, at } }) with all public texts of a round.
export function watchPosts(code, id, round, callback, onError) {
  return onValue(ref(db, path(code, `posts/${id}/${round}`)), (snap) => callback(snap.val() || {}), onError);
}

// Facilitator only: texts waiting for approval (the rules refuse everyone else).
export function watchInbox(code, id, round, callback, onError) {
  return onValue(ref(db, path(code, `inbox/${id}/${round}`)), (snap) => callback(snap.val() || {}), onError);
}

// Calls callback({ slot: pid }) with my own texts in this round.
export function watchMine(code, id, round, uid, callback, onError) {
  return onValue(ref(db, path(code, `mine/${id}/${round}/${uid}`)), (snap) => callback(snap.val() || {}), onError);
}

// One of my own texts that is still in the inbox (moderated wall).
export async function getOwnInboxText(code, id, round, pid) {
  return (await get(ref(db, path(code, `inbox/${id}/${round}/${pid}`)))).val();
}

// New text: the text and "slot N is mine" are written together, in one step.
// store: "posts" (public at once) or "inbox" (moderated: waits for approval).
export function addText(code, id, round, uid, slot, store, fields) {
  const pid = push(ref(db, path(code, `${store}/${id}/${round}`))).key;
  return update(ref(db, `sessions/${code}`), {
    [`mine/${id}/${round}/${uid}/${slot}`]: pid,
    [`${store}/${id}/${round}/${pid}`]: { ...fields, at: serverTimestamp() }
  });
}

// Edit my text. Moderated: the edited text goes back to the inbox and the
// public copy (if it was approved) is removed – it needs a new approval.
// fields.at (the time it was first sent) is kept, so the card doesn't jump.
export function editText(code, id, round, pid, store, fields, removePublic = false) {
  const changes = { [`${store}/${id}/${round}/${pid}`]: { at: serverTimestamp(), ...fields } };
  if (removePublic) changes[`posts/${id}/${round}/${pid}`] = null;
  return update(ref(db, `sessions/${code}`), changes);
}

// Delete my text everywhere and free the slot, in one step.
export function deleteText(code, id, round, uid, slot, pid, stores) {
  const changes = { [`mine/${id}/${round}/${uid}/${slot}`]: null };
  stores.forEach((store) => { changes[`${store}/${id}/${round}/${pid}`] = null; });
  return update(ref(db, `sessions/${code}`), changes);
}

// Facilitator, moderated wall: copy the approved text to the public "posts"
// (without the secret label) and take it off the hidden list.
export function approveText(code, id, round, pid, item) {
  const copy = { text: item.text, at: serverTimestamp() };
  if (item.group === true) copy.group = true;
  return update(ref(db, `sessions/${code}`), {
    [`posts/${id}/${round}/${pid}`]: copy,
    [`activities/${id}/hidden/${round}/${pid}`]: null
  });
}

// Facilitator: hide a text (wall card or a word) from the projector, or show it again.
// Moderated wall: hiding also removes the public copy, so the text is
// unreadable for the projector again.
export function setHidden(code, id, round, key, hidden, removePublic = false) {
  const changes = { [`activities/${id}/hidden/${round}/${key}`]: hidden ? true : null };
  if (removePublic) changes[`posts/${id}/${round}/${key}`] = null;
  return update(ref(db, `sessions/${code}`), changes);
}

// ----- Voting on wall cards -----

// Calls callback({ uid: { slot: pid } }).
export function watchVotes(code, id, callback, onError) {
  return onValue(ref(db, path(code, `votes/${id}`)), (snap) => callback(snap.val() || {}), onError);
}

export function setVote(code, id, uid, slot, pid) {
  return update(ref(db, path(code, `votes/${id}/${uid}`)), { [slot]: pid });
}

// Votes per card: { pid: 3 }. Every person counts at most once per card.
export function tallyVotes(votes) {
  const counts = {};
  Object.values(votes || {}).forEach((slots) => {
    new Set(Object.values(slots || {})).forEach((pid) => { counts[pid] = (counts[pid] || 0) + 1; });
  });
  return counts;
}

// ----- "Who wrote this?" guesses -----

// Calls callback({ uid: 0 | 1 }) for one spotlighted text.
export function watchGuesses(code, id, pid, callback, onError) {
  return onValue(ref(db, path(code, `guesses/${id}/${pid}`)), (snap) => callback(snap.val() || {}), onError);
}

export function saveGuess(code, id, pid, uid, label) {
  return update(ref(db, path(code, `guesses/${id}/${pid}`)), { [uid]: label });
}
