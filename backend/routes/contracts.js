const express = require("express");
const mongoose = require("mongoose");
const Contract = require("../models/Contract");
const Product = require("../models/Product");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth); // every contract route needs a login

function validateId(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid contract id" });
    }
    next();
}

// Customers see their own contracts, admins see all
router.get("/", async (req, res) => {
    const filter = req.user.role === "admin" ? {} : { customer: req.user.id };
    const contracts = await Contract.find(filter)
        .populate("customer", "name email")
        .sort({ createdAt: -1 });
    res.json(contracts);
});

// Customer requests a contract
router.post("/", async (req, res) => {
    if (req.user.role !== "customer") {
        return res.status(403).json({ message: "Only customers can request contracts" });
    }

    const { productId, notes } = req.body;
    const sheepCount = Number(req.body.sheepCount);
    const durationMonths = Number(req.body.durationMonths);

    if (!Number.isInteger(sheepCount) || sheepCount < 1) {
        return res.status(400).json({ message: "Sheep count must be a whole number, at least 1" });
    }
    if (!Number.isInteger(durationMonths)) {
        return res.status(400).json({ message: "Duration must be a whole number of months" });
    }
    if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: "Choose a sheep product" });
    }

    const product = await Product.findById(productId);
    if (!product || product.category !== "sheep") {
        return res.status(400).json({ message: "Choose a valid sheep product" });
    }

    const contract = await Contract.create({
        customer: req.user.id,
        product: product._id,
        productName: product.name,
        pricePerSheep: product.price,
        sheepCount,
        durationMonths,
        totalInvestment: product.price * sheepCount,
        notes
    });

    res.status(201).json(contract);
});

// Load a contract and check its current status before changing it
async function loadWithStatus(req, res, allowedStatus) {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
        res.status(404).json({ message: "Contract not found" });
        return null;
    }
    if (contract.status !== allowedStatus) {
        res.status(400).json({ message: `Contract is ${contract.status}, expected ${allowedStatus}` });
        return null;
    }
    return contract;
}

// Admin: approve a pending contract (optionally set the customer's profit share)
router.patch("/:id/approve", requireAdmin, validateId, async (req, res) => {
    const contract = await loadWithStatus(req, res, "pending");
    if (!contract) return;

    if (req.body.customerSharePercent !== undefined) {
        contract.customerSharePercent = Number(req.body.customerSharePercent);
    }
    contract.status = "active";
    contract.startDate = new Date();
    await contract.save(); // runs validators (share must be 0-100)
    res.json(contract);
});

// Admin: reject a pending contract
router.patch("/:id/reject", requireAdmin, validateId, async (req, res) => {
    const contract = await loadWithStatus(req, res, "pending");
    if (!contract) return;

    contract.status = "rejected";
    await contract.save();
    res.json(contract);
});

// Admin: complete an active contract and split the profit
router.patch("/:id/complete", requireAdmin, validateId, async (req, res) => {
    const totalProfit = Number(req.body.totalProfit);
    if (!Number.isFinite(totalProfit) || totalProfit < 0) {
        return res.status(400).json({ message: "Total profit must be a number, 0 or more" });
    }

    const contract = await loadWithStatus(req, res, "active");
    if (!contract) return;

    contract.totalProfit = totalProfit;
    contract.customerShare = (totalProfit * contract.customerSharePercent) / 100;
    contract.farmShare = totalProfit - contract.customerShare;
    contract.status = "completed";
    contract.completedAt = new Date();
    await contract.save();
    res.json(contract);
});

// Customer: cancel their own pending contract
router.patch("/:id/cancel", validateId, async (req, res) => {
    const contract = await loadWithStatus(req, res, "pending");
    if (!contract) return;

    if (String(contract.customer) !== req.user.id) {
        return res.status(403).json({ message: "You can only cancel your own contracts" });
    }
    contract.status = "cancelled";
    await contract.save();
    res.json(contract);
});

module.exports = router;
