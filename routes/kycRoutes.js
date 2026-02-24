const express = require('express');
const multer = require('multer');
const path = require('path');
const {
    submitKYC,
    getKYCList,
    verifyUser
} = require('../controllers/kycController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Multer Config for KYC Documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Reusing existing uploads folder
    },
    filename: (req, file, cb) => {
        cb(null, `kyc-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for high-res ID photos
});

// Middleware: All KYC routes require login
router.use(protect);

// User: Submit KYC
router.post('/submit', upload.single('document'), submitKYC);

// Admin: Management
router.get('/list', authorize('admin'), getKYCList);
router.put('/verify/:id', authorize('admin'), verifyUser);

module.exports = router;
