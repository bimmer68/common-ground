// Tiny translation helper.
//   t("screen.participants", { count: 5 })  ->  "5 joined"
//   <h1 data-i18n="participant.title"></h1>  ->  filled in by applyTranslations()
//
// Singular / plural: a text can have one form per plural category, e.g.
//   "poll.votes": { one: "{count} vote", other: "{count} votes" }
// t("poll.votes", { count: 1 }) -> "1 vote", { count: 3 } -> "3 votes".
// Intl.PluralRules knows the categories of every language ("one", "few",
// "many", "other"…), so each language can add the forms it needs.
//
// Language: every page starts in English. Only the participant page
// (js/participant.js) calls setLanguage(), so the projector, the facilitator
// and the report always stay in English. The other languages are files in
// js/i18n/ and are loaded only when someone picks them.
// A text missing in the chosen language is shown in English, never as its key.
import en from "./i18n/en.js";
import { LANGUAGES } from "./i18n/languages.js";

let language = LANGUAGES[0];
let strings = en;
let plurals = new Intl.PluralRules(language.code);
const englishPlurals = plurals;

export const currentLanguage = () => language.code;

export function t(key, params = {}) {
  let text = strings[key];
  let rules = plurals;
  if (text == null) {
    text = en[key] ?? key; // missing translation -> English
    rules = englishPlurals;
  }
  if (typeof text === "object") {
    text = text[rules.select(Number(params.count))] ?? text.other;
  }
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in params ? String(params[name]) : `{${name}}`));
}

// Loads js/i18n/{file}.js and switches the page to that language, including
// the writing direction (Arabic and Hebrew: right to left).
// An unknown code, or a file that fails to load, keeps English.
export async function setLanguage(code) {
  const next = LANGUAGES.find((lang) => lang.code === code) || LANGUAGES[0];
  let nextStrings = en;
  if (next.file !== "en") {
    try {
      nextStrings = (await import(`./i18n/${next.file}.js`)).default;
    } catch (err) {
      console.error(err);
      return setLanguage(LANGUAGES[0].code);
    }
  }
  language = next;
  strings = nextStrings;
  plurals = new Intl.PluralRules(next.code);
  document.documentElement.lang = next.code;
  document.documentElement.dir = next.dir || "ltr";
  return next.code;
}

// Fills every element that has data-i18n (text) or data-i18n-placeholder.
export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const title = document.documentElement.dataset.i18nTitle;
  if (title) document.title = t(title);
}
