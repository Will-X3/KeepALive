const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["business_owner", "admin"],
      default: "business_owner",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
