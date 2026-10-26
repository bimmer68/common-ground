// The activity loop ("petlja"), shared by all three pages:
//
//   1. The facilitator sets sessions/{CODE}/current = { activityId }.
//   2. Every page listens to "current" and then to the activity it points to.
//   3. The activity's "type" picks a module from js/activities/, and the
//      module draws the right view for this page (participant, screen or host).
//   4. When the facilitator changes something (phase, Reveal), the module's
//      view gets update(activity). When they switch activity, the old view is
//      removed and a new one is drawn.
//
// A module view is a function  view(ctx) -> { update(activity)?, destroy()? }
// ctx = { el, code, uid, activityId, activity }
// On the facilitator's page ctx also has end(): ends the activity (after a
// confirmation), so a module can offer "End" as its last step.
import { watchCurrent, watchActivity } from "./activity-store.js";
import { activityTypes } from "./activities/index.js";
import { el } from "./dom.js";
import { t } from "./i18n.js";

// role: "participant" | "screen" | "host"
// onChange(activityId or null): lets the page show its own idle view
// (waiting card, QR lobby) when nothing is running.
export function runActivityLoop({ code, uid, role, container, onChange, onError }) {
  let currentId; // undefined until the first answer from the database, so idle (null) is reported too
  let stopView = null;

  const stopCurrent = watchCurrent(code, (id) => {
    if (id === currentId) return;
    if (stopView) stopView();
    stopView = null;
    container.replaceChildren();
    currentId = id;
    onChange(id);
    if (!id) return;
    stopView = activityView({ code, uid, role, container, id, onError });
  }, onError);

  return function stop() {
    stopCurrent();
    if (stopView) stopView();
    container.replaceChildren();
  };
}

// Draws ONE activity (by id) with its module and keeps it up to date, no
// matter whether it is the current one. The loop above uses it for the
// current activity; the facilitator's page also uses it to open an earlier
// activity only on the phone ("Open"), without touching the projector.
// extra: more fields for the module's view (the host page passes end()).
// onActivity(activity or null): called on every change, before drawing.
export function activityView({ code, uid, role, container, id, onError, extra = {}, onActivity = null }) {
  let view = null;
  let viewType = null;
  let stopped = false;

  function clearView() {
    if (view?.destroy) view.destroy();
    view = null;
    viewType = null;
    container.replaceChildren();
  }

  function draw(activity) {
    const module = activityTypes[activity.type];
    if (!module || !module[role]) {
      clearView();
      container.append(el("p", { class: "status", text: t("activity.unknown") }));
      return;
    }
    // Same activity, something changed (e.g. phase or Reveal): let the view update itself.
    if (view && viewType === activity.type && view.update) {
      view.update(activity);
      return;
    }
    clearView();
    viewType = activity.type;
    view = module[role]({ ...extra, el: container, code, uid, activityId: id, activity }) || {};
  }

  const stopActivity = watchActivity(code, id, (activity) => {
    if (stopped) return;
    if (onActivity) onActivity(activity);
    if (activity) draw(activity);
    else clearView();
  }, onError);

  return function stop() {
    stopped = true;
    stopActivity();
    clearView();
  };
}
