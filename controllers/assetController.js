const Asset = require('../models/Asset');

/**
 * @desc    Create new asset
 * @route   POST /api/assets
 * @access  Private/Admin
 */
exports.createAsset = async (req, res) => {
    try {
        const images = req.files ? req.files.map(file => file.filename) : [];

        if (images.length === 0) {
            return res.status(400).json({ success: false, message: 'Please upload at least one image' });
        }

        // Parse array fields if they come as strings (common in multipart/form-data)
        const parseArray = (input) => {
            if (typeof input === 'string') return input.split(',').map(item => item.trim()).filter(i => i);
            return input || [];
        };

        const amenities = parseArray(req.body.amenities);
        const nearbyLandmarks = parseArray(req.body.nearbyLandmarks);
        const projectHighlights = parseArray(req.body.projectHighlights);

        // Extract coordinates if present in separate fields (lat, lng)
        const coordinates = {
            lat: req.body['coordinates[lat]'] || req.body.lat,
            lng: req.body['coordinates[lng]'] || req.body.lng
        };

        const assetData = {
            ...req.body,
            amenities,
            nearbyLandmarks,
            projectHighlights,
            coordinates: (coordinates.lat && coordinates.lng) ? coordinates : undefined,
            images,
            owner: req.user.id
        };

        const asset = await Asset.create(assetData);

        res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            data: asset
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message || 'Server Error'
        });
    }
};

/**
 * @desc    Get all assets
 * @route   GET /api/assets
 * @access  Public
 */
exports.getAssets = async (req, res) => {
    try {
        const queryObj = { ...req.query };
        const excludeFields = ['page', 'sort', 'limit', 'fields'];
        excludeFields.forEach(param => delete queryObj[param]);

        const assets = await Asset.find(queryObj);

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

/**
 * @desc    Get single asset
 * @route   GET /api/assets/:id
 * @access  Public
 */
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

/**
 * @desc    Update asset
 * @route   PUT /api/assets/:id
 * @access  Private/Admin
 */
exports.updateAsset = async (req, res) => {
    try {
        let asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        // Handle image updates
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.filename);
            req.body.images = [...asset.images, ...newImages];
        }

        // Parse array fields if updated
        const parseArray = (input) => {
            if (typeof input === 'string') return input.split(',').map(item => item.trim()).filter(i => i);
            return input;
        };

        if (req.body.amenities) req.body.amenities = parseArray(req.body.amenities);
        if (req.body.nearbyLandmarks) req.body.nearbyLandmarks = parseArray(req.body.nearbyLandmarks);
        if (req.body.projectHighlights) req.body.projectHighlights = parseArray(req.body.projectHighlights);

        // Handle coordinates update
        if (req.body['coordinates[lat]'] || req.body['coordinates[lng]'] || req.body.lat || req.body.lng) {
            req.body.coordinates = {
                lat: req.body['coordinates[lat]'] || req.body.lat || (asset.coordinates ? asset.coordinates.lat : 0),
                lng: req.body['coordinates[lng]'] || req.body.lng || (asset.coordinates ? asset.coordinates.lng : 0)
            };
        }

        asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: asset
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * @desc    Delete asset
 * @route   DELETE /api/assets/:id
 * @access  Private/Admin
 */
exports.deleteAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        await asset.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Asset removed successfully',
            data: {}
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};
