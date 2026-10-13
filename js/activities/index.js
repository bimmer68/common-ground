// The list of all activity types.
//
// To add a new type (e.g. a word cloud in Faza 4):
//   1. create js/activities/wordcloud.js with the same shape as poll.js
//   2. add one line below (and its import)
// Nothing else in the app has to change: the loop (js/activity-loop.js)
// picks the module by the activity's "type" and lets it draw the screen.
import measure from "./measure.js";
import poll from "./poll.js";

export const activityTypes = {
  measure,
  poll
};
