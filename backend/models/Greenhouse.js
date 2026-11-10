const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        seedling: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        phone: {
            type: String,
            required: true
        },

        notes: {
            type: String,
            maxlength: 1000
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
        },

        durationMonths: {
            type: Number,
            required: true,
            min: 1,
            max: 24
        },

        proposedShare: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },

        expectedMonthlyPrice: Number,

        agreedShare: Number,

        agreedMonthlyPrice: Number,

        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "cancelled"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

const greenhouseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        size: {
            type: Number,
            required: true,
            min: 0.01
        },

        monthlyPrice: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ["available", "busy", "maintenance"],
            default: "available"
        },

        rentals: [rentalSchema]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Greenhouse", greenhouseSchema);