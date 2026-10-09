// Safe wrappers around localStorage (it can be blocked, e.g. in private mode).
// Used to remember "which session am I in" across page refreshes.
const PREFIX = "commonGround.";

export function load(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore: the app still works, it just won't remember after a refresh.
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore
  }
}
