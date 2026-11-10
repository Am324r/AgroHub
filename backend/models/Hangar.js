const mongoose = require('mongoose');
const percent = { type: Number, required: true, min: 0, max: 100 };
const rentalSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sheepCount: { type: Number, required: true, min: 1, validate: Number.isInteger },
    phone: { type: String, required: true },
    notes: { type: String, maxlength: 1000, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationMonths: { type: Number, required: true, min: 1, max: 24, validate: Number.isInteger },
    feeding: { type: Boolean, required: true },
    monthlyPrice: { type: Number, required: true, min: 0 },
    caretakerPercent: percent,
    feedingPercent: percent,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'], default: 'pending' },
    totalProfit: Number,
    farmProfitShare: Number,
    customerProfitShare: Number,
    totalRent: Number
}, { timestamps: true });
module.exports = mongoose.model('Hangar', new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    maxSheep: { type: Number, required: true, min: 1, validate: Number.isInteger },
    monthlyPrice: { type: Number, required: true, min: 0 },
    caretakerPercent: percent,
    feedingPercent: percent,
    status: { type: String, enum: ['available', 'busy', 'maintenance'], default: 'available' },
    rentals: [rentalSchema]
}, { timestamps: true }));
