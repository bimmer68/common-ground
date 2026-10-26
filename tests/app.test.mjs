// The whole app in a headless browser, on the Firebase emulator:
// the facilitator's phone (375 px), the projector and participants' phones,
// each with its own anonymous uid.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { startServer, startBrowser, device, open, loadRules, readDb, eventually, PHONE, PROJECTOR } from "./helpers.mjs";

const SHOTS = new URL("./screenshots/", import.meta.url).pathname;
let server;
let browser;
let errors;

before(async () => {
  mkdirSync(SHOTS, { recursive: true });
  await loadRules();
  server = await startServer();
  browser = await startBrowser();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

// ---------- Helpers ----------

async function page(path, viewport = PHONE, init = null) {
  const context = await device(browser, viewport, { errors });
  if (init) await context.addInitScript(init);
  const tab = await open(context, server.base, path);
  // confirm() / alert(): answered "yes", unless a test sets tab.answerNo = true.
  // The last question is kept in tab.lastDialog.
  tab.on("dialog", (dialog) => {
    tab.lastDialog = dialog.message();
    if (tab.answerNo) dialog.dismiss(); else dialog.accept();
  });
  return tab;
}

async function newSession(init = null) {
  const host = await page("host.html", PHONE, init);
  await host.click("#create-button");
  await host.waitForSelector("#dashboard:not([hidden])");
  const code = (await host.textContent("#bar-code")).trim();
  assert.match(code, /^[A-Z]{4}$/);
  return { host, code };
}

async function join(code, nickname = "Lion", init = null) {
  const phone = await page(`index.html?s=${code}`, PHONE, init);
  await phone.fill("#nickname", nickname);
  await phone.click("#join-button");
  await phone.waitForSelector("#waiting:not([hidden])");
  return phone;
}

const projector = (code) => page(`screen.html?s=${code}`, PROJECTOR);
const text = (tab, selector) => tab.locator(selector).innerText();
const primary = (host) => host.locator("#activity .button-primary");
const tile = (host, name) => host.locator(".tile", { has: host.locator(".tile-name", { hasText: new RegExp(`^${name}$`) }) });

async function noHorizontalScroll(tab) {
  const [scroll, width] = await tab.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(scroll <= width, `page is wider than the screen: ${scroll} > ${width}`);
}

function freshErrors() {
  errors = [];
}

function noErrors() {
  if (errors.length) console.log(errors);
  assert.deepEqual(errors, [], "no JavaScript errors on any page");
}

// ---------- Facilitator screen ----------

test("facilitator: sticky bar, Now card, tiles, folded sections – fits 375 px", async () => {
  freshErrors();
  const { host, code } = await newSession();
  const phone = await join(code);

  await eventually(async () => assert.match(await text(host, "#bar-people"), /1/));
  assert.equal(await text(host, "#bar-code"), code);
  assert.match(await text(host, "#bar-activity"), /QR code/);
  assert.equal(await host.locator(".tile").count(), 6);
  // Every type has its own colour.
  const colours = await host.locator(".tile").evaluateAll((tiles) => tiles.map((t) => getComputedStyle(t).borderTopColor));
  assert.equal(new Set(colours).size, 6);
  // PIN, links, report, list, settings: all folded at the start.
  assert.equal(await host.locator("details.fold[open]").count(), 0);
  // The "Now" card and the tiles are in the first screen.
  const tilesBottom = await host.locator("#activity-types").evaluate((el) => el.getBoundingClientRect().bottom);
  assert.ok(tilesBottom < 740, `tiles end at ${tilesBottom}px`);
  await noHorizontalScroll(host);
  await host.screenshot({ path: `${SHOTS}01-host-start.png` });

  // The bar stays visible when scrolling.
  await host.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const barTop = await host.locator("#host-bar").evaluate((el) => el.getBoundingClientRect().top);
  assert.equal(barTop, 0);

  // Timer from the bar: the button shows the time left.
  await host.click("#bar-timer");
  await host.locator("#timer button", { hasText: "1:30" }).click();
  await eventually(async () => assert.match(await text(host, "#bar-timer"), /1:[0-9]{2}/));
  await host.screenshot({ path: `${SHOTS}02-host-timer.png` });
  await host.locator("#timer .button-danger").click();
  await eventually(async () => assert.equal((await text(host, "#bar-timer")).trim(), "⏱"));
  await phone.close();
  noErrors();
});

// ---------- Quick poll: statement and question for voting ----------

test("poll: statement first, question only when voting opens; Compare explains itself; next question in one click", async () => {
  freshErrors();
  const { host, code } = await newSession();
  const screen = await projector(code);
  const p1 = await join(code, "Lion");
  const p2 = await join(code, "Owl");

  await tile(host, "Poll").click();
  await host.fill("#poll-title", "Win or dialogue");
  await host.fill("#poll-q0-text", "In a discussion, the goal is to win.");
  await host.fill("#poll-q0-question", "Do you agree?");
  await host.locator("details[data-fold^='poll-more'] summary").first().click();
  await host.fill("#poll-q0-tag", "Win");
  await host.locator("button", { hasText: "+ Yes / No" }).click();
  await host.fill("#poll-q1-text", "Listening is part of a good discussion.");
  await host.locator("details[data-fold^='poll-more'] summary").nth(1).click();
  await host.fill("#poll-q1-tag", "Dialogue");
  await noHorizontalScroll(host);
  await host.screenshot({ path: `${SHOTS}03-host-poll-setup.png`, fullPage: true });
  await host.locator("#activity-setup .button-primary").click();

  // Statement on the projector and the phones; the question is not shown yet.
  await screen.waitForSelector(".poll-statement");
  assert.equal(await text(screen, ".poll-statement"), "In a discussion, the goal is to win.");
  assert.ok(!(await text(screen, "#activity")).includes("Do you agree?"));
  await p1.waitForSelector(".poll-question-phone");
  assert.ok(!(await text(p1, "#activity")).includes("Do you agree?"));
  await eventually(async () => assert.match(await primary(host).innerText(), /Show the question and open voting/));
  await host.screenshot({ path: `${SHOTS}04-host-poll-statement.png` });

  await primary(host).click();
  await screen.waitForSelector(".poll-question");
  assert.equal(await text(screen, ".poll-question"), "Do you agree?");
  assert.equal(await text(screen, ".poll-context"), "In a discussion, the goal is to win.");
  await p1.locator(".poll-option", { hasText: "Yes" }).click();
  await p2.locator(".poll-option", { hasText: "No" }).click();
  assert.equal(await text(p1, ".poll-question-phone"), "Do you agree?");
  await eventually(async () => assert.match(await text(host, "#activity"), /2 of 2 voted/));
  await host.screenshot({ path: `${SHOTS}05-host-poll-voting.png` });

  await primary(host).click(); // close voting and show results
  await screen.waitForSelector(".poll-chart");

  // Compare from the small button.
  await host.locator(".actions-more button", { hasText: "Compare" }).click();
  await screen.waitForSelector(".poll-compare");
  assert.match(await text(screen, ".poll-compare-title"), /Share of all votes that went to “Yes”/);
  assert.match(await text(screen, ".poll-compare-option >> nth=0"), /of votes: Yes/);
  await screen.screenshot({ path: `${SHOTS}06-projector-compare.png` });
  await host.screenshot({ path: `${SHOTS}07-host-compare.png` });

  // From Compare, ONE click: next question (statement).
  assert.equal(await primary(host).innerText(), "Next question");
  await primary(host).click();
  await eventually(async () => assert.equal(await text(screen, ".poll-statement"), "Listening is part of a good discussion."));
  // Without a question for voting it works as before: the statement is the question.
  await primary(host).click();
  await eventually(async () => assert.equal(await text(screen, ".poll-question"), "Listening is part of a good discussion."));
  assert.equal(await screen.locator(".poll-context").count(), 0);

  // "Go to question": a clear list, one tap.
  await host.locator(".actions-more button", { hasText: "Go to question" }).click();
  await host.locator(".jump-list button", { hasText: "1. In a discussion" }).click();
  await eventually(async () => assert.equal(await text(screen, ".poll-statement"), "In a discussion, the goal is to win."));
  noErrors();
});

test("poll: old templates (no 'question' field) load and run as before", async () => {
  freshErrors();
  // A template saved by the old version (same shape as CNQXHL, AVLBAG, DYQZXS).
  const saved = await fetch("http://127.0.0.1:9000/templates/OLDTPL.json?ns=demo-common-ground-default-rtdb", {
    method: "PUT", headers: { Authorization: "Bearer owner" },
    body: JSON.stringify({
      type: "poll", ownerUid: "someone-else", savedAt: Date.now(),
      config: { title: "Old list", questions: [
        { type: "choice", text: "Which word fits?", options: ["believed", "winked"], tag: "Win", live: true },
        { type: "rating", text: "How safe do you feel?", live: false }
      ] }
    })
  });
  assert.ok(saved.ok);
  const { host, code } = await newSession();
  const screen = await projector(code);
  const p1 = await join(code);
  await tile(host, "Poll").click();
  await host.locator("details[data-fold='poll-templates'] summary").click();
  await host.fill("#poll-template-code", "OLDTPL");
  await host.locator("#poll-template-code + button").click();
  await eventually(async () => assert.equal(await host.inputValue("#poll-q0-text"), "Which word fits?"));
  assert.equal(await host.inputValue("#poll-q0-question"), "");
  await host.locator("#activity-setup .button-primary").click();
  await eventually(async () => assert.equal(await primary(host).innerText(), "Open voting"));
  await primary(host).click();
  await p1.locator(".poll-option", { hasText: "winked" }).click();
  await eventually(async () => assert.equal(await text(screen, ".poll-question"), "Which word fits?"));
  await eventually(async () => assert.match(await text(screen, ".poll-chart"), /winked\s*100%/));
  // The old activity config is not changed: no "question" was added.
  const activities = await readDb(`sessions/${code}/activities`);
  const [activity] = Object.values(activities);
  assert.ok(!("question" in activity.config.questions[0]));
  noErrors();
});

// ---------- "Open" only on the phone vs "Show on projector" ----------

test("earlier activity: Open = only on this phone (approve texts), Show on projector = projector switches", async () => {
  freshErrors();
  const { host, code } = await newSession();
  const screen = await projector(code);
  const p1 = await join(code);

  // A moderated wall; a participant writes a text.
  await tile(host, "Moderated wall").click();
  await host.fill("#wall-prompt", "What do you need to feel safe here?");
  await host.locator("#activity-setup .button-primary").click();
  await p1.fill("#text-main", "Being listened to");
  await p1.locator("#activity button[type=submit]").click();
  await eventually(async () => assert.match(await text(host, ".pending-box"), /Being listened to/));

  // Then a word cloud goes on the projector.
  await tile(host, "Word cloud").click();
  await host.fill("#cloud-p0", "Peace for me is…");
  await host.locator("#activity-setup .button-primary").click();
  await eventually(async () => assert.match(await text(screen, "#activity"), /Peace for me is/));

  // "Open" the moderated wall: only on this phone.
  await host.locator("#fold-activities summary").click();
  await eventually(async () => assert.match(await text(host, "#activities"), /1 waiting for approval/));
  await host.locator("#activities li", { hasText: "Moderated wall" }).locator("button", { hasText: "Open" }).click();
  await eventually(async () => assert.match(await text(host, "#now-kicker"), /opened only on this phone/i));
  assert.match(await text(host, "#preview-text"), /still show: Word cloud/);
  assert.match(await text(host, "#now-badge"), /Only on this phone/);
  assert.match(await text(host, "#bar-activity"), /Word cloud/); // the bar always tells what is on the projector
  await host.screenshot({ path: `${SHOTS}08-host-open-only-here.png` });

  // Approve during the "break": the projector and the phone still show the word cloud.
  await host.locator(".pending-box button", { hasText: "Approve" }).click();
  await eventually(async () => assert.match(await text(host, "#activity"), /Nothing is waiting/));
  assert.match(await text(screen, "#activity"), /Peace for me is/);
  assert.ok(!(await text(screen, "#activity")).includes("Being listened to"));
  assert.match(await text(p1, "#activity"), /Peace for me is/);

  // Now "Show on projector".
  await host.click("#preview-project");
  await eventually(async () => assert.match(await text(screen, "#activity"), /Being listened to/));
  await eventually(async () => assert.match(await text(host, "#now-badge"), /On the projector/));
  assert.ok(await host.locator("#preview-bar").isHidden());
  noErrors();
});

test("dangerous actions ask first: End activity, New session", async () => {
  freshErrors();
  const { host, code } = await newSession();
  const screen = await projector(code);
  await tile(host, "Wall").click();
  await host.fill("#wall-prompt", "One word for today");
  await host.locator("#activity-setup .button-primary").click();
  await screen.waitForSelector(".text-view-prompt");

  host.answerNo = true;
  await host.click("#end-activity");
  await eventually(() => assert.match(host.lastDialog || "", /End this activity\?/));
  await host.waitForTimeout(300);
  assert.match(await text(screen, "#activity"), /One word for today/); // "No" = nothing happened

  host.answerNo = false;
  await host.click("#end-activity");
  await screen.waitForSelector("#lobby:not([hidden])");

  await host.locator("details.fold", { hasText: "Settings" }).locator("summary").click();
  host.answerNo = true;
  await host.click("#new-session");
  await eventually(() => assert.match(host.lastDialog || "", /Start a new session\?/));
  assert.ok(await host.locator("#dashboard").isVisible());
  noErrors();
});

// ---------- Common Ground: proposed changes ----------

test("Common Ground: 'With a change' sends an anonymous change; facilitator puts it to the vote in one click", async () => {
  freshErrors();
  const { host, code } = await newSession();
  const screen = await projector(code);
  const p1 = await join(code, "Lion");
  const p2 = await join(code, "Owl");

  await tile(host, "Common Ground").click();
  await host.locator("#activity-setup .button-primary").click();
  await p1.fill("#text-main", "Everyone deserves to feel safe.");
  await p1.locator("#activity .text-form button[type=submit]").click();
  await eventually(async () => assert.match(await text(host, ".pending-box"), /Everyone deserves/));
  await host.locator(".pending-box button", { hasText: "Approve" }).click();
  await eventually(async () => assert.equal(await primary(host).innerText(), "Put the next statement to the vote"));
  await primary(host).click();

  await p1.locator(".poll-option", { hasText: "With a change" }).click();
  await p1.waitForSelector("#ground-amend");
  await p1.fill("#ground-amend", "Everyone deserves to feel safe at home and on the street.");
  await p1.locator(".amend-box button[type=submit]").click();
  await eventually(async () => assert.match(await text(p1, ".amend-box"), /Sent to the facilitator/));
  await p1.screenshot({ path: `${SHOTS}09-phone-amend.png` });
  await p2.locator(".poll-option", { hasText: "I can sign" }).click();
  assert.equal(await p2.locator("#ground-amend").isVisible(), false);

  await eventually(async () => assert.match(await text(host, ".ground-amends"), /at home and on the street/));
  assert.match(await text(host, ".ground-amends"), /Close voting to put a proposal/);
  await primary(host).click(); // close voting
  await eventually(async () => assert.match(await text(host, ".ground-amends"), /Put to the vote as new version/));
  await host.screenshot({ path: `${SHOTS}10-host-amends.png`, fullPage: true });

  // Anonymous: the saved proposal has only a text and a time.
  const amends = await readDb(`sessions/${code}/amends`);
  const items = Object.values(Object.values(Object.values(amends)[0])[0].v0);
  assert.deepEqual(Object.keys(items[0]).sort(), ["at", "text"]);
  assert.ok(!JSON.stringify(amends).includes("Lion"));

  // "Edit first" puts the text into the new version box.
  await host.locator(".amend button", { hasText: "Edit first" }).click();
  assert.equal(await host.inputValue("#ground-revise"), "Everyone deserves to feel safe at home and on the street.");

  // One click: the proposal is version 2, on the vote.
  await host.locator(".amend button", { hasText: "Put to the vote as new version" }).click();
  await eventually(async () => assert.match(await text(screen, "#activity"), /Version 2/));
  assert.match(await text(screen, "#activity"), /at home and on the street/);
  await eventually(async () => assert.match(await text(p2, "#activity"), /at home and on the street/));
  assert.match(await text(p2, "#activity"), /new version/);

  // Changing the vote away from "With a change" deletes my proposal.
  await p1.locator(".poll-option", { hasText: "With a change" }).click();
  await p1.fill("#ground-amend", "Add: and online.");
  await p1.locator(".amend-box button[type=submit]").click();
  await eventually(async () => assert.match(await text(host, ".ground-amends"), /and online/));
  await p1.locator(".poll-option", { hasText: "I can sign" }).click();
  await eventually(async () => assert.ok(!(await text(host, ".ground-amends")).includes("and online")));
  noErrors();
});

// ---------- Languages ----------

test("facilitator language: Bosnian / Italian on the phone, projector stays English, remembered after refresh", async () => {
  freshErrors();
  const { host, code } = await newSession();
  const screen = await projector(code);
  await host.locator("details.fold", { hasText: "Settings" }).locator("summary").click();
  await host.selectOption("#host-language", "bs");
  await eventually(async () => assert.equal(await text(host, "#new-activity h2"), "Nova aktivnost"));
  assert.equal(await text(host, "#now-title"), "Ništa nije pokrenuto");

  // The default statements of a measurement go to the projector: English.
  await tile(host, "Mjerenje").click();
  assert.equal(await host.inputValue("#measure-s0"), "When I disagree with someone, my goal is to convince them.");
  await host.locator("#activity-setup .button-primary").click();
  await eventually(async () => assert.equal(await primary(host).innerText(), "Pokreni Poslije"));
  await host.evaluate(() => window.scrollTo(0, 0));
  await host.screenshot({ path: `${SHOTS}11-host-bosnian.png` });
  await eventually(async () => assert.match(await text(screen, "#activity"), /Answer on your phone/));

  await host.reload();
  await eventually(async () => assert.equal(await text(host, "#new-activity h2"), "Nova aktivnost"));
  assert.equal(await screen.evaluate(() => document.documentElement.lang), "en");

  await host.locator("details.fold", { hasText: "Postavke" }).locator("summary").click();
  await host.selectOption("#host-language", "it");
  await eventually(async () => assert.equal(await text(host, "#new-activity h2"), "Nuova attività"));
  assert.equal(await primary(host).innerText(), "Avvia Dopo");
  noErrors();
});

test("poll Compare in Bosnian still shows the English option on the projector", async () => {
  freshErrors();
  const { host, code } = await newSession(() => { if (location.protocol === "http:") localStorage.setItem("commonGround.hostLanguage", JSON.stringify("bs")); });
  const screen = await projector(code);
  await tile(host, "Glasanje").click();
  await host.fill("#poll-q0-text", "Winning matters.");
  await host.locator("details[data-fold^='poll-more'] summary").first().click();
  await host.fill("#poll-q0-tag", "Win");
  await host.locator("#activity-setup .button-primary").click();
  await eventually(async () => assert.ok(await host.locator(".actions-more button", { hasText: "Compare" }).isVisible()));
  await host.locator(".actions-more button", { hasText: "Compare" }).click();
  await screen.waitForSelector(".poll-compare");
  assert.match(await text(screen, ".poll-compare-option"), /of votes: Yes/);
  // The facilitator's menu shows the option in Bosnian.
  assert.match(await text(host, "#poll-compare-option"), /Da/);
  noErrors();
});

test("participant languages: Српски (Cyrillic) and Français; the last choice always wins", async () => {
  freshErrors();
  const { code } = await newSession();
  const phone = await page(`index.html?s=${code}`);
  await phone.waitForSelector("#language");
  const options = await phone.locator("#language option").allInnerTexts();
  assert.ok(options.includes("Српски") && options.includes("Srpski") && options.includes("Français"));

  await phone.selectOption("#language", "sr-Cyrl");
  await eventually(async () => assert.equal(await text(phone, "#join-button"), "Уђи"));
  assert.equal(await phone.inputValue("#language"), "sr-Cyrl");
  await phone.selectOption("#language", "fr");
  await eventually(async () => assert.equal(await text(phone, "#join-button"), "Rejoindre"));

  // Slow network for Russian: pick Russian, then quickly Arabic. Arabic must win.
  await phone.route("**/js/i18n/ru.js", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    route.continue();
  });
  await phone.selectOption("#language", "ru");
  await phone.selectOption("#language", "ar");
  await phone.waitForTimeout(2500);
  assert.equal(await phone.inputValue("#language"), "ar");
  assert.equal(await phone.evaluate(() => document.documentElement.lang), "ar");
  assert.equal(await phone.evaluate(() => document.documentElement.dir), "rtl");
  assert.equal(await text(phone, "#join-button"), "انضمام");
  // Also back to English quickly after a slow language.
  await phone.selectOption("#language", "ru");
  await phone.selectOption("#language", "en");
  await phone.waitForTimeout(2500);
  assert.equal(await text(phone, "#join-button"), "Join");
  assert.equal(await phone.evaluate(() => document.documentElement.dir), "ltr");

  // The language is never written to the database.
  await phone.selectOption("#language", "fr");
  await phone.fill("#nickname", "Renard");
  await phone.click("#join-button");
  await phone.waitForSelector("#waiting:not([hidden])");
  const session = JSON.stringify(await readDb(`sessions/${code}`));
  assert.ok(!session.includes("Renard"));
  assert.ok(!/"fr"|language|Français/.test(session));
  noErrors();
});

// ---------- Report ----------

test("report: English or Italian", async () => {
  freshErrors();
  const { host, code } = await newSession();
  const p1 = await join(code);
  await tile(host, "Poll").click();
  await host.fill("#poll-q0-text", "Statement A");
  await host.fill("#poll-q0-question", "Question A?");
  await host.locator("#activity-setup .button-primary").click();
  await eventually(async () => assert.match(await primary(host).innerText(), /Show the question/));
  await primary(host).click();
  await p1.locator(".poll-option", { hasText: "Yes" }).click();
  await eventually(async () => assert.match(await text(host, "#activity"), /1 of 1 voted/));

  const report = await host.context().newPage();
  report.on("dialog", (d) => d.accept());
  await report.goto(`${server.base}report.html?s=${code}`);
  await report.waitForSelector("#report:not([hidden])");
  assert.equal(await text(report, "h1"), "Workshop report");
  assert.match(await text(report, "#report"), /Question for voting: Question A\?/);
  await report.selectOption("#report-language", "it");
  await eventually(async () => assert.equal(await text(report, "h1"), "Report del workshop"));
  assert.match(await text(report, "#report"), /Sondaggio rapido/);
  assert.match(await text(report, "#report"), /Sì/);
  await report.reload();
  await report.waitForSelector("#report:not([hidden])");
  assert.equal(await text(report, "h1"), "Report del workshop");
  noErrors();
});

// ---------- Everything that worked before still works ----------

test("regression: measurement, word cloud, wall – phones and projector", async () => {
  freshErrors();
  const { host, code } = await newSession();
  const screen = await projector(code);
  const p1 = await join(code, "Lion");
  await eventually(async () => assert.match(await text(screen, "#count"), /1 joined/));

  // Measurement before → after → reveal
  await tile(host, "Measurement").click();
  await host.locator("#activity-setup .button-primary").click();
  await p1.waitForSelector(".scale");
  await p1.click(".statement:nth-of-type(1) .scale label:nth-child(2)");
  await p1.click(".statement:nth-of-type(2) .scale label:nth-child(4)");
  await p1.click("#activity button[type=submit]");
  await p1.waitForSelector("text=Thank you!");
  await primary(host).click(); // Start After (confirm: yes)
  await p1.waitForSelector(".scale");
  await p1.click(".statement:nth-of-type(1) .scale label:nth-child(4)");
  await p1.click(".statement:nth-of-type(2) .scale label:nth-child(5)");
  await p1.click("#activity button[type=submit]");
  await p1.waitForSelector("text=Thank you!");
  await eventually(async () => assert.equal(await primary(host).innerText(), "Reveal results"));
  await primary(host).click();
  await eventually(async () => assert.match(await text(screen, "#activity"), /2\.0[\s\S]*4\.0/));

  // Word cloud: words joined and normalized, remove a word
  await tile(host, "Word cloud").click();
  await host.fill("#cloud-p0", "Peace for me is…");
  await host.locator("#activity-setup .button-primary").click();
  await p1.fill("#text-q0", "Trust!");
  await p1.locator("#activity button[type=submit]").click();
  await eventually(async () => assert.match(await text(host, ".word-list"), /trust · 1/));
  await primary(host).click(); // close writing and show the cloud
  await eventually(async () => assert.match(await text(screen, ".cloud"), /trust/));
  await host.locator(".word-list button", { hasText: "Remove" }).click();
  await eventually(async () => assert.match(await text(screen, "#activity"), /No words yet/));

  // Wall: write, vote, results
  await tile(host, "Wall").click();
  await host.fill("#wall-prompt", "What helps?");
  await host.locator("#activity-setup .button-primary").click();
  await p1.fill("#text-main", "Patience");
  await p1.locator("#activity button[type=submit]").click();
  await eventually(async () => assert.match(await text(screen, ".wall-grid"), /Patience/));
  await primary(host).click(); // open voting
  await p1.locator(".vote-card button").click();
  await primary(host).click(); // close voting
  await eventually(async () => assert.match(await text(screen, ".wall-grid"), /1 vote/));
  await eventually(async () => assert.match(await primary(host).innerText(), /End the wall/));
  await primary(host).click(); // end (confirm: yes)
  await screen.waitForSelector("#lobby:not([hidden])");
  await p1.waitForSelector("#waiting:not([hidden])");

  // Refresh keeps the facilitator in the session.
  await host.reload();
  await host.waitForSelector("#dashboard:not([hidden])");
  assert.equal(await text(host, "#bar-code"), code);
  noErrors();
});
