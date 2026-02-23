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

// @desc    Register user (Web2)
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Use create - it will trigger the password hashing middleware in the model
        const user = await User.create({ name, email, password, role });

        const token = generateToken(user._id);
        res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Login user (Web2)
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and include password field
        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(user._id);
        res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Get nonce for Web3 login
// @route   GET /api/auth/nonce/:walletAddress
exports.getNonce = async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const address = walletAddress.toLowerCase();

        let user = await User.findOne({ walletAddress: address });

        if (!user) {
            // Auto-create account for new Web3 users
            user = await User.create({
                name: `Web3User-${address.substring(0, 6)}`,
                walletAddress: address
            });
        }

        res.status(200).json({ success: true, nonce: user.nonce });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Verify signature and login (Web3)
// @route   POST /api/auth/verify
exports.verifySignature = async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;
        const address = walletAddress.toLowerCase();

        const user = await User.findOne({ walletAddress: address });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const msg = `Verify your wallet ownership for BluEstate: ${user.nonce}`;

        // Recover the address from the signature
        const recoveredAddress = ethers.verifyMessage(msg, signature);

        if (recoveredAddress.toLowerCase() !== address) {
            return res.status(401).json({ success: false, message: "Invalid signature" });
        }

        // Important: Update nonce after successful verification to prevent replay attacks
        user.nonce = Math.floor(Math.random() * 1000000).toString();
        await user.save();

        const token = generateToken(user._id);
        res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, walletAddress: user.walletAddress, role: user.role } });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
