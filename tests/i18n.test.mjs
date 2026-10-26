// Language files (js/i18n/): no missing texts, no broken {placeholders}.
import { test } from "node:test";
import assert from "node:assert/strict";

const load = async (file) => (await import(`../js/i18n/${file}.js`)).default;
const { LANGUAGES, HOST_LANGUAGES, REPORT_LANGUAGES } = await import("../js/i18n/languages.js");
const en = await load("en");

// The participant's texts: every key the Serbian (Latin) file has – it holds
// exactly the participant's texts.
const participantKeys = Object.keys(await load("sr"));

// The facilitator's texts: everything except the projector's own texts and
// the default CONTENT (measure statements), which stays English on purpose.
const notForHost = (key) => key.startsWith("screen.") || /^measure\.preset\.[a-zA-Z0-9]+\.[12]$/.test(key)
  || /^(poll|cloud|wall|modwall|ground|measure)\.screen/.test(key) || key === "ground.defaultPrompt"
  || /^modwall\.defaultLabel/.test(key) || /^report\./.test(key) || key === "app.name";

const holes = (text) => [...JSON.stringify(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("every participant language has all participant texts", async () => {
  for (const lang of LANGUAGES) {
    const strings = await load(lang.file);
    const missing = participantKeys.filter((key) => !(key in strings));
    assert.deepEqual(missing, [], `${lang.file}.js is missing texts`);
  }
});

test("Bosnian and Italian have every facilitator text; Italian every report text", async () => {
  for (const lang of HOST_LANGUAGES.filter((l) => l.file !== "en")) {
    const strings = await load(lang.file);
    const missing = Object.keys(en).filter((key) => !notForHost(key) && !(key in strings));
    assert.deepEqual(missing, [], `${lang.file}.js is missing facilitator texts`);
  }
  for (const lang of REPORT_LANGUAGES.filter((l) => l.file !== "en")) {
    const strings = await load(lang.file);
    const missing = Object.keys(en).filter((key) => key.startsWith("report.") && !(key in strings));
    assert.deepEqual(missing, [], `${lang.file}.js is missing report texts`);
  }
});

test("translations keep the same {placeholders} as English", async () => {
  const files = new Set([...LANGUAGES, ...HOST_LANGUAGES].map((l) => l.file));
  for (const file of files) {
    const strings = await load(file);
    for (const [key, text] of Object.entries(strings)) {
      assert.ok(key in en, `${file}.js has a key that English doesn't: ${key}`);
      const forms = typeof text === "object" ? Object.values(text) : [text];
      for (const form of forms) {
        const expected = holes(typeof en[key] === "object" ? en[key].other : en[key]);
        // A plural form may leave out {count} (e.g. "proposed once"), but never invent a new hole.
        const got = holes(form).split(",").filter(Boolean);
        assert.ok(got.every((h) => expected.split(",").includes(h)), `${file}.js ${key}: {${got}} vs English {${expected}}`);
      }
    }
  }
});

test("languages: Serbian in Latin AND Cyrillic, French, all files exist", async () => {
  const names = LANGUAGES.map((l) => l.name);
  assert.ok(names.includes("Srpski") && names.includes("Српски") && names.includes("Français"));
  const cyrillic = await load("sr-cyrl");
  assert.equal(cyrillic["participant.join"], "Уђи");
  assert.equal(cyrillic["participant.codePlaceholder"], "ABCD");
  assert.deepEqual(HOST_LANGUAGES.map((l) => l.code), ["en", "bs", "it"]);
  assert.deepEqual(REPORT_LANGUAGES.map((l) => l.code), ["en", "it"]);
});
