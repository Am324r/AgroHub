const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Only allow these fields from the client (prevents mass assignment)
function pickFields(body) {
    const { name, category, description, price, quantity } = body;
    const data = { name, category, description, price, quantity };
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    return data;
}

function validateId(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid product id" });
    }
    next();
}

// Public: anyone can browse
router.get("/", async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
});

router.get("/:id", validateId, async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
});

// Admin only: create, update, delete
router.post("/", requireAuth, requireAdmin, async (req, res) => {
    const product = await Product.create(pickFields(req.body));
    res.status(201).json(product);
});

router.put("/:id", requireAuth, requireAdmin, validateId, async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, pickFields(req.body), {
        new: true,
        runValidators: true
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
});

router.delete("/:id", requireAuth, requireAdmin, validateId, async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
});

module.exports = router;
