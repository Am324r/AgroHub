
const mongoose = require("mongoose");
const express = require("express");
const Product = require("./models/Product");

const app = express();

mongoose.connect("mongodb://127.0.0.1:27017/agrohub");

const connection = mongoose.connection;

connection.on("connected", () => {
    console.log("MongoDB connected successfully");
});

connection.on("error", (err) => {
    console.log("MongoDB connection error:", err);
});

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Welcome to AgroHub!");
});

app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post("/api/products", async (req, res) => {
    try {
        console.log("POST request received:", req.body);
        const newProduct = new Product(req.body);

        await newProduct.save();

        res.json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
