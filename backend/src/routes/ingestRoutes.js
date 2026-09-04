const express = require("express");
const { heartbeat, reportEvent, reportBlurHealth } = require("../controllers/ingestController");
const { requireIngestKey } = require("../middleware/ingestAuth");

const router = express.Router();

router.post("/heartbeat", requireIngestKey, heartbeat);
router.post("/event", requireIngestKey, reportEvent);
router.post("/blur-health", requireIngestKey, reportBlurHealth);

module.exports = router;
