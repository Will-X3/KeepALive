const asyncHandler = require("express-async-handler");
const Category = require("../models/Category");
const Location = require("../models/Location");

// @route  GET /api/categories
// @access Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

// @route  POST /api/categories
// @access Private (admin only)
const createCategory = asyncHandler(async (req, res) => {
  const { name, slug } = req.body;

  if (!name || !slug) {
    res.status(400);
    throw new Error("name and slug are required");
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    res.status(400);
    throw new Error("slug must be lowercase, alphanumeric, and hyphens only");
  }

  const existing = await Category.findOne({ $or: [{ name }, { slug }] });
  if (existing) {
    res.status(409);
    throw new Error("Category name or slug already exists");
  }

  const category = await Category.create({ name, slug });
  res.status(201).json(category);
});

// @route  DELETE /api/categories/:id
// @access Private (admin only)
const deleteCategory = asyncHandler(async (req, res) => {
  const inUse = await Location.countDocuments({ categoryId: req.params.id });
  if (inUse > 0) {
    res.status(409);
    throw new Error("Cannot delete a category that has locations assigned to it");
  }

  const deleted = await Category.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404);
    throw new Error("Category not found");
  }

  res.status(204).send();
});

module.exports = { getCategories, createCategory, deleteCategory };
