// Facilitator page (host.html): create or take over a session, see who joined,
// start activities and control them, run the timer. The facilitator's phone is
// never shown on the projector, so the host PIN is safe here. The facilitator
// sees only HOW MANY people joined, never who (nicknames stay on the phones).
import { ensureSignedIn } from "./firebase.js";
import { t, applyTranslations } from "./i18n.js";
import { showConnectionBanner } from "./connection.js";
import { el } from "./dom.js";
import * as storage from "./storage.js";
import {
  codeFromUrl, pageUrl, normalizeCode, isValidCode, isValidPin, getSessionMeta,
  createSession, takeOverSession, getHostPin, watchMeta, watchMemberCount, isDenied
} from "./session.js";
import { startNewActivity, setCurrent, watchActivities } from "./activity-store.js";
import { runActivityLoop } from "./activity-loop.js";
import { activityTypes } from "./activities/index.js";
import { timerControls } from "./timer.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "host"; // { code }

let uid = null;
let sessionCode = null; // the session open on the dashboard
let stops = [];         // functions that stop the live listeners of that session
let currentId = null;   // the activity that is running now
let activities = [];    // all activities of the session

function show(id) {
  ["loading", "create", "dashboard"].forEach((name) => { $(name).hidden = name !== id; });
}

function stopAll() {
  stops.forEach((stop) => stop());
  stops = [];
  sessionCode = null;
  currentId = null;
  activities = [];
}

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

  $("code").textContent = code;
  $("screen-link").href = pageUrl("screen.html", code);
  $("participant-link").textContent = pageUrl("index.html", code);
  $("pin").textContent = "";
  closeSetup();
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

  // If someone takes over with the PIN, this phone loses control.
  stops.push(watchMeta(code, (meta) => {
    if (meta && meta.hostUid !== uid) lostControl();
  }, onError));

  // Only the number of participants – the facilitator never sees who they are.
  stops.push(watchMemberCount(code, (count) => {
    $("participant-count").textContent = String(count);
  }, onError));

  stops.push(timerControls({ el: $("timer"), code, onError }));

  // The same loop as on the phones and the projector; here modules draw controls.
  stops.push(runActivityLoop({
    code, uid, role: "host", container: $("activity"), onError,
    onChange: (id) => {
      currentId = id;
      $("no-activity").hidden = !!id;
      $("end-activity").hidden = !id;
      renderActivities();
    }
  }));

  stops.push(watchActivities(code, (list) => {
    activities = list;
    renderActivities();
  }, onError));
}

function renderActivities() {
  $("no-activities").hidden = activities.length > 0;
  $("activities").replaceChildren(...activities.slice().reverse().map((activity) => {
    const module = activityTypes[activity.type];
    const name = module ? module.describe(activity) : activity.type;
    const running = activity.id === currentId;
    return el("li", {},
      el("span", { text: name }),
      running
        ? el("span", { class: "tag", text: t("host.activityRunning") })
        : el("button", {
          type: "button", class: "button button-small", text: t("host.activityShow"),
          onclick: () => setCurrent(sessionCode, activity.id).catch(onActionError)
        }));
  }));
}

// Buttons for every activity type in js/activities/index.js.
function renderActivityTypes() {
  $("activity-types").replaceChildren(...Object.entries(activityTypes).map(([type, module]) =>
    el("button", { type: "button", class: "button", text: t(module.name), onclick: () => openSetup(type) })));
}

function openSetup(type) {
  const code = sessionCode;
  $("new-activity").hidden = true;
  $("activity-setup").hidden = false;
  activityTypes[type].setup({
    el: $("activity-setup"),
    uid,
    onStart: async (phase, config, extra) => {
      await startNewActivity(code, type, phase, config, extra);
      closeSetup();
    },
    onCancel: closeSetup
  });
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

async function start() {
  applyTranslations();
  showConnectionBanner();
  renderActivityTypes();

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
  $("end-activity").addEventListener("click", () => {
    setCurrent(sessionCode, null).catch(onActionError);
  });
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
