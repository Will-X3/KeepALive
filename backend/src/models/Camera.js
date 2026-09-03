const mongoose = require("mongoose");
const crypto = require("crypto");

const cameraSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    // Unique, rotatable ingest credential. Never expose this to consumers —
    // playback uses Stream.playbackId instead.
    ingestKey: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
    ingestKeyRotatedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "connected", "disconnected", "error"],
      default: "pending",
      index: true,
    },
    lastSeenAt: Date,
    // Masking zones, full-person blur toggle, etc. Loose on purpose for MVP.
    privacyConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Camera", cameraSchema);
