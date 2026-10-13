// The list of all activity types.
//
// To add a new type:
//   1. create js/activities/<type>.js with the same shape as poll.js
//   2. add one line below (and its import)
// Nothing else in the app has to change: the loop (js/activity-loop.js)
// picks the module by the activity's "type" and lets it draw the screen.
//
// wordcloud, wall and moderatedWall share the text base (text-base.js and
// js/text-store.js): the phone part is the same, only the projector differs.
import measure from "./measure.js";
import poll from "./poll.js";
import wordcloud from "./wordcloud.js";
import wall from "./wall.js";
import moderatedWall from "./moderated-wall.js";

export const activityTypes = {
  measure,
  poll,
  wordcloud,
  wall,
  moderatedWall
};
