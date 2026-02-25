const express = require('express');
const {
    getStatement,
    getInvestorView,
    getNotifications,
    markNotificationsRead,
    depositFunds,
    withdrawFunds
} = require('../controllers/financialController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/statement', getStatement);
router.get('/investor-view', getInvestorView);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markNotificationsRead);
router.put('/notifications/read/:id', markNotificationsRead);
router.post('/deposit', depositFunds);
router.post('/withdraw', withdrawFunds);

module.exports = router;
