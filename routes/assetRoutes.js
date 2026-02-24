const express = require('express');
const multer = require('multer');
const path = require('path');
const {
    createAsset,
    getAssets,
    getAsset,
    updateAsset,
    deleteAsset
} = require('../controllers/assetController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Multer Config for Local Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `asset-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File filter to ensure only images are uploaded
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('Please upload only images'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter
});

// Public Routes
router.get('/', getAssets);
router.get('/:id', getAsset);

// Admin Only Routes
router.post('/', protect, authorize('admin'), upload.array('images', 5), createAsset);
router.put('/:id', protect, authorize('admin'), upload.array('images', 5), updateAsset);
router.delete('/:id', protect, authorize('admin'), deleteAsset);

module.exports = router;
