// Facilitator page (host.html): create or take over a session, see how many
// joined, start activities and control them, run the timer. The facilitator's
// phone is never shown on the projector, so the host PIN is safe here. The
// facilitator sees only HOW MANY people joined, never who (nicknames stay on
// the phones).
//
// Layout (made for a phone, ~375 px wide):
//   - a bar at the top that never scrolls away: code, participants, what is
//     on the projector, timer button
//   - "Now": the activity with ONE big button for the next step
//   - "New activity": a tile per type (colour + icon)
//   - everything else (earlier activities, links, report, PIN, settings) is
//     folded, so it never pushes the controls down
//
// "Open" vs "On projector": an earlier activity can be opened ONLY on this
// phone (e.g. to approve texts during a break). The projector and the phones
// keep showing what they showed; only "On projector" switches them.
import { ensureSignedIn } from "./firebase.js";
import { t, applyTranslations, setLanguage, currentLanguage } from "./i18n.js";
import { HOST_LANGUAGES } from "./i18n/languages.js";
import { showConnectionBanner } from "./connection.js";
import { el, fill } from "./dom.js";
import { badge } from "./host-ui.js";
import * as storage from "./storage.js";
import {
  codeFromUrl, pageUrl, normalizeCode, isValidCode, isValidPin, getSessionMeta,
  createSession, takeOverSession, getHostPin, watchMeta, watchMemberCount, isDenied
} from "./session.js";
import { startNewActivity, setCurrent, watchActivities, watchCurrent } from "./activity-store.js";
import { activityView } from "./activity-loop.js";
import { activityTypes } from "./activities/index.js";
import { timerControls } from "./timer.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "host";             // { code }
const LANGUAGE_KEY = "hostLanguage";    // "bs" | "en" | "it" – only on this phone

let uid = null;
let sessionCode = null; // the session open on the dashboard
let stops = [];         // functions that stop the live listeners of that session
let currentId = null;   // the activity on the projector now
let previewId = null;   // an activity opened ONLY on this phone (or null)
let activities = [];    // all activities of the session
let shown = { id: null, stop: null, activity: null }; // the activity in the "Now" card
const pending = new Map(); // activityId -> { stop, count } texts waiting for approval
let dashboardError = (err) => console.error(err); // the error handler of the open dashboard

function show(id) {
  ["loading", "create", "dashboard"].forEach((name) => { $(name).hidden = name !== id; });
  $("host-bar").hidden = id !== "dashboard";
}

function stopAll() {
  stops.forEach((stop) => stop());
  stops = [];
  if (shown.stop) shown.stop();
  shown = { id: null, stop: null, activity: null };
  pending.forEach((entry) => entry.stop());
  pending.clear();
  sessionCode = null;
  currentId = null;
  previewId = null;
  activities = [];
}

const moduleOf = (activity) => activityTypes[activity?.type] || null;
const iconOf = (activity) => moduleOf(activity)?.icon || "•";
const nameOf = (activity) => {
  const module = moduleOf(activity);
  return module ? module.describe(activity) : activity?.type || "";
};
const shortNameOf = (type) => t(activityTypes[type]?.short || activityTypes[type]?.name || type);
const typeClass = (type) => `type-${String(type || "none").replace(/[^a-zA-Z]/g, "")}`;

function showCreate(notice = "", code = "") {
  stopAll();
  $("fatal-error").hidden = true;
  $("create-notice").textContent = notice;
  $("create-notice").hidden = !notice;
  $("takeover-code").value = code;
  $("takeover-pin").value = "";
  $("takeover-error").hidden = true;
  history.replaceState(null, "", location.pathname);
  show("create");
}

function showDashboard(code) {
  stopAll();
  sessionCode = code;
  storage.save(STORAGE_KEY, { code });
  // Keep the code in the address bar, so a refresh lands in the same session.
  history.replaceState(null, "", `?s=${code}`);

  $("bar-code").textContent = code;
  $("bar-people").textContent = t("host.barPeople", { count: 0 });
  $("screen-link").href = pageUrl("screen.html", code);
  $("report-link").href = pageUrl("report.html", code);
  $("participant-link").textContent = pageUrl("index.html", code);
  $("pin").textContent = "";
  closeSetup();
  drawNow();
  drawBar();
  show("dashboard");

  getHostPin(code)
    .then((pin) => { $("pin").textContent = pin || t("host.pinMissing"); })
    .catch((err) => console.error(err));

  // Someone took over with the PIN: this phone quietly stops listening and
  // shows only the takeover message (no error).
  const lostControl = () => {
    if (sessionCode !== code) return; // already handled
    storage.remove(STORAGE_KEY);
    showCreate(t("host.lostControl", { code }), code);
  };

  // A listener can be refused by the database ("permission denied") in the
  // moment control moves to another device. That is not a real error: check
  // who owns the session now, and only show an error if it is still us.
  const onError = (err) => {
    if (sessionCode !== code) return; // this dashboard is already closed
    console.error(err);
    if (!isDenied(err)) return showFatal(t("common.error"));
    getSessionMeta(code)
      .then((meta) => {
        if (meta && meta.hostUid !== uid) lostControl();
        else if (sessionCode === code) showFatal(t("common.error"));
      })
      .catch(() => { if (sessionCode === code) showFatal(t("common.error")); });
  };
  dashboardError = onError;

  // If someone takes over with the PIN, this phone loses control.
  stops.push(watchMeta(code, (meta) => {
    if (meta && meta.hostUid !== uid) lostControl();
  }, onError));

  // Only the number of participants – the facilitator never sees who they are.
  stops.push(watchMemberCount(code, (count) => {
    $("bar-people").textContent = t("host.barPeople", { count });
    $("bar-people").setAttribute("aria-label", t("host.participantsCount", { count }));
  }, onError));

  stops.push(timerControls({ el: $("timer"), code, onError, onStatus: drawTimerButton }));

  // What is on the projector now.
  stops.push(watchCurrent(code, (id) => {
    currentId = id;
    if (previewId === id) previewId = null; // the opened activity is now on the projector
    refreshNow();
    drawBar();
    renderActivities();
  }, onError));

  stops.push(watchActivities(code, (list) => {
    activities = list;
    followPending();
    drawBar();
    renderActivities();
  }, onError));
}

// ---------- The bar at the top ----------

function drawBar() {
  const current = activities.find((a) => a.id === currentId);
  const bar = $("bar-activity");
  bar.textContent = current ? `${iconOf(current)} ${shortNameOf(current.type)}` : t("host.barIdle");
  bar.title = current ? nameOf(current) : t("host.barIdle");
  bar.setAttribute("aria-label", t("host.barOnProjector", { name: current ? nameOf(current) : t("host.barIdle") }));
}

// The timer button shows the time left while a timer runs.
function drawTimerButton(status) {
  const button = $("bar-timer");
  button.textContent = status ? `⏱ ${status}` : "⏱";
  button.classList.toggle("bar-timer-running", !!status);
  button.setAttribute("aria-label", status ? t("host.timerRunning", { time: status }) : t("timer.title"));
}

function toggleTimer(open = $("timer").hidden) {
  $("timer").hidden = !open;
  $("bar-timer").setAttribute("aria-expanded", String(open));
}

// ---------- "Now": the activity on the projector, or one opened only here ----------

// Draws the activity that should be in the "Now" card: the opened one
// (preview) if there is one, otherwise the one on the projector.
function refreshNow() {
  const id = previewId || currentId;
  if (id !== shown.id) {
    if (shown.stop) shown.stop();
    shown = { id, stop: null, activity: null };
    if (id) {
      shown.stop = activityView({
        code: sessionCode, uid, role: "host", container: $("activity"), id, onError: dashboardError,
        extra: { end: () => endActivity(id) },
        onActivity: (activity) => { shown.activity = activity; drawNow(); }
      });
    } else {
      $("activity").replaceChildren();
    }
  }
  drawNow();
}

function drawNow() {
  const activity = shown.id ? shown.activity : null;
  const isPreview = !!previewId && shown.id === previewId;
  const now = $("now");
  now.className = `now-card ${shown.id ? typeClass(activity?.type) : "now-idle"}${isPreview ? " now-preview" : ""}`;
  $("now-icon").textContent = shown.id ? iconOf(activity) : "◻";
  $("now-kicker").textContent = t(isPreview ? "host.nowPreview" : "host.now");
  $("now-title").textContent = shown.id ? (activity ? shortNameOf(activity.type) : t("common.loading")) : t("host.nothingRunning");
  fill($("now-badge"), shown.id && (isPreview ? badge(t("host.badgePreview"), "preview") : badge(t("host.badgeLive"), "live")));
  $("no-activity").hidden = !!shown.id;
  $("end-activity").hidden = !shown.id || isPreview;

  $("preview-bar").hidden = !isPreview;
  if (isPreview) {
    const current = activities.find((a) => a.id === currentId);
    $("preview-text").textContent = t("host.previewText", { name: current ? nameOf(current) : t("host.barIdle") });
  }
}

// Ends the activity on the projector: everyone goes back to the QR code / waiting screen.
// id: the activity that asks to be ended (an activity opened only on this
// phone is not on the projector, so it can't end anything).
function endActivity(id = currentId) {
  if (!currentId) return;
  if (id !== currentId) return alert(t("host.notOnProjector"));
  if (!confirm(t("host.confirmEnd"))) return;
  setCurrent(sessionCode, null).catch(onActionError);
}

// "Open": only on this phone. The projector does not change.
function openHere(id) {
  previewId = id === currentId ? null : id;
  refreshNow();
  renderActivities();
  $("now").scrollIntoView({ behavior: "smooth", block: "start" });
}

// "On projector": the projector and all phones switch to this activity.
function project(id) {
  setCurrent(sessionCode, id)
    .then(() => { if (previewId === id) previewId = null; refreshNow(); renderActivities(); })
    .catch(onActionError);
}

// ---------- Texts waiting for approval (moderated wall, Common Ground) ----------
// A module that has watchPending() tells how many texts wait for approval, so
// the list of activities can show it even when the activity is not open.
function followPending() {
  const ids = new Set();
  activities.forEach((activity) => {
    const module = moduleOf(activity);
    if (!module?.watchPending) return;
    ids.add(activity.id);
    if (pending.has(activity.id)) return;
    const entry = { count: 0, stop: null };
    pending.set(activity.id, entry);
    entry.stop = module.watchPending({ code: sessionCode, activityId: activity.id }, (count) => {
      entry.count = count;
      renderActivities();
    }, (err) => console.error(err));
  });
  pending.forEach((entry, id) => {
    if (!ids.has(id)) { entry.stop(); pending.delete(id); }
  });
}

// ---------- Earlier activities ----------

function renderActivities() {
  $("no-activities").hidden = activities.length > 0;
  fill($("activities-badge"), activities.length > 0 && badge(String(activities.length), "info"));
  $("activities").replaceChildren(...activities.slice().reverse().map((activity) => {
    const live = activity.id === currentId;
    const opened = activity.id === previewId;
    const waiting = pending.get(activity.id)?.count || 0;
    return el("li", { class: `activity-item ${typeClass(activity.type)}${live ? " activity-live" : ""}` },
      el("span", { class: "type-icon type-icon-small", "aria-hidden": "true", text: iconOf(activity) }),
      el("div", { class: "activity-item-main" },
        el("p", { class: "activity-item-name", text: nameOf(activity) }),
        el("p", { class: "activity-item-badges" },
          live ? badge(t("host.badgeLive"), "live") : opened ? badge(t("host.badgePreview"), "preview") : badge(t("host.badgeDone"), "done"),
          waiting > 0 && badge(t("host.badgePending", { count: waiting }), "pending")),
        el("div", { class: "activity-item-buttons" },
          el("button", {
            type: "button", class: "button button-small button-secondary", text: t("host.open"),
            disabled: opened || (live && !previewId), onclick: () => openHere(activity.id)
          }),
          !live && el("button", {
            type: "button", class: "button button-small button-project", text: t("host.toProjector"),
            onclick: () => project(activity.id)
          }))));
  }));
}

// ---------- New activity ----------

// A tile for every activity type in js/activities/index.js, each in its own colour.
function renderActivityTypes() {
  $("activity-types").replaceChildren(...Object.entries(activityTypes).map(([type, module]) =>
    el("button", { type: "button", class: `tile ${typeClass(type)}`, onclick: () => openSetup(type) },
      el("span", { class: "tile-icon", "aria-hidden": "true", text: module.icon || "•" }),
      el("span", { class: "tile-name", text: shortNameOf(type) }))));
}

function openSetup(type) {
  const code = sessionCode;
  $("new-activity").hidden = true;
  $("activity-setup").hidden = false;
  $("activity-setup").className = `setup ${typeClass(type)}`;
  activityTypes[type].setup({
    el: $("activity-setup"),
    uid,
    onStart: async (phase, config, extra) => {
      await startNewActivity(code, type, phase, config, extra);
      previewId = null;
      closeSetup();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onCancel: closeSetup
  });
  $("new-activity-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeSetup() {
  $("activity-setup").replaceChildren();
  $("activity-setup").hidden = true;
  $("new-activity").hidden = false;
}

function onActionError(err) {
  console.error(err);
  alert(t("common.error"));
}

function showFatal(message) {
  $("loading").hidden = true;
  $("fatal-error").textContent = message;
  $("fatal-error").hidden = false;
}

// ---------- Language of this page (bs / en / it) ----------

function setupLanguagePickers() {
  document.querySelectorAll(".host-language").forEach((select) => {
    select.replaceChildren(...HOST_LANGUAGES.map((lang) => el("option", { value: lang.code, lang: lang.code, text: lang.name })));
    select.value = currentLanguage();
    select.addEventListener("change", () => changeLanguage(select.value));
  });
}

async function changeLanguage(code) {
  storage.save(LANGUAGE_KEY, code);
  await setLanguage(code, HOST_LANGUAGES);
  document.querySelectorAll(".host-language").forEach((select) => { select.value = currentLanguage(); });
  applyTranslations();
  renderActivityTypes();
  // Draw the whole dashboard again in the new language (same session, nothing is lost in the database).
  if (sessionCode) showDashboard(sessionCode);
}

async function start() {
  await setLanguage(storage.load(LANGUAGE_KEY), HOST_LANGUAGES);
  applyTranslations();
  setupLanguagePickers();
  showConnectionBanner();
  renderActivityTypes();
  drawTimerButton(null);

  let user;
  try {
    user = await ensureSignedIn();
  } catch (err) {
    console.error(err);
    return showFatal(t("common.signInError"));
  }
  uid = user.uid;

  $("create-button").addEventListener("click", create);
  $("takeover-form").addEventListener("submit", (event) => {
    event.preventDefault();
    takeOver();
  });
  $("end-activity").addEventListener("click", () => endActivity());
  $("bar-timer").addEventListener("click", () => toggleTimer());
  $("preview-project").addEventListener("click", () => previewId && project(previewId));
  $("preview-close").addEventListener("click", () => openHere(currentId));
  $("new-session").addEventListener("click", () => {
    if (!confirm(t("host.confirmNew"))) return;
    storage.remove(STORAGE_KEY);
    showCreate();
  });

  // After a refresh: go back to the session this phone controls.
  const code = codeFromUrl() || storage.load(STORAGE_KEY)?.code;
  if (!code) return showCreate();

  try {
    const meta = await getSessionMeta(code);
    if (meta && meta.hostUid === uid) return showDashboard(code);
    storage.remove(STORAGE_KEY);
    if (meta) showCreate(t("host.notYours", { code }), code);
    else showCreate();
  } catch (err) {
    console.error(err);
    showFatal(t("common.error"));
  }
}

async function create() {
  const button = $("create-button");
  button.disabled = true;
  button.textContent = t("host.creating");
  $("create-error").hidden = true;
  try {
    const code = await createSession(uid);
    showDashboard(code);
  } catch (err) {
    console.error(err);
    $("create-error").textContent = t("common.error");
    $("create-error").hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = t("host.create");
  }
}

async function takeOver() {
  const code = normalizeCode($("takeover-code").value);
  const pin = $("takeover-pin").value.trim();
  const error = $("takeover-error");
  const fail = (message) => {
    error.textContent = message;
    error.hidden = false;
  };

  if (!isValidCode(code)) return fail(t("participant.errorCode"));
  if (!isValidPin(pin)) return fail(t("host.errorPin"));
  error.hidden = true;

  const button = $("takeover-button");
  button.disabled = true;
  button.textContent = t("host.takingOver");
  try {
    const result = await takeOverSession(code, uid, pin);
    if (result === "ok") return showDashboard(code);
    fail(t({ notFound: "participant.errorNotFound", wait: "host.errorWait", wrongPin: "host.errorWrongPin" }[result]));
  } catch (err) {
    console.error(err);
    fail(t("common.error"));
  } finally {
    button.disabled = false;
    button.textContent = t("host.takeover");
  }
}

start();
