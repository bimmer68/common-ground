// Activity type "measure": measurement before / after (Faza 2).
//
// Two statements on a 1–5 scale (1 = strongly disagree, 5 = strongly agree).
// ONE activity has two phases, "before" and "after", so both phases always use
// exactly the same statements. Statements are fixed once the activity starts.
//
//   activities/{id}                 { type: "measure", phase: "before" | "after", revealed, config: { statements: [s1, s2] } }
//   responses/{id}/{phase}/{uid}    [answer1, answer2]   (numbers 1–5)
//
// The projector shows only the number of answers until the facilitator
// clicks Reveal. Then it shows the average before → after for each statement.
import { t } from "../i18n.js";
import { el } from "../dom.js";
import { watchMemberCount } from "../session.js";
import { saveResponse, getOwnResponse, watchResponses, updateActivity } from "../activity-store.js";

const PRESETS = ["seniors", "juniorsDay1", "juniorsDay2"];
const SCALE = [1, 2, 3, 4, 5];
const STATEMENT_COUNT = 2;
const STATEMENT_MAX = 200;
const PHASES = ["before", "after"];

// Firebase may give a list back as an array or as { 0: …, 1: … }; this handles both.
function statementsOf(activity) {
  const s = activity.config?.statements || {};
  return Array.from({ length: STATEMENT_COUNT }, (_, i) => s[i] || "");
}

// Average and number of answers for one statement in one phase.
function stats(phaseResponses, index) {
  const values = Object.values(phaseResponses || {})
    .map((answer) => Number(answer?.[index]))
    .filter((n) => n >= 1 && n <= 5);
  if (!values.length) return { avg: null, n: 0 };
  return { avg: values.reduce((a, b) => a + b, 0) / values.length, n: values.length };
}

const countOf = (responses, phase) => Object.keys(responses[phase] || {}).length;
const formatAvg = (avg) => (avg == null ? t("measure.noValue") : avg.toFixed(1));
const phaseName = (phase) => t(`measure.phase.${phase}`);

// ---------- Facilitator: form for a new measurement ----------
function setup({ el: root, onStart, onCancel }) {
  const select = el("select", { id: "measure-preset" },
    PRESETS.map((id) => el("option", { value: id, text: t(`measure.preset.${id}`) })));
  const fields = Array.from({ length: STATEMENT_COUNT }, (_, i) =>
    el("textarea", { id: `measure-s${i}`, maxlength: STATEMENT_MAX, rows: 3 }));
  const error = el("p", { class: "error", role: "alert", hidden: true });
  const start = el("button", { type: "button", class: "button", text: t("measure.startBefore") });

  function fillPreset() {
    fields.forEach((field, i) => { field.value = t(`measure.preset.${select.value}.${i + 1}`); });
  }
  select.addEventListener("change", fillPreset);
  fillPreset();

  start.addEventListener("click", async () => {
    const statements = fields.map((f) => f.value.trim().replace(/\s+/g, " "));
    if (statements.some((s) => !s || s.length > STATEMENT_MAX)) {
      error.textContent = t("measure.errorStatement", { max: STATEMENT_MAX });
      error.hidden = false;
      return;
    }
    error.hidden = true;
    start.disabled = true;
    try {
      await onStart("before", { preset: select.value, statements });
    } catch (err) {
      console.error(err);
      error.textContent = t("common.error");
      error.hidden = false;
      start.disabled = false;
    }
  });

  root.replaceChildren(
    el("h2", { text: t("measure.name") }),
    el("label", { for: "measure-preset", text: t("measure.preset") }),
    select,
    ...fields.flatMap((field, i) => [
      el("label", { for: field.id, text: t("measure.statementLabel", { n: i + 1 }) }),
      field
    ]),
    el("p", { class: "hint", text: t("measure.setupHint") }),
    error,
    start,
    el("button", { type: "button", class: "button button-secondary", text: t("common.cancel"), onclick: onCancel })
  );
}

// Short line for the facilitator's list of activities.
function describe(activity) {
  return `${t("measure.name")} · ${phaseName(activity.phase)}`;
}

// ---------- Facilitator: controls while it is running ----------
function host({ el: root, code, activityId, activity }) {
  let act = activity;
  let responses = {};
  let members = 0;

  async function change(fields) {
    try {
      await updateActivity(code, activityId, fields);
    } catch (err) {
      console.error(err);
      alert(t("common.error"));
    }
  }

  function draw() {
    const buttons = [];
    if (act.phase === "before") {
      buttons.push(el("button", {
        type: "button", class: "button", text: t("measure.startAfter"),
        onclick: () => { if (confirm(t("measure.confirmAfter"))) change({ phase: "after", revealed: false }); }
      }));
    } else {
      buttons.push(el("button", {
        type: "button", class: "button button-secondary", text: t("measure.backToBefore"),
        onclick: () => change({ phase: "before", revealed: false })
      }));
    }
    buttons.push(el("button", {
      type: "button", class: "button", text: t(act.revealed ? "measure.hide" : "measure.reveal"),
      onclick: () => change({ revealed: !act.revealed })
    }));

    root.replaceChildren(
      el("h2", { text: t("measure.name") }),
      el("p", { class: "phase-now", text: t("measure.phaseNow", { phase: phaseName(act.phase) }) }),
      el("ol", { class: "statement-list" }, statementsOf(act).map((s) => el("li", { text: s }))),
      ...PHASES.map((phase) => el("p", {
        class: phase === act.phase ? "count count-active" : "count",
        text: t("measure.counts", { phase: phaseName(phase), count: countOf(responses, phase), total: members })
      })),
      el("p", { class: "hint", text: t(act.revealed ? "measure.revealedNote" : "measure.hiddenNote") }),
      ...buttons
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

// ---------- Participant: the form on the phone ----------
function participant({ el: root, code, uid, activityId, activity }) {
  let phase = null;
  let drawId = 0; // ignores slow answers that arrive after the phase changed

  async function load(act) {
    phase = act.phase;
    const myDraw = ++drawId;
    root.replaceChildren(el("p", { class: "status", text: t("common.loading") }));
    let saved = null;
    try {
      saved = await getOwnResponse(code, activityId, act.phase, uid);
    } catch (err) {
      console.error(err);
    }
    if (myDraw !== drawId) return;
    if (saved) showThanks(act, saved);
    else showForm(act, null);
  }

  function showForm(act, previous) {
    const statements = statementsOf(act);
    const answers = statements.map((_, i) => (previous ? Number(previous[i]) || null : null));
    const send = el("button", { type: "submit", class: "button", text: t("measure.submit") });
    const error = el("p", { class: "error", role: "alert", hidden: true });
    const refresh = () => { send.disabled = answers.some((a) => !a); };

    const questions = statements.map((statement, i) => el("fieldset", { class: "statement" },
      el("legend", { text: statement }),
      el("div", { class: "scale" }, SCALE.map((value) => el("label", {},
        el("input", {
          type: "radio", name: `s${i}`, value: String(value), checked: answers[i] === value,
          onchange: () => { answers[i] = value; refresh(); }
        }),
        el("span", { text: String(value) })
      ))),
      el("div", { class: "scale-ends" },
        el("span", { text: t("measure.scaleLow") }),
        el("span", { text: t("measure.scaleHigh") }))
    ));

    const form = el("form", { class: "card", novalidate: true },
      el("p", { class: "label", text: phaseName(act.phase) }),
      el("h1", { text: t("measure.participantTitle") }),
      ...questions, error, send);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (answers.some((a) => !a)) return;
      send.disabled = true;
      send.textContent = t("measure.saving");
      error.hidden = true;
      try {
        await saveResponse(code, activityId, act.phase, uid, answers);
        showThanks(act, answers);
      } catch (err) {
        console.error(err);
        error.textContent = t("measure.saveError");
        error.hidden = false;
        send.textContent = t("measure.submit");
        refresh();
      }
    });

    refresh();
    root.replaceChildren(form);
  }

  function showThanks(act, saved) {
    root.replaceChildren(el("section", { class: "card center" },
      el("h1", { text: t("measure.thanksTitle") }),
      el("p", { text: t("measure.thanksText") }),
      el("button", {
        type: "button", class: "button button-secondary", text: t("measure.change"),
        onclick: () => showForm(act, saved)
      })
    ));
  }

  load(activity);

  return {
    // Reveal changes nothing on the phone; a new phase shows a fresh form.
    update(next) { if (next.phase !== phase) load(next); },
    destroy() { drawId++; }
  };
}

// ---------- Projector ----------
function screen({ el: root, code, activityId, activity }) {
  let act = activity;
  let responses = {};
  let members = 0;

  function drawCount() {
    root.replaceChildren(
      el("p", { class: "measure-phase", text: phaseName(act.phase) }),
      el("p", { class: "measure-instruction", text: t("measure.screenInstruction") }),
      el("p", { class: "measure-count", text: t("measure.screenAnswered", { count: countOf(responses, act.phase), total: members }) })
    );
  }

  function valueBox(phase, s, extraClass) {
    return el("div", { class: `measure-value ${extraClass}` },
      el("div", { class: "measure-number", text: formatAvg(s.avg) }),
      el("div", { class: "measure-label", text: t("measure.screenN", { phase: phaseName(phase), count: s.n }) }));
  }

  function drawResults() {
    root.replaceChildren(el("div", { class: "measure-results" },
      statementsOf(act).map((statement, i) => {
        const before = stats(responses.before, i);
        const after = stats(responses.after, i);
        return el("div", { class: "measure-row" },
          el("p", { class: "measure-statement", text: statement }),
          el("div", { class: "measure-shift" },
            valueBox("before", before, "before"),
            el("div", { class: "measure-arrow", "aria-hidden": "true", text: "→" }),
            valueBox("after", after, "after")));
      })));
  }

  const draw = () => (act.revealed ? drawResults() : drawCount());
  const stopResponses = watchResponses(code, activityId, (r) => { responses = r; draw(); });
  const stopMembers = watchMemberCount(code, (n) => { members = n; draw(); });
  draw();

  return {
    update(next) { act = next; draw(); },
    destroy() { stopResponses(); stopMembers(); }
  };
}

// ---------- Report (report.html) ----------
// The average before -> after for each statement, with the number of answers.
function report({ activity, responses }) {
  const cell = (s) => (s.avg == null ? t("measure.noValue") : t("report.average", { value: formatAvg(s.avg), count: s.n }));
  return [
    el("p", { class: "report-meta", text: `${t("measure.scaleLow")} · ${t("measure.scaleHigh")}` }),
    el("table", { class: "report-table" },
      el("thead", {}, el("tr", {},
        el("th", { text: t("report.statement") }),
        el("th", { class: "report-num", text: phaseName("before") }),
        el("th", { class: "report-num", text: phaseName("after") }))),
      el("tbody", {}, statementsOf(activity).map((statement, i) => el("tr", {},
        el("td", { text: statement }),
        el("td", { class: "report-num", text: cell(stats(responses.before, i)) }),
        el("td", { class: "report-num report-strong", text: cell(stats(responses.after, i)) })))))
  ];
}

export default {
  name: "measure.name", // i18n key for the "start new activity" button
  setup,
  describe,
  host,
  participant,
  screen,
  report
};
