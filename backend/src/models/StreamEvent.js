const mongoose = require("mongoose");

const streamEventSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stream",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      "connected",
      "disconnected",
      "blur_failure",
      "ingest_failure",
      "transcoding_failure",
    ],
    required: true,
  },
  detail: String,
  createdAt: { type: Date, default: Date.now },
});

// Append-only event log — auto-expire after 90 days so this collection
// doesn't grow forever. Adjust or remove once you know what you actually
// want to keep for historical debugging/analytics.
streamEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model("StreamEvent", streamEventSchema);
