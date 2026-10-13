// Participant page (index.html): enter code + nickname, then follow the
// facilitator: the waiting card when nothing runs, otherwise the current activity.
// The nickname stays ONLY on this phone (localStorage). It is never sent to
// the database, so nobody can link this person to their answers.
import { ensureSignedIn } from "./firebase.js";
import { t, applyTranslations, setLanguage } from "./i18n.js";
import { LANGUAGES } from "./i18n/languages.js";
import { el } from "./dom.js";
import { showConnectionBanner } from "./connection.js";
import * as storage from "./storage.js";
import { runActivityLoop } from "./activity-loop.js";
import {
  NICKNAME_MAX, codeFromUrl, normalizeCode, isValidCode, normalizeNickname,
  isValidNickname, getSessionMeta, joinSession, isMember
} from "./session.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "participant"; // { code, nickname } – only on this phone
const LANGUAGE_KEY = "language";    // e.g. "uk" – only on this phone, never in the database

let uid = null;
let stopLoop = null;
let joined = null; // { code, nickname } once in a session

function show(id) {
  ["loading", "join-form", "waiting", "activity"].forEach((name) => { $(name).hidden = name !== id; });
  // The language can be changed on the join form and while waiting, not in the middle of an activity.
  $("language-picker").hidden = id !== "join-form" && id !== "waiting";
}

// The language menu: every language with its own name, in its own script.
function setupLanguagePicker(selected) {
  const select = $("language");
  select.replaceChildren(...LANGUAGES.map((lang) =>
    el("option", { value: lang.code, lang: lang.code, dir: lang.dir || "ltr", text: lang.name })));
  select.value = selected;
  select.addEventListener("change", async () => {
    storage.save(LANGUAGE_KEY, select.value);
    await setLanguage(select.value);
    applyTranslations();
    showError("");
    if (joined) drawWaiting(joined.code, joined.nickname);
  });
}

function drawWaiting(code, nickname) {
  $("waiting-title").textContent = nickname
    ? t("participant.waitingTitleNamed", { nickname })
    : t("participant.waitingTitle");
  $("joined-as").textContent = t("participant.joinedAs", { code });
}

function showError(message) {
  $("join-error").textContent = message;
  $("join-error").hidden = !message;
}

function showJoined(code, nickname) {
  joined = { code, nickname };
  drawWaiting(code, nickname);
  show("waiting");
  // Keep the code in the address bar, so a refresh lands in the same session.
  history.replaceState(null, "", `?s=${code}`);

  // Follow the facilitator: when they start an activity, its form appears here.
  if (stopLoop) stopLoop();
  stopLoop = runActivityLoop({
    code, uid, role: "participant", container: $("activity"),
    onChange: (id) => show(id ? "activity" : "waiting"),
    onError: (err) => console.error(err)
  });
}

async function start() {
  // The language is chosen before anything is drawn, so the page appears in it at once.
  const language = await setLanguage(storage.load(LANGUAGE_KEY));
  setupLanguagePicker(language);
  applyTranslations();
  showConnectionBanner();

  let user;
  try {
    user = await ensureSignedIn();
  } catch (err) {
    console.error(err);
    $("loading").hidden = true;
    $("fatal-error").textContent = t("common.signInError");
    $("fatal-error").hidden = false;
    return;
  }
  uid = user.uid;

  const saved = storage.load(STORAGE_KEY);
  const code = codeFromUrl() || saved?.code || "";

  // Already joined this session earlier (page was refreshed)? Skip the form.
  // Firebase gives us the same uid after a refresh, so the database knows us.
  if (code) {
    try {
      if (await isMember(code, uid)) {
        // The nickname is only in this browser; if it was cleared, we simply greet without it.
        const nickname = saved?.code === code ? saved.nickname || "" : "";
        storage.save(STORAGE_KEY, { code, nickname });
        showJoined(code, nickname);
        return;
      }
    } catch (err) {
      console.error(err);
    }
  }

  $("code").value = code;
  if (saved?.nickname) $("nickname").value = saved.nickname;
  show("join-form");
  (code ? $("nickname") : $("code")).focus();

  $("join-form").addEventListener("submit", (event) => {
    event.preventDefault();
    join();
  });
}

async function join() {
  const code = normalizeCode($("code").value);
  const nickname = normalizeNickname($("nickname").value);

  if (!isValidCode(code)) return showError(t("participant.errorCode"));
  if (!isValidNickname(nickname)) return showError(t("participant.errorNickname", { max: NICKNAME_MAX }));
  showError("");

  const button = $("join-button");
  button.disabled = true;
  button.textContent = t("participant.joining");
  try {
    if (!(await getSessionMeta(code))) {
      showError(t("participant.errorNotFound"));
      return;
    }
    await joinSession(code, uid);
    storage.save(STORAGE_KEY, { code, nickname });
    showJoined(code, nickname);
  } catch (err) {
    console.error(err);
    showError(t("common.error"));
  } finally {
    button.disabled = false;
    button.textContent = t("participant.join");
  }
}

start();
