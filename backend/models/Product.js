const mongoose = require("mongoose");

const product_schema = mongoose.Schema({
    name: String,
    category: String,
    description: String,
    price: Number,
    quantity: Number
});

const Product = mongoose.model("Product", product_schema);

module.exports = Product;
