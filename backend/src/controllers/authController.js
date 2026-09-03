const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @route  POST /api/auth/register
// @access Public — business owner self-registration only. Admin accounts
// are created via the seed script, never through this endpoint.
const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }
  if (password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: "business_owner",
  });

  res.status(201).json({
    token: generateToken(user),
    user: { id: user._id, email: user.email, role: user.role },
  });
});

// @route  POST /api/auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Deliberately identical error for "no such user" and "wrong password" so
  // login can't be used to enumerate registered emails.
  const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    token: generateToken(user),
    user: { id: user._id, email: user.email, role: user.role },
  });
});

// @route  GET /api/auth/me
// @access Private
const getMe = asyncHandler(async (req, res) => {
  // req.user is already the full doc (minus passwordHash) via the protect middleware.
  res.json({ id: req.user._id, email: req.user.email, role: req.user.role });
});

module.exports = { register, login, getMe };
