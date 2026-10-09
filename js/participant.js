// Participant page (index.html): enter code + nickname, then wait.
import { ensureSignedIn } from "./firebase.js";
import { t, applyTranslations } from "./i18n.js";
import { showConnectionBanner } from "./connection.js";
import * as storage from "./storage.js";
import {
  NICKNAME_MAX, codeFromUrl, normalizeCode, isValidCode, normalizeNickname,
  isValidNickname, getSessionMeta, joinSession, isMember, getOwnNickname
} from "./session.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "participant"; // { code, nickname }

function show(id) {
  ["loading", "join-form", "waiting"].forEach((name) => { $(name).hidden = name !== id; });
}

function showError(message) {
  $("join-error").textContent = message;
  $("join-error").hidden = !message;
}

function showWaiting(code, nickname) {
  $("joined-as").textContent = t("participant.joinedAs", { nickname, code });
  show("waiting");
  // Keep the code in the address bar, so a refresh lands in the same session.
  history.replaceState(null, "", `?s=${code}`);
}

async function start() {
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

  const saved = storage.load(STORAGE_KEY);
  const code = codeFromUrl() || saved?.code || "";

  // Already joined this session earlier (page was refreshed)? Skip the form.
  // Firebase gives us the same uid after a refresh, so the database knows us.
  if (code) {
    try {
      if (await isMember(code, user.uid)) {
        const nickname = saved?.code === code ? saved.nickname : await getOwnNickname(code, user.uid);
        storage.save(STORAGE_KEY, { code, nickname });
        showWaiting(code, nickname);
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
    join(user.uid);
  });
}

async function join(uid) {
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
    await joinSession(code, uid, nickname);
    storage.save(STORAGE_KEY, { code, nickname });
    showWaiting(code, nickname);
  } catch (err) {
    console.error(err);
    showError(t("common.error"));
  } finally {
    button.disabled = false;
    button.textContent = t("participant.join");
  }
}

start();
