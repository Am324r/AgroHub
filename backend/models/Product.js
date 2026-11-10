const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "Name is required"], trim: true },
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: {
                values: ["sheep", "grass", "seedling"],
                message: "Category must be sheep, grass or seedling"
            }
        },
        description: { type: String, trim: true, default: "" },
        price: { type: Number, required: [true, "Price is required"], min: [0, "Price cannot be negative"] },
        quantity: { type: Number, required: [true, "Quantity is required"], min: [0, "Quantity cannot be negative"] }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
