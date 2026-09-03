const express = require("express");
const {
  getCategories,
  createCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", getCategories);
router.post("/", protect, authorize("admin"), createCategory);
router.delete("/:id", protect, authorize("admin"), deleteCategory);

module.exports = router;
