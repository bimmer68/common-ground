// The list of all activity types.
//
// To add a new type (e.g. a poll in Faza 3):
//   1. create js/activities/poll.js with the same shape as measure.js
//   2. add one line below
// Nothing else in the app has to change: the loop (js/activity-loop.js)
// picks the module by the activity's "type" and lets it draw the screen.
import measure from "./measure.js";

export const activityTypes = {
  measure
};
