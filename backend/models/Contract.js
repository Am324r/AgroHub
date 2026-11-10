const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
    {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },          // snapshot, in case the product changes
        pricePerSheep: { type: Number, required: true, min: 0 }, // snapshot
        sheepCount: { type: Number, required: true, min: [1, "At least 1 sheep"] },
        durationMonths: { type: Number, required: true, min: [1, "At least 1 month"], max: [24, "At most 24 months"] },
        totalInvestment: { type: Number, required: true, min: 0 },
        notes: { type: String, trim: true, default: "" },

        status: {
            type: String,
            enum: ["pending", "active", "completed", "rejected", "cancelled"],
            default: "pending"
        },
        customerSharePercent: { type: Number, min: 0, max: 100, default: 50 },
        startDate: Date,

        // filled in when the admin completes the contract
        totalProfit: { type: Number, min: 0 },
        customerShare: Number,
        farmShare: Number,
        completedAt: Date
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contract", contractSchema);
