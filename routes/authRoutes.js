const express = require("express");
const {
    register,
    login,
    getNonce,
    linkWallet,
    unlinkWallet,
    getMe
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Public Routes
router.post("/register", register);
router.post("/login", login);

// Private Routes (Logged-in users only)
router.get("/me", protect, getMe);
router.get("/nonce", protect, getNonce); // Get nonce for the logged-in user
router.post("/link-wallet", protect, linkWallet);
router.delete("/unlink-wallet", protect, unlinkWallet);

module.exports = router;
