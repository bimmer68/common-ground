// Database rules (database.rules.json) on the Firebase emulator.
// Every test plays several devices: the facilitator ("host"), participants
// ("p1", "p2"), the projector ("screen") and someone who is not in the
// session ("stranger"). Each one has its own anonymous uid.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { setLogLevel } from "firebase/app";

setLogLevel("silent"); // refused writes are expected here; no warnings in the output

const TS = { ".sv": "timestamp" };
let env;
let n = 0;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-common-ground",
    database: { rules: readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"), host: "127.0.0.1", port: 9000 }
  });
  await env.clearDatabase(); // start empty (the session codes below are reused on every run)
});
after(async () => { await env.cleanup(); });

const as = (uid) => env.authenticatedContext(uid).database();
const pushId = () => as("host").ref().push().key;

// A fresh session code for every test: ROAA, ROAB …
function newCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  n++;
  return `T${letters[Math.floor(n / 576) % 24]}${letters[Math.floor(n / 24) % 24]}${letters[n % 24]}`;
}

// Session with host PIN 123456 and members p1, p2.
async function session() {
  const code = newCode();
  await assertSucceeds(as("host").ref(`sessions/${code}`).update({ meta: { hostUid: "host", createdAt: TS }, hostPin: "123456" }));
  for (const uid of ["p1", "p2"]) await assertSucceeds(as(uid).ref(`sessions/${code}/members/${uid}`).set(true));
  return code;
}

// Creates an activity and makes it the current one (as js/activity-store.js does).
async function activity(code, fields) {
  const id = pushId();
  await assertSucceeds(as("host").ref(`sessions/${code}`).update({
    [`activities/${id}`]: { revealed: false, createdAt: TS, ...fields },
    current: { activityId: id }
  }));
  return id;
}

const s = (code) => (path) => `sessions/${code}/${path}`;

// ---------- Session, PIN, members ----------

test("session: create, no overwrite, PIN only for the host", async () => {
  const code = await session();
  await assertFails(as("p1").ref(`sessions/${code}/meta`).set({ hostUid: "p1", createdAt: TS }));
  await assertSucceeds(as("host").ref(`sessions/${code}/hostPin`).get());
  await assertFails(as("p1").ref(`sessions/${code}/hostPin`).get());
  await assertFails(as("screen").ref(`sessions/${code}/hostPin`).get());
  await assertSucceeds(as("screen").ref(`sessions/${code}/meta`).get());
});

test("members: only your own entry, value true", async () => {
  const code = await session();
  await assertFails(as("p1").ref(`sessions/${code}/members/p2`).set(true));
  await assertFails(as("stranger").ref(`sessions/${code}/members/stranger`).set("yes"));
  await assertSucceeds(as("stranger").ref(`sessions/${code}/members/stranger`).set(true));
  const count = (await as("screen").ref(`sessions/${code}/members`).get()).numChildren();
  assert.equal(count, 3);
});

test("takeover: wrong PIN refused, right PIN works, attempts limited", async () => {
  const code = await session();
  const p = s(code);
  await assertSucceeds(as("other").ref(p("pinAttempts/other")).set({ pin: "000000", at: TS }));
  await assertFails(as("other").ref(p("meta/hostUid")).set("other"));
  await assertFails(as("other").ref(p("pinAttempts/other")).set({ pin: "123456", at: TS })); // too fast
  await assertSucceeds(as("third").ref(p("pinAttempts/third")).set({ pin: "123456", at: TS }));
  await assertSucceeds(as("third").ref(p("meta/hostUid")).set("third"));
  await assertFails(as("host").ref(p("hostPin")).get()); // the old device lost the PIN
});

// ---------- Activities, current, timer ----------

test("activities: only the host writes; current must exist", async () => {
  const code = await session();
  const p = s(code);
  await assertFails(as("p1").ref(p(`activities/${pushId()}`)).set({ type: "poll", phase: "q0", revealed: false, createdAt: TS }));
  await assertFails(as("host").ref(p("current")).set({ activityId: pushId() }));
  const id = await activity(code, { type: "measure", phase: "before", config: { statements: ["a", "b"] } });
  await assertFails(as("p1").ref(p("current")).set(null));
  await assertSucceeds(as("host").ref(p("current")).set(null));
  await assertSucceeds(as("host").ref(p("current")).set({ activityId: id }));
  await assertFails(as("host").ref(p(`activities/${id}/type`)).set("poll"));
});

test("timer: host only, 5–3600 seconds", async () => {
  const code = await session();
  const p = s(code);
  await assertFails(as("p1").ref(p("timer")).set({ startedAt: TS, duration: 90 }));
  await assertFails(as("host").ref(p("timer")).set({ startedAt: TS, duration: 4 }));
  await assertSucceeds(as("host").ref(p("timer")).set({ startedAt: TS, duration: 90, big: true }));
  await assertSucceeds(as("host").ref(p("timer")).update({ big: false }));
});

// ---------- Measure and poll ----------

test("measure: answers 1–5, only in the current phase, only members", async () => {
  const code = await session();
  const p = s(code);
  const id = await activity(code, { type: "measure", phase: "before", config: { statements: ["a", "b"] } });
  await assertSucceeds(as("p1").ref(p(`responses/${id}/before/p1`)).set([2, 4]));
  await assertFails(as("p1").ref(p(`responses/${id}/before/p1`)).set([6, 4]));
  await assertFails(as("p1").ref(p(`responses/${id}/after/p1`)).set([3, 3]));
  await assertFails(as("p1").ref(p(`responses/${id}/before/p2`)).set([3, 3]));
  await assertFails(as("stranger").ref(p(`responses/${id}/before/stranger`)).set([3, 3]));
});

test("poll: vote only while voting, index 0–5", async () => {
  const code = await session();
  const p = s(code);
  const config = { title: "", questions: [{ type: "yesno", text: "Statement", question: "Do you agree?", live: false }] };
  const id = await activity(code, { type: "poll", phase: "q0", state: "statement", config });
  await assertFails(as("p1").ref(p(`responses/${id}/q0/p1`)).set(0));
  await assertSucceeds(as("host").ref(p(`activities/${id}`)).update({ state: "voting" }));
  await assertSucceeds(as("p1").ref(p(`responses/${id}/q0/p1`)).set(1));
  await assertFails(as("p1").ref(p(`responses/${id}/q0/p1`)).set(6));
  await assertFails(as("p1").ref(p(`responses/${id}/q1/p1`)).set(0));
  await assertSucceeds(as("host").ref(p(`activities/${id}`)).update({ state: "compare", compare: "Yes" }));
  await assertFails(as("p1").ref(p(`responses/${id}/q0/p1`)).set(0));
});

// ---------- Templates ----------

const oldTemplate = {
  type: "poll", ownerUid: "host", savedAt: TS,
  config: {
    title: "Win or dialogue",
    questions: [
      { type: "yesno", text: "Winning is important.", tag: "Win", live: false },
      { type: "choice", text: "Which one?", options: ["believed", "winked"], live: true },
      { type: "rating", text: "How much?", live: false }
    ]
  }
};

test("templates: old shape (CNQXHL style) still valid; owner only", async () => {
  await assertSucceeds(as("host").ref("templates/CNQXHM").set(oldTemplate));
  await assertSucceeds(as("p1").ref("templates/CNQXHM").get());
  await assertFails(as("p1").ref("templates").get());
  await assertFails(as("p1").ref("templates/CNQXHM").set({ ...oldTemplate, ownerUid: "p1" }));
});

test("templates: new field 'question' (question for voting), max 200", async () => {
  const withQuestion = structuredClone(oldTemplate);
  withQuestion.config.questions[0].question = "Do you agree that winning is important?";
  await assertSucceeds(as("host").ref("templates/QWQWQW").set(withQuestion));
  withQuestion.config.questions[0].question = "x".repeat(201);
  await assertFails(as("host").ref("templates/QWQWQW").set(withQuestion));
  withQuestion.config.questions[0].question = "";
  await assertFails(as("host").ref("templates/QWQWQW").set(withQuestion));
});

// ---------- Walls ----------

test("wall: a text needs its slot; perPerson limits the slots; nobody edits others", async () => {
  const code = await session();
  const p = s(code);
  const id = await activity(code, { type: "wall", phase: "main", state: "writing", config: { prompt: "?", perPerson: 1, votes: 3 } });
  const pid = pushId();
  await assertSucceeds(as("p1").ref(p("")).update({ [`mine/${id}/main/p1/0`]: pid, [`posts/${id}/main/${pid}`]: { text: "Hello", at: TS } }));
  await assertFails(as("p1").ref(p(`mine/${id}/main/p1/1`)).set(pushId()));
  await assertFails(as("p2").ref(p(`posts/${id}/main/${pid}`)).set({ text: "Changed", at: TS }));
  await assertFails(as("p2").ref(p(`mine/${id}/main/p1`)).get());
  await assertSucceeds(as("host").ref(p(`activities/${id}`)).update({ state: "voting" }));
  await assertSucceeds(as("p2").ref(p(`votes/${id}/p2/0`)).set(pid));
  await assertFails(as("p2").ref(p(`votes/${id}/p2/3`)).set(pid));
});

test("moderated wall: inbox only for host and author; approve only the same text", async () => {
  const code = await session();
  const p = s(code);
  const id = await activity(code, { type: "moderatedWall", phase: "main", state: "writing", config: { prompt: "?", perPerson: 1, votes: 3 } });
  const pid = pushId();
  await assertSucceeds(as("p1").ref(p("")).update({ [`mine/${id}/main/p1/0`]: pid, [`inbox/${id}/main/${pid}`]: { text: "Secret", at: TS } }));
  await assertFails(as("p1").ref(p(`posts/${id}/main/${pid}`)).set({ text: "Secret", at: TS }));
  await assertFails(as("screen").ref(p(`inbox/${id}`)).get());
  await assertFails(as("p2").ref(p(`inbox/${id}/main/${pid}`)).get());
  await assertSucceeds(as("p1").ref(p(`inbox/${id}/main/${pid}`)).get());
  await assertSucceeds(as("host").ref(p(`inbox/${id}`)).get());
  await assertFails(as("host").ref(p(`posts/${id}/main/${pid}`)).set({ text: "Other", at: TS }));
  await assertSucceeds(as("host").ref(p(`posts/${id}/main/${pid}`)).set({ text: "Secret", at: TS }));
});

test("moderated wall: host can approve while the wall is NOT on the projector", async () => {
  const code = await session();
  const p = s(code);
  const id = await activity(code, { type: "moderatedWall", phase: "main", state: "writing", config: { prompt: "?", perPerson: 1, votes: 3 } });
  const pid = pushId();
  await assertSucceeds(as("p1").ref(p("")).update({ [`mine/${id}/main/p1/0`]: pid, [`inbox/${id}/main/${pid}`]: { text: "Later", at: TS } }));
  await assertSucceeds(as("host").ref(p("current")).set(null)); // facilitator moved on; opens it only on the phone
  await assertSucceeds(as("host").ref(p(`inbox/${id}`)).get());
  await assertSucceeds(as("host").ref(p("")).update({ [`posts/${id}/main/${pid}`]: { text: "Later", at: TS }, [`activities/${id}/hidden/main/${pid}`]: null }));
});

// ---------- Common Ground ----------

async function groundOnVote(code) {
  const p = s(code);
  const id = await activity(code, { type: "commonGround", phase: "main", state: "writing", config: { prompt: "?", perPerson: 1, threshold: 80 } });
  const pid = pushId();
  await assertSucceeds(as("p1").ref(p("")).update({ [`mine/${id}/main/p1/0`]: pid, [`inbox/${id}/main/${pid}`]: { text: "We all want peace.", at: TS } }));
  await assertSucceeds(as("host").ref(p(`posts/${id}/main/${pid}`)).set({ text: "We all want peace.", at: TS }));
  await assertSucceeds(as("host").ref(p(`activities/${id}`)).update({ [`versions/${pid}/v0`]: "We all want peace.", ballot: { pid, v: "v0" }, state: "voting" }));
  return { id, pid, p };
}

test("common ground: signs only for the version on the ballot, while voting", async () => {
  const code = await session();
  const { id, pid, p } = await groundOnVote(code);
  await assertSucceeds(as("p1").ref(p(`signs/${id}/${pid}/v0/p1`)).set(1));
  await assertFails(as("p1").ref(p(`signs/${id}/${pid}/v1/p1`)).set(0));
  await assertFails(as("p1").ref(p(`signs/${id}/${pid}/v0/p1`)).set(3));
  await assertSucceeds(as("host").ref(p(`activities/${id}`)).update({ state: "results" }));
  await assertFails(as("p1").ref(p(`signs/${id}/${pid}/v0/p1`)).set(0));
});

// New (this PR): "With a change" can come with a proposed change.
//   amends/{id}/{pid}/{v}/{aid}       { text, at }  – NO author; only the host reads
//   myAmends/{id}/{pid}/{v}/{uid}     aid           – "this proposal is mine", only that uid reads
async function amend(db, p, id, pid, uid, text, aid = pushId(), v = "v0") {
  return db.ref(p("")).update({ [`myAmends/${id}/${pid}/${v}/${uid}`]: aid, [`amends/${id}/${pid}/${v}/${aid}`]: { text, at: TS } });
}

test("amends: only after 'With a change', only while voting, max 200 characters", async () => {
  const code = await session();
  const { id, pid, p } = await groundOnVote(code);
  await assertFails(amend(as("p1"), p, id, pid, "p1", "Add: at home")); // no sign yet
  await assertSucceeds(as("p1").ref(p(`signs/${id}/${pid}/v0/p1`)).set(0));
  await assertFails(amend(as("p1"), p, id, pid, "p1", "Add: at home")); // "I can sign" – no change needed
  await assertSucceeds(as("p1").ref(p(`signs/${id}/${pid}/v0/p1`)).set(1));
  await assertFails(amend(as("p1"), p, id, pid, "p1", "x".repeat(201)));
  await assertFails(amend(as("p1"), p, id, pid, "p1", ""));
  await assertFails(amend(as("p1"), p, id, pid, "p1", "Add: at home", pushId(), "v1")); // not the ballot
  await assertSucceeds(amend(as("p1"), p, id, pid, "p1", "Add: at home"));
  await assertFails(amend(as("stranger"), p, id, pid, "stranger", "Hi"));
  await assertSucceeds(as("host").ref(p(`activities/${id}`)).update({ state: "results" }));
  await assertSucceeds(as("p2").ref(p(`signs/${id}/${pid}/v0/p2`)).get());
  await assertFails(amend(as("p2"), p, id, pid, "p2", "Too late"));
});

test("amends: anonymous – only the host reads them, only the author reads 'mine'", async () => {
  const code = await session();
  const { id, pid, p } = await groundOnVote(code);
  await assertSucceeds(as("p1").ref(p(`signs/${id}/${pid}/v0/p1`)).set(1));
  const aid = pushId();
  await assertSucceeds(amend(as("p1"), p, id, pid, "p1", "Add: at home", aid));
  const read = (await as("host").ref(p(`amends/${id}`)).get()).val();
  assert.deepEqual(Object.keys(read[pid].v0), [aid]);
  assert.equal(read[pid].v0[aid].text, "Add: at home");
  assert.equal(Object.keys(read[pid].v0[aid]).sort().join(), "at,text"); // no uid, no name
  await assertFails(as("screen").ref(p(`amends/${id}`)).get());
  await assertFails(as("p2").ref(p(`amends/${id}`)).get());
  await assertFails(as("host").ref(p(`myAmends/${id}/${pid}/v0/p1`)).get());
  await assertFails(as("p2").ref(p(`myAmends/${id}/${pid}/v0/p1`)).get());
  await assertSucceeds(as("p1").ref(p(`myAmends/${id}/${pid}/v0/p1`)).get());
  await assertSucceeds(as("p1").ref(p(`amends/${id}/${pid}/v0/${aid}`)).get()); // the author reads their own text
  await assertFails(as("p2").ref(p(`amends/${id}/${pid}/v0/${aid}`)).get());
});

test("amends: one per person and version; edit own; delete own; nobody touches others", async () => {
  const code = await session();
  const { id, pid, p } = await groundOnVote(code);
  await assertSucceeds(as("p1").ref(p(`signs/${id}/${pid}/v0/p1`)).set(1));
  await assertSucceeds(as("p2").ref(p(`signs/${id}/${pid}/v0/p2`)).set(1));
  const aid = pushId();
  await assertSucceeds(amend(as("p1"), p, id, pid, "p1", "First", aid));
  await assertFails(amend(as("p1"), p, id, pid, "p1", "Second")); // the slot is taken
  await assertSucceeds(as("p1").ref(p(`amends/${id}/${pid}/v0/${aid}`)).set({ text: "First, edited", at: TS }));
  await assertFails(as("p2").ref(p(`amends/${id}/${pid}/v0/${aid}`)).set({ text: "Hijacked", at: TS }));
  await assertFails(as("p2").ref(p(`amends/${id}/${pid}/v0/${aid}`)).remove());
  await assertFails(as("p1").ref(p(`myAmends/${id}/${pid}/v0/p1`)).remove()); // must go together with the text
  await assertSucceeds(as("p1").ref(p("")).update({ [`myAmends/${id}/${pid}/v0/p1`]: null, [`amends/${id}/${pid}/v0/${aid}`]: null }));
  await assertSucceeds(amend(as("p1"), p, id, pid, "p1", "Again"));
});

test("amends: changing the vote away from 'With a change' can delete the proposal in the same step", async () => {
  const code = await session();
  const { id, pid, p } = await groundOnVote(code);
  await assertSucceeds(as("p1").ref(p(`signs/${id}/${pid}/v0/p1`)).set(1));
  const aid = pushId();
  await assertSucceeds(amend(as("p1"), p, id, pid, "p1", "Change it", aid));
  await assertSucceeds(as("p1").ref(p("")).update({
    [`signs/${id}/${pid}/v0/p1`]: 0,
    [`myAmends/${id}/${pid}/v0/p1`]: null,
    [`amends/${id}/${pid}/v0/${aid}`]: null
  }));
});
