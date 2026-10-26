// Activity type "moderatedWall": moderated wall (Faza 5).
//
// The same as the wall (wall.js), with one big difference: a new text goes
// FIRST ONLY to the facilitator's phone. It reaches the projector only after
// the facilitator approves it.
//
// How that is made safe (not just hidden by code):
//   inbox/{id}/main/{pid}   texts waiting for approval. The database rules let
//                           ONLY the facilitator read this (and the author their
//                           own text). The projector is refused by the server.
//   posts/{id}/main/{pid}   the approved copy. Only the facilitator can write
//                           here for a moderated wall, and only a text that is
//                           exactly the same as in the inbox.
// If the author edits an approved text, the public copy is removed in the same
// step and the new version waits for approval again.
//
// Extras:
//   Spotlight     activities/{id}/spotlight = pid: the projector shows one
//                 approved text, very big, so the facilitator can read it aloud.
//   Hidden label  ("Who wrote this?") config.labels = ["I believe this", "I don't believe this"].
//                 When sending, the author secretly picks one label; it is saved
//                 ONLY in the inbox (never in the public copy). During the
//                 spotlight the others guess (guesses/{id}/{pid}/{uid}). On
//                 Reveal the facilitator writes activities/{id}/answer, and the
//                 rules accept only the label the author really chose. The
//                 author is never shown.
import { t, tEn } from "../i18n.js";
import { el, fill } from "../dom.js";
import { actions, badge, fold, withHelp } from "../host-ui.js";
import {
  watchPosts, watchInbox, watchMine, watchVotes, watchGuesses, saveGuess, approveText, setHidden, tallyVotes
} from "../text-store.js";
import { watchActivity } from "../activity-store.js";
import { list, clean, hiddenOf, checkbox, fitToBox, refitOnResize } from "./text-base.js";
import {
  ROUND, LIMITS, wallSetup, stateButtons, changer, hostCard, cardsOf, voterCount, wallParticipant, wallScreen, wallReport
} from "./wall.js";

const labelsOf = (act) => {
  const labels = list(act.config?.labels).map(String);
  return labels.length === 2 ? labels : null;
};

const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

// [3, 5] = 3 people guessed the first label, 5 the second.
function countGuesses(guesses) {
  const counts = [0, 0];
  Object.values(guesses || {}).forEach((g) => { if (g === 0 || g === 1) counts[g]++; });
  return counts;
}

// ---------- Facilitator: setup ----------
function setup(ctx) {
  let useLabels = false;
  // The labels are shown on the projector and the phones: default texts in English.
  const labelInputs = [tEn("modwall.defaultLabel0"), tEn("modwall.defaultLabel1")].map((value, i) => el("input", {
    id: `modwall-label${i}`, maxlength: LIMITS.label, value, "aria-label": t("modwall.labelN", { n: i + 1 })
  }));
  const labelFields = el("div", { class: "label-fields", hidden: true },
    labelInputs.map((input, i) => [el("label", { for: input.id, text: t("modwall.labelN", { n: i + 1 }) }), input]),
    el("p", { class: "hint", text: t("modwall.labelsHint") }));

  wallSetup({
    ...ctx,
    name: "modwall.name",
    hint: "modwall.setupHint",
    extraFields: [
      checkbox(t("modwall.labelsLabel"), false, (v) => { useLabels = v; labelFields.hidden = !v; }),
      labelFields
    ],
    extraConfig() {
      if (!useLabels) return { config: {} };
      const labels = labelInputs.map((input) => clean(input.value));
      if (labels.some((l) => !l || l.length > LIMITS.label) || labels[0].toLowerCase() === labels[1].toLowerCase()) {
        return { error: t("modwall.errorLabels", { max: LIMITS.label }) };
      }
      return { config: { labels } };
    }
  });
}

function describe(activity) {
  return `${t("modwall.name")} · ${activity.config?.prompt || ""}`;
}

// ---------- Texts waiting for approval (for the facilitator's list of activities) ----------
// Calls callback(number) with how many texts wait for approval: in the inbox,
// not approved (no public copy) and not hidden. Shared with Common Ground.
export function watchPending({ code, activityId }, callback, onError) {
  let inbox = {};
  let posts = {};
  let hidden = {};
  const report = () => callback(Object.keys(inbox).filter((pid) => !posts[pid] && !hidden[pid]).length);
  const stops = [
    watchInbox(code, activityId, ROUND, (value) => { inbox = value; report(); }, onError),
    watchPosts(code, activityId, ROUND, (value) => { posts = value; report(); }, onError),
    watchActivity(code, activityId, (act) => { hidden = hiddenOf(act || {}, ROUND); report(); }, onError)
  ];
  return () => stops.forEach((stop) => stop());
}

// ---------- Facilitator: approve, hide, spotlight ----------
function host({ el: root, code, activityId, activity, end }) {
  let act = activity;
  let inbox = {};
  let posts = {};
  let votes = {};
  let guesses = {};
  let stopGuesses = null;
  let guessesFor = null;
  const change = changer(code, activityId);
  const failed = (err) => { console.error(err); alert(t("common.error")); };

  function followGuesses() {
    const pid = labelsOf(act) ? act.spotlight || null : null;
    if (pid === guessesFor) return;
    if (stopGuesses) stopGuesses();
    stopGuesses = null;
    guessesFor = pid;
    guesses = {};
    if (pid) stopGuesses = watchGuesses(code, activityId, pid, (value) => { guesses = value; draw(); }, (err) => console.error(err));
  }

  const approve = (pid) => approveText(code, activityId, ROUND, pid, inbox[pid]).catch(failed);
  const hide = async (pid) => {
    try {
      if (act.spotlight === pid) await change({ spotlight: null, answer: null });
      // Hiding an approved text also removes the public copy: the projector can't read it any more.
      await setHidden(code, activityId, ROUND, pid, true, true);
    } catch (err) {
      failed(err);
    }
  };

  // Approved, visible texts in the order they were sent – the spotlight goes through these.
  const approvedCards = () => cardsOf(posts, hiddenOf(act, ROUND), {}, false);

  function spotlightSection() {
    const cards = approvedCards();
    const labels = labelsOf(act);
    if (!act.spotlight) {
      return fold("modwall-spotlight", t("modwall.spotlightTitle"), [
        el("p", { class: "hint", text: t(labels ? "modwall.spotlightHintLabels" : "modwall.spotlightHint") }),
        el("button", {
          type: "button", class: "button button-secondary", text: t("modwall.spotlightStart"), disabled: !cards.length,
          onclick: () => cards.length && change({ spotlight: cards[0].pid, answer: null })
        })
      ], { className: "fold-inner" });
    }
    const i = cards.findIndex((c) => c.pid === act.spotlight);
    const go = (k) => change({ spotlight: cards[k].pid, answer: null });
    const counts = countGuesses(guesses);
    const total = counts[0] + counts[1];
    const answered = act.answer === 0 || act.answer === 1;
    // While the spotlight is on, it is the main thing: it gets the big button.
    return el("div", { class: "spotlight-controls" },
      el("div", { class: "host-state" },
        badge(t("modwall.spotlightOn"), "live"),
        i >= 0 && el("span", { class: "phase-now", text: t("modwall.spotlightOf", { n: i + 1, total: cards.length }) })),
      el("p", { class: "poll-host-question", text: cards[i]?.text || "" }),
      labels && el("p", { class: "count count-active", text: t("modwall.guesses", { count: total }) }),
      labels && answered && el("p", { class: "hint", text: t("modwall.answerShown", { label: labels[act.answer], pct: percent(counts[act.answer], total) }) }),
      actions({
        primary: labels && !answered
          ? { text: t("modwall.reveal"), onclick: () => inbox[act.spotlight] && change({ answer: inbox[act.spotlight].label }) }
          : i >= 0 && i + 1 < cards.length
            ? { text: t("modwall.spotlightNext"), onclick: () => go(i + 1) }
            : { text: t("modwall.spotlightStop"), onclick: () => change({ spotlight: null, answer: null }) },
        secondary: [
          { text: t("poll.back"), disabled: i <= 0, onclick: () => go(i - 1) },
          labels && !answered && i >= 0 && i + 1 < cards.length && { text: t("modwall.spotlightNext"), onclick: () => go(i + 1) },
          (i < 0 || i + 1 < cards.length || (labels && !answered)) && { text: t("modwall.spotlightStop"), onclick: () => change({ spotlight: null, answer: null }) }
        ]
      }));
  }

  function draw() {
    const hidden = hiddenOf(act, ROUND);
    const counts = tallyVotes(votes);
    const byVotes = act.state !== "writing";
    // The facilitator's own copy of every text, from the inbox (no author in it).
    const all = cardsOf(inbox, {}, counts, false);
    const pending = all.filter((c) => !posts[c.pid] && !hidden[c.pid]);
    const shown = cardsOf(posts, hidden, counts, byVotes);
    const hiddenCards = all.filter((c) => !posts[c.pid] && hidden[c.pid]);

    fill(root,
      el("h2", { text: t("modwall.name") }),
      el("p", { class: "poll-host-question", text: act.config?.prompt || "" }),
      el("p", { class: "count count-active" }, [
        t("modwall.counts", { pending: pending.length, shown: shown.length }),
        act.state !== "writing" ? t("wall.voters", { count: voterCount(votes) }) : null
      ].filter(Boolean).join(" · ")),
      // The spotlight (when on) takes the big button; otherwise writing → voting → results.
      act.spotlight ? spotlightSection() : stateButtons(act, change, end),

      // Waiting for approval: amber, always open, right under the buttons.
      el("div", { class: "pending-box" },
        withHelp(el("h3", {}, t("modwall.pendingTitle"), " ", badge(String(pending.length), pending.length ? "pending" : "done")), t("modwall.pendingHint")),
        pending.length === 0 && el("p", { class: "hint", text: t("modwall.noPending") }),
        el("ul", { class: "host-cards" }, pending.map((card) => hostCard({ ...card, className: "host-card-pending" }, false,
          el("button", { type: "button", class: "button button-small", text: t("modwall.approve"), onclick: () => approve(card.pid) }),
          el("button", { type: "button", class: "button button-small button-secondary", text: t("wall.hide"), onclick: () => hide(card.pid) }))))),

      !act.spotlight && spotlightSection(),

      fold("modwall-shown", t("modwall.shownTitle"), [
        shown.length === 0 && el("p", { class: "hint", text: t("wall.noCards") }),
        el("ul", { class: "host-cards" }, shown.map((card) => hostCard({ ...card, className: "host-card-shown" }, byVotes,
          el("button", {
            type: "button", class: "button button-small button-secondary", text: t("modwall.spotlightThis"),
            disabled: act.spotlight === card.pid, onclick: () => change({ spotlight: card.pid, answer: null })
          }),
          el("button", { type: "button", class: "button button-small button-secondary", text: t("wall.hide"), onclick: () => hide(card.pid) }))))
      ], { className: "fold-inner", badge: badge(String(shown.length), "live") }),

      hiddenCards.length > 0 && fold("modwall-hidden", t("modwall.hiddenTitle"), [
        el("ul", { class: "host-cards" }, hiddenCards.map((card) => hostCard({ ...card, hidden: true }, false,
          el("button", { type: "button", class: "button button-small button-secondary", text: t("modwall.approve"), onclick: () => approve(card.pid) }))))
      ], { className: "fold-inner", badge: badge(String(hiddenCards.length), "done") }));
  }

  const onError = (err) => console.error(err);
  const stops = [
    watchInbox(code, activityId, ROUND, (value) => { inbox = value; draw(); }, onError),
    watchPosts(code, activityId, ROUND, (value) => { posts = value; draw(); }, onError),
    watchVotes(code, activityId, (value) => { votes = value; draw(); }, onError)
  ];
  followGuesses();
  draw();

  return {
    update(next) { act = next; followGuesses(); draw(); },
    destroy() { stops.forEach((stop) => stop()); if (stopGuesses) stopGuesses(); }
  };
}

// ---------- Participant ----------
function participant(ctx) {
  const { code, uid, activityId } = ctx;
  let act = ctx.activity;
  let posts = {};
  let mine = {};
  let guesses = {};
  let stopGuesses = null;
  let guessesFor = null;
  let error = "";
  const labels = labelsOf(act);

  // "Who wrote this?" card, above the wall.
  const guessCard = el("section", { class: "card guess-card", hidden: true });

  // What I see under my own text.
  function statusOf(pid, current) {
    if (posts[pid]) return t("modwall.statusShown");
    if (hiddenOf(current, ROUND)[pid]) return t("modwall.statusHidden");
    return t("modwall.statusPending");
  }

  const view = wallParticipant(ctx, { store: "inbox", statusOf, labels, top: guessCard });

  function followGuesses() {
    const pid = labels ? act.spotlight || null : null;
    if (pid === guessesFor) return;
    if (stopGuesses) stopGuesses();
    stopGuesses = null;
    guessesFor = pid;
    guesses = {};
    error = "";
    if (pid) stopGuesses = watchGuesses(code, activityId, pid, (value) => { guesses = value; drawGuess(); }, (err) => console.error(err));
  }

  async function guess(pid, label) {
    error = "";
    try {
      await saveGuess(code, activityId, pid, uid, label);
    } catch (err) {
      console.error(err);
      if (act.spotlight === pid && act.answer == null) error = t("text.saveError");
      drawGuess();
    }
  }

  function drawGuess() {
    const pid = act.spotlight;
    const post = pid ? posts[pid] : null;
    guessCard.hidden = !labels || !post;
    if (guessCard.hidden) return;
    const isMine = Object.values(mine).includes(pid);
    const answered = act.answer === 0 || act.answer === 1;
    const myGuess = guesses[uid];
    fill(guessCard,
      el("p", { class: "label", text: t("modwall.guessTitle") }),
      el("p", { class: "guess-text", text: post.text }),
      isMine
        ? el("p", { class: "hint", text: t("modwall.guessMine") })
        : [
          el("p", { text: t("modwall.guessQuestion") }),
          el("div", { class: "poll-buttons" }, labels.map((label, i) => el("button", {
            type: "button", class: myGuess === i ? "poll-option poll-option-chosen" : "poll-option",
            "aria-pressed": myGuess === i ? "true" : "false", disabled: answered,
            text: label, onclick: () => guess(pid, i)
          }))),
          error && el("p", { class: "error", role: "alert", text: error })
        ],
      answered && el("p", { class: "guess-answer", text: t("modwall.answerWas", { label: labels[act.answer] }) }));
  }

  const onError = (err) => console.error(err);
  const stopPosts = watchPosts(code, activityId, ROUND, (value) => { posts = value; view.refresh(); drawGuess(); }, onError);
  const stopMine = watchMine(code, activityId, ROUND, uid, (value) => { mine = value; drawGuess(); }, onError);
  followGuesses();
  drawGuess();

  return {
    update(next) { act = next; view.update(next); followGuesses(); drawGuess(); },
    destroy() { view.destroy(); stopPosts(); stopMine(); if (stopGuesses) stopGuesses(); }
  };
}

// ---------- Projector ----------
// The projector reads ONLY "posts" (approved texts). It never even asks for
// the inbox – and if it did, the database would refuse.
function screen(ctx) {
  const { el: root, code, activityId } = ctx;
  let act = ctx.activity;
  let posts = {};
  let guesses = {};
  let stopGuesses = null;
  let guessesFor = null;

  const wallBox = el("div", { class: "screen-fill" });
  const spotBox = el("div", { class: "screen-fill", hidden: true });
  root.replaceChildren(wallBox, spotBox);
  const wall = wallScreen({ ...ctx, el: wallBox });
  const textBox = el("div", { class: "fit-box spotlight-box" });
  const stopResize = refitOnResize(textBox);

  function followGuesses() {
    const pid = labelsOf(act) ? act.spotlight || null : null;
    if (pid === guessesFor) return;
    if (stopGuesses) stopGuesses();
    stopGuesses = null;
    guessesFor = pid;
    guesses = {};
    if (pid) stopGuesses = watchGuesses(code, activityId, pid, (value) => { guesses = value; draw(); }, (err) => console.error(err));
  }

  function guessPanel(labels) {
    const counts = countGuesses(guesses);
    const total = counts[0] + counts[1];
    const answered = act.answer === 0 || act.answer === 1;
    if (!answered) {
      return el("div", { class: "guess-panel" },
        el("p", { class: "text-view-instruction", text: t("modwall.screenGuess") }),
        el("div", { class: "guess-options" }, labels.map((label) => el("span", { class: "guess-option", text: label }))),
        el("p", { class: "guess-count", text: t("modwall.guesses", { count: total }) }));
    }
    return el("div", { class: "guess-panel" },
      el("div", { class: "guess-options" }, labels.map((label, i) => el("div", { class: i === act.answer ? "guess-result guess-result-true" : "guess-result" },
        el("div", { class: "guess-pct", text: `${percent(counts[i], total)}%` }),
        el("div", { class: "guess-label", text: label }),
        i === act.answer && el("div", { class: "guess-true", text: t("modwall.screenAnswer") })))),
      el("p", { class: "guess-count", text: t("modwall.guesses", { count: total }) }));
  }

  function draw() {
    const post = act.spotlight ? posts[act.spotlight] : null;
    wallBox.hidden = !!post;
    spotBox.hidden = !post;
    if (!post) return;
    const labels = labelsOf(act);
    fill(textBox, el("p", { class: "spotlight-text", text: post.text }));
    fill(spotBox, el("div", { class: "text-view" },
      textBox,
      post.group && el("p", { class: "spotlight-group", text: t("text.group") }),
      labels && guessPanel(labels)));
    fitToBox(textBox);
  }

  const stopPosts = watchPosts(code, activityId, ROUND, (value) => { posts = value; draw(); }, (err) => console.error(err));
  followGuesses();
  draw();

  return {
    update(next) { act = next; wall.update(next); followGuesses(); draw(); },
    destroy() { wall.destroy(); stopPosts(); stopResize(); if (stopGuesses) stopGuesses(); }
  };
}

export default {
  name: "modwall.name",
  short: "modwall.short",
  icon: "🛡️",
  setup,
  watchPending,
  describe,
  host,
  participant,
  screen,
  // Only approved texts are in "posts", so the report can never show a text
  // that was waiting or hidden. The secret labels (inbox) are never read.
  report: wallReport
};
