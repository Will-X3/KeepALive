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
    // Where the worker is actually serving its HLS output right now.
    // Reported by the worker on each heartbeat — see ingestController.
    // Today this is only ever reachable when the worker and whoever's
    // viewing share a network (local dev, or a camera on the same LAN as
    // the backend); it is NOT a production playback path for a remote
    // camera. That needs real hosting/CDN, not solved by this field.
    playbackUrl: { type: String },
    lastHealthCheckAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stream", streamSchema);
