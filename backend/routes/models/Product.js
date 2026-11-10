const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ["sheep", "grass", "seedling"] },
    description: { type: String, default: "", trim: true },
    unit: { type: String, default: "piece" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);