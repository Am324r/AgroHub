// Run once:  node seedAdmin.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

async function main() {
    if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");

    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/agrohub");

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        existing.role = "admin";
        await existing.save();
        console.log("Existing user promoted to admin:", email);
    } else {
        await User.create({
            name: "Admin",
            email,
            password: await bcrypt.hash(password, 10),
            role: "admin"
        });
        console.log("Admin created:", email);
    }
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
