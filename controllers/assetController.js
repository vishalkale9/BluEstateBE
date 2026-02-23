const Asset = require('../models/Asset');

// @desc    Create new asset
// @route   POST /api/assets
// @access  Private/Admin
exports.createAsset = async (req, res) => {
    try {
        // req.files is populated by multer
        const imagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const assetData = {
            ...req.body,
            images: imagePaths,
            owner: req.user.id // Link to the admin who created it
        };

        const asset = await Asset.create(assetData);

        res.status(201).json({
            success: true,
            data: asset
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get all assets
// @route   GET /api/assets
// @access  Public
exports.getAssets = async (req, res) => {
    try {
        const assets = await Asset.find();

        res.status(200).json({
            success: true,
            count: assets.length,
            data: assets
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get single asset
// @route   GET /api/assets/:id
// @access  Public
exports.getAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        res.status(200).json({
            success: true,
            data: asset
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};
