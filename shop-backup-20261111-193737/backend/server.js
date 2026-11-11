require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");

const productRoutes = require("./routes/products");
const authRoutes = require("./routes/auth");
const contractRoutes = require("./routes/contracts");
const greenhouseRoutes = require("./routes/greenhouses");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/agrohub";

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing. Add it to backend/.env");
    process.exit(1);
}

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Welcome to AgroHub!");
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/greenhouses", greenhouseRoutes);
app.use("/api/hangars", require("./routes/hangars"));

// Central error handler
app.use((err, req, res, next) => {
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map(
            (error) => error.message
        );

        return res.status(400).json({
            message: messages.join(", ")
        });
    }

    if (err.code === 11000) {
        return res.status(400).json({
            message: "That email is already registered"
        });
    }

    console.error(err);

    res.status(500).json({
        message: "Server error"
    });
});


mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    });
    
