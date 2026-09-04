const asyncHandler = require("express-async-handler");
const Location = require("../models/Location");
const Camera = require("../models/Camera");
const Stream = require("../models/Stream");
const Category = require("../models/Category");
const { assertOwnsBusiness, assertOwnsLocation } = require("../utils/ownership");

// @route  GET /api/locations?lat=&lng=&radiusKm=&category=&liveOnly=
// @access Public — no account required, per product spec
const getNearbyLocations = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm = 10, category, liveOnly } = req.query;

  if (lat === undefined || lng === undefined) {
    res.status(400);
    throw new Error("lat and lng query params are required");
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  const radiusMeters = Number(radiusKm) * 1000;

  if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radiusMeters)) {
    res.status(400);
    throw new Error("lat, lng, and radiusKm must be numbers");
  }

  const match = {
    status: liveOnly === "true" ? "live" : { $in: ["live", "paused"] },
  };

  if (category) {
    const cat = await Category.findOne({ slug: category });
    match.categoryId = cat ? cat._id : null; // null -> no matches, rather than erroring on unknown slug
  }

  // $geoNear must be the first stage, and it's the only way to get an
  // actual computed distance back (plain $near sorts but returns no
  // distance field). It also requires the geo query criteria up front,
  // separate from the rest of the $match filters, or it errors.
  const results = await Location.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distanceMeters",
        maxDistance: radiusMeters,
        spherical: true,
        query: match,
      },
    },
    {
      $lookup: { from: "categories", localField: "categoryId", foreignField: "_id", as: "categoryId" },
    },
    { $unwind: "$categoryId" },
    {
      $lookup: { from: "businesses", localField: "businessId", foreignField: "_id", as: "businessId" },
    },
    { $unwind: "$businessId" },
    // Only surface locations belonging to an active business.
    { $match: { "businessId.status": "active" } },
    {
      $project: {
        name: 1,
        address: 1,
        geo: 1,
        timezone: 1,
        hours: 1,
        status: 1,
        distanceMeters: 1,
        createdAt: 1,
        updatedAt: 1,
        "categoryId._id": 1,
        "categoryId.name": 1,
        "categoryId.slug": 1,
        "businessId._id": 1,
        "businessId.name": 1,
      },
    },
  ]);

  res.json(results);
});

// @route  GET /api/locations/:id
// @access Public
const getLocationById = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.params.id)
    .populate("categoryId", "name slug")
    .populate("businessId", "name website status settings");

  const businessActive = location?.businessId?.status === "active";
  if (!location || !businessActive || location.status === "suspended") {
    res.status(404);
    throw new Error("Location not found");
  }

  // Only ever expose a playback URL when a stream is genuinely reporting
  // "live" — this is the actual public-facing privacy gate. A camera that
  // exists but hasn't been confirmed healthy (or has gone fail_closed)
  // must never surface a playable URL here, regardless of what the
  // business owner can see in their own dashboard preview.
  const cameras = await Camera.find({ locationId: location._id }).select("_id");
  const liveStream = await Stream.findOne({
    cameraId: { $in: cameras.map((c) => c._id) },
    publicState: "live",
  }).sort({ updatedAt: -1 });

  res.json({
    ...location.toObject(),
    liveStream: liveStream ? { playbackUrl: liveStream.playbackUrl } : null,
  });
});

// @route  POST /api/locations
// @access Private (business_owner, admin)
const createLocation = asyncHandler(async (req, res) => {
  const { businessId, categoryId, name, address, lat, lng, timezone, hours } = req.body;

  if (
    !businessId ||
    !categoryId ||
    !name ||
    !address ||
    lat === undefined ||
    lng === undefined ||
    !timezone
  ) {
    res.status(400);
    throw new Error(
      "businessId, categoryId, name, address, lat, lng, and timezone are required"
    );
  }

  await assertOwnsBusiness(req.user, businessId);

  const location = await Location.create({
    businessId,
    categoryId,
    name,
    address,
    geo: { type: "Point", coordinates: [Number(lng), Number(lat)] },
    timezone,
    hours: hours || {},
    status: "draft",
  });

  res.status(201).json(location);
});

// @route  PATCH /api/locations/:id
// @access Private (owner or admin)
const updateLocation = asyncHandler(async (req, res) => {
  await assertOwnsLocation(req.user, req.params.id);

  const { name, address, lat, lng, timezone, hours, categoryId } = req.body;
  const update = { name, address, timezone, hours, categoryId };
  if (lat !== undefined && lng !== undefined) {
    update.geo = { type: "Point", coordinates: [Number(lng), Number(lat)] };
  }

  const updated = await Location.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true }
  );

  res.json(updated);
});

// @route  PATCH /api/locations/:id/visibility
// @access Private (owner or admin)
// Toggles live <-> paused. Going live requires a camera with a Stream
// already reporting publicState "live" — i.e. the blur pipeline has
// confirmed healthy via /api/ingest/blur-health. A connected camera alone
// is not enough; ambiguous/unconfirmed states never resolve permissively.
const setVisibility = asyncHandler(async (req, res) => {
  const location = await assertOwnsLocation(req.user, req.params.id);
  const { status } = req.body;

  if (!["live", "paused"].includes(status)) {
    res.status(400);
    throw new Error("status must be 'live' or 'paused'");
  }

  if (status === "live") {
    const cameras = await Camera.find({ locationId: location._id }).select("_id");
    if (cameras.length === 0) {
      res.status(409);
      throw new Error("Connect a camera before going live");
    }

    const liveStream = await Stream.findOne({
      cameraId: { $in: cameras.map((c) => c._id) },
      publicState: "live",
    });
    if (!liveStream) {
      res.status(409);
      throw new Error(
        "No camera is currently confirmed healthy (publicState 'live'). Check the camera's ingest and blur-health status."
      );
    }
  }

  const updated = await Location.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(updated);
});

// @route  PATCH /api/locations/:id/admin-status
// @access Private (admin only)
const adminSetStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["draft", "live", "paused", "suspended"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const updated = await Location.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!updated) {
    res.status(404);
    throw new Error("Location not found");
  }

  res.json(updated);
});

module.exports = {
  getNearbyLocations,
  getLocationById,
  createLocation,
  updateLocation,
  setVisibility,
  adminSetStatus,
};
