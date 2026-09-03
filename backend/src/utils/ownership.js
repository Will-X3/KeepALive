const Business = require("../models/Business");
const Location = require("../models/Location");

/**
 * Confirms the requesting user owns the business, unless they're an admin.
 * Throws a 404-flavored error (not 403) for a business owned by someone
 * else, so ownership can't be probed by comparing 403 vs 404 responses.
 */
async function assertOwnsBusiness(user, businessId) {
  const business = await Business.findById(businessId);
  if (!business) {
    const err = new Error("Business not found");
    err.status = 404;
    throw err;
  }
  if (user.role !== "admin" && business.ownerId.toString() !== user._id.toString()) {
    const err = new Error("Business not found");
    err.status = 404;
    throw err;
  }
  return business;
}

/** Same idea, resolved through the location's parent business. */
async function assertOwnsLocation(user, locationId) {
  const location = await Location.findById(locationId).populate("businessId");
  if (!location) {
    const err = new Error("Location not found");
    err.status = 404;
    throw err;
  }
  const business = location.businessId; // populated Business doc
  if (user.role !== "admin" && business.ownerId.toString() !== user._id.toString()) {
    const err = new Error("Location not found");
    err.status = 404;
    throw err;
  }
  return location;
}

module.exports = { assertOwnsBusiness, assertOwnsLocation };
