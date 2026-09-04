const express = require("express");
const {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  updateBusiness,
  updateBusinessStatus,
  updateBusinessSettings,
} = require("../controllers/businessController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("business_owner", "admin"), createBusiness);
router.get("/mine", protect, authorize("business_owner", "admin"), getMyBusinesses);
router.get("/:id", protect, getBusinessById);
router.patch("/:id", protect, updateBusiness);
router.patch("/:id/settings", protect, updateBusinessSettings);
router.patch("/:id/status", protect, authorize("admin"), updateBusinessStatus);

module.exports = router;
