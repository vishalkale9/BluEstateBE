const express = require('express');
const {
    listSharesForSale,
    getMarketListings,
    buyFromMarket,
    cancelListing
} = require('../controllers/secondaryMarketController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Publicly viewable market
router.get('/market', getMarketListings);

// Trading actions require protection
router.post('/list', protect, listSharesForSale);
router.post('/buy/:listingId', protect, buyFromMarket);
router.delete('/cancel/:id', protect, cancelListing);

module.exports = router;
