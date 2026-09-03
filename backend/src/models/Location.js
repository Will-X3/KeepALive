const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    // GeoJSON Point: coordinates are [lng, lat] — note the order, it trips
    // everyone up at least once. Enables real $near / $geoWithin queries.
    geo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    timezone: { type: String, required: true },
    hours: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["draft", "live", "paused", "suspended"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true }
);

locationSchema.index({ geo: "2dsphere" });

module.exports = mongoose.model("Location", locationSchema);
