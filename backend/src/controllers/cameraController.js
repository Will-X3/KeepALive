const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Camera = require("../models/Camera");
const Stream = require("../models/Stream");
const StreamEvent = require("../models/StreamEvent");
const Business = require("../models/Business");
const Location = require("../models/Location");
const { assertOwnsLocation } = require("../utils/ownership");
const { assertOwnsCamera } = require("../utils/cameraOwnership");

// @route  POST /api/locations/:locationId/cameras
// @access Private (owner or admin)
// Connects a new camera to a location. A camera always gets exactly one
// Stream record created alongside it — publicState starts "offline" and
// only ever advances past "fail_closed" once ingest health is confirmed
// (see ingestController). Never defaults to "live".
const createCamera = asyncHandler(async (req, res) => {
  const location = await assertOwnsLocation(req.user, req.params.locationId);

  const camera = await Camera.create({ locationId: location._id });
  const stream = await Stream.create({
    cameraId: camera._id,
    ingestState: "idle",
    publicState: "offline",
  });

  // The ingestKey is only ever returned in full at creation (and on
  // rotation) — treat this response as the one chance to copy it down into
  // whatever the camera/encoder config uses.
  res.status(201).json({
    camera,
    stream,
    ingestKey: camera.ingestKey,
    note: "Save this ingest key now — it won't be shown again. Rotate it from the dashboard if it leaks.",
  });
});

// @route  GET /api/locations/:locationId/cameras
// @access Private (owner or admin)
const listCamerasForLocation = asyncHandler(async (req, res) => {
  await assertOwnsLocation(req.user, req.params.locationId);

  const cameras = await Camera.find({ locationId: req.params.locationId }).select("-ingestKey");
  const streams = await Stream.find({
    cameraId: { $in: cameras.map((c) => c._id) },
  });

  const withStreams = cameras.map((camera) => ({
    ...camera.toObject(),
    streams: streams.filter((s) => s.cameraId.toString() === camera._id.toString()),
  }));

  res.json(withStreams);
});

// @route  GET /api/cameras/mine
// @access Private (business_owner, admin)
// Every camera across every location the owner has, for the cross-location
// monitor view — as opposed to listCamerasForLocation, which is scoped to
// one location. Admins get literally everything, not just their own.
const listMyCameras = asyncHandler(async (req, res) => {
  let locationFilter = {};

  if (req.user.role !== "admin") {
    const myBusinesses = await Business.find({ ownerId: req.user._id }).select("_id");
    const myLocations = await Location.find({
      businessId: { $in: myBusinesses.map((b) => b._id) },
    }).select("_id");
    locationFilter = { locationId: { $in: myLocations.map((l) => l._id) } };
  }

  const cameras = await Camera.find(locationFilter)
    .select("-ingestKey")
    .populate({
      path: "locationId",
      select: "name businessId",
      populate: { path: "businessId", select: "name" },
    });

  const streams = await Stream.find({ cameraId: { $in: cameras.map((c) => c._id) } }).sort({
    createdAt: -1,
  });

  const result = cameras.map((camera) => ({
    ...camera.toObject(),
    streams: streams.filter((s) => s.cameraId.toString() === camera._id.toString()),
  }));

  res.json(result);
});

// @route  GET /api/cameras/:id
// @access Private (owner or admin)
const getCamera = asyncHandler(async (req, res) => {
  const camera = await assertOwnsCamera(req.user, req.params.id);
  const streams = await Stream.find({ cameraId: camera._id });
  const { ingestKey, ...safeCamera } = camera.toObject();
  res.json({ ...safeCamera, streams });
});

// @route  POST /api/cameras/:id/rotate-key
// @access Private (owner or admin)
// Rotating invalidates the old key immediately — any ingest client still
// using it starts getting 401s on its next heartbeat, which is the
// intended behavior for a suspected leak.
const rotateIngestKey = asyncHandler(async (req, res) => {
  const camera = await assertOwnsCamera(req.user, req.params.id);

  camera.ingestKey = crypto.randomBytes(24).toString("hex");
  camera.ingestKeyRotatedAt = new Date();
  await camera.save();

  res.json({
    ingestKey: camera.ingestKey,
    note: "Save this ingest key now — it won't be shown again.",
  });
});

// @route  PATCH /api/cameras/:id/privacy
// @access Private (owner or admin)
// Masking/exclusion zones, full-person blur toggle, etc. Left as a loose
// object (validated by the vision pipeline that actually consumes it, once
// that exists) rather than modeled field-by-field here.
const updatePrivacyConfig = asyncHandler(async (req, res) => {
  const camera = await assertOwnsCamera(req.user, req.params.id);

  if (typeof req.body.privacyConfig !== "object" || req.body.privacyConfig === null) {
    res.status(400);
    throw new Error("privacyConfig must be an object");
  }

  camera.privacyConfig = req.body.privacyConfig;
  await camera.save();

  const { ingestKey, ...safeCamera } = camera.toObject();
  res.json(safeCamera);
});

// @route  DELETE /api/cameras/:id
// @access Private (owner or admin)
const deleteCamera = asyncHandler(async (req, res) => {
  const camera = await assertOwnsCamera(req.user, req.params.id);

  const streams = await Stream.find({ cameraId: camera._id });
  await StreamEvent.deleteMany({ streamId: { $in: streams.map((s) => s._id) } });
  await Stream.deleteMany({ cameraId: camera._id });
  await Camera.deleteOne({ _id: camera._id });

  res.status(204).send();
});

module.exports = {
  createCamera,
  listCamerasForLocation,
  listMyCameras,
  getCamera,
  rotateIngestKey,
  updatePrivacyConfig,
  deleteCamera,
};
