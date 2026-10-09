// Shows a small banner at the top of the page while the connection is lost
// (weak Wi-Fi, phone was locked). Firebase reconnects by itself.
import { watchConnection } from "./firebase.js";
import { t } from "./i18n.js";

export function showConnectionBanner() {
  const banner = document.createElement("div");
  banner.className = "connection-banner";
  banner.setAttribute("role", "status");
  banner.textContent = t("common.offline");
  banner.hidden = true;
  document.body.prepend(banner);

  let timer = null;
  watchConnection((online) => {
    clearTimeout(timer);
    if (online) {
      banner.hidden = true;
    } else {
      // Wait a moment so the banner doesn't flash while the page is loading.
      timer = setTimeout(() => { banner.hidden = false; }, 1500);
    }
  });
}
