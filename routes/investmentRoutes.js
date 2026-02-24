const express = require('express');
const {
    investInAsset,
    getMyPortfolio,
    getGlobalSales
} = require('../controllers/investmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Middleware: All investment actions require a valid login token
router.use(protect);

// Investor Routes
router.post('/buy', investInAsset);
router.get('/portfolio', getMyPortfolio);

// Administrative Analytics
router.get('/all', authorize('admin'), getGlobalSales);

module.exports = router;
