// Small building blocks for the facilitator's phone (host.html), shared by
// js/host.js and the host views of the activity modules. They keep every
// activity looking the same: ONE big button for the next step, smaller
// buttons next to it, short texts, and help behind a "?".
import { el } from "./dom.js";
import { t } from "./i18n.js";

// The big button for the next step, and smaller buttons under it.
//   actions({ primary: { text, onclick, disabled? },
//             secondary: [{ text, onclick, disabled?, danger?, pressed? }, …] })
// An empty entry (null / false) in secondary is skipped.
export function actions({ primary, secondary = [] }) {
  const more = secondary.filter(Boolean);
  return el("div", { class: "actions" },
    primary && el("button", {
      type: "button", class: "button button-primary", text: primary.text,
      disabled: !!primary.disabled, onclick: primary.onclick
    }),
    more.length > 0 && el("div", { class: "actions-more" }, more.map((b) => el("button", {
      type: "button", class: b.danger ? "button button-small button-danger" : "button button-small button-secondary",
      text: b.text, disabled: !!b.disabled, onclick: b.onclick,
      "aria-expanded": b.pressed == null ? null : String(b.pressed)
    }))));
}

// A coloured label for a state: "live" (on the projector), "preview" (only on
// this phone), "pending" (waiting for approval), "done", "info".
export function badge(text, kind = "info") {
  return el("span", { class: `badge badge-${kind}`, text });
}

// A label, heading or checkbox with a "?" next to it. Tapping "?" shows a
// short help text under it (and hides it again).
//   withHelp(el("label", { for: "x", text: "Prompt" }), "Shown on the projector.")
export function withHelp(node, helpText) {
  if (!helpText) return node;
  const note = el("p", { class: "help-text", hidden: true, text: helpText });
  const button = el("button", {
    type: "button", class: "help-button", text: "?", "aria-label": t("host.help"), "aria-expanded": "false",
    onclick: () => {
      note.hidden = !note.hidden;
      button.setAttribute("aria-expanded", String(!note.hidden));
    }
  });
  return el("div", { class: "with-help" }, node, button, note);
}

// A section that opens and closes (accordion). It stays open or closed when
// the view is drawn again (the state is kept per key, on this page only).
//   fold("templates", "Templates", content, { badge: badge("2"), open: false })
const openFolds = new Map();

export function fold(key, title, content, { open = false, badge: tag = null, className = "" } = {}) {
  const isOpen = openFolds.has(key) ? openFolds.get(key) : open;
  return el("details", {
    class: `fold ${className}`.trim(), open: isOpen, "data-fold": key,
    ontoggle: (event) => { openFolds.set(key, event.target.open); }
  },
  el("summary", {}, el("span", { class: "fold-title", text: title }), tag),
  el("div", { class: "fold-body" }, content));
}

// Opens (or closes) a fold by its key, the next time it is drawn.
export function setFoldOpen(key, open) {
  openFolds.set(key, open);
}
