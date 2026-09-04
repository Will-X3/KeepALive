const mongoose = require("mongoose");
const { REVIEW_TAGS } = require("../constants/reviewTags");

const reviewSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    // Closed vocabulary only — validated against REVIEW_TAGS at the schema
    // level AND again in the controller before that, so there's no path
    // for arbitrary text to end up here even via a direct API call.
    tags: {
      type: [{ type: String, enum: REVIEW_TAGS }],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one tag is required",
      },
    },
    // Anonymous, client-generated — consumers don't have accounts. Used
    // only for a soft one-review-per-session-per-location limit, not real
    // identity. Someone can trivially reset this by clearing storage; this
    // is a low-effort deterrent against casual ballot-stuffing, not a
    // security control.
    sessionId: { type: String, required: true },
  },
  { timestamps: true }
);

// One review per session per location — see the honesty note above about
// what this does and doesn't protect against.
reviewSchema.index({ locationId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
