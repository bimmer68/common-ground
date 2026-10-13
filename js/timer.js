// Timer on the projector (Faza 3).
//
//   sessions/{CODE}/timer   { startedAt, duration, big? }   – only the facilitator writes
//
// big = true: the timer fills the whole projector instead of sitting in the
// corner (Faza 5), for exercises where the time is the main thing on screen.
//
// startedAt is written as serverTimestamp(): the DATABASE SERVER puts in its
// own clock, not the phone's. duration is in seconds. Nothing else is stored:
// there is no "seconds left" that someone has to keep updating.
//
// Every screen (projector, facilitator's phone) computes by itself, a few
// times per second:
//     ends at   = startedAt + duration × 1000
//     time left = ends at − serverNow()
// serverNow() is "the server's time right now" (js/firebase.js), so all
// screens get the same answer even if their own clocks are wrong, and even if
// the facilitator's phone falls asleep: the projector doesn't need the phone.
import { db, ref, set, update, onValue, serverTimestamp, serverNow } from "./firebase.js";
import { el } from "./dom.js";
import { t } from "./i18n.js";

export const PRESETS = [60, 90, 120];
export const MIN_SECONDS = 5;
export const MAX_SECONDS = 3600;
const LAST_SECONDS = 10;      // the last seconds: big and red on the projector
const SHOW_DONE_MS = 15000;   // "Time's up!" stays this long, then disappears
const TICK_MS = 200;

const timerRef = (code) => ref(db, `sessions/${code}/timer`);

export function startTimer(code, seconds, big = false) {
  return set(timerRef(code), { startedAt: serverTimestamp(), duration: seconds, big });
}

// Switch a running timer between the corner and the full screen.
export function setTimerBig(code, big) {
  return update(timerRef(code), { big });
}

export function stopTimer(code) {
  return set(timerRef(code), null);
}

// Calls callback(timer or null) whenever the facilitator starts or stops it.
function watchTimer(code, callback, onError) {
  return onValue(timerRef(code), (snap) => {
    const v = snap.val();
    callback(v && typeof v.startedAt === "number" && typeof v.duration === "number" ? v : null);
  }, onError);
}

// Milliseconds left (negative after the end), or null when there is no timer.
function timeLeft(timer) {
  return timer ? timer.startedAt + timer.duration * 1000 - serverNow() : null;
}

// 83 500 ms -> "1:24". Rounded UP, so "0:00" appears only at the real end.
export function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// "90" -> 90, "1:30" -> 90. Returns null if it isn't a valid time.
export function parseTime(text) {
  const value = String(text || "").trim();
  let seconds = null;
  if (/^\d{1,4}$/.test(value)) seconds = Number(value);
  const m = value.match(/^(\d{1,2}):([0-5]\d)$/);
  if (m) seconds = Number(m[1]) * 60 + Number(m[2]);
  return seconds != null && seconds >= MIN_SECONDS && seconds <= MAX_SECONDS ? seconds : null;
}

// Calls draw() now, a few times per second, and right when the page becomes
// visible again (a laptop or phone that slept). Returns a stop function.
function ticker(draw) {
  const interval = setInterval(draw, TICK_MS);
  document.addEventListener("visibilitychange", draw);
  draw();
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", draw);
  };
}

// ---------- Projector: the timer on top of whatever is shown ----------
export function timerDisplay({ el: root, code }) {
  let timer = null;

  function draw() {
    const left = timeLeft(timer);
    if (left == null || left < -SHOW_DONE_MS) {
      root.hidden = true;
      return;
    }
    const done = left <= 0;
    root.hidden = false;
    root.classList.toggle("timer-ending", !done && left <= LAST_SECONDS * 1000);
    root.classList.toggle("timer-done", done);
    root.classList.toggle("timer-big", timer.big === true);
    root.textContent = done ? t("timer.done") : formatTime(left);
  }

  const stopWatch = watchTimer(code, (v) => { timer = v; draw(); }, (err) => console.error(err));
  const stopTicker = ticker(draw);
  return () => { stopWatch(); stopTicker(); root.hidden = true; };
}

// ---------- Facilitator: start / stop ----------
export function timerControls({ el: root, code, onError }) {
  let timer = null;

  const display = el("p", { class: "timer-left", hidden: true });
  const stop = el("button", {
    type: "button", class: "button button-secondary", text: t("timer.stop"), hidden: true,
    onclick: () => stopTimer(code).catch(fail)
  });
  const custom = el("input", {
    id: "timer-custom", inputmode: "numeric", autocomplete: "off",
    placeholder: t("timer.customPlaceholder")
  });
  const error = el("p", { class: "error", role: "alert", hidden: true });
  const big = el("input", {
    type: "checkbox",
    onchange: () => { if (timer) setTimerBig(code, big.checked).catch(fail); }
  });

  function fail(err) {
    console.error(err);
    error.textContent = t("common.error");
    error.hidden = false;
  }

  function start(seconds) {
    error.hidden = true;
    startTimer(code, seconds, big.checked).catch(fail);
  }

  function startCustom(event) {
    event.preventDefault();
    const seconds = parseTime(custom.value);
    if (seconds == null) {
      error.textContent = t("timer.errorCustom", { min: MIN_SECONDS, max: MAX_SECONDS / 60 });
      error.hidden = false;
      return;
    }
    custom.value = "";
    start(seconds);
  }

  root.replaceChildren(
    el("h2", { text: t("timer.title") }),
    display,
    el("div", { class: "button-row" }, PRESETS.map((seconds) => el("button", {
      type: "button", class: "button button-small", text: formatTime(seconds * 1000),
      onclick: () => start(seconds)
    }))),
    el("form", { class: "inline-form", novalidate: true, onsubmit: startCustom },
      el("label", { for: "timer-custom", text: t("timer.custom") }),
      el("div", { class: "inline-row" },
        custom,
        el("button", { type: "submit", class: "button button-small", text: t("timer.start") }))),
    el("label", { class: "check" }, big, el("span", { text: t("timer.bigLabel") })),
    el("p", { class: "hint", text: t("timer.bigHint") }),
    error,
    stop,
    el("p", { class: "hint", text: t("timer.hint") })
  );

  function draw() {
    const left = timeLeft(timer);
    const visible = left != null && left >= -SHOW_DONE_MS;
    display.hidden = !visible;
    stop.hidden = left == null;
    stop.textContent = t(left != null && left <= 0 ? "timer.hide" : "timer.stop");
    if (visible) display.textContent = left <= 0 ? t("timer.done") : formatTime(left);
  }

  const stopWatch = watchTimer(code, (v) => {
    timer = v;
    if (timer) big.checked = timer.big === true; // the box always shows what the projector does
    draw();
  }, onError);
  const stopTicker = ticker(draw);
  return () => { stopWatch(); stopTicker(); root.replaceChildren(); };
}
