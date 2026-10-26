// The languages a participant can choose on their phone (index.html).
// Each language is written with its own name and in its own script, so a
// person finds it even if they can't read the others.
//   code  language tag for the browser (<html lang>, plural rules)
//   file  js/i18n/{file}.js with the texts
//   dir   "rtl" for languages written from right to left
// English is first: it is the default and the fallback for missing texts.
export const LANGUAGES = [
  { code: "en", file: "en", name: "English" },
  { code: "bs", file: "bs", name: "Bosanski" },
  { code: "sr-Latn", file: "sr", name: "Srpski" },
  { code: "sr-Cyrl", file: "sr-cyrl", name: "Српски" },
  { code: "it", file: "it", name: "Italiano" },
  { code: "fr", file: "fr", name: "Français" },
  { code: "ru", file: "ru", name: "Русский" },
  { code: "uk", file: "uk", name: "Українська" },
  { code: "az", file: "az", name: "Azərbaycanca" },
  { code: "ka", file: "ka", name: "ქართული" },
  { code: "hy", file: "hy", name: "Հայերեն" },
  { code: "bm", file: "bm", name: "Bamanankan" },
  { code: "sq", file: "sq", name: "Shqip" },
  { code: "ar", file: "ar", name: "العربية", dir: "rtl" },
  { code: "he", file: "he", name: "עברית", dir: "rtl" }
];

// The facilitator's page (host.html) can be in these languages. The choice is
// kept only on that phone (localStorage). The projector always stays in English.
export const HOST_LANGUAGES = [
  { code: "en", file: "en", name: "English" },
  { code: "bs", file: "bs", name: "Bosanski" },
  { code: "it", file: "it", name: "Italiano" }
];

// The report (report.html) can be printed in English or Italian.
export const REPORT_LANGUAGES = [
  { code: "en", file: "en", name: "English" },
  { code: "it", file: "it", name: "Italiano" }
];
