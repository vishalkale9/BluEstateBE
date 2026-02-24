const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const bcrypt = require("bcryptjs");

// Helper: Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d',
    });
};

/**
 * @desc    Get current user profile (To check if wallet is linked)
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Traditional Signup (Web2-first)
 * @route   POST /api/auth/register
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Explicitly check for existing user to provide better error message
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: "User already exists with this email" });
        }

        const user = await User.create({ name, email, password });
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, walletAddress: user.walletAddress }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Traditional Login
 * @route   POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, walletAddress: user.walletAddress }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Step 1: Get Nonce for the current logged-in user
 * @route   GET /api/auth/nonce
 * @access  Private (Since it's for linking in the profile dropdown)
 */
exports.getNonce = async (req, res) => {
    try {
        // Since user is logged in via Email, we use req.user.id
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.status(200).json({ success: true, nonce: user.nonce });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Step 2: Verify & Link Wallet to current account
 * @route   POST /api/auth/link-wallet
 * @access  Private
 */
exports.linkWallet = async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;
        const address = walletAddress.toLowerCase();

        // 1. Verify that this wallet isn't already used by someone else
        const walletUsed = await User.findOne({ walletAddress: address });
        if (walletUsed && walletUsed._id.toString() !== req.user.id) {
            return res.status(400).json({ success: false, message: "This wallet is already linked to another account" });
        }

        const user = await User.findById(req.user.id);
        const msg = `Verify your wallet ownership for BluEstate: ${user.nonce}`;

        // 2. Cryptographic Verification
        const recoveredAddress = ethers.verifyMessage(msg, signature);

        if (recoveredAddress.toLowerCase() !== address) {
            return res.status(401).json({ success: false, message: "Signature verification failed" });
        }

        // 3. Update User Record
        user.walletAddress = address;
        user.nonce = Math.floor(Math.random() * 1000000).toString(); // Rotate nonce for security
        await user.save();

        res.status(200).json({
            success: true,
            message: "Wallet successfully linked",
            user: { id: user._id, name: user.name, email: user.email, walletAddress: user.walletAddress }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Unlink Wallet (Disconnect logic)
 * @route   DELETE /api/auth/unlink-wallet
 * @access  Private
 */
exports.unlinkWallet = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.walletAddress = undefined; // Remove the link
        await user.save();

        res.status(200).json({ success: true, message: "Wallet unlinked successfully" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
