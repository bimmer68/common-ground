// Tiny translation helper.
//   t("screen.participants", { count: 5 })  ->  "5 joined"
//   <h1 data-i18n="participant.title"></h1>  ->  filled in by applyTranslations()
import en from "./i18n/en.js";

const strings = en;

export function t(key, params = {}) {
  const text = strings[key] ?? key;
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
