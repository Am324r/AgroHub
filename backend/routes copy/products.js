const express = require("express");
const Product = require("../models/Product");
const router = express.Router();

const FIELDS = ["name", "category", "description", "unit", "price", "stock", "active"];
const pick = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

router.get("/", async (req, res) => {
  const filter = { active: true };
  if (req.query.category) filter.category = req.query.category;
  res.json(await Product.find(filter));
});

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

router.post("/", async (req, res) => {
  const product = await Product.create(pick(req.body));
  res.status(201).json(product);
});

router.patch("/:id", async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, pick(req.body), {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

router.delete("/:id", async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Deleted" });
});

module.exports = router;