// Tiny translation helper.
//   t("screen.participants", { count: 5 })  ->  "5 joined"
//   <h1 data-i18n="participant.title"></h1>  ->  filled in by applyTranslations()
//
// Singular / plural: a text can have one form per plural category, e.g.
//   "poll.votes": { one: "{count} vote", other: "{count} votes" }
// t("poll.votes", { count: 1 }) -> "1 vote", { count: 3 } -> "3 votes".
// Intl.PluralRules knows the categories of every language ("one", "few",
// "many", "other"…), so later languages can add the forms they need.
import en from "./i18n/en.js";

const LANGUAGE = "en";
const strings = en;
const plurals = new Intl.PluralRules(LANGUAGE);

export function t(key, params = {}) {
  let text = strings[key] ?? key;
  if (typeof text === "object") {
    text = text[plurals.select(Number(params.count))] ?? text.other;
  }
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in params ? String(params[name]) : `{${name}}`));
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
