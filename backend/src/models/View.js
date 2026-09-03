const mongoose = require("mongoose");

const viewSchema = new mongoose.Schema({
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location",
    required: true,
    index: true,
  },
  // Anonymous, client-generated id — never tied to a User (consumers don't
  // have accounts).
  sessionId: { type: String, required: true },
  referrer: String,
  createdAt: { type: Date, default: Date.now },
});

viewSchema.index({ locationId: 1, createdAt: -1 });

module.exports = mongoose.model("View", viewSchema);
