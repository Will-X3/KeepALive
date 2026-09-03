const express = require("express");
const {
  getNearbyLocations,
  getLocationById,
  createLocation,
  updateLocation,
  setVisibility,
  adminSetStatus,
} = require("../controllers/locationController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public
router.get("/", getNearbyLocations);
router.get("/:id", getLocationById);

// Business owner / admin
router.post("/", protect, authorize("business_owner", "admin"), createLocation);
router.patch("/:id", protect, updateLocation);
router.patch("/:id/visibility", protect, setVisibility);

// Admin only
router.patch("/:id/admin-status", protect, authorize("admin"), adminSetStatus);

module.exports = router;
