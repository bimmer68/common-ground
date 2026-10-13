// Projector page (screen.html?s=CODE). No controls and NEVER any nicknames
// or the host PIN. When nothing runs: big QR code, the code and the number of
// participants. Otherwise the current activity, drawn by its module.
// Opened without ?s=CODE it asks for the session code.
import { ensureSignedIn } from "./firebase.js";
import { t, applyTranslations } from "./i18n.js";
import { showConnectionBanner } from "./connection.js";
import { codeFromUrl, pageUrl, normalizeCode, isValidCode, getSessionMeta, watchMemberCount } from "./session.js";
import { runActivityLoop } from "./activity-loop.js";
import { timerDisplay } from "./timer.js";

const $ = (id) => document.getElementById(id);

function show(id) {
  ["message", "enter-form", "lobby", "activity"].forEach((name) => { $(name).hidden = name !== id; });
}

function showMessage(text) {
  $("message").textContent = text;
  show("message");
}

function showEnterForm(error = "") {
  $("enter-error").textContent = error;
  $("enter-error").hidden = !error;
  history.replaceState(null, "", location.pathname);
  show("enter-form");
  $("enter-code").focus();
}

async function start() {
  applyTranslations();
  showConnectionBanner();

  try {
    await ensureSignedIn();
  } catch (err) {
    console.error(err);
    return showMessage(t("common.signInError"));
  }

  $("enter-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const code = normalizeCode($("enter-code").value);
    if (!isValidCode(code)) return showEnterForm(t("participant.errorCode"));
    openSession(code);
  });

  const code = codeFromUrl();
  if (code) openSession(code);
  else showEnterForm();
}

async function openSession(code) {
  $("enter-button").disabled = true;
  try {
    if (!(await getSessionMeta(code))) return showEnterForm(t("screen.notFound", { code }));
  } catch (err) {
    console.error(err);
    return showMessage(t("common.error"));
  } finally {
    $("enter-button").disabled = false;
  }

  // Keep the code in the address bar, so a refresh lands in the same session.
  history.replaceState(null, "", `?s=${code}`);

  const joinUrl = pageUrl("index.html", code);
  // QR code is drawn in the browser by the qrcodejs library (loaded in screen.html).
  new QRCode($("qr"), {
    text: joinUrl,
    width: 512,
    height: 512,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });

  $("code").textContent = code;
  // Shortest address that works: without "https://" and without "index.html"
  // (the web server opens index.html by itself for a folder address).
  const shortUrl = pageUrl("index.html").replace(/^https?:\/\//, "").replace(/\/index\.html$/, "");
  $("join-url").textContent = t("screen.orGoTo", { url: shortUrl });

  watchMemberCount(code, (count) => {
    $("count").textContent = t("screen.participants", { count });
  });

  // The timer floats on top of everything (lobby or activity).
  timerDisplay({ el: $("timer"), code });

  // Follow the facilitator: QR lobby when nothing runs, otherwise the activity.
  runActivityLoop({
    code, uid: null, role: "screen", container: $("activity"),
    onChange: (id) => show(id ? "activity" : "lobby"),
    onError: (err) => console.error(err)
  });
}

start();
