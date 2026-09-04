const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "pending",
      index: true,
    },
    // Opt-in feature flags. These persist the business owner's choice, but
    // the features themselves (reviews, wait-time broadcast) aren't fully
    // built yet — see PROJECT.md / conversation history. Reviews in
    // particular is a deliberate reversal of the original "no reviews, no
    // social features" product decision — flipping this on is a real
    // product change, not a cosmetic toggle.
    settings: {
      allowReviews: { type: Boolean, default: false },
      broadcastWaitTimes: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Business", businessSchema);
