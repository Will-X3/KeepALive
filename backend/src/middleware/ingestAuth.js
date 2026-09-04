const asyncHandler = require("express-async-handler");
const Camera = require("../models/Camera");

/**
 * Cameras/ingest clients never get a user JWT — they authenticate with the
 * unique ingestKey issued when the camera was connected. This is
 * deliberately a separate credential from playback (Stream.playbackId) and
 * from user auth, so a leaked ingest key can be rotated without touching
 * anything else, and a leaked playback id can never be used to push video.
 */
const requireIngestKey = asyncHandler(async (req, res, next) => {
  const key = req.headers["x-ingest-key"];

  if (!key) {
    res.status(401);
    throw new Error("Missing X-Ingest-Key header");
  }

  const camera = await Camera.findOne({ ingestKey: key });
  if (!camera) {
    res.status(401);
    throw new Error("Invalid ingest key");
  }

  req.camera = camera;
  next();
});

module.exports = { requireIngestKey };
