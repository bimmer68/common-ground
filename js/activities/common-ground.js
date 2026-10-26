// Activity type "commonGround": the Common Ground meter (Faza 8).
//
// 1. writing   Participants propose statements they think the WHOLE group
//              could sign. Like the moderated wall: a text goes first only to
//              the facilitator, and reaches the projector after approval.
// 2. voting    The facilitator puts ONE approved statement to the vote.
//              Everybody answers on the phone:
//                "I can sign" / "With a change" / "I can't sign"
// 3. results   Voting is closed. The projector shows the result. A statement
//              with at least 80% "I can sign" (the facilitator can change the
//              threshold) goes on the Common Ground board and fills the meter.
//              Many "With a change"? The facilitator types a new version on the
//              phone and puts it to the vote again. The old version and its
//              result stay in the history.
// 4. board     The projector shows the board: every statement that passed,
//              in big letters, and the meter.
//
// Database:
//   activities/{id}   { type: "commonGround", phase: "main", state, revealed: false,
//                       config: { prompt, perPerson, threshold },
//                       hidden?: { main: { pid: true } },
//                       versions?: { pid: { v0: "text", v1: "new text" … } },
//                       ballot?: { pid, v } }          ← what is (or was last) voted on
//   inbox/{id}/main/{pid}    proposals waiting for approval (facilitator only)
//   posts/{id}/main/{pid}    approved proposals (public, NO author)
//   signs/{id}/{pid}/{v}/{uid}   0 | 1 | 2   (js/ground-store.js)
//   amends/{id}/{pid}/{v}/{aid}  { text, at }  a proposed change from someone who
//                                voted "With a change" (NO author; only the facilitator
//                                reads it and can put it to the vote as a new version)
//
// Nothing about the board is saved: it is always CALCULATED from the
// signatures and the threshold (statementsOf below). So if the facilitator
// changes the threshold, the board and the meter follow at once.
import { t, tEn } from "../i18n.js";
import { el, fill } from "../dom.js";
import { actions, badge, fold, withHelp } from "../host-ui.js";
import { watchMemberCount } from "../session.js";
import { watchPosts, watchInbox, watchMine, approveText, setHidden } from "../text-store.js";
import { watchSigns, watchMySign, saveSign, watchAmends, watchMyAmend, saveAmend, deleteAmend } from "../ground-store.js";
import { PER_PERSON, clean, intBetween, hiddenOf, numberSelect, fitToBox, refitOnResize, textWriter } from "./text-base.js";
import { ROUND, LIMITS, cardsOf, hostCard, drawCards, changer } from "./wall.js";
import { watchPending } from "./moderated-wall.js";

export const CHOICES = ["sign", "change", "cant"]; // the vote is the index: 0, 1, 2
const THRESHOLDS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const DEFAULT_THRESHOLD = 80;
const MAX_VERSIONS = 20; // v0 … v19 (the rules allow the same)

export const thresholdOf = (act) => intBetween(act.config?.threshold, 50, 100, DEFAULT_THRESHOLD);
const perPersonOf = (act) => intBetween(act.config?.perPerson, 1, 3, 1);
const sum = (numbers) => numbers.reduce((a, b) => a + b, 0);
const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);
const versionNumber = (v) => Number(String(v).slice(1)); // "v2" -> 2

// All versions of one statement, oldest first: [{ v: "v0", n: 0, text }, …]
function versionsOf(act, pid) {
  return Object.entries(act.versions?.[pid] || {})
    .filter(([v, text]) => /^v[0-9]+$/.test(v) && typeof text === "string")
    .map(([v, text]) => ({ v, n: versionNumber(v), text }))
    .sort((a, b) => a.n - b.n);
}

// { uid: 0 | 1 | 2 } -> [sign, change, cant], e.g. [9, 3, 1]
export function tallySigns(byUid) {
  const counts = [0, 0, 0];
  Object.values(byUid || {}).forEach((choice) => { if (choice === 0 || choice === 1 || choice === 2) counts[choice]++; });
  return counts;
}

// Is a version being voted on right now? Then it can't pass (yet): the
// board only takes results of CLOSED votes.
const isOpen = (act, pid, v) => act.state === "voting" && act.ballot?.pid === pid && act.ballot?.v === v;

// Every approved statement with all its versions and results:
//   [{ pid, text, versions: [{ v, n, text, counts, total, pct, open, passed }],
//      passed: the newest version that passed (or null), latest }]
// A version passes when (rounded) % "I can sign" >= threshold.
export function statementsOf(act, posts, signs) {
  const threshold = thresholdOf(act);
  return cardsOf(posts, hiddenOf(act, ROUND), {}, false).map((card) => {
    const versions = versionsOf(act, card.pid).map((version) => {
      const counts = tallySigns(signs?.[card.pid]?.[version.v]);
      const total = sum(counts);
      const pct = percent(counts[0], total);
      const open = isOpen(act, card.pid, version.v);
      return { ...version, counts, total, pct, open, passed: !open && total > 0 && pct >= threshold };
    });
    return {
      pid: card.pid,
      text: card.text,
      versions,
      latest: versions[versions.length - 1] || null,
      passed: [...versions].reverse().find((version) => version.passed) || null
    };
  });
}

// The text that is (or was last) on the ballot.
function ballotOf(act) {
  const pid = act.ballot?.pid;
  const v = act.ballot?.v;
  const text = pid && v ? act.versions?.[pid]?.[v] : null;
  return typeof text === "string" ? { pid, v, n: versionNumber(v), text } : null;
}

// ---------- The meter (projector and report) ----------
// One segment per approved statement; a statement that passed fills one.
function meter(passed, total, big = false) {
  return el("div", { class: big ? "ground-meter ground-meter-big" : "ground-meter" },
    el("div", { class: "ground-meter-track", style: `--segments: ${Math.max(1, total)}` },
      Array.from({ length: Math.max(1, total) }, (_, i) => el("div", { class: i < passed ? "ground-meter-seg ground-meter-full" : "ground-meter-seg" }))),
    el("p", { class: "ground-meter-label", text: t("ground.meter", { passed, count: total }) }));
}

// ---------- Facilitator: setup ----------
function setup({ el: root, onStart, onCancel }) {
  // The prompt is shown on the projector: the default text is in English.
  const config = { prompt: tEn("ground.defaultPrompt"), perPerson: 1, threshold: DEFAULT_THRESHOLD };
  const error = el("p", { class: "error", role: "alert", hidden: true });
  const fail = (text) => { error.textContent = text; error.hidden = !text; };

  const startButton = el("button", { type: "button", class: "button button-primary", text: t("ground.start") });
  startButton.addEventListener("click", async () => {
    const prompt = clean(config.prompt);
    if (!prompt || prompt.length > LIMITS.prompt) return fail(t("wall.errorPrompt", { max: LIMITS.prompt }));
    fail("");
    startButton.disabled = true;
    try {
      await onStart(ROUND, { ...config, prompt }, { state: "writing" });
    } catch (err) {
      console.error(err);
      fail(t("common.error"));
      startButton.disabled = false;
    }
  });

  fill(root,
    withHelp(el("h2", { text: t("ground.name") }), t("ground.setupHint")),
    el("label", { for: "ground-prompt", text: t("wall.promptLabel") }),
    el("textarea", {
      id: "ground-prompt", rows: 2, maxlength: LIMITS.prompt, value: config.prompt,
      oninput: (event) => { config.prompt = event.target.value; }
    }),
    thresholdSelect("ground-threshold", config.threshold, (n) => { config.threshold = n; }),
    fold("ground-more", t("host.moreOptions"), [
      numberSelect("ground-per-person", t("ground.perPersonLabel"), PER_PERSON, config.perPerson, (n) => { config.perPerson = n; }),
      el("p", { class: "hint", text: t("wall.textHint", { max: LIMITS.text }) })
    ], { className: "fold-inner" }),
    el("div", { class: "setup-start" },
      error,
      startButton,
      el("button", { type: "button", class: "button button-secondary", text: t("common.cancel"), onclick: onCancel })));
}

function thresholdSelect(id, selected, onchange) {
  return [
    withHelp(el("label", { for: id, text: t("ground.thresholdLabel") }), t("ground.thresholdHint")),
    el("select", { id, onchange: (event) => onchange(Number(event.target.value)) },
      THRESHOLDS.map((n) => el("option", { value: String(n), text: `${n}%`, selected: n === selected })))
  ];
}

// All proposed changes for one statement, newest version first:
//   [{ v, n, text, count }]  – the same text (ignoring case and spaces) is counted once.
function amendsOf(amends, pid) {
  const out = [];
  Object.entries(amends?.[pid] || {})
    .filter(([v]) => /^v[0-9]+$/.test(v))
    .sort(([a], [b]) => versionNumber(b) - versionNumber(a))
    .forEach(([v, items]) => {
      const seen = new Map();
      Object.values(items || {})
        .filter((item) => item && typeof item.text === "string" && item.text)
        .sort((a, b) => (a.at || 0) - (b.at || 0))
        .forEach((item) => {
          const key = clean(item.text).toLowerCase();
          if (seen.has(key)) seen.get(key).count++;
          else seen.set(key, { v, n: versionNumber(v), text: clean(item.text), count: 1 });
        });
      out.push(...seen.values());
    });
  return out;
}

function describe(activity) {
  return `${t("ground.name")} · ${activity.config?.prompt || ""}`;
}

// ---------- Facilitator: approve, put to the vote, new versions ----------
// The big button follows the work: put the next statement to the vote →
// close voting → (new version, or) the next statement → show the board.
function host({ el: root, code, activityId, activity, end }) {
  let act = activity;
  let inbox = {};
  let posts = {};
  let signs = {};
  let amends = {};
  let members = 0;
  const change = changer(code, activityId);
  const failed = (err) => { console.error(err); alert(t("common.error")); };

  // The "new version" box has its own place on the page and is drawn again
  // ONLY when another statement or version is on the ballot. Otherwise every
  // incoming vote would redraw it and the facilitator's typing would be lost.
  const mainBox = el("div");
  const reviseBox = el("div", { class: "ground-revise" });
  const listBox = el("div");
  root.replaceChildren(mainBox, reviseBox, listBox);
  let reviseKey = null;
  let reviseInput = null;

  const approve = (pid) => approveText(code, activityId, ROUND, pid, inbox[pid]).catch(failed);
  // Hiding an approved text also removes the public copy: the projector can't read it any more.
  const hide = (pid) => setHidden(code, activityId, ROUND, pid, true, true).catch(failed);

  // Put a statement to the vote: its newest version, or the proposed text as "v0".
  function release(statement) {
    const fields = { state: "voting" };
    if (statement.latest) {
      fields.ballot = { pid: statement.pid, v: statement.latest.v };
    } else {
      fields[`versions/${statement.pid}/v0`] = statement.text;
      fields.ballot = { pid: statement.pid, v: "v0" };
    }
    return change(fields);
  }

  // A new version of the statement on the ballot, put to the vote at once.
  function releaseNewVersion(pid, text) {
    const versions = versionsOf(act, pid);
    const latest = versions[versions.length - 1];
    if (latest && clean(latest.text) === clean(text)) return alert(t("ground.errorSameText"));
    const next = latest ? latest.n + 1 : 0;
    if (next >= MAX_VERSIONS) return alert(t("ground.errorTooManyVersions", { max: MAX_VERSIONS }));
    return change({ [`versions/${pid}/v${next}`]: text, ballot: { pid, v: `v${next}` }, state: "voting" });
  }

  // The next statement nobody voted on yet (oldest first), or null.
  const nextUnvoted = (statements) => statements.find((st) => !st.passed && !(st.latest?.total > 0) && !(st.latest?.open)) || null;

  const STATE_BADGE = { writing: "live", voting: "live", results: "done", board: "live" };

  function mainActions(statements) {
    const upcoming = nextUnvoted(statements);
    const releaseNext = upcoming && { text: t("ground.releaseNext"), onclick: () => release(upcoming) };
    const showBoard = { text: t("ground.showBoard"), onclick: () => change({ state: "board" }) };
    const backToWriting = { text: t("ground.backToWriting"), onclick: () => change({ state: "writing" }) };
    switch (act.state) {
      case "voting":
        return { primary: { text: t("ground.closeVoting"), onclick: () => change({ state: "results" }) }, secondary: [] };
      case "results":
        return { primary: releaseNext || showBoard, secondary: [releaseNext && showBoard, backToWriting] };
      case "board":
        return {
          primary: { text: t("ground.hideBoard"), onclick: () => change({ state: act.ballot ? "results" : "writing" }) },
          secondary: [backToWriting, { text: t("ground.endActivity"), onclick: () => end?.() }]
        };
      default: // writing
        return { primary: releaseNext || showBoard, secondary: [releaseNext && showBoard] };
    }
  }

  // Proposed changes for the statement on the ballot (only the facilitator sees them).
  function amendSection(ballot) {
    const items = amendsOf(amends, ballot.pid);
    const canUse = act.state === "results";
    return el("div", { class: "ground-amends" },
      withHelp(el("h3", {}, t("ground.amendsTitle"), " ", badge(String(items.reduce((n, a) => n + a.count, 0)), items.length ? "pending" : "done")),
        t("ground.amendsHint")),
      items.length === 0 && el("p", { class: "hint", text: t("ground.noAmends") }),
      !canUse && items.length > 0 && el("p", { class: "hint", text: t("ground.amendsAfterVoting") }),
      el("ul", { class: "amend-list" }, items.map((item) => el("li", { class: "amend" },
        el("p", { class: "amend-text", text: item.text }),
        el("p", { class: "hint" }, [
          item.n !== ballot.n ? t("ground.versionN", { n: item.n + 1 }) : null,
          item.count > 1 ? t("ground.amendCount", { count: item.count }) : null
        ].filter(Boolean).join(" · ")),
        canUse && el("div", { class: "button-row" },
          el("button", {
            type: "button", class: "button button-small", text: t("ground.useAmend"),
            onclick: () => releaseNewVersion(ballot.pid, item.text)
          }),
          el("button", {
            type: "button", class: "button button-small button-secondary", text: t("ground.editAmend"),
            onclick: () => {
              if (!reviseInput) return;
              reviseInput.value = item.text;
              reviseInput.focus();
              reviseInput.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }))))));
  }

  function ballotSection(statements) {
    const ballot = ballotOf(act);
    if (!ballot || act.state === "writing" || act.state === "board") return null;
    const statement = statements.find((st) => st.pid === ballot.pid);
    const version = statement?.versions.find((ver) => ver.v === ballot.v);
    const counts = version?.counts || [0, 0, 0];
    const total = sum(counts);
    return el("div", { class: "ground-ballot" },
      el("p", { class: "label", text: ballot.n > 0 ? `${t("ground.ballotTitle")} · ${t("ground.versionN", { n: ballot.n + 1 })}` : t("ground.ballotTitle") }),
      el("p", { class: "poll-host-question", text: ballot.text }),
      el("p", { class: "count count-active", text: t("poll.voted", { count: total, total: members }) }),
      // The facilitator always sees the numbers on the phone (never projected before closing).
      el("ul", { class: "poll-mini" }, CHOICES.map((choice, k) => el("li", {},
        el("span", { text: t(`ground.choice.${choice}`) }),
        el("span", { text: `${counts[k]} · ${percent(counts[k], total)}%` })))),
      act.state === "results" && version && el("p", {
        class: version.passed ? "ground-verdict ground-verdict-yes" : "ground-verdict",
        text: t(version.passed ? "ground.passed" : "ground.notPassed", { pct: version.pct, threshold: thresholdOf(act) })
      }));
  }

  function drawRevise() {
    const ballot = ballotOf(act);
    const key = act.state === "results" && ballot ? `${ballot.pid}/${ballot.v}` : null;
    if (key === reviseKey) return;
    reviseKey = key;
    reviseInput = null;
    if (!key) return reviseBox.replaceChildren();
    const textarea = el("textarea", { id: "ground-revise", rows: 3, maxlength: LIMITS.text, value: ballot.text });
    reviseInput = textarea;
    const error = el("p", { class: "error", role: "alert", hidden: true });
    const button = el("button", {
      type: "button", class: "button button-secondary", text: t("ground.releaseVersion"),
      onclick: async () => {
        const text = clean(textarea.value);
        if (!text || text.length > LIMITS.text) {
          error.textContent = t("text.errorLength", { max: LIMITS.text });
          error.hidden = false;
          return;
        }
        if (text === ballot.text) {
          error.textContent = t("ground.errorSameText");
          error.hidden = false;
          return;
        }
        error.hidden = true;
        button.disabled = true;
        await releaseNewVersion(ballot.pid, text);
        button.disabled = false;
      }
    });
    fill(reviseBox,
      withHelp(el("h3", { text: t("ground.reviseTitle") }), t("ground.reviseHint")),
      el("label", { for: "ground-revise", text: t("ground.reviseLabel") }),
      textarea, error, button);
  }

  function statementItem(statement) {
    const onBallot = act.ballot?.pid === statement.pid;
    const status = statement.passed
      ? badge(t("ground.statusPassed", { pct: statement.passed.pct }), "live")
      : statement.latest?.open ? badge(t("ground.statusVoting"), "preview")
        : statement.latest?.total ? badge(t("ground.statusNotPassed", { pct: statement.latest.pct }), "done")
          : badge(t("ground.statusNew"), "info");
    return el("li", { class: statement.passed ? "host-card ground-card-passed" : "host-card" },
      el("p", { class: "host-card-text", text: statement.latest?.text || statement.text }),
      el("p", { class: "activity-item-badges" }, status),
      // The history: every version with its result, oldest first.
      statement.versions.length > 1 && el("ol", { class: "ground-history" }, statement.versions.map((ver) => el("li", {},
        el("span", { text: ver.text }),
        el("span", { class: "hint", text: ver.open ? ` · ${t("ground.statusVoting")}` : ` · ${t("ground.historyResult", { pct: ver.pct, count: ver.total })}` })))),
      el("div", { class: "button-row" },
        !(onBallot && act.state === "voting") && el("button", {
          type: "button", class: "button button-small", text: t(statement.latest ? "ground.releaseAgain" : "ground.release"),
          onclick: () => release(statement)
        }),
        !(onBallot && act.state === "voting") && el("button", {
          type: "button", class: "button button-small button-secondary", text: t("wall.hide"), onclick: () => hide(statement.pid)
        })));
  }

  function draw() {
    const hidden = hiddenOf(act, ROUND);
    const statements = statementsOf(act, posts, signs);
    const passed = statements.filter((st) => st.passed).length;
    const all = cardsOf(inbox, {}, {}, false);
    const pending = all.filter((c) => !posts[c.pid] && !hidden[c.pid]);
    const hiddenCards = all.filter((c) => !posts[c.pid] && hidden[c.pid]);
    const state = STATE_BADGE[act.state] ? act.state : "writing";
    const ballot = ballotOf(act);

    fill(mainBox,
      el("h2", { text: t("ground.name") }),
      el("p", { class: "poll-host-question", text: act.config?.prompt || "" }),
      el("div", { class: "host-state" },
        badge(t(`ground.state.${state}`), STATE_BADGE[state]),
        el("span", { class: "phase-now", text: t("ground.meter", { passed, count: statements.length }) })),
      ballotSection(statements),
      actions(mainActions(statements)),
      ballot && (act.state === "voting" || act.state === "results") && amendSection(ballot));

    drawRevise();

    fill(listBox,
      // Waiting for approval: amber, always open.
      el("div", { class: "pending-box" },
        withHelp(el("h3", {}, t("ground.pendingTitle"), " ", badge(String(pending.length), pending.length ? "pending" : "done")), t("modwall.pendingHint")),
        pending.length === 0 && el("p", { class: "hint", text: t("modwall.noPending") }),
        el("ul", { class: "host-cards" }, pending.map((card) => hostCard({ ...card, className: "host-card-pending" }, false,
          el("button", { type: "button", class: "button button-small", text: t("modwall.approve"), onclick: () => approve(card.pid) }),
          el("button", { type: "button", class: "button button-small button-secondary", text: t("wall.hide"), onclick: () => hide(card.pid) }))))),

      fold("ground-statements", t("ground.statementsTitle"), [
        el("p", { class: "hint", text: t("ground.statementsHint") }),
        statements.length === 0 && el("p", { class: "hint", text: t("wall.noCards") }),
        el("ul", { class: "host-cards" }, statements.map(statementItem))
      ], { className: "fold-inner", open: true, badge: badge(String(statements.length), "info") }),

      fold("ground-threshold", t("ground.thresholdFold", { threshold: thresholdOf(act) }),
        thresholdSelect("ground-threshold-now", thresholdOf(act), (n) => change({ "config/threshold": n })),
        { className: "fold-inner" }),

      hiddenCards.length > 0 && fold("ground-hidden", t("modwall.hiddenTitle"), [
        el("ul", { class: "host-cards" }, hiddenCards.map((card) => hostCard({ ...card, hidden: true }, false,
          el("button", { type: "button", class: "button button-small button-secondary", text: t("modwall.approve"), onclick: () => approve(card.pid) }))))
      ], { className: "fold-inner", badge: badge(String(hiddenCards.length), "done") }));
  }

  const onError = (err) => console.error(err);
  const stops = [
    watchInbox(code, activityId, ROUND, (value) => { inbox = value; draw(); }, onError),
    watchPosts(code, activityId, ROUND, (value) => { posts = value; draw(); }, onError),
    watchSigns(code, activityId, (value) => { signs = value; draw(); }, onError),
    watchAmends(code, activityId, (value) => { amends = value; draw(); }, onError),
    watchMemberCount(code, (n) => { members = n; draw(); }, onError)
  ];
  draw();

  return {
    update(next) { act = next; draw(); },
    destroy() { stops.forEach((stop) => stop()); }
  };
}

// ---------- Participant ----------

// "With a change": a box to write the change (max 200 characters, anonymous).
// It has its own place on the page and is NOT drawn again with every vote,
// so the keyboard stays open while typing. follow(ballot) switches it to the
// version on the vote; show(true/false) when my vote is (not) "With a change".
function amendWriter({ code, uid, activityId }) {
  let key = null;
  let ballot = null;
  let mine = null; // { aid, text } – my proposal for this version
  let stop = null;
  let busy = false;

  const input = el("textarea", {
    id: "ground-amend", rows: 3, maxlength: LIMITS.text, dir: "auto",
    oninput: () => { counter.textContent = t("text.chars", { count: input.value.length, max: LIMITS.text }); }
  });
  const counter = el("p", { class: "hint text-counter" });
  const status = el("p", { class: "my-text-status", role: "status" });
  const error = el("p", { class: "error", role: "alert", hidden: true });
  const send = el("button", { type: "submit", class: "button" });
  const remove = el("button", {
    type: "button", class: "button button-small button-secondary", text: t("text.delete"),
    onclick: async () => {
      if (!mine || !confirm(t("ground.amendConfirmDelete"))) return;
      try {
        await deleteAmend(code, activityId, ballot.pid, ballot.v, uid, mine.aid);
        input.value = "";
      } catch (err) {
        console.error(err);
        fail(t("text.saveError"));
      }
    }
  });
  const form = el("form", { class: "amend-box", novalidate: true, hidden: true, onsubmit: (event) => { event.preventDefault(); submit(); } },
    el("label", { for: "ground-amend", text: t("ground.amendLabel") }),
    el("p", { class: "hint", text: t("ground.amendHint") }),
    input, counter, status, error, send, remove);

  function fail(text) {
    error.textContent = text;
    error.hidden = !text;
  }

  function draw() {
    send.textContent = t(busy ? "text.sending" : mine ? "text.save" : "ground.amendSend");
    send.disabled = busy;
    remove.hidden = !mine;
    status.hidden = !mine;
    status.textContent = mine ? t("ground.amendSaved") : "";
    counter.textContent = t("text.chars", { count: input.value.length, max: LIMITS.text });
  }

  async function submit() {
    const text = clean(input.value);
    if (!text || text.length > LIMITS.text) return fail(t("text.errorLength", { max: LIMITS.text }));
    fail("");
    busy = true;
    draw();
    try {
      await saveAmend(code, activityId, ballot.pid, ballot.v, uid, mine?.aid || null, text);
      input.value = text;
    } catch (err) {
      console.error(err);
      fail(t("text.saveError"));
    } finally {
      busy = false;
      draw();
    }
  }

  return {
    el: form,
    get mine() { return mine; },
    follow(next) {
      const nextKey = next ? `${next.pid}/${next.v}` : null;
      if (nextKey === key) return;
      if (stop) stop();
      stop = null;
      key = nextKey;
      ballot = next;
      mine = null;
      input.value = "";
      fail("");
      draw();
      if (next) {
        stop = watchMyAmend(code, activityId, next.pid, next.v, uid, (value) => {
          mine = value;
          // Show what I sent, unless I am in the middle of changing it.
          if (mine && document.activeElement !== input) input.value = mine.text;
          draw();
        }, (err) => console.error(err));
      }
    },
    show(visible) { form.hidden = !visible; },
    destroy() { if (stop) stop(); }
  };
}

function participant({ el: root, code, uid, activityId, activity }) {
  let act = activity;
  let posts = {};
  let mySign = null;
  let signKey = null;
  let stopSign = null;
  let error = "";

  const writer = textWriter({
    code, uid, activityId, round: ROUND, store: "inbox", maxLength: LIMITS.text,
    perPerson: perPersonOf(act), normalize: clean, multiline: true,
    statusOf: (pid) => (posts[pid] ? t("modwall.statusShown") : hiddenOf(act, ROUND)[pid] ? t("modwall.statusHidden") : t("modwall.statusPending"))
  });
  const amend = amendWriter({ code, uid, activityId });
  const prompt = el("h1", { class: "poll-question-phone" });
  const writeHint = el("p", { class: "hint", text: t("ground.writeHint") });
  const writeCard = el("section", { class: "card" }, prompt, writeHint, writer.el);
  // The voting card: the top part is drawn again with every change, the box
  // for a proposed change keeps its place (and what is being typed in it).
  const signTop = el("div");
  const signBottom = el("div");
  const signCard = el("section", { class: "card" }, signTop, amend.el, signBottom);
  root.replaceChildren(writeCard, signCard);

  // Listen only to MY signature for the version on the ballot.
  function followSign() {
    const ballot = ballotOf(act);
    const key = ballot ? `${ballot.pid}/${ballot.v}` : null;
    amend.follow(ballot);
    if (key === signKey) return;
    if (stopSign) stopSign();
    stopSign = null;
    signKey = key;
    mySign = null;
    error = "";
    if (ballot) stopSign = watchMySign(code, activityId, ballot.pid, ballot.v, uid, (value) => { mySign = value; draw(); }, (err) => console.error(err));
  }

  async function sign(ballot, choice) {
    const before = mySign;
    mySign = choice; // show at once; undo if it fails
    error = "";
    draw();
    try {
      // Away from "With a change": my proposed change is deleted in the same step.
      const removeAmend = choice !== 1 ? amend.mine?.aid || null : null;
      await saveSign(code, activityId, ballot.pid, ballot.v, uid, choice, removeAmend);
    } catch (err) {
      console.error(err);
      mySign = before;
      // Refused because voting was just closed: no error, the phone simply follows.
      if (act.state === "voting") error = t("poll.saveError");
      draw();
    }
  }

  function draw() {
    const writing = act.state === "writing";
    prompt.textContent = act.config?.prompt || "";
    writer.update(writing);
    writeCard.hidden = !writing;
    signCard.hidden = writing;
    const ballot = ballotOf(act);
    // Set once per drawing (hiding it for a moment would close the keyboard).
    amend.show(act.state === "voting" && !!ballot && mySign === 1);
    if (writing) return;

    if (act.state === "voting" && ballot) {
      fill(signTop,
        el("p", { class: "label", text: t("ground.canYouSign") }),
        el("h1", { class: "poll-question-phone", text: ballot.text }),
        ballot.n > 0 && el("p", { class: "hint", text: t("ground.newVersionNote") }),
        el("div", { class: "poll-buttons" }, CHOICES.map((choice, k) => el("button", {
          type: "button", class: mySign === k ? "poll-option poll-option-chosen" : "poll-option",
          "aria-pressed": mySign === k ? "true" : "false", text: t(`ground.choice.${choice}`),
          onclick: () => sign(ballot, k)
        }))));
      fill(signBottom,
        error && el("p", { class: "error", role: "alert", text: error }),
        el("p", { class: "hint", text: t(mySign == null ? "poll.tapToVote" : "poll.voteSaved") }));
      return;
    }

    // results or board: voting is closed
    fill(signTop, el("div", { class: "center" },
      act.state === "results" && ballot && el("p", { class: "poll-question-phone", text: ballot.text }),
      el("p", { text: t(act.state === "board" ? "ground.lookAtBoard" : "poll.closed") }),
      act.state === "results" && mySign != null && el("p", { class: "hint", text: t("poll.yourVote", { option: t(`ground.choice.${CHOICES[mySign]}`) }) })));
    fill(signBottom);
  }

  const stopPosts = watchPosts(code, activityId, ROUND, (value) => { posts = value; writer.refresh(); }, (err) => console.error(err));
  followSign();
  draw();

  return {
    update(next) { act = next; followSign(); draw(); },
    destroy() { writer.destroy(); amend.destroy(); stopPosts(); if (stopSign) stopSign(); }
  };
}

// ---------- Projector ----------
function screen({ el: root, code, activityId, activity }) {
  let act = activity;
  let posts = {};
  let signs = {};
  let members = 0;
  const box = el("div", { class: "fit-box" });
  const stopResize = refitOnResize(box);

  function drawWriting(statements) {
    const cards = statements.map((s) => ({ pid: s.pid, text: s.text, group: false, votes: 0 }));
    root.replaceChildren(el("div", { class: "text-view" },
      el("p", { class: "text-view-prompt", text: act.config?.prompt || "" }),
      el("p", { class: "text-view-instruction", text: t("ground.screenWrite") }),
      cards.length ? box : el("p", { class: "text-view-empty", text: t("wall.screenEmpty") })));
    if (cards.length) drawCards(box, cards, false);
  }

  function drawVoting(ballot, version) {
    fill(box, el("p", { class: "spotlight-text", text: ballot.text }));
    root.replaceChildren(el("div", { class: "text-view" },
      el("p", { class: "text-view-instruction", text: t("ground.screenCanYouSign") }),
      ballot.n > 0 && el("p", { class: "ground-version", text: t("ground.versionN", { n: ballot.n + 1 }) }),
      box,
      el("div", { class: "guess-options" }, CHOICES.map((choice) => el("span", { class: "guess-option", text: t(`ground.choice.${choice}`) }))),
      el("p", { class: "guess-count", text: t("poll.screenVotes", { count: version?.total || 0, total: members }) })));
    fitToBox(box);
  }

  function drawResults(ballot, version, statements) {
    const counts = version?.counts || [0, 0, 0];
    const total = sum(counts);
    const max = Math.max(1, ...counts);
    const passedCount = statements.filter((s) => s.passed).length;
    fill(box, el("p", { class: "ground-result-text", text: ballot.text }));
    root.replaceChildren(el("div", { class: "text-view" },
      box,
      el("div", { class: "poll-chart ground-chart" }, CHOICES.map((choice, k) => el("div", { class: "poll-bar-row" },
        el("div", { class: "poll-bar-label", text: t(`ground.choice.${choice}`) }),
        el("div", { class: "poll-bar-track" },
          el("div", { class: k === 0 ? "poll-bar-fill" : "poll-bar-fill ground-bar-other", style: `width: ${(counts[k] / max) * 100}%` })),
        el("div", { class: "poll-bar-value", text: `${percent(counts[k], total)}%` })))),
      el("p", {
        class: version?.passed ? "ground-screen-verdict ground-screen-yes" : "ground-screen-verdict",
        text: t(version?.passed ? "ground.screenPassed" : "ground.screenNotPassed", { threshold: thresholdOf(act) })
      }),
      meter(passedCount, statements.length)));
    fitToBox(box);
  }

  function drawBoard(statements) {
    const board = statements.filter((s) => s.passed);
    fill(box, board.length
      ? el("ul", { class: "ground-board" }, board.map((s) => el("li", { text: s.passed.text })))
      : el("p", { class: "text-view-empty", text: t("ground.boardEmpty") }));
    root.replaceChildren(el("div", { class: "text-view" },
      el("p", { class: "ground-board-title", text: t("ground.boardTitle") }),
      meter(board.length, statements.length, true),
      box));
    fitToBox(box);
  }

  function draw() {
    const statements = statementsOf(act, posts, signs);
    const ballot = ballotOf(act);
    const version = ballot ? statements.find((s) => s.pid === ballot.pid)?.versions.find((ver) => ver.v === ballot.v) : null;
    if (act.state === "board") return drawBoard(statements);
    if (act.state === "voting" && ballot) return drawVoting(ballot, version);
    if (act.state === "results" && ballot) return drawResults(ballot, version, statements);
    drawWriting(statements);
  }

  const onError = (err) => console.error(err);
  const stops = [
    watchPosts(code, activityId, ROUND, (value) => { posts = value; draw(); }, onError),
    watchSigns(code, activityId, (value) => { signs = value; draw(); }, onError),
    watchMemberCount(code, (n) => { members = n; draw(); }, onError)
  ];
  draw();

  return {
    update(next) { act = next; draw(); },
    destroy() { stops.forEach((stop) => stop()); stopResize(); }
  };
}

// ---------- Report (report.html) ----------
// The board, then the statements that did not reach the threshold. Only
// approved, not hidden statements (the report never reads the inbox).
function report({ activity, posts, signs }) {
  const statements = statementsOf(activity, posts?.[ROUND], signs).filter((s) => s.versions.length);
  const board = statements.filter((s) => s.passed);
  const others = statements.filter((s) => !s.passed && s.latest.total);
  const versionNote = (ver) => (ver.n > 0 ? ` · ${t("ground.versionN", { n: ver.n + 1 })}` : "");
  const allApproved = statementsOf(activity, posts?.[ROUND], signs).length;
  return [
    el("p", { class: "report-question", text: activity.config?.prompt || "" }),
    el("p", { class: "report-meta", text: t("report.groundSummary", { count: board.length, total: allApproved, threshold: thresholdOf(activity) }) }),
    el("h4", { text: t("ground.boardTitle") }),
    board.length === 0 && el("p", { class: "report-empty", text: t("ground.boardEmpty") }),
    el("ol", { class: "report-board" }, board.map((s) => el("li", {},
      el("span", { class: "report-board-text", text: s.passed.text }),
      el("span", { class: "report-meta", text: ` ${t("report.groundSigned", { pct: s.passed.pct, count: s.passed.total })}${versionNote(s.passed)}` })))),
    others.length > 0 && el("h4", { text: t("report.groundOthers") }),
    others.length > 0 && el("ul", { class: "report-list" }, others.map((s) => el("li", {},
      el("span", { text: s.latest.text }),
      el("span", { class: "report-meta", text: ` ${t("report.groundSigned", { pct: s.latest.pct, count: s.latest.total })}${versionNote(s.latest)}` }))))
  ];
}

export default {
  name: "ground.name",
  short: "ground.short",
  icon: "🤝",
  setup,
  watchPending,
  describe,
  host,
  participant,
  screen,
  report
};
