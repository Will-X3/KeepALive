const express = require("express");
const {
  createCamera,
  listCamerasForLocation,
  listMyCameras,
  getCamera,
  rotateIngestKey,
  updatePrivacyConfig,
  deleteCamera,
} = require("../controllers/cameraController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Nested under a location: POST /api/locations/:locationId/cameras
router.post("/locations/:locationId/cameras", protect, createCamera);
router.get("/locations/:locationId/cameras", protect, listCamerasForLocation);

// Cross-location monitor — must come before /cameras/:id or "mine" gets
// captured as the :id param.
router.get("/cameras/mine", protect, listMyCameras);

// Camera-specific: /api/cameras/:id/...
router.get("/cameras/:id", protect, getCamera);
router.post("/cameras/:id/rotate-key", protect, rotateIngestKey);
router.patch("/cameras/:id/privacy", protect, updatePrivacyConfig);
router.delete("/cameras/:id", protect, deleteCamera);

module.exports = router;
