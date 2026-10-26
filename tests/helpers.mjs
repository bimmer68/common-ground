// Helpers for the browser tests: a small web server for the app, and
// "devices" (one browser context each = its own anonymous uid), all talking
// to the Firebase EMULATOR instead of the real database.
//
// The app is served exactly as it is in the repo, with two changes made only
// on the way to the browser:
//   - js/firebase-config.js points to the emulator project "demo-common-ground"
//   - js/firebase.js also connects Auth and the Database to the emulators
// Firebase itself (www.gstatic.com) comes from node_modules/firebase, the same
// version 10.12.2. The QR library (cdnjs) is replaced by a tiny stand-in.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIREBASE_DIR = path.dirname(createRequire(import.meta.url).resolve("firebase/package.json"));
const NAMESPACE = "demo-common-ground-default-rtdb";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };

export const PHONE = { width: 375, height: 740 };
export const PROJECTOR = { width: 1280, height: 720 };

const CONFIG = `export const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "demo-common-ground.firebaseapp.com",
  databaseURL: "https://${NAMESPACE}.firebaseio.com",
  projectId: "demo-common-ground",
  appId: "demo-app"
};`;

const QR_STUB = "window.QRCode = function QRCode(el) { el.textContent = 'QR'; }; window.QRCode.CorrectLevel = { M: 0 };";

async function transform(rel, body) {
  if (rel === "js/firebase-config.js") return CONFIG;
  if (rel === "js/firebase.js") {
    const marker = "export const db = getDatabase(app);";
    if (!body.includes(marker)) throw new Error("js/firebase.js changed: update tests/helpers.mjs");
    return body.replace(marker, `${marker}
__connectAuth(auth, "http://127.0.0.1:9099", { disableWarnings: true });
__connectDatabase(db, "127.0.0.1", 9000);`) + `
import { connectAuthEmulator as __connectAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { connectDatabaseEmulator as __connectDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
`;
  }
  return body;
}

// Loads database.rules.json into the emulator (the same file the owner copies to Firebase).
export async function loadRules() {
  const rules = await readFile(path.join(ROOT, "database.rules.json"), "utf8");
  const res = await fetch(`http://127.0.0.1:9000/.settings/rules.json?ns=${NAMESPACE}`, {
    method: "PUT", headers: { Authorization: "Bearer owner" }, body: rules
  });
  if (!res.ok) throw new Error(`Could not load rules: ${res.status} ${await res.text()}`);
}

// Reads the database as an admin (no rules), for checks like "nothing secret was saved".
export async function readDb(dbPath) {
  const res = await fetch(`http://127.0.0.1:9000/${dbPath}.json?ns=${NAMESPACE}`, { headers: { Authorization: "Bearer owner" } });
  return res.json();
}

export async function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      let body = await readFile(file, "utf8");
      body = await transform(rel, body);
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "text/plain", "Cache-Control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { base: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) };
}

export async function startBrowser() {
  return chromium.launch();
}

// One device = one browser context = one anonymous uid (like a separate phone).
export async function device(browser, viewport = PHONE, { errors = [] } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  await context.route("https://www.gstatic.com/firebasejs/10.12.2/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    route.fulfill({ contentType: "text/javascript", body: await readFile(path.join(FIREBASE_DIR, name), "utf8") });
  });
  await context.route("https://cdnjs.cloudflare.com/**", (route) => route.fulfill({ contentType: "text/javascript", body: QR_STUB }));
  context.on("page", (page) => watchErrors(page, errors));
  return context;
}

// Collects uncaught errors and console errors (except expected "permission denied" refusals).
function watchErrors(page, errors) {
  page.on("pageerror", (err) => errors.push(`${page.url()}: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/permission_denied|PERMISSION_DENIED|Failed to load resource/i.test(text)) return;
    errors.push(`${page.url()}: ${text}`);
  });
}

export async function open(context, base, page) {
  const tab = await context.newPage();
  await tab.goto(base + page);
  return tab;
}

// Waits until fn() stops throwing (for things that arrive from the database).
export async function eventually(fn, { timeout = 10000, interval = 100 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (Date.now() > end) throw err;
      await new Promise((r) => setTimeout(r, interval));
    }
  }
}
