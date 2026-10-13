// Activity type "poll": quick voting (Faza 3).
//
// The facilitator prepares a LIST of questions before the workshop. During the
// workshop they only click Next / Back. Every question goes through three
// states, always in this order:
//
//   statement → voting → results → (next question) statement → voting → …
//
//   statement  big text on the projector, phones show the text, no voting yet
//   voting     phones get buttons; projector shows the number of votes
//              (and the bars too, if this question shows results live)
//   results    voting is closed; projector shows bars with percentages
//   compare    extra screen: % for one option, per tag ("Win: 8% moved")
//
// Database:
//   activities/{id}   { type: "poll", phase: "q0" | "q1" | …, state, compare?,
//                       revealed: false, config: { title, questions: [ … ] } }
//   responses/{id}/q{n}/{uid}   index of the chosen option: 0, 1, 2 …
//
// "phase" is the question that is on now ("q2" = the third question), so every
// question keeps its own votes. The rules accept a vote only for the current
// question and only while its state is "voting".
//
// One question:  { type: "yesno" | "choice" | "truefalse" | "rating",
//                  text, options? (only for "choice", 2–6), tag?, live }
//   live = true:  bars grow on the projector while people vote
//   live = false: only the number of votes, bars after "Reveal"
import { t } from "../i18n.js";
import { el, fill } from "../dom.js";
import { watchMemberCount } from "../session.js";
import { saveResponse, getOwnResponse, watchResponses, updateActivity } from "../activity-store.js";
import { saveTemplate, loadTemplate, rememberedTemplates } from "../templates.js";

const TYPES = ["yesno", "choice", "truefalse", "rating"];
const LIMITS = { questions: 50, text: 200, option: 60, tag: 30, title: 80, minOptions: 2, maxOptions: 6 };

// ---------- Small helpers shared by all views ----------

const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");
const key = (value) => clean(value).toLowerCase(); // "Moved " and "moved" are the same option

// Firebase may give a list back as an array or as { 0: …, 1: … }; this handles both.
const list = (value) => (value ? Object.values(value) : []);

function questionsOf(act) {
  return list(act.config?.questions);
}

// The answer buttons of a question. Fixed types get their texts from en.js,
// so they will be translated on the phones later.
function optionsOf(question) {
  switch (question?.type) {
    case "yesno": return [t("poll.yes"), t("poll.no")];
    case "truefalse": return [t("poll.true"), t("poll.false")];
    case "rating": return ["1", "2", "3", "4", "5"];
    default: return list(question?.options).map(String);
  }
}

// "q3" -> 3
function indexOf(act) {
  const n = Number(String(act.phase || "").slice(1));
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

// How many votes each option got: [5, 2] for "5 yes, 2 no".
function tally(phaseResponses, optionCount) {
  const counts = new Array(optionCount).fill(0);
  Object.values(phaseResponses || {}).forEach((answer) => {
    if (Number.isInteger(answer) && answer >= 0 && answer < optionCount) counts[answer]++;
  });
  return counts;
}

const sum = (numbers) => numbers.reduce((a, b) => a + b, 0);
const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

// Average of a 1–5 rating, e.g. 3.8 (votes for "1" are at index 0).
function ratingAverage(counts) {
  const total = sum(counts);
  return total ? counts.reduce((acc, c, i) => acc + c * (i + 1), 0) / total : null;
}

// ---------- Next / Back ----------
// The whole poll is one long row of steps:
//   q0 statement, q0 voting, q0 results, q1 statement, q1 voting, …
// Next and Back just move one step along that row.

function nextStep(act, count) {
  const i = indexOf(act);
  const state = act.state === "compare" ? "results" : act.state;
  if (state === "statement") return { state: "voting" };
  if (state === "voting") return { state: "results" };
  if (i + 1 < count) return { phase: `q${i + 1}`, state: "statement" };
  return null; // the last question is finished
}

function previousStep(act) {
  const i = indexOf(act);
  if (act.state === "compare") return { state: "results" };
  if (act.state === "results") return { state: "voting" };
  if (act.state === "voting") return { state: "statement" };
  if (i > 0) return { phase: `q${i - 1}`, state: "results" };
  return null; // already at the very beginning
}

function nextLabel(act, questions) {
  const question = questions[indexOf(act)];
  const state = act.state === "compare" ? "results" : act.state;
  if (state === "statement") return t("poll.next.openVoting");
  if (state === "voting") return t(question?.live ? "poll.next.closeVoting" : "poll.next.reveal");
  return indexOf(act) + 1 < questions.length ? t("poll.next.nextQuestion") : t("poll.next.end");
}

// ---------- Compare by tag ----------

// Tags in the order they first appear, e.g. ["Win", "Dialogue"].
function tagsOf(questions) {
  const seen = new Map();
  questions.forEach((q) => {
    const tag = clean(q.tag);
    if (tag && !seen.has(key(tag))) seen.set(key(tag), tag);
  });
  return [...seen.values()];
}

// Every option text used by tagged questions (for the "compare which option?" list).
function compareOptionsOf(questions) {
  const seen = new Map();
  questions.filter((q) => clean(q.tag)).forEach((q) => {
    optionsOf(q).forEach((label) => { if (!seen.has(key(label))) seen.set(key(label), label); });
  });
  return [...seen.values()];
}

// For each tag: how many of all votes in its questions went to the chosen option.
//   [{ tag: "Win", hits: 2, total: 24, pct: 8 }, { tag: "Dialogue", … }]
function compareData(questions, responses, option) {
  return tagsOf(questions).map((tag) => {
    let hits = 0;
    let total = 0;
    questions.forEach((q, i) => {
      if (key(q.tag) !== key(tag)) return;
      const options = optionsOf(q);
      tally(responses[`q${i}`], options.length).forEach((count, k) => {
        total += count;
        if (key(options[k]) === key(option)) hits += count;
      });
    });
    return { tag, hits, total, pct: total ? percent(hits, total) : null };
  });
}

// ---------- Facilitator: preparing the list of questions ----------

function emptyQuestion(type = "yesno") {
  return { type, text: "", options: ["", ""], tag: "", live: false };
}

// Turns the form into what is saved: trimmed texts, options only for "choice",
// no empty tag. Returns { config } or { error }.
function buildConfig(title, questions) {
  const out = [];
  if (!questions.length) return { error: t("poll.errorNoQuestions") };
  if (questions.length > LIMITS.questions) return { error: t("poll.errorTooMany", { max: LIMITS.questions }) };
  for (const [i, q] of questions.entries()) {
    const n = i + 1;
    const text = clean(q.text);
    if (!text || text.length > LIMITS.text) return { error: t("poll.errorText", { n, max: LIMITS.text }) };
    const item = { type: q.type, text, live: !!q.live };
    if (q.type === "choice") {
      const options = q.options.map(clean);
      if (options.length < LIMITS.minOptions || options.length > LIMITS.maxOptions
        || options.some((o) => !o || o.length > LIMITS.option)) {
        return { error: t("poll.errorOptions", { n, min: LIMITS.minOptions, max: LIMITS.maxOptions, chars: LIMITS.option }) };
      }
      item.options = options;
    }
    const tag = clean(q.tag);
    if (tag.length > LIMITS.tag) return { error: t("poll.errorTag", { n, max: LIMITS.tag }) };
    if (tag) item.tag = tag;
    out.push(item);
  }
  const cleanTitle = clean(title);
  if (cleanTitle.length > LIMITS.title) return { error: t("poll.errorTitle", { max: LIMITS.title }) };
  return { config: { title: cleanTitle, questions: out } };
}

// A saved list (template or activity) back into editable form.
function fromConfig(config) {
  return questionsOf({ config }).map((q) => ({
    type: TYPES.includes(q.type) ? q.type : "yesno",
    text: q.text || "",
    options: q.type === "choice" ? list(q.options).map(String) : ["", ""],
    tag: q.tag || "",
    live: !!q.live
  }));
}

function setup({ el: root, uid, onStart, onCancel }) {
  let title = "";
  let questions = [emptyQuestion()];
  let template = null; // { code, ownerUid } of the template that was loaded or saved

  const message = el("p", { class: "notice", role: "status", hidden: true });
  const error = el("p", { class: "error", role: "alert", hidden: true });

  function say(text) {
    message.textContent = text;
    message.hidden = !text;
    error.hidden = true;
  }
  function fail(text) {
    error.textContent = text;
    error.hidden = !text;
    message.hidden = true;
  }

  // One question in the editor. Typing changes the data directly (no redraw,
  // so the keyboard stays open); adding, removing or moving redraws the list.
  function questionEditor(q, i) {
    const id = `poll-q${i}`;
    const move = (delta) => {
      const j = i + delta;
      if (j < 0 || j >= questions.length) return;
      [questions[i], questions[j]] = [questions[j], questions[i]];
      draw();
    };

    const options = q.type !== "choice" ? null : el("div", { class: "poll-options-edit" },
      el("p", { class: "label", text: t("poll.optionsLabel", { min: LIMITS.minOptions, max: LIMITS.maxOptions }) }),
      q.options.map((value, k) => el("div", { class: "inline-row" },
        el("input", {
          value, maxlength: LIMITS.option, "aria-label": t("poll.optionN", { n: k + 1 }),
          placeholder: t("poll.optionN", { n: k + 1 }),
          oninput: (event) => { q.options[k] = event.target.value; }
        }),
        q.options.length > LIMITS.minOptions && el("button", {
          type: "button", class: "button button-small button-secondary", text: "✕",
          "aria-label": t("poll.removeOption"),
          onclick: () => { q.options.splice(k, 1); draw(); }
        }))),
      q.options.length < LIMITS.maxOptions && el("button", {
        type: "button", class: "button button-small button-secondary", text: t("poll.addOption"),
        onclick: () => { q.options.push(""); draw(); }
      }));

    return el("fieldset", { class: "poll-edit" },
      el("legend", { text: t("poll.questionN", { n: i + 1 }) }),
      el("div", { class: "button-row" },
        el("button", { type: "button", class: "button button-small button-secondary", text: "↑", "aria-label": t("poll.moveUp"), disabled: i === 0, onclick: () => move(-1) }),
        el("button", { type: "button", class: "button button-small button-secondary", text: "↓", "aria-label": t("poll.moveDown"), disabled: i === questions.length - 1, onclick: () => move(1) }),
        el("button", {
          type: "button", class: "button button-small button-secondary", text: t("poll.removeQuestion"),
          disabled: questions.length === 1,
          onclick: () => { questions.splice(i, 1); draw(); }
        })),
      el("label", { for: `${id}-type`, text: t("poll.typeLabel") }),
      el("select", {
        id: `${id}-type`,
        onchange: (event) => { q.type = event.target.value; draw(); }
      }, TYPES.map((type) => el("option", { value: type, text: t(`poll.type.${type}`), selected: type === q.type }))),
      el("label", { for: `${id}-text`, text: t("poll.textLabel") }),
      el("textarea", {
        id: `${id}-text`, rows: 2, maxlength: LIMITS.text, value: q.text,
        oninput: (event) => { q.text = event.target.value; }
      }),
      options,
      el("label", { for: `${id}-tag`, text: t("poll.tagLabel") }),
      el("input", {
        id: `${id}-tag`, maxlength: LIMITS.tag, value: q.tag, placeholder: t("poll.tagPlaceholder"),
        oninput: (event) => { q.tag = event.target.value; }
      }),
      el("label", { class: "check" },
        el("input", { type: "checkbox", checked: q.live, onchange: (event) => { q.live = event.target.checked; } }),
        el("span", { text: t("poll.liveLabel") })));
  }

  // ----- Templates: save the list and use it again in another session -----
  const templateCode = el("input", {
    id: "poll-template-code", class: "input-code", maxlength: 6, autocomplete: "off",
    autocapitalize: "characters", spellcheck: "false", placeholder: "ABCDEF"
  });

  async function load(code) {
    fail("");
    try {
      const saved = await loadTemplate(code);
      if (!saved || saved.type !== "poll") return fail(t("poll.templateNotFound", { code }));
      title = saved.config?.title || "";
      questions = fromConfig(saved.config);
      if (!questions.length) questions = [emptyQuestion()];
      template = { code, ownerUid: saved.ownerUid };
      draw();
      say(t("poll.templateLoaded", { code }));
    } catch (err) {
      console.error(err);
      fail(t("common.error"));
    }
  }

  async function save() {
    const built = buildConfig(title, questions);
    if (built.error) return fail(built.error);
    if (!built.config.title) return fail(t("poll.errorTemplateTitle"));
    try {
      // Our own template is updated; someone else's becomes a new copy with a new code.
      const reuse = template && template.ownerUid === uid ? template.code : null;
      const code = await saveTemplate(uid, "poll", built.config, reuse);
      template = { code, ownerUid: uid };
      draw();
      say(t(reuse ? "poll.templateUpdated" : "poll.templateSaved", { code }));
    } catch (err) {
      console.error(err);
      fail(t("common.error"));
    }
  }

  function templateSection() {
    const mine = rememberedTemplates("poll");
    return el("div", { class: "poll-templates" },
      el("h3", { text: t("poll.templatesTitle") }),
      el("p", { class: "hint", text: t("poll.templatesHint") }),
      el("button", {
        type: "button", class: "button button-secondary",
        text: t(template && template.ownerUid === uid ? "poll.templateUpdate" : "poll.templateSave"),
        onclick: save
      }),
      mine.length > 0 && el("p", { class: "label", text: t("poll.templatesMine") }),
      mine.length > 0 && el("ul", { class: "activity-list" }, mine.map((saved) => el("li", {},
        el("span", { text: `${saved.title} · ${saved.code}` }),
        el("button", { type: "button", class: "button button-small", text: t("poll.templateLoad"), onclick: () => load(saved.code) })))),
      el("form", {
        class: "inline-form", novalidate: true,
        onsubmit: (event) => {
          event.preventDefault();
          const code = clean(templateCode.value).toUpperCase();
          if (!/^[A-Z]{6}$/.test(code)) return fail(t("poll.templateCodeError"));
          load(code);
        }
      },
      el("label", { for: "poll-template-code", text: t("poll.templateCodeLabel") }),
      el("div", { class: "inline-row" },
        templateCode,
        el("button", { type: "submit", class: "button button-small", text: t("poll.templateLoad") }))));
  }

  const startButton = el("button", { type: "button", class: "button", text: t("poll.start") });
  startButton.addEventListener("click", async () => {
    const built = buildConfig(title, questions);
    if (built.error) return fail(built.error);
    fail("");
    startButton.disabled = true;
    try {
      await onStart("q0", built.config, { state: "statement" });
    } catch (err) {
      console.error(err);
      fail(t("common.error"));
      startButton.disabled = false;
    }
  });

  function draw() {
    fill(root,
      el("h2", { text: t("poll.name") }),
      el("p", { class: "hint", text: t("poll.setupHint") }),
      el("label", { for: "poll-title", text: t("poll.titleLabel") }),
      el("input", {
        id: "poll-title", maxlength: LIMITS.title, value: title, placeholder: t("poll.titlePlaceholder"),
        oninput: (event) => { title = event.target.value; }
      }),
      questions.map(questionEditor),
      questions.length < LIMITS.questions && el("div", { class: "button-row" },
        TYPES.map((type) => el("button", {
          type: "button", class: "button button-small button-secondary", text: t("poll.addType", { type: t(`poll.type.${type}`) }),
          onclick: () => { questions.push(emptyQuestion(type)); draw(); }
        }))),
      templateSection(),
      message,
      error,
      startButton,
      el("button", { type: "button", class: "button button-secondary", text: t("common.cancel"), onclick: onCancel })
    );
  }

  draw();
}

// Short line for the facilitator's list of activities.
function describe(activity) {
  const questions = questionsOf(activity);
  const title = activity.config?.title || questions[0]?.text || "";
  return `${t("poll.name")} · ${title} (${t("poll.questionCount", { count: questions.length })})`;
}

// ---------- Facilitator: Next / Back while it runs ----------
function host({ el: root, code, activityId, activity }) {
  let act = activity;
  let responses = {};
  let members = 0;
  let compareChoice = null;

  async function change(fields) {
    try {
      await updateActivity(code, activityId, fields);
    } catch (err) {
      console.error(err);
      alert(t("common.error"));
    }
  }

  function draw() {
    const questions = questionsOf(act);
    const i = indexOf(act);
    const question = questions[i] || {};
    const options = optionsOf(question);
    const counts = tally(responses[`q${i}`], options.length);
    const votes = sum(counts);
    const next = nextStep(act, questions.length);
    const back = previousStep(act);
    const tags = tagsOf(questions);
    const compareOptions = compareOptionsOf(questions);
    if (!compareOptions.some((o) => key(o) === key(compareChoice))) compareChoice = compareOptions[0] || null;

    // The facilitator always sees the numbers on their phone (never projected).
    const bars = el("ul", { class: "poll-mini" }, options.map((label, k) => el("li", {},
      el("span", { text: label }),
      el("span", { text: `${counts[k]} · ${percent(counts[k], votes)}%` }))));

    const compare = !tags.length ? null : el("div", { class: "poll-compare-controls" },
      el("h3", { text: t("poll.compareTitle") }),
      el("p", { class: "hint", text: t("poll.compareHint", { tags: tags.join(" · ") }) }),
      el("label", { for: "poll-compare-option", text: t("poll.compareOption") }),
      el("select", {
        id: "poll-compare-option",
        onchange: (event) => { compareChoice = event.target.value; }
      }, compareOptions.map((o) => el("option", { value: o, text: o, selected: key(o) === key(compareChoice) }))),
      act.state === "compare"
        ? el("button", {
          type: "button", class: "button", text: t("poll.compareUpdate"),
          onclick: () => change({ compare: compareChoice })
        })
        : el("button", {
          type: "button", class: "button button-secondary", text: t("poll.compareShow"),
          onclick: () => change({ state: "compare", compare: compareChoice })
        }));

    fill(root,
      el("h2", { text: act.config?.title || t("poll.name") }),
      el("p", { class: "label", text: t("poll.questionOf", { n: i + 1, total: questions.length }) }),
      el("p", { class: "poll-host-question", text: question.text || "" }),
      question.tag && el("p", { class: "hint", text: t("poll.tagShown", { tag: question.tag }) }),
      el("p", { class: "phase-now", text: t(`poll.state.${act.state}`) }),
      el("p", { class: "count count-active", text: t("poll.voted", { count: votes, total: members }) }),
      bars,
      el("p", { class: "hint", text: t(question.live ? "poll.liveNote" : "poll.revealNote") }),
      el("button", {
        type: "button", class: "button", text: nextLabel(act, questions), disabled: !next,
        onclick: () => next && change(next)
      }),
      el("button", {
        type: "button", class: "button button-secondary", text: t("poll.back"), disabled: !back,
        onclick: () => back && change(back)
      }),
      el("label", { for: "poll-jump", text: t("poll.jump") }),
      el("select", {
        id: "poll-jump",
        onchange: (event) => change({ phase: `q${event.target.value}`, state: "statement" })
      }, questions.map((q, k) => el("option", {
        value: String(k), text: `${k + 1}. ${q.text}`, selected: k === i
      }))),
      compare
    );
  }

  const stopResponses = watchResponses(code, activityId, (r) => { responses = r; draw(); });
  const stopMembers = watchMemberCount(code, (n) => { members = n; draw(); });
  draw();

  return {
    update(next) { act = next; draw(); },
    destroy() { stopResponses(); stopMembers(); }
  };
}

// ---------- Participant: the buttons on the phone ----------
function participant({ el: root, code, uid, activityId, activity }) {
  let act = activity;
  const mine = {};    // phase -> my vote (index), remembered so a redraw doesn't ask the database again
  let loading = null; // the phase we are reading our vote for
  let error = "";

  async function loadMine(phase) {
    if (phase in mine || loading === phase) return;
    loading = phase;
    try {
      const saved = await getOwnResponse(code, activityId, phase, uid);
      if (!(phase in mine)) mine[phase] = Number.isInteger(saved) ? saved : null;
    } catch (err) {
      console.error(err);
      mine[phase] = null;
    }
    if (loading === phase) loading = null;
    draw();
  }

  async function vote(phase, index) {
    const before = mine[phase];
    mine[phase] = index; // show the choice at once; undo if it fails
    error = "";
    draw();
    try {
      await saveResponse(code, activityId, phase, uid, index);
    } catch (err) {
      console.error(err);
      mine[phase] = before;
      // Refused because voting was just closed: no error, the phone simply follows.
      if (act.phase === phase && act.state === "voting") error = t("poll.saveError");
      draw();
    }
  }

  function draw() {
    const questions = questionsOf(act);
    const i = indexOf(act);
    const question = questions[i] || {};
    const phase = `q${i}`;
    const options = optionsOf(question);
    const label = el("p", { class: "label", text: t("poll.questionOf", { n: i + 1, total: questions.length }) });
    const text = el("h1", { class: "poll-question-phone", text: question.text || "" });

    if (act.state === "statement") {
      root.replaceChildren(el("section", { class: "card" }, label, text,
        el("p", { class: "hint", text: t("poll.waitVoting") })));
      return;
    }

    if (!(phase in mine)) {
      loadMine(phase);
      root.replaceChildren(el("section", { class: "card" }, label, text,
        el("p", { class: "status", text: t("common.loading") })));
      return;
    }
    const chosen = mine[phase];

    if (act.state === "voting") {
      root.replaceChildren(el("section", { class: "card" }, label, text,
        el("div", { class: question.type === "rating" ? "poll-buttons poll-buttons-row" : "poll-buttons" },
          options.map((option, k) => el("button", {
            type: "button",
            class: k === chosen ? "poll-option poll-option-chosen" : "poll-option",
            "aria-pressed": k === chosen ? "true" : "false",
            text: option,
            onclick: () => vote(phase, k)
          }))),
        question.type === "rating" && el("div", { class: "scale-ends" },
          el("span", { text: t("poll.ratingLow") }),
          el("span", { text: t("poll.ratingHigh") })),
        error && el("p", { class: "error", role: "alert", text: error }),
        el("p", { class: "hint", text: t(chosen == null ? "poll.tapToVote" : "poll.voteSaved") })));
      return;
    }

    // results or compare: voting is closed
    root.replaceChildren(el("section", { class: "card center" }, label, text,
      el("p", { text: t("poll.closed") }),
      chosen != null && options[chosen] != null && el("p", { class: "hint", text: t("poll.yourVote", { option: options[chosen] }) })));
  }

  draw();

  return {
    update(next) { act = next; error = ""; draw(); },
    destroy() { loading = null; }
  };
}

// ---------- Projector ----------
function screen({ el: root, code, activityId, activity }) {
  let act = activity;
  let responses = {};
  let members = 0;

  function barChart(question, counts) {
    const total = sum(counts);
    const max = Math.max(1, ...counts);
    const average = question.type === "rating" ? ratingAverage(counts) : null;
    return el("div", { class: "poll-chart" },
      optionsOf(question).map((label, k) => el("div", { class: "poll-bar-row" },
        el("div", { class: "poll-bar-label", text: label }),
        el("div", { class: "poll-bar-track" },
          el("div", { class: "poll-bar-fill", style: `width: ${(counts[k] / max) * 100}%` })),
        el("div", { class: "poll-bar-value", text: `${percent(counts[k], total)}%` }))),
      el("p", { class: "poll-total", text: t("poll.votes", { count: total }) }),
      average != null && el("p", { class: "poll-average", text: t("poll.average", { value: average.toFixed(1) }) }));
  }

  function drawCompare(questions) {
    const option = act.compare || compareOptionsOf(questions)[0] || "";
    root.replaceChildren(el("div", { class: "poll-compare" },
      compareData(questions, responses, option).map((row) => el("div", { class: "poll-compare-col" },
        el("div", { class: "poll-compare-tag", text: row.tag }),
        el("div", { class: "poll-compare-pct", text: row.pct == null ? t("measure.noValue") : `${row.pct}%` }),
        el("div", { class: "poll-compare-option", text: option }),
        el("div", { class: "poll-compare-n", text: t("poll.votes", { count: row.total }) })))));
  }

  function draw() {
    const questions = questionsOf(act);
    if (act.state === "compare") return drawCompare(questions);

    const i = indexOf(act);
    const question = questions[i] || {};
    const counts = tally(responses[`q${i}`], optionsOf(question).length);

    if (act.state === "statement") {
      root.replaceChildren(el("p", { class: "poll-statement", text: question.text || "" }));
      return;
    }

    const parts = [el("p", { class: "poll-question", text: question.text || "" })];
    if (act.state === "voting") {
      parts.push(el("p", { class: "poll-instruction", text: t("poll.screenVote") }));
      if (question.live) parts.push(barChart(question, counts));
      else parts.push(el("p", { class: "measure-count", text: t("poll.screenVotes", { count: sum(counts), total: members }) }));
    } else {
      parts.push(barChart(question, counts));
    }
    root.replaceChildren(...parts);
  }

  const stopResponses = watchResponses(code, activityId, (r) => { responses = r; draw(); });
  const stopMembers = watchMemberCount(code, (n) => { members = n; draw(); });
  draw();

  return {
    update(next) { act = next; draw(); },
    destroy() { stopResponses(); stopMembers(); }
  };
}

export default {
  name: "poll.name", // i18n key for the "start new activity" button
  setup,
  describe,
  host,
  participant,
  screen
};
