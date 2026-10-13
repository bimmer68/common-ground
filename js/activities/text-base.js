// The shared base for TEXT answers (Faza 4 and 5). Word cloud, wall and
// moderated wall all do the same thing on the phone: a participant writes a
// short text, can send 1–3 of them, and can edit or delete their own while
// writing is open. Only the way the texts are SHOWN is different, and that is
// in each module (wordcloud.js, wall.js, moderated-wall.js).
//
// Database access is in js/text-store.js.
import { t } from "../i18n.js";
import { el, fill } from "../dom.js";
import { watchMine, watchPosts, getOwnInboxText, addText, editText, deleteText } from "../text-store.js";

export const SLOTS = ["0", "1", "2"]; // at most 3 texts per person (and per round)
export const PER_PERSON = [1, 2, 3];

// Firebase may give a list back as an array or as { 0: …, 1: … }; this handles both.
export const list = (value) => (value ? Object.values(value) : []);

// "  Hello   world " -> "Hello world"
export const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");

// Word cloud: lower case, no spaces at the ends, no punctuation at the end.
//   "  Trust! " -> "trust"     "Hope..." -> "hope"
export function normalizeWord(value) {
  return clean(value).toLowerCase().replace(/[\s\p{P}]+$/u, "");
}

// A word as a database key (keys can't contain . # $ [ ] /).
export function wordKey(word) {
  return encodeURIComponent(word).replace(/\./g, "%2E");
}

// Number between min and max, else the default.
export function intBetween(value, min, max, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

// The texts of activity.hidden for one round: { key: true }.
export function hiddenOf(act, round) {
  return act.hidden?.[round] || {};
}

// ---------- Setup helpers (facilitator) ----------

// <label> + <select> with numbers, e.g. "How many answers per person?" 1 / 2 / 3.
export function numberSelect(id, label, values, selected, onchange) {
  return [
    el("label", { for: id, text: label }),
    el("select", { id, onchange: (event) => onchange(Number(event.target.value)) },
      values.map((n) => el("option", { value: String(n), text: String(n), selected: n === selected })))
  ];
}

export function checkbox(label, checked, onchange) {
  return el("label", { class: "check" },
    el("input", { type: "checkbox", checked, onchange: (event) => onchange(event.target.checked) }),
    el("span", { text: label }));
}

// ---------- Fit text to the projector ----------
// Big screens show between 1 and ~45 texts. The view is drawn at full size,
// then made smaller step by step until everything fits on the screen.
// CSS uses var(--fit) in its font sizes (css/screen.css).
export function fitToBox(box, min = 0.2) {
  let fit = 1;
  box.style.setProperty("--fit", fit);
  while (fit > min && (box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1)) {
    fit *= 0.9;
    box.style.setProperty("--fit", fit);
  }
}

// Redraws fit when the window (projector) changes size. Returns a stop function.
export function refitOnResize(box) {
  const onResize = () => fitToBox(box);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}

// ---------- Participant: write, edit and delete my own texts ----------
//
// options:
//   code, uid, activityId, round
//   store       "posts" (shown at once) or "inbox" (moderated: waits for approval)
//   maxLength   40 (word cloud) or 200 (walls)
//   perPerson   1–3
//   normalize   function that cleans the text before sending
//   multiline   textarea instead of a one-line input
//   groups      show "We write as a group" (one phone per group)
//   labels      [a, b]: the author secretly picks one (moderated wall game)
//   statusOf    (pid) -> short text under my message, or null
//
// Returns { el, update(open), refresh(), destroy() }. open = writing is open now.
export function textWriter(options) {
  const { code, uid, activityId, round, store, maxLength, perPerson, normalize, multiline, groups, labels, statusOf } = options;
  let open = true;
  let slots = {};      // { slot: pid } – my texts
  let publicPosts = {};
  const inboxItems = {}; // pid -> my item from the inbox (moderated)
  let editing = null;  // the slot being edited, or null
  let busy = false;
  let error = "";

  const root = el("div", { class: "text-writer" });
  const listNode = el("ul", { class: "my-texts" });
  const input = el(multiline ? "textarea" : "input", {
    id: `text-${round}`, maxlength: maxLength, rows: multiline ? 3 : null, autocomplete: "off",
    oninput: () => { counter.textContent = t("text.chars", { count: input.value.length, max: maxLength }); }
  });
  const counter = el("p", { class: "hint text-counter" });
  const groupBox = groups ? el("input", { type: "checkbox" }) : null;
  const labelInputs = labels ? labels.map((label, i) => el("input", { type: "radio", name: `label-${round}`, value: String(i) })) : [];
  const sendButton = el("button", { type: "submit", class: "button" });
  const cancelButton = el("button", {
    type: "button", class: "button button-secondary", text: t("common.cancel"),
    onclick: () => { editing = null; resetForm(); draw(); }
  });
  const errorNode = el("p", { class: "error", role: "alert", hidden: true });
  const formTitle = el("label", { for: `text-${round}` });
  const form = el("form", { class: "text-form", novalidate: true, onsubmit: (event) => { event.preventDefault(); send(); } },
    formTitle,
    input,
    counter,
    labels && el("fieldset", { class: "secret-label" },
      el("legend", { text: t("text.labelLegend") }),
      labels.map((label, i) => el("label", { class: "check" }, labelInputs[i], el("span", { text: label }))),
      el("p", { class: "hint", text: t("text.labelHint") })),
    groups && el("label", { class: "check" }, groupBox, el("span", { text: t("text.groupCheck") })),
    errorNode,
    sendButton,
    cancelButton);
  const moreNode = el("p", { class: "hint" });
  const closedNode = el("p", { class: "hint", text: t("text.writingClosed") });
  root.append(listNode, form, moreNode, closedNode);

  const itemOf = (pid) => (store === "inbox" ? inboxItems[pid] : publicPosts[pid]);
  const mySlots = () => SLOTS.filter((s) => slots[s] && itemOf(slots[s]));
  const freeSlot = () => SLOTS.slice(0, perPerson).find((s) => !slots[s]);

  function resetForm(item = null) {
    input.value = item?.text || "";
    if (groupBox) groupBox.checked = item?.group === true;
    labelInputs.forEach((radio, i) => { radio.checked = item?.label === i; });
    counter.textContent = t("text.chars", { count: input.value.length, max: maxLength });
    error = "";
  }

  // Moderated wall: my texts live in the inbox, which only I (and the
  // facilitator) can read – so I read them one by one.
  async function loadInbox() {
    if (store !== "inbox") return;
    const missing = Object.values(slots).filter((pid) => !(pid in inboxItems));
    for (const pid of missing) {
      try {
        inboxItems[pid] = await getOwnInboxText(code, activityId, round, pid);
      } catch (err) {
        console.error(err);
        inboxItems[pid] = null;
      }
    }
    if (missing.length) draw();
  }

  async function send() {
    const text = normalize(input.value);
    if (!text || text.length > maxLength) return fail(t("text.errorLength", { max: maxLength }));
    const label = labelInputs.findIndex((radio) => radio.checked);
    if (labels && label < 0) return fail(t("text.errorLabel"));
    const fields = { text };
    if (groupBox?.checked) fields.group = true;
    if (labels) fields.label = label;

    busy = true;
    draw();
    try {
      if (editing != null) {
        const pid = slots[editing];
        fields.at = itemOf(pid)?.at;
        if (fields.at == null) delete fields.at;
        await editText(code, activityId, round, pid, store, fields, store === "inbox");
        if (store === "inbox") inboxItems[pid] = { ...fields };
      } else {
        const slot = freeSlot();
        if (slot == null) return;
        await addText(code, activityId, round, uid, slot, store, fields);
      }
      editing = null;
      resetForm();
    } catch (err) {
      console.error(err);
      // Refused because the facilitator just closed writing: no error, the view follows.
      if (open) fail(t("text.saveError"));
    } finally {
      busy = false;
      draw();
    }
  }

  async function remove(slot) {
    if (!confirm(t("text.confirmDelete"))) return;
    const pid = slots[slot];
    try {
      await deleteText(code, activityId, round, uid, slot, pid, store === "inbox" ? ["inbox", "posts"] : ["posts"]);
      delete inboxItems[pid];
      if (editing === slot) { editing = null; resetForm(); }
    } catch (err) {
      console.error(err);
      if (open) fail(t("text.saveError"));
    }
    draw();
  }

  function fail(message) {
    error = message;
    draw();
  }

  function draw() {
    const mine = mySlots();
    fill(listNode, mine.map((slot) => {
      const pid = slots[slot];
      const item = itemOf(pid);
      const status = statusOf ? statusOf(pid) : null;
      return el("li", { class: editing === slot ? "my-text my-text-editing" : "my-text" },
        el("p", { class: "my-text-body", text: item.text }),
        (item.group || (labels && item.label != null)) && el("p", { class: "hint" },
          [item.group ? t("text.group") : null, labels && item.label != null ? t("text.yourLabel", { label: labels[item.label] }) : null]
            .filter(Boolean).join(" · ")),
        status && el("p", { class: "my-text-status", text: status }),
        open && editing == null && el("div", { class: "button-row" },
          el("button", { type: "button", class: "button button-small button-secondary", text: t("text.edit"), onclick: () => { editing = slot; resetForm(item); draw(); input.focus(); } }),
          el("button", { type: "button", class: "button button-small button-secondary", text: t("text.delete"), onclick: () => remove(slot) })));
    }));

    const free = freeSlot();
    const canWrite = open && (editing != null || free != null);
    form.hidden = !canWrite;
    formTitle.textContent = t(editing != null ? "text.editTitle" : mine.length ? "text.anotherTitle" : "text.writeTitle");
    sendButton.textContent = t(busy ? "text.sending" : editing != null ? "text.save" : "text.send");
    sendButton.disabled = busy;
    cancelButton.hidden = editing == null;
    errorNode.textContent = error;
    errorNode.hidden = !error;
    const left = SLOTS.slice(0, perPerson).filter((s) => !slots[s]).length;
    moreNode.hidden = !open || perPerson === 1;
    moreNode.textContent = t("text.left", { count: left });
    closedNode.hidden = open;
  }

  const stopMine = watchMine(code, activityId, round, uid, (value) => {
    slots = value;
    if (editing != null && !slots[editing]) editing = null;
    draw();
    loadInbox();
  }, (err) => console.error(err));
  const stopPosts = watchPosts(code, activityId, round, (value) => { publicPosts = value; draw(); }, (err) => console.error(err));

  resetForm();
  draw();

  return {
    el: root,
    update(isOpen) {
      open = isOpen;
      if (!open) editing = null;
      draw();
    },
    refresh: draw,
    destroy() { stopMine(); stopPosts(); }
  };
}
