const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        "privacy_concern",
        "inappropriate_camera",
        "prohibited_area",
        "business_misrepresentation",
        "other",
      ],
      required: true,
    },
    detail: String,
    status: {
      type: String,
      enum: ["open", "in_review", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
