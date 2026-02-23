const express = require("express");
const {
    register,
    login,
    getNonce,
    verifySignature
} = require("../controllers/authController");

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Traditional Signup (Email/Password)
 */
router.post("/register", register);

/**
 * @route   POST /api/auth/login
 * @desc    Traditional Login (Email/Password)
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/nonce/:walletAddress
 * @desc    Web3 Step 1: Get challenge nonce for MetaMask
 */
router.get("/nonce/:walletAddress", getNonce);

/**
 * @route   POST /api/auth/verify
 * @desc    Web3 Step 2: Verify signature and issue JWT
 */
router.post("/verify", verifySignature);

module.exports = router;
