// Activity type "wall": wall with voting (Faza 5).
//
// Participants send short texts (max 200 characters, 1–3 per person). They
// appear on the projector as cards at once. Then the facilitator opens voting:
// everybody gets a few votes (default 3) and gives them to cards on the phone.
// The projector sorts the cards by votes.
//
//   writing   phones write; projector shows the cards as they come
//   voting    phones vote; projector sorts by votes live, or only after
//             "Close voting" (the facilitator's choice)
//   results   voting is closed; cards sorted by votes, with the numbers
//
// Database (see js/text-store.js):
//   activities/{id}   { type: "wall", phase: "main", state, revealed: false,
//                       hidden?: { main: { pid: true } },
//                       config: { prompt, perPerson, votes, live, groups } }
//   posts/{id}/main/{pid}     { text, group?, at }   – NO author
//   votes/{id}/{uid}/{slot}   pid                    – one slot per vote
//
// "groups": a participant can tick "We write as a group" (one phone per
// group). That only puts "Group" on the card, nothing else changes.
//
// The moderated wall (moderated-wall.js) uses the same pieces, which is why
// some functions here are exported.
import { t } from "../i18n.js";
import { el, fill } from "../dom.js";
import { actions, badge, fold, withHelp } from "../host-ui.js";
import { updateActivity } from "../activity-store.js";
import { watchPosts, watchVotes, setVote, setHidden, tallyVotes } from "../text-store.js";
import {
  PER_PERSON, clean, intBetween, hiddenOf, numberSelect, checkbox,
  fitToBox, refitOnResize, textWriter
} from "./text-base.js";

export const ROUND = "main"; // a wall has one round
export const LIMITS = { prompt: 150, text: 200, label: 40 };
export const VOTES = [1, 2, 3, 4, 5];
const VOTE_SLOTS = ["0", "1", "2", "3", "4"]; // one slot per vote (the rules count them)
const STATES = ["writing", "voting", "results"];

export const perPersonOf = (act) => intBetween(act.config?.perPerson, 1, 3, 1);
export const votesOf = (act) => intBetween(act.config?.votes, 1, 5, 3);

// Cards as a list: [{ pid, text, group, at, votes }], hidden ones left out
// unless withHidden. byVotes: most votes first, otherwise oldest first.
export function cardsOf(posts, hidden, counts, byVotes, withHidden = false) {
  return Object.entries(posts || {})
    .filter(([pid, post]) => post && typeof post.text === "string" && (withHidden || !hidden[pid]))
    .map(([pid, post]) => ({ pid, text: post.text, group: post.group === true, at: post.at || 0, votes: counts[pid] || 0, hidden: !!hidden[pid] }))
    .sort((a, b) => (byVotes ? b.votes - a.votes : 0) || a.at - b.at || a.pid.localeCompare(b.pid));
}

// Sorted by votes on the projector?
export function sortedByVotes(act) {
  return act.state === "results" || (act.state === "voting" && !!act.config?.live);
}

// How many different people voted.
export const voterCount = (votes) => Object.values(votes || {}).filter((slots) => slots && Object.keys(slots).length).length;

// ---------- Facilitator: setup (shared with the moderated wall) ----------
// extraFields / extraConfig(): more fields (the moderated wall adds the hidden labels).
export function wallSetup({ el: root, onStart, onCancel, name, hint, extraFields, extraConfig }) {
  const config = { prompt: "", perPerson: 1, votes: 3, live: false, groups: false };
  const error = el("p", { class: "error", role: "alert", hidden: true });
  const fail = (text) => { error.textContent = text; error.hidden = !text; };

  const startButton = el("button", { type: "button", class: "button button-primary", text: t("wall.start") });
  startButton.addEventListener("click", async () => {
    const prompt = clean(config.prompt);
    if (!prompt || prompt.length > LIMITS.prompt) return fail(t("wall.errorPrompt", { max: LIMITS.prompt }));
    const built = { ...config, prompt };
    if (extraConfig) {
      const extra = extraConfig();
      if (extra.error) return fail(extra.error);
      Object.assign(built, extra.config);
    }
    fail("");
    startButton.disabled = true;
    try {
      await onStart(ROUND, built, { state: "writing" });
    } catch (err) {
      console.error(err);
      fail(t("common.error"));
      startButton.disabled = false;
    }
  });

  fill(root,
    withHelp(el("h2", { text: t(name) }), t(hint)),
    el("label", { for: "wall-prompt", text: t("wall.promptLabel") }),
    el("textarea", {
      id: "wall-prompt", rows: 2, maxlength: LIMITS.prompt, placeholder: t("wall.promptPlaceholder"),
      oninput: (event) => { config.prompt = event.target.value; }
    }),
    fold(`${name}-more`, t("host.moreOptions"), [
      numberSelect("wall-per-person", t("text.perPersonLabel"), PER_PERSON, config.perPerson, (n) => { config.perPerson = n; }),
      el("p", { class: "hint", text: t("wall.textHint", { max: LIMITS.text }) }),
      numberSelect("wall-votes", t("wall.votesLabel"), VOTES, config.votes, (n) => { config.votes = n; }),
      checkbox(t("wall.liveLabel"), config.live, (v) => { config.live = v; }),
      checkbox(t("wall.groupsLabel"), config.groups, (v) => { config.groups = v; }),
      extraFields
    ], { className: "fold-inner" }),
    el("div", { class: "setup-start" },
      error,
      startButton,
      el("button", { type: "button", class: "button button-secondary", text: t("common.cancel"), onclick: onCancel })));
}

function setup(ctx) {
  wallSetup({ ...ctx, name: "wall.name", hint: "wall.setupHint" });
}

function describe(activity) {
  return `${t("wall.name")} · ${activity.config?.prompt || ""}`;
}

// ---------- Facilitator: writing → voting → results ----------
// The state as a coloured badge, the big button for the next state and a
// small "Back" (shared with the moderated wall). After "results" the big
// button ends the activity (end() from the facilitator's page).
const STATE_BADGE = { writing: "live", voting: "live", results: "done" };

export function stateButtons(act, change, end, extraSecondary = []) {
  const i = Math.max(0, STATES.indexOf(act.state));
  const next = STATES[i + 1];
  const back = STATES[i - 1];
  return [
    el("div", { class: "host-state" }, badge(t(`wall.state.${STATES[i]}`), STATE_BADGE[STATES[i]])),
    actions({
      primary: next
        ? { text: t(next === "results" && !act.config?.live ? "wall.next.reveal" : `wall.next.${next}`), onclick: () => change({ state: next }) }
        : { text: t("wall.next.endActivity"), onclick: () => end?.() },
      secondary: [
        { text: t("poll.back"), disabled: !back, onclick: () => back && change({ state: back }) },
        ...extraSecondary
      ]
    })
  ];
}

export function changer(code, activityId) {
  return async (fields) => {
    try {
      await updateActivity(code, activityId, fields);
    } catch (err) {
      console.error(err);
      alert(t("common.error"));
    }
  };
}

// One card in the facilitator's list. extraClass: e.g. "host-card-pending"
// (amber: waiting for approval) or "host-card-shown" (green: on the projector).
export function hostCard(card, showVotes, ...buttons) {
  return el("li", { class: card.hidden ? "host-card host-card-hidden" : `host-card ${card.className || ""}`.trim() },
    el("p", { class: "host-card-text", text: card.text }),
    el("p", { class: "hint" }, [
      card.group ? t("text.group") : null,
      showVotes ? t("poll.votes", { count: card.votes }) : null,
      card.hidden ? t("wall.hiddenTag") : null
    ].filter(Boolean).join(" · ")),
    el("div", { class: "button-row" }, buttons));
}

function host({ el: root, code, activityId, activity, end }) {
  let act = activity;
  let posts = {};
  let votes = {};
  const change = changer(code, activityId);

  function toggle(card) {
    setHidden(code, activityId, ROUND, card.pid, !card.hidden).catch((err) => { console.error(err); alert(t("common.error")); });
  }

  function draw() {
    const counts = tallyVotes(votes);
    const cards = cardsOf(posts, hiddenOf(act, ROUND), counts, act.state !== "writing", true);
    const visible = cards.filter((c) => !c.hidden).length;
    fill(root,
      el("h2", { text: t("wall.name") }),
      el("p", { class: "poll-host-question", text: act.config?.prompt || "" }),
      withHelp(el("p", { class: "count count-active" }, [
        t("wall.cardCount", { count: visible }),
        act.state !== "writing" ? t("wall.voters", { count: voterCount(votes) }) : null
      ].filter(Boolean).join(" · ")), t(act.config?.live ? "wall.liveNote" : "wall.revealNote")),
      stateButtons(act, change, end),
      fold("wall-cards", t("wall.cardsTitle"), [
        el("p", { class: "hint", text: t("wall.hideHint") }),
        cards.length === 0 && el("p", { class: "hint", text: t("wall.noCards") }),
        el("ul", { class: "host-cards" }, cards.map((card) => hostCard(card, act.state !== "writing",
          el("button", {
            type: "button", class: "button button-small button-secondary",
            text: t(card.hidden ? "wall.show" : "wall.hide"), onclick: () => toggle(card)
          }))))
      ], { className: "fold-inner", open: true, badge: badge(String(visible), "info") }));
  }

  const stopPosts = watchPosts(code, activityId, ROUND, (value) => { posts = value; draw(); }, (err) => console.error(err));
  const stopVotes = watchVotes(code, activityId, (value) => { votes = value; draw(); }, (err) => console.error(err));
  draw();

  return {
    update(next) { act = next; draw(); },
    destroy() { stopPosts(); stopVotes(); }
  };
}

// ---------- Participant ----------

// Voting on the phone: every visible card with a Vote button.
export function votingPanel({ code, uid, activityId }) {
  let act = null;
  let posts = {};
  let myVotes = {}; // { slot: pid }
  let error = "";
  const root = el("div", { class: "voting" });

  // Cards that can be voted for now (a hidden card frees its vote).
  const visibleIds = () => new Set(cardsOf(posts, hiddenOf(act, ROUND), {}, false).map((c) => c.pid));

  async function toggle(pid) {
    const visible = visibleIds();
    const mySlot = VOTE_SLOTS.find((s) => myVotes[s] === pid);
    const free = VOTE_SLOTS.slice(0, votesOf(act)).find((s) => !visible.has(myVotes[s]));
    if (mySlot == null && free == null) return;
    const slot = mySlot ?? free;
    const before = { ...myVotes };
    if (mySlot != null) delete myVotes[slot];
    else myVotes[slot] = pid; // show at once; undo if it fails
    error = "";
    draw();
    try {
      await setVote(code, activityId, uid, slot, mySlot != null ? null : pid);
    } catch (err) {
      console.error(err);
      myVotes = before;
      if (act.state === "voting") error = t("text.saveError");
      draw();
    }
  }

  function draw() {
    if (!act) return;
    const max = votesOf(act);
    const visible = visibleIds();
    const chosen = new Set(Object.values(myVotes).filter((pid) => visible.has(pid)));
    const left = Math.max(0, max - chosen.size);
    const cards = cardsOf(posts, hiddenOf(act, ROUND), {}, false);
    fill(root,
      el("p", { class: "votes-left", text: t("wall.votesLeft", { count: left, max }) }),
      error && el("p", { class: "error", role: "alert", text: error }),
      cards.length === 0 && el("p", { class: "hint", text: t("wall.noCards") }),
      el("ul", { class: "vote-cards" }, cards.map((card) => {
        const voted = chosen.has(card.pid);
        return el("li", { class: voted ? "vote-card vote-card-chosen" : "vote-card" },
          el("p", { class: "vote-card-text", text: card.text }),
          card.group && el("p", { class: "hint", text: t("text.group") }),
          el("button", {
            type: "button", class: voted ? "button button-small" : "button button-small button-secondary",
            "aria-pressed": voted ? "true" : "false",
            disabled: !voted && left === 0,
            text: t(voted ? "wall.voted" : "wall.vote"),
            onclick: () => toggle(card.pid)
          }));
      })));
  }

  const stopPosts = watchPosts(code, activityId, ROUND, (value) => { posts = value; draw(); }, (err) => console.error(err));
  const stopVotes = watchVotes(code, activityId, (value) => { myVotes = { ...(value[uid] || {}) }; draw(); }, (err) => console.error(err));

  return {
    el: root,
    update(next) { act = next; draw(); },
    destroy() { stopPosts(); stopVotes(); }
  };
}

// The phone during a wall (shared with the moderated wall):
// writing -> my texts + form, voting -> vote buttons, results -> "look at the screen".
export function wallParticipant({ el: root, code, uid, activityId, activity }, { store = "posts", statusOf = null, labels = null, top = null } = {}) {
  let act = activity;
  const writer = textWriter({
    code, uid, activityId, round: ROUND, store, maxLength: LIMITS.text,
    perPerson: perPersonOf(act), normalize: clean, multiline: true,
    groups: !!act.config?.groups, labels, statusOf: statusOf ? (pid) => statusOf(pid, act) : null
  });
  const voting = votingPanel({ code, uid, activityId });
  const prompt = el("h1", { class: "poll-question-phone" });
  const stateNote = el("p", { class: "hint" });
  fill(root, top, el("section", { class: "card" }, prompt, stateNote, writer.el, voting.el));

  function draw() {
    prompt.textContent = act.config?.prompt || "";
    writer.update(act.state === "writing");
    writer.el.hidden = act.state !== "writing";
    voting.el.hidden = act.state !== "voting";
    voting.update(act);
    stateNote.textContent = act.state === "results" ? t("wall.votingClosed") : "";
    stateNote.hidden = act.state !== "results";
  }

  draw();
  return {
    update(next) { act = next; draw(); },
    refresh() { writer.refresh(); },
    destroy() { writer.destroy(); voting.destroy(); }
  };
}

function participant(ctx) {
  return wallParticipant(ctx);
}

// ---------- Projector ----------

// Number of columns for n cards, so that the text can stay as big as possible.
const columnsFor = (n) => (n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : n <= 25 ? 5 : 6);

// Draws the cards into box (shared with the moderated wall).
export function drawCards(box, cards, showVotes) {
  fill(box, el("div", { class: "wall-grid", style: `--cols: ${columnsFor(cards.length)}` }, cards.map((card) =>
    el("div", { class: "wall-card" },
      el("p", { class: "wall-card-text", text: card.text }),
      (card.group || showVotes) && el("div", { class: "wall-card-foot" },
        card.group && el("span", { class: "wall-card-group", text: t("text.group") }),
        showVotes && el("span", { class: "wall-card-votes", text: t("poll.votes", { count: card.votes }) }))))));
  fitToBox(box);
}

// The projector during a wall (shared with the moderated wall).
export function wallScreen({ el: root, code, activityId, activity }) {
  let act = activity;
  let posts = {};
  let votes = {};
  const box = el("div", { class: "fit-box" });
  const stopResize = refitOnResize(box);

  function draw() {
    const byVotes = sortedByVotes(act);
    const cards = cardsOf(posts, hiddenOf(act, ROUND), tallyVotes(votes), byVotes);
    const instruction = act.state === "voting" ? t("wall.screenVote") : act.state === "writing" ? t("wall.screenWrite") : null;
    root.replaceChildren(el("div", { class: "text-view" },
      el("p", { class: "text-view-prompt", text: act.config?.prompt || "" }),
      instruction && el("p", { class: "text-view-instruction", text: instruction }),
      cards.length ? box : el("p", { class: "text-view-empty", text: t("wall.screenEmpty") })));
    if (cards.length) drawCards(box, cards, byVotes);
  }

  const stopPosts = watchPosts(code, activityId, ROUND, (value) => { posts = value; draw(); }, (err) => console.error(err));
  const stopVotes = watchVotes(code, activityId, (value) => { votes = value; draw(); }, (err) => console.error(err));
  draw();

  return {
    update(next) { act = next; draw(); },
    destroy() { stopPosts(); stopVotes(); stopResize(); }
  };
}

// ---------- Report (report.html, shared with the moderated wall) ----------
// The texts that were on the projector (never hidden ones; for the moderated
// wall "posts" holds only approved texts), sorted by votes if people voted.
export function wallReport({ activity, posts, votes }) {
  const voted = voterCount(votes) > 0;
  const cards = cardsOf(posts[ROUND], hiddenOf(activity, ROUND), tallyVotes(votes), voted);
  return [
    el("p", { class: "report-question", text: activity.config?.prompt || "" }),
    el("p", { class: "report-meta" }, [
      t("report.texts", { count: cards.length }),
      voted ? t("wall.voters", { count: voterCount(votes) }) : null
    ].filter(Boolean).join(" · ")),
    cards.length === 0 && el("p", { class: "report-empty", text: t("wall.noCards") }),
    el("ul", { class: "report-list" }, cards.map((card) => el("li", {},
      el("span", { text: card.text }),
      (voted || card.group) && el("span", { class: "report-meta" }, ` · ${[
        card.group ? t("text.group") : null,
        voted ? t("poll.votes", { count: card.votes }) : null
      ].filter(Boolean).join(" · ")}`))))
  ];
}

export default {
  name: "wall.name",
  short: "wall.short",
  icon: "🧱",
  setup,
  describe,
  host,
  participant,
  screen: wallScreen,
  report: wallReport
};
