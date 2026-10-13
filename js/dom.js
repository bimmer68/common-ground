// Tiny helper for building page elements in JavaScript.
//   el("p", { class: "hint", text: "Hello" })
//   el("button", { type: "button", onclick: () => … }, "Send")
// Strings are always added as plain text (never as HTML), so text typed by
// a user can never turn into code on the page.
const PROPERTIES = ["value", "checked", "disabled", "hidden"];

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (PROPERTIES.includes(key)) node[key] = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  node.append(...children.flat().filter((child) => child != null && child !== false));
  return node;
}

// Like node.replaceChildren(), but also accepts lists and skips empty values,
// the same way el() does:  fill(root, title, maybeNull, [a, b])
export function fill(node, ...children) {
  node.replaceChildren(...children.flat().filter((child) => child != null && child !== false && child !== ""));
}
