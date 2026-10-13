// Templates: a prepared activity (e.g. a list of poll questions) saved so it
// can be used again in another session, on any device.
//
//   templates/{CODE}   { type: "poll", ownerUid, savedAt, config: { title, questions } }
//
// Every template gets its own 6-letter code (e.g. KXPTRM). Whoever knows the
// code can load it – the same idea as the session code. The list of all
// templates can't be read by anyone (database.rules.json), so a participant
// can't browse for upcoming questions. Only the device that saved a template
// can change it; anyone else who saves it gets a new copy with a new code.
//
// This phone also remembers the codes it saved or loaded (localStorage), so
// the facilitator doesn't have to type them.
import { db, ref, get, set, serverTimestamp } from "./firebase.js";
import * as storage from "./storage.js";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I and O
const STORAGE_KEY = "templates";            // [{ code, type, title }]
const REMEMBER_MAX = 20;

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => LETTERS[b % LETTERS.length]).join("");
}

function remember(code, type, title) {
  const others = (storage.load(STORAGE_KEY) || []).filter((item) => item.code !== code);
  storage.save(STORAGE_KEY, [{ code, type, title }, ...others].slice(0, REMEMBER_MAX));
}

export function rememberedTemplates(type) {
  return (storage.load(STORAGE_KEY) || []).filter((item) => item.type === type);
}

export async function loadTemplate(code) {
  const snap = await get(ref(db, `templates/${code}`));
  const template = snap.val();
  if (template) remember(code, template.type, template.config?.title || code);
  return template;
}

// Saves under `code` (our own template) or under a new code. Returns the code.
export async function saveTemplate(uid, type, config, code = null) {
  const data = { type, ownerUid: uid, savedAt: serverTimestamp(), config };
  if (code) {
    await set(ref(db, `templates/${code}`), data);
  } else {
    for (let attempt = 0; ; attempt++) {
      if (attempt >= 10) throw new Error("Could not create a template code");
      code = randomCode();
      try {
        // The rules refuse to overwrite someone else's template, so a taken code just fails.
        if ((await get(ref(db, `templates/${code}`))).exists()) continue;
        await set(ref(db, `templates/${code}`), data);
        break;
      } catch (err) {
        if (attempt >= 4) throw err;
      }
    }
  }
  remember(code, type, config.title || code);
  return code;
}
