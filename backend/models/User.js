const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "Name is required"], trim: true },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Email is not valid"]
        },
        password: { type: String, required: true }, // stored as a bcrypt hash
        role: { type: String, enum: ["customer", "admin"], default: "customer" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
