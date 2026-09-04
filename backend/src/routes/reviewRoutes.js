const express = require("express");
const {
  getAvailableTags,
  submitReview,
  getReviewSummary,
} = require("../controllers/reviewController");

const router = express.Router();

router.get("/locations/:locationId/reviews/tags", getAvailableTags);
router.get("/locations/:locationId/reviews/summary", getReviewSummary);
router.post("/locations/:locationId/reviews", submitReview);

module.exports = router;
