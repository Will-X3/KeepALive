const asyncHandler = require("express-async-handler");
const Business = require("../models/Business");
const Location = require("../models/Location");
const { assertOwnsBusiness } = require("../utils/ownership");

// @route  POST /api/businesses
// @access Private (business_owner, admin)
const createBusiness = asyncHandler(async (req, res) => {
  const { name, website, phone } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Business name is required");
  }

  // Starts pending — manual review for the pilot.
  const business = await Business.create({
    ownerId: req.user._id,
    name,
    website,
    phone,
    status: "pending",
  });

  res.status(201).json(business);
});

// @route  GET /api/businesses/mine
// @access Private (business_owner, admin)
const getMyBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ ownerId: req.user._id }).sort({ createdAt: -1 });

  // Attach each business's locations (small N at MVP scale, so N+1 is fine).
  const withLocations = await Promise.all(
    businesses.map(async (b) => ({
      ...b.toObject(),
      locations: await Location.find({ businessId: b._id }),
    }))
  );

  res.json(withLocations);
});

// @route  GET /api/businesses/:id
// @access Private (owner or admin)
const getBusinessById = asyncHandler(async (req, res) => {
  const business = await assertOwnsBusiness(req.user, req.params.id);
  const locations = await Location.find({ businessId: business._id });
  res.json({ ...business.toObject(), locations });
});

// @route  PATCH /api/businesses/:id
// @access Private (owner or admin)
const updateBusiness = asyncHandler(async (req, res) => {
  await assertOwnsBusiness(req.user, req.params.id);

  const { name, website, phone } = req.body;
  const updated = await Business.findByIdAndUpdate(
    req.params.id,
    { $set: { name, website, phone } },
    { new: true, runValidators: true }
  );

  res.json(updated);
});

// @route  PATCH /api/businesses/:id/status
// @access Private (admin only)
const updateBusinessStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["pending", "active", "suspended"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const updated = await Business.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!updated) {
    res.status(404);
    throw new Error("Business not found");
  }

  res.json(updated);
});

// @route  PATCH /api/businesses/:id/settings
// @access Private (owner or admin)
// Opt-in feature flags. allowReviews in particular is a real product
// decision, not a cosmetic setting — see the comment on the Business
// model. This endpoint only ever writes the two known flags, never
// arbitrary keys, so a client can't smuggle in unrelated fields.
const updateBusinessSettings = asyncHandler(async (req, res) => {
  await assertOwnsBusiness(req.user, req.params.id);

  const { allowReviews, broadcastWaitTimes } = req.body;
  const update = {};
  if (typeof allowReviews === "boolean") update["settings.allowReviews"] = allowReviews;
  if (typeof broadcastWaitTimes === "boolean") update["settings.broadcastWaitTimes"] = broadcastWaitTimes;

  if (Object.keys(update).length === 0) {
    res.status(400);
    throw new Error("Provide allowReviews and/or broadcastWaitTimes as booleans");
  }

  const updated = await Business.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  res.json(updated);
});

module.exports = {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  updateBusiness,
  updateBusinessStatus,
  updateBusinessSettings,
};
