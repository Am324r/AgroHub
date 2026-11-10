const mongoose = require("mongoose");
const express = require("express");
const productRoutes = require("./routes/products");

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("Welcome to AgroHub!"));
app.use("/api/products", productRoutes);

// Express 5 forwards rejected async handlers here
app.use((err, req, res, next) => {
  const status = err.name === "ValidationError" || err.name === "CastError" ? 400 : 500;
  res.status(status).json({ message: err.message });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    app.listen(process.env.PORT || 3000, () => console.log("Server running"));
  })
  .catch((err) => console.error("MongoDB connection error:", err));