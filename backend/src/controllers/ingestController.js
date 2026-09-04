const asyncHandler = require("express-async-handler");
const Stream = require("../models/Stream");
const StreamEvent = require("../models/StreamEvent");

async function getOrCreateStream(cameraId) {
  let stream = await Stream.findOne({ cameraId }).sort({ createdAt: -1 });
  if (!stream) {
    stream = await Stream.create({ cameraId, ingestState: "idle", publicState: "offline" });
  }
  return stream;
}

// @route  POST /api/ingest/heartbeat
// @access Ingest key (X-Ingest-Key header)
// Reports basic connectivity only. Deliberately does NOT set publicState —
// a camera being connected says nothing about whether the blur pipeline is
// healthy. publicState only ever moves via reportBlurHealth or
// reportEvent, never as a side effect of a heartbeat.
const heartbeat = asyncHandler(async (req, res) => {
  const camera = req.camera;

  camera.status = "connected";
  camera.lastSeenAt = new Date();
  await camera.save();

  const stream = await getOrCreateStream(camera._id);
  stream.ingestState = req.body.ingestState || "connected";
  stream.lastHealthCheckAt = new Date();
  await stream.save();

  res.json({ cameraStatus: camera.status, streamPublicState: stream.publicState });
});

const EVENT_TYPES = [
  "connected",
  "disconnected",
  "blur_failure",
  "ingest_failure",
  "transcoding_failure",
];

// @route  POST /api/ingest/event
// @access Ingest key
// Logs the event and applies the fail-closed rule: any privacy- or
// pipeline-relevant failure immediately takes the public feed down, no
// grace period, no "still probably fine." Ambiguous/failure states never
// resolve permissively.
const reportEvent = asyncHandler(async (req, res) => {
  const camera = req.camera;
  const { type, detail } = req.body;

  if (!EVENT_TYPES.includes(type)) {
    res.status(400);
    throw new Error(`type must be one of: ${EVENT_TYPES.join(", ")}`);
  }

  const stream = await getOrCreateStream(camera._id);

  await StreamEvent.create({ streamId: stream._id, type, detail });

  switch (type) {
    case "disconnected":
      camera.status = "disconnected";
      stream.publicState = "offline";
      break;
    case "blur_failure":
    case "ingest_failure":
    case "transcoding_failure":
      camera.status = "error";
      stream.publicState = "fail_closed";
      break;
    case "connected":
      camera.status = "connected";
      // Note: does NOT set publicState to "live" — that only happens via
      // reportBlurHealth, once the blur pipeline itself confirms healthy.
      break;
  }

  camera.lastSeenAt = new Date();
  await camera.save();
  await stream.save();

  res.status(201).json({ cameraStatus: camera.status, streamPublicState: stream.publicState });
});

// @route  POST /api/ingest/blur-health
// @access Ingest key
// Stub for the future vision/blur pipeline. This is the ONLY path that can
// set publicState to "live" — and only while the camera itself is
// currently connected. Everything else in this file can only take the
// feed offline/fail-closed, never bring it up, which is intentional.
const reportBlurHealth = asyncHandler(async (req, res) => {
  const camera = req.camera;
  const { healthy } = req.body;

  if (typeof healthy !== "boolean") {
    res.status(400);
    throw new Error("healthy (boolean) is required");
  }

  const stream = await getOrCreateStream(camera._id);

  if (healthy && camera.status === "connected") {
    stream.publicState = "live";
  } else {
    stream.publicState = "fail_closed";
    await StreamEvent.create({
      streamId: stream._id,
      type: "blur_failure",
      detail: healthy ? "Blur healthy but camera not connected" : "Blur pipeline reported unhealthy",
    });
  }

  stream.lastHealthCheckAt = new Date();
  await stream.save();

  res.json({ streamPublicState: stream.publicState });
});

module.exports = { heartbeat, reportEvent, reportBlurHealth };
