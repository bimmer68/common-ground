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
// Language: every page starts in English. The participant page, the
// facilitator page and the report call setLanguage() with the language chosen
// on that device; the projector never does, so it always stays in English.
// The other languages are files in js/i18n/ and are loaded only when someone
// picks them. A text missing in the chosen language is shown in English,
// never as its key.
//
// tEn(key): always English. For texts that are SAVED as content and then
// shown on the projector (e.g. the default statements of a measurement), so a
// facilitator working in Bosnian still puts English on the screen.
import en from "./i18n/en.js";
import { LANGUAGES } from "./i18n/languages.js";

let language = LANGUAGES[0];
let strings = en;
let plurals = new Intl.PluralRules(language.code);
const englishPlurals = plurals;

export const currentLanguage = () => language.code;

function format(text, rules, params) {
  if (typeof text === "object") {
    text = text[rules.select(Number(params.count))] ?? text.other;
  }
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in params ? String(params[name]) : `{${name}}`));
}

export function t(key, params = {}) {
  const text = strings[key];
  if (text == null) return format(en[key] ?? key, englishPlurals, params); // missing translation -> English
  return format(text, plurals, params);
}

export function tEn(key, params = {}) {
  return format(en[key] ?? key, englishPlurals, params);
}

// Loads js/i18n/{file}.js and switches the page to that language, including
// the writing direction (Arabic and Hebrew: right to left).
// An unknown code, or a file that fails to load, keeps English.
//
// The LAST choice always wins: loading a file takes a moment, so if someone
// picks Russian and then quickly Arabic, the Russian file may arrive after
// the Arabic one. Every call gets a number (request); a call that is no
// longer the newest one when its file arrives changes nothing.
// choices: the list to choose from (default: the participant's languages).
let request = 0;

export async function setLanguage(code, choices = LANGUAGES) {
  const mine = ++request;
  const next = choices.find((lang) => lang.code === code) || choices[0];
  let nextStrings = en;
  if (next.file !== "en") {
    try {
      nextStrings = (await import(`./i18n/${next.file}.js`)).default;
    } catch (err) {
      console.error(err);
      if (mine !== request) return language.code;
      return setLanguage(LANGUAGES[0].code);
    }
  }
  if (mine !== request) return language.code; // a newer choice was made meanwhile
  language = next;
  strings = nextStrings;
  plurals = new Intl.PluralRules(next.code);
  document.documentElement.lang = next.code;
  document.documentElement.dir = next.dir || "ltr";
  return next.code;
}

// Fills every element that has data-i18n (text), data-i18n-placeholder or
// data-i18n-aria (aria-label: the name a screen reader says).
export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  const title = document.documentElement.dataset.i18nTitle;
  if (title) document.title = t(title);
}
