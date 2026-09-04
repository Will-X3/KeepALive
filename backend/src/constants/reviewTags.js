/**
 * Reviews are closed-vocabulary checkboxes only — never free text. A
 * customer picks from this fixed list; nothing here is ever
 * user-authored, so there's no free-text moderation surface at all.
 * Add/remove tags here; nothing else needs to change.
 */
const REVIEW_TAGS = [
  "Clean",
  "Fast service",
  "Friendly staff",
  "Great value",
  "Worth the wait",
  "Long wait",
  "Would recommend",
];

module.exports = { REVIEW_TAGS };
