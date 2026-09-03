const mongoose = require("mongoose");
const crypto = require("crypto");

const streamSchema = new mongoose.Schema(
  {
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Camera",
      required: true,
      index: true,
    },
    ingestState: { type: String, default: "idle" },
    // What's safe to show publicly is deliberately separate from ingest
    // state. A camera can be "connected" while publicState stays
    // fail_closed because the blur pipeline hasn't confirmed healthy.
    publicState: {
      type: String,
      enum: ["offline", "starting", "live", "degraded", "fail_closed"],
      default: "offline",
      index: true,
    },
    // Opaque id used by clients — never the raw camera/RTSP URL.
    playbackId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(16).toString("hex"),
    },
    lastHealthCheckAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stream", streamSchema);
