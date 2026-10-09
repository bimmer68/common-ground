// Facilitator page (host.html): create a session, see who joined.
// The facilitator's phone is never shown on the projector.
import { ensureSignedIn } from "./firebase.js";
import { t, applyTranslations } from "./i18n.js";
import { showConnectionBanner } from "./connection.js";
import * as storage from "./storage.js";
import { codeFromUrl, pageUrl, getSessionMeta, createSession, watchNicknames } from "./session.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "host"; // { code }

let stopWatching = null;

function show(id) {
  ["loading", "create", "dashboard"].forEach((name) => { $(name).hidden = name !== id; });
}

function showCreate(notice = "") {
  $("create-notice").textContent = notice;
  $("create-notice").hidden = !notice;
  history.replaceState(null, "", location.pathname);
  show("create");
}

function showDashboard(code) {
  storage.save(STORAGE_KEY, { code });
  // Keep the code in the address bar, so a refresh lands in the same session.
  history.replaceState(null, "", `?s=${code}`);

  $("code").textContent = code;
  $("screen-link").href = pageUrl("screen.html", code);
  $("participant-link").textContent = pageUrl("index.html", code);
  show("dashboard");

  if (stopWatching) stopWatching();
  stopWatching = watchNicknames(code, renderParticipants, (err) => {
    console.error(err);
    showFatal(t("common.error"));
  });
}

function renderParticipants(list) {
  $("participants-title").textContent = t("host.participantsTitle", { count: list.length });
  $("no-participants").hidden = list.length > 0;
  const ul = $("participants");
  ul.replaceChildren(...list.map(({ nickname }) => {
    const li = document.createElement("li");
    li.textContent = nickname; // textContent: a nickname can never inject HTML
    return li;
  }));
}

function showFatal(message) {
  $("loading").hidden = true;
  $("fatal-error").textContent = message;
  $("fatal-error").hidden = false;
}

async function start() {
  applyTranslations();
  showConnectionBanner();

  let user;
  try {
    user = await ensureSignedIn();
  } catch (err) {
    console.error(err);
    return showFatal(t("common.signInError"));
  }

  $("create-button").addEventListener("click", () => create(user.uid));
  $("new-session").addEventListener("click", () => {
    if (!confirm(t("host.confirmNew"))) return;
    if (stopWatching) stopWatching();
    stopWatching = null;
    storage.remove(STORAGE_KEY);
    showCreate();
  });

  // After a refresh: go back to the session this phone created.
  const code = codeFromUrl() || storage.load(STORAGE_KEY)?.code;
  if (!code) return showCreate();

  try {
    const meta = await getSessionMeta(code);
    if (meta && meta.hostUid === user.uid) return showDashboard(code);
    storage.remove(STORAGE_KEY);
    showCreate(meta ? t("host.notYours", { code }) : "");
  } catch (err) {
    console.error(err);
    showFatal(t("common.error"));
  }
}

async function create(uid) {
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

start();
