const jwt = require("jsonwebtoken");

// Requires a valid "Authorization: Bearer <token>" header
function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Login required" });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}

// Use after requireAuth
function requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access only" });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
