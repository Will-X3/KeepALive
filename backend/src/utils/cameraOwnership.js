const Camera = require("../models/Camera");

/**
 * Confirms the requesting user owns the camera (via location -> business),
 * unless they're an admin. Returns 404, not 403, for a camera owned by
 * someone else — same reasoning as assertOwnsBusiness/assertOwnsLocation:
 * ownership shouldn't be probeable by comparing status codes.
 */
async function assertOwnsCamera(user, cameraId) {
  const camera = await Camera.findById(cameraId).populate({
    path: "locationId",
    populate: { path: "businessId" },
  });

  if (!camera) {
    const err = new Error("Camera not found");
    err.status = 404;
    throw err;
  }

  const business = camera.locationId?.businessId;
  if (user.role !== "admin" && business?.ownerId?.toString() !== user._id.toString()) {
    const err = new Error("Camera not found");
    err.status = 404;
    throw err;
  }

  return camera;
}

module.exports = { assertOwnsCamera };
