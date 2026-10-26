// Report page (report.html?s=CODE), Faza 6. Only for the facilitator.
//
// A clean, light page that can be printed or saved as PDF ("Print" button,
// then "Save as PDF" in the print window). It contains: date, number of
// participants and, for every activity type in js/activities/index.js, the
// part drawn by the module's own report() function.
//
// Never in the report: nicknames (they are not in the database), languages,
// uids, texts that were not approved or were hidden.
//
// The report itself can be in English or Italian (menu at the top, not
// printed). Only the report's own texts change; what people wrote stays as
// it was written.
import { ensureSignedIn } from "./firebase.js";
import { t, applyTranslations, setLanguage, currentLanguage } from "./i18n.js";
import { REPORT_LANGUAGES } from "./i18n/languages.js";
import { el, fill } from "./dom.js";
import * as storage from "./storage.js";
import { codeFromUrl, getSessionMeta } from "./session.js";
import { loadReportData } from "./report-store.js";
import { activityTypes } from "./activities/index.js";

const $ = (id) => document.getElementById(id);
const LANGUAGE_KEY = "reportLanguage"; // "en" | "it" – only on this device

function showMessage(text) {
  $("loading").hidden = true;
  $("message").textContent = text;
  $("message").hidden = false;
}

// "27 October 2026" / "27 ottobre 2026"
const formatDate = (ms) => (ms
  ? new Intl.DateTimeFormat(currentLanguage() === "en" ? "en-GB" : currentLanguage(), { dateStyle: "long" }).format(new Date(ms))
  : t("measure.noValue"));

// The language menu (not printed). Choosing a language draws the report again.
function languageMenu(code, data) {
  return el("div", { class: "report-language" },
    el("label", { for: "report-language", text: t("report.language") }),
    el("select", {
      id: "report-language",
      onchange: async (event) => {
        storage.save(LANGUAGE_KEY, event.target.value);
        await setLanguage(event.target.value, REPORT_LANGUAGES);
        applyTranslations();
        document.title = t("report.titleWithCode", { code });
        draw(code, data);
      }
    }, REPORT_LANGUAGES.map((lang) => el("option", { value: lang.code, lang: lang.code, text: lang.name, selected: lang.code === currentLanguage() }))));
}

// Activities as a list, oldest first.
function activityList(activities) {
  return Object.entries(activities || {})
    .map(([id, activity]) => ({ id, ...activity }))
    .filter((activity) => activity && activity.type)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function draw(code, data) {
  const activities = activityList(data.activities);
  const participants = Object.keys(data.members).length;

  // One section per activity type, in the order of js/activities/index.js.
  const sections = Object.entries(activityTypes).map(([type, module]) => {
    if (!module.report) return null;
    const ofType = activities.filter((activity) => activity.type === type);
    if (!ofType.length) return null;
    return el("section", { class: "report-section" },
      el("h2", { text: t(module.name) }),
      ofType.map((activity, i) => el("article", { class: "report-activity" },
        ofType.length > 1 && el("h3", { text: t("report.part", { n: i + 1, total: ofType.length }) }),
        module.report({
          activity,
          responses: data.responses[activity.id] || {},
          posts: data.posts[activity.id] || {},
          votes: data.votes[activity.id] || {},
          signs: data.signs[activity.id] || {}
        }))));
  }).filter(Boolean);

  fill($("report"),
    el("header", { class: "report-header" },
      el("p", { class: "report-kicker", text: t("app.name") }),
      el("h1", { text: t("report.heading") }),
      el("dl", { class: "report-facts" },
        el("div", {}, el("dt", { text: t("report.date") }), el("dd", { text: formatDate(data.meta.createdAt) })),
        el("div", {}, el("dt", { text: t("report.participants") }), el("dd", { text: String(participants) })),
        el("div", {}, el("dt", { text: t("report.activities") }), el("dd", { text: String(activities.length) })),
        el("div", {}, el("dt", { text: t("report.session") }), el("dd", { text: code }))),
      el("div", { class: "report-actions" },
        languageMenu(code, data),
        el("button", { type: "button", class: "report-button", text: t("report.print"), onclick: () => window.print() }),
        el("p", { class: "report-hint", text: t("report.printHint") }))),
    sections.length ? sections : el("p", { class: "report-empty", text: t("report.noActivities") }),
    el("footer", { class: "report-footer", text: t("report.privacy") }));

  $("loading").hidden = true;
  $("report").hidden = false;
}

async function start() {
  await setLanguage(storage.load(LANGUAGE_KEY), REPORT_LANGUAGES);
  applyTranslations();
  const code = codeFromUrl();
  if (!code) return showMessage(t("report.noCode"));

  let user;
  try {
    user = await ensureSignedIn();
  } catch (err) {
    console.error(err);
    return showMessage(t("common.signInError"));
  }

  try {
    const meta = await getSessionMeta(code);
    if (!meta) return showMessage(t("screen.notFound", { code }));
    // Only the device that controls the session (the facilitator) gets the report.
    if (meta.hostUid !== user.uid) return showMessage(t("report.notHost", { code }));
    document.title = t("report.titleWithCode", { code });
    draw(code, await loadReportData(code));
  } catch (err) {
    console.error(err);
    showMessage(t("common.error"));
  }
}

start();
