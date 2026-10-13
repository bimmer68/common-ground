// Activity type "wordcloud": word cloud (Faza 4).
//
// Like the quick poll, the facilitator prepares a LIST of prompts (e.g. six
// sentence beginnings) and only clicks Next / Back during the workshop. Every
// prompt goes through two states:
//
//   writing   phones can send short answers (max 40 characters);
//             projector shows the prompt and the number of answers
//             (or the cloud growing live, if the facilitator chose "live")
//   results   writing is closed; projector shows the cloud
//
// Database (see js/text-store.js):
//   activities/{id}   { type: "wordcloud", phase: "q0" | "q1" | …, state,
//                       revealed: false, hidden?: { q0: { word: true } },
//                       config: { title, prompts: [ … ], perPerson: 1–3, live } }
//   posts/{id}/q{n}/{pid}   { text, at }   one answer, already normalized
//
// The same words are joined (after normalizing: lower case, no spaces and no
// punctuation at the end), and a word given more often is drawn bigger.
// The facilitator can remove a word from the projector (hidden).
import { t } from "../i18n.js";
import { el, fill } from "../dom.js";
import { updateActivity } from "../activity-store.js";
import { watchPosts, setHidden } from "../text-store.js";
import {
  PER_PERSON, list, clean, normalizeWord, wordKey, intBetween, hiddenOf,
  numberSelect, checkbox, fitToBox, refitOnResize, textWriter
} from "./text-base.js";

const LIMITS = { prompts: 30, prompt: 150, title: 80, answer: 40 };

const promptsOf = (act) => list(act.config?.prompts).map(String);
const perPersonOf = (act) => intBetween(act.config?.perPerson, 1, 3, 1);

// "q3" -> 3
function indexOf(act) {
  const n = Number(String(act.phase || "").slice(1));
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

// All answers of a round, joined: [{ word: "trust", key, count: 4 }, …], biggest first.
// hidden = { key: true } for words the facilitator removed.
export function countWords(posts, hidden = {}) {
  const words = new Map();
  Object.values(posts || {}).forEach((post) => {
    const word = normalizeWord(post?.text);
    if (!word) return;
    const key = wordKey(word);
    const entry = words.get(key) || { word, key, count: 0, hidden: !!hidden[key] };
    entry.count++;
    words.set(key, entry);
  });
  return [...words.values()].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

// ---------- Next / Back ----------
//   q0 writing, q0 results, q1 writing, q1 results, …

function nextStep(act, count) {
  const i = indexOf(act);
  if (act.state === "writing") return { state: "results" };
  if (i + 1 < count) return { phase: `q${i + 1}`, state: "writing" };
  return null;
}

function previousStep(act) {
  const i = indexOf(act);
  if (act.state === "results") return { state: "writing" };
  if (i > 0) return { phase: `q${i - 1}`, state: "results" };
  return null;
}

function nextLabel(act, count) {
  if (act.state === "writing") return t(act.config?.live ? "cloud.next.close" : "cloud.next.reveal");
  return indexOf(act) + 1 < count ? t("cloud.next.nextPrompt") : t("cloud.next.end");
}

// ---------- Facilitator: preparing the prompts ----------
function setup({ el: root, onStart, onCancel }) {
  let title = "";
  let prompts = [""];
  let perPerson = 1;
  let live = false;

  const error = el("p", { class: "error", role: "alert", hidden: true });
  const fail = (text) => { error.textContent = text; error.hidden = !text; };

  function promptEditor(value, i) {
    const move = (delta) => {
      const j = i + delta;
      if (j < 0 || j >= prompts.length) return;
      [prompts[i], prompts[j]] = [prompts[j], prompts[i]];
      draw();
    };
    return el("div", { class: "prompt-edit" },
      el("label", { for: `cloud-p${i}`, text: t("cloud.promptN", { n: i + 1 }) }),
      el("input", {
        id: `cloud-p${i}`, maxlength: LIMITS.prompt, value, placeholder: t("cloud.promptPlaceholder"),
        oninput: (event) => { prompts[i] = event.target.value; }
      }),
      el("div", { class: "button-row" },
        el("button", { type: "button", class: "button button-small button-secondary", text: "↑", "aria-label": t("poll.moveUp"), disabled: i === 0, onclick: () => move(-1) }),
        el("button", { type: "button", class: "button button-small button-secondary", text: "↓", "aria-label": t("poll.moveDown"), disabled: i === prompts.length - 1, onclick: () => move(1) }),
        el("button", {
          type: "button", class: "button button-small button-secondary", text: t("poll.removeQuestion"),
          disabled: prompts.length === 1, onclick: () => { prompts.splice(i, 1); draw(); }
        })));
  }

  const startButton = el("button", { type: "button", class: "button", text: t("cloud.start") });
  startButton.addEventListener("click", async () => {
    const cleaned = prompts.map(clean);
    if (cleaned.some((p) => !p || p.length > LIMITS.prompt)) return fail(t("cloud.errorPrompt", { max: LIMITS.prompt }));
    if (clean(title).length > LIMITS.title) return fail(t("poll.errorTitle", { max: LIMITS.title }));
    fail("");
    startButton.disabled = true;
    try {
      await onStart("q0", { title: clean(title), prompts: cleaned, perPerson, live }, { state: "writing" });
    } catch (err) {
      console.error(err);
      fail(t("common.error"));
      startButton.disabled = false;
    }
  });

  function draw() {
    fill(root,
      el("h2", { text: t("cloud.name") }),
      el("p", { class: "hint", text: t("cloud.setupHint") }),
      el("label", { for: "cloud-title", text: t("poll.titleLabel") }),
      el("input", {
        id: "cloud-title", maxlength: LIMITS.title, value: title, placeholder: t("cloud.titlePlaceholder"),
        oninput: (event) => { title = event.target.value; }
      }),
      prompts.map(promptEditor),
      prompts.length < LIMITS.prompts && el("button", {
        type: "button", class: "button button-small button-secondary add-button", text: t("cloud.addPrompt"),
        onclick: () => { prompts.push(""); draw(); }
      }),
      numberSelect("cloud-per-person", t("text.perPersonLabel"), PER_PERSON, perPerson, (n) => { perPerson = n; }),
      el("p", { class: "hint", text: t("cloud.answerHint", { max: LIMITS.answer }) }),
      checkbox(t("cloud.liveLabel"), live, (v) => { live = v; }),
      error,
      startButton,
      el("button", { type: "button", class: "button button-secondary", text: t("common.cancel"), onclick: onCancel }));
  }

  draw();
}

function describe(activity) {
  const prompts = promptsOf(activity);
  const title = activity.config?.title || prompts[0] || "";
  return `${t("cloud.name")} · ${title} (${t("cloud.promptCount", { count: prompts.length })})`;
}

// ---------- Facilitator: Next / Back, remove words ----------
function host({ el: root, code, activityId, activity }) {
  let act = activity;
  let posts = {};
  let stopPosts = null;
  let round = null;

  async function change(fields) {
    try {
      await updateActivity(code, activityId, fields);
    } catch (err) {
      console.error(err);
      alert(t("common.error"));
    }
  }

  function toggleWord(key, hide) {
    setHidden(code, activityId, round, key, hide).catch((err) => { console.error(err); alert(t("common.error")); });
  }

  // Every prompt has its own answers: listen to the round that is on now.
  function follow() {
    if (round === act.phase) return;
    if (stopPosts) stopPosts();
    round = act.phase;
    posts = {};
    stopPosts = watchPosts(code, activityId, round, (value) => { posts = value; draw(); }, (err) => console.error(err));
  }

  function draw() {
    const prompts = promptsOf(act);
    const i = indexOf(act);
    const words = countWords(posts, hiddenOf(act, act.phase));
    const next = nextStep(act, prompts.length);
    const back = previousStep(act);

    fill(root,
      el("h2", { text: act.config?.title || t("cloud.name") }),
      el("p", { class: "label", text: t("cloud.promptOf", { n: i + 1, total: prompts.length }) }),
      el("p", { class: "poll-host-question", text: prompts[i] || "" }),
      el("p", { class: "phase-now", text: t(`cloud.state.${act.state}`) }),
      el("p", { class: "count count-active", text: t("cloud.answers", { count: Object.keys(posts).length }) }),
      el("p", { class: "hint", text: t(act.config?.live ? "cloud.liveNote" : "cloud.revealNote") }),
      el("button", { type: "button", class: "button", text: nextLabel(act, prompts.length), disabled: !next, onclick: () => next && change(next) }),
      el("button", { type: "button", class: "button button-secondary", text: t("poll.back"), disabled: !back, onclick: () => back && change(back) }),
      el("label", { for: "cloud-jump", text: t("cloud.jump") }),
      el("select", {
        id: "cloud-jump",
        onchange: (event) => change({ phase: `q${event.target.value}`, state: "writing" })
      }, prompts.map((p, k) => el("option", { value: String(k), text: `${k + 1}. ${p}`, selected: k === i }))),
      el("h3", { text: t("cloud.wordsTitle") }),
      el("p", { class: "hint", text: t("cloud.wordsHint") }),
      words.length === 0 && el("p", { class: "hint", text: t("cloud.noWords") }),
      el("ul", { class: "word-list" }, words.map((w) => el("li", { class: w.hidden ? "word-hidden" : null },
        el("span", { text: `${w.word} · ${w.count}` }),
        el("button", {
          type: "button", class: "button button-small button-secondary",
          text: t(w.hidden ? "cloud.restoreWord" : "cloud.removeWord"),
          onclick: () => toggleWord(w.key, !w.hidden)
        })))));
  }

  follow();
  draw();

  return {
    update(next) { act = next; follow(); draw(); },
    destroy() { if (stopPosts) stopPosts(); }
  };
}

// ---------- Participant ----------
function participant({ el: root, code, uid, activityId, activity }) {
  let act = activity;
  let writer = null;
  let round = null;

  const label = el("p", { class: "label" });
  const prompt = el("h1", { class: "poll-question-phone" });
  const look = el("p", { class: "hint", text: t("cloud.lookAtScreen") });
  const slot = el("div");
  root.replaceChildren(el("section", { class: "card" }, label, prompt, slot, look));

  function draw() {
    const prompts = promptsOf(act);
    const i = indexOf(act);
    label.textContent = t("cloud.promptOf", { n: i + 1, total: prompts.length });
    prompt.textContent = prompts[i] || "";
    // A new prompt: a new writer (my answers are per prompt).
    if (round !== act.phase) {
      if (writer) writer.destroy();
      round = act.phase;
      writer = textWriter({
        code, uid, activityId, round, store: "posts", maxLength: LIMITS.answer,
        perPerson: perPersonOf(act), normalize: normalizeWord, multiline: false
      });
      slot.replaceChildren(writer.el);
    }
    writer.update(act.state === "writing");
    look.hidden = act.state === "writing";
  }

  draw();

  return {
    update(next) { act = next; draw(); },
    destroy() { if (writer) writer.destroy(); }
  };
}

// ---------- Projector ----------
const COLORS = 5; // .cloud-c0 … .cloud-c4 in css/screen.css

// Biggest word in the middle, smaller ones around it: [5, 4, 3, 2, 1] -> [2, 4, 5, 3, 1]
function centerOut(words) {
  const out = [];
  words.forEach((w, i) => { if (i % 2) out.unshift(w); else out.push(w); });
  return out;
}

function screen({ el: root, code, activityId, activity }) {
  let act = activity;
  let posts = {};
  let stopPosts = null;
  let round = null;

  const box = el("div", { class: "fit-box" });
  const stopResize = refitOnResize(box);

  function follow() {
    if (round === act.phase) return;
    if (stopPosts) stopPosts();
    round = act.phase;
    posts = {};
    stopPosts = watchPosts(code, activityId, round, (value) => { posts = value; draw(); }, (err) => console.error(err));
  }

  function draw() {
    const prompts = promptsOf(act);
    const prompt = prompts[indexOf(act)] || "";
    const all = countWords(posts, hiddenOf(act, act.phase));
    const words = all.filter((w) => !w.hidden);
    const showCloud = act.state === "results" || act.config?.live;

    if (!showCloud) {
      root.replaceChildren(el("div", { class: "text-view" },
        el("p", { class: "poll-statement", text: prompt }),
        el("p", { class: "poll-instruction cloud-instruction", text: t("cloud.screenWrite") }),
        el("p", { class: "measure-count", text: t("cloud.answers", { count: Object.keys(posts).length }) })));
      return;
    }

    const max = Math.max(1, ...words.map((w) => w.count));
    // Size grows with the square root of the count, so one very common word
    // doesn't make all the others tiny.
    fill(box, el("div", { class: "cloud" }, centerOut(words).map((w) => el("span", {
      class: `cloud-word cloud-c${all.indexOf(w) % COLORS}`,
      style: `--size: ${(0.35 + 0.65 * Math.sqrt(w.count / max)).toFixed(3)}`,
      text: w.word
    }))));
    root.replaceChildren(el("div", { class: "text-view" },
      el("p", { class: "text-view-prompt", text: prompt }),
      words.length ? box : el("p", { class: "text-view-empty", text: t("cloud.screenNoWords") })));
    fitToBox(box);
  }

  follow();
  draw();

  return {
    update(next) { act = next; follow(); draw(); },
    destroy() { if (stopPosts) stopPosts(); stopResize(); }
  };
}

// ---------- Report (report.html) ----------
// The words of every prompt, most frequent first. Words the facilitator
// removed from the projector are left out.
function report({ activity, posts }) {
  return [
    activity.config?.title && el("p", { class: "report-question", text: activity.config.title }),
    promptsOf(activity).map((prompt, i) => {
      const words = countWords(posts[`q${i}`], hiddenOf(activity, `q${i}`)).filter((w) => !w.hidden);
      return el("div", { class: "report-item" },
        el("p", { class: "report-question", text: `${i + 1}. ${prompt}` }),
        words.length === 0
          ? el("p", { class: "report-empty", text: t("cloud.noWords") })
          : el("p", { class: "report-words" }, words.map((w) => el("span", { class: "report-word" },
            el("span", { text: w.word }),
            w.count > 1 && el("span", { class: "report-word-count", text: ` ×${w.count}` })))));
    })
  ];
}

export default {
  name: "cloud.name",
  setup,
  describe,
  host,
  participant,
  screen,
  report
};
