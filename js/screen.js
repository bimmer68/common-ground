// Projector page (screen.html?s=CODE): big QR code, the code and the number
// of participants. No controls and NEVER any nicknames.
import { ensureSignedIn } from "./firebase.js";
import { t, applyTranslations } from "./i18n.js";
import { showConnectionBanner } from "./connection.js";
import { codeFromUrl, pageUrl, getSessionMeta, watchMemberCount } from "./session.js";

const $ = (id) => document.getElementById(id);

function showMessage(text) {
  $("message").textContent = text;
  $("message").hidden = false;
  $("lobby").hidden = true;
}

async function start() {
  applyTranslations();
  showConnectionBanner();

  const code = codeFromUrl();
  if (!code) return showMessage(t("screen.noCode"));

  try {
    await ensureSignedIn();
    if (!(await getSessionMeta(code))) return showMessage(t("screen.notFound", { code }));
  } catch (err) {
    console.error(err);
    return showMessage(t("common.signInError"));
  }

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
  $("join-url").textContent = t("screen.orGoTo", { url: pageUrl("index.html").replace(/^https?:\/\//, "") });
  $("message").hidden = true;
  $("lobby").hidden = false;

  watchMemberCount(code, (count) => {
    $("count").textContent = t("screen.participants", { count });
  });
}

start();
