const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
    return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// Anyone can register, but always as a customer
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role: "customer" });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase() });

    // Same message for unknown email and wrong password
    const ok = user && (await bcrypt.compare(String(password || ""), user.password));
    if (!ok) return res.status(401).json({ message: "Wrong email or password" });

    res.json({ token: signToken(user), user: publicUser(user) });
});

// Restore the logged-in user from a saved token
router.get("/me", requireAuth, async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    res.json({ user: publicUser(user) });
});

module.exports = router;