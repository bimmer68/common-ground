// Reads everything the report needs, once (no live listeners: a report is a
// snapshot of the session at the moment it is opened).
//
// It reads ONLY public parts of the session: activities, answers, approved
// texts, votes and signatures. It never reads "inbox" (texts that were not
// approved) or "mine" (who wrote what). Nicknames and languages are not in
// the database at all.
import { db, ref, get } from "./firebase.js";

const PARTS = ["meta", "members", "activities", "responses", "posts", "votes", "signs"];

// Returns { meta, members, activities, responses, posts, votes, signs } (each {} if empty).
export async function loadReportData(code) {
  const values = await Promise.all(PARTS.map((part) => get(ref(db, `sessions/${code}/${part}`)).then((snap) => snap.val() || {})));
  return Object.fromEntries(PARTS.map((part, i) => [part, values[i]]));
}
