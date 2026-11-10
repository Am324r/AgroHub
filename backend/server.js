require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");
const productRoutes = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/agrohub";

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Welcome to AgroHub!");
});

app.use("/api/products", productRoutes);

// Central error handler
app.use((err, req, res, next) => {
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ message: messages.join(", ") });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
});

// Only start listening once MongoDB is connected
mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
        app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    });
