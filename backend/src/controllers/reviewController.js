const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const Location = require("../models/Location");
const { REVIEW_TAGS } = require("../constants/reviewTags");

// @route  GET /api/locations/:locationId/reviews/tags
// @access Public
// So the frontend never hardcodes the tag list separately from the backend.
const getAvailableTags = asyncHandler(async (req, res) => {
  res.json(REVIEW_TAGS);
});

// @route  POST /api/locations/:locationId/reviews
// @access Public — no consumer accounts, matches the rest of the product
const submitReview = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.params.locationId).populate("businessId");

  if (!location || location.status === "suspended" || location.businessId?.status !== "active") {
    res.status(404);
    throw new Error("Location not found");
  }
  if (!location.businessId?.settings?.allowReviews) {
    res.status(403);
    throw new Error("This location isn't accepting reviews");
  }

  const { tags, sessionId } = req.body;

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400);
    throw new Error("sessionId is required");
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    res.status(400);
    throw new Error("Select at least one tag");
  }
  const invalidTags = tags.filter((t) => !REVIEW_TAGS.includes(t));
  if (invalidTags.length > 0) {
    res.status(400);
    throw new Error(`Unknown tag(s): ${invalidTags.join(", ")}`);
  }

  try {
    const review = await Review.create({
      locationId: location._id,
      tags: [...new Set(tags)], // de-dupe
      sessionId,
    });
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      res.status(409);
      throw new Error("You've already reviewed this location");
    }
    throw err;
  }
});

// @route  GET /api/locations/:locationId/reviews/summary
// @access Public
const getReviewSummary = asyncHandler(async (req, res) => {
  const locationId = new mongoose.Types.ObjectId(req.params.locationId);

  const totalReviews = await Review.countDocuments({ locationId });

  const counts = await Review.aggregate([
    { $match: { locationId } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
  ]);

  const tagCounts = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  res.json({ totalReviews, tagCounts });
});

module.exports = { getAvailableTags, submitReview, getReviewSummary };
