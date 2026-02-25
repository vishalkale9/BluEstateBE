const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const Notification = require('../models/Notification');
const Asset = require('../models/Asset');
const User = require('../models/User');
const { recordTransaction, sendNotification } = require('../utils/rwaAudit');

/**
 * @desc    Get Transaction History (Financial Statement)
 * @route   GET /api/financial/statement
 * @access  Private
 */
exports.getStatement = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id })
            .populate('asset', 'title location')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Deposit Funds into Wallet (Mock Web3/Bank On-ramp)
 * @route   POST /api/financial/deposit
 * @access  Private
 */
exports.depositFunds = async (req, res) => {
    try {
        const { amount, transactionHash } = req.body;
        const depositAmount = Number(amount);

        if (!depositAmount || depositAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Please provide a valid deposit amount' });
        }

        // 1. Update User Balance
        const user = await User.findById(req.user.id);
        user.walletBalance += depositAmount;
        await user.save();

        // 2. Record Transaction Ledger
        const transaction = await recordTransaction({
            user: req.user.id,
            type: 'Deposit',
            amount: depositAmount,
            description: `Deposited funds via Blockchain Wallet`,
            transactionHash: transactionHash || `MOCK_TX_${Date.now()}`
        });

        // 3. Notify User
        await sendNotification(
            req.user.id,
            'Deposit Successful',
            `$${depositAmount.toFixed(2)} has been successfully added to your wallet.`,
            'TRANSACTION_SUCCESS'
        );

        res.status(200).json({
            success: true,
            message: 'Funds deposited successfully',
            newBalance: user.walletBalance,
            transaction
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Withdraw Funds from Wallet
 * @route   POST /api/financial/withdraw
 * @access  Private
 */
exports.withdrawFunds = async (req, res) => {
    try {
        const { amount, walletAddress } = req.body;
        const withdrawAmount = Number(amount);

        const user = await User.findById(req.user.id);

        if (!withdrawAmount || withdrawAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
        }

        if (user.walletBalance < withdrawAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance for withdrawal' });
        }

        // 1. Deduct Balance
        user.walletBalance -= withdrawAmount;
        await user.save();

        // 2. Record Transaction
        const transaction = await recordTransaction({
            user: req.user.id,
            type: 'Withdrawal',
            amount: -withdrawAmount,
            description: `Withdrawal to wallet: ${walletAddress || 'Registered Wallet'}`,
            status: 'completed'
        });

        // 3. Notify User
        await sendNotification(
            req.user.id,
            'Withdrawal Processed',
            `Your withdrawal of $${withdrawAmount.toFixed(2)} has been processed.`,
            'TRANSACTION_SUCCESS'
        );

        res.status(200).json({
            success: true,
            message: 'Withdrawal successful',
            newBalance: user.walletBalance,
            transaction
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get Investor Portfolio Analytics (Advanced Reporting)
 * @route   GET /api/financial/investor-view
 * @access  Private
 */
exports.getInvestorView = async (req, res) => {
    try {
        const investments = await Investment.find({ user: req.user.id }).populate('asset');

        // Logic for "Expert" Reporting - Consolidated by Asset
        let totalInvested = 0;
        let totalCurrentValue = 0;

        // Map to group investments by Asset ID
        const consolidatedMap = new Map();

        for (const inv of investments) {
            const asset = inv.asset;
            if (!asset) continue;

            const assetId = asset._id.toString();
            if (!consolidatedMap.has(assetId)) {
                consolidatedMap.set(assetId, {
                    title: asset.title,
                    shares: 0,
                    totalCost: 0,
                    assetRef: asset
                });
            }

            const data = consolidatedMap.get(assetId);
            data.shares += inv.sharesBought;
            data.totalCost += inv.totalAmount;
            totalInvested += inv.totalAmount;
        }

        // Fetch active listings to show "In-Market" shares
        const SecondaryListing = require('../models/SecondaryListing');
        const activeListings = await SecondaryListing.find({ seller: req.user.id, status: 'active' });

        const assetBreakdown = Array.from(consolidatedMap.values()).map(data => {
            const listing = activeListings.find(l => l.asset.toString() === data.assetRef._id.toString());
            const sharesListed = listing ? listing.sharesForSale : 0;

            const currentAssetPrice = data.assetRef.currentMarketPrice || data.assetRef.tokenPrice;
            const currentValue = data.shares * currentAssetPrice;
            totalCurrentValue += currentValue;
            const netGain = currentValue - data.totalCost;

            return {
                asset: data.title,
                totalShares: data.shares,
                sharesAvailable: data.shares - sharesListed,
                sharesListed: sharesListed,
                initialInvestment: data.totalCost, // What the user actually paid
                avgEntryPrice: data.shares > 0 ? Number((data.totalCost / data.shares).toFixed(2)) : 0,
                currentMarketPrice: currentAssetPrice,
                netGain: Number(netGain.toFixed(2)),
                lastAppraisalDate: data.assetRef.lastAppraisalDate,
                currentEstimate: Number(currentValue.toFixed(2)),
                roi: data.totalCost > 0
                    ? Number(((currentValue / data.totalCost - 1) * 100).toFixed(2)) + '%'
                    : '0%'
            };
        });

        // Fetch Total Rent Earned from Transactions
        const rentTrans = await Transaction.find({
            user: req.user.id,
            type: 'Rent_Yield'
        });
        const totalRentEarned = rentTrans.reduce((sum, tr) => sum + tr.amount, 0);

        res.status(200).json({
            success: true,
            summary: {
                capitalDeployed: totalInvested,
                estimatedPortfolioValue: Number(totalCurrentValue.toFixed(2)),
                totalDividends: totalRentEarned,
                netGain: Number((totalCurrentValue - totalInvested + totalRentEarned).toFixed(2)),
                totalROI: totalInvested > 0
                    ? Number((((totalCurrentValue + totalRentEarned) / totalInvested - 1) * 100).toFixed(2)) + '%'
                    : '0%'
            },
            breakdown: assetBreakdown
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get Notifications
 * @route   GET /api/financial/notifications
 * @access  Private
 */
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id }).sort('-createdAt');
        res.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Mark notifications as read
 * @route   PUT /api/financial/notifications/read/:id?
 * @access  Private
 */
exports.markNotificationsRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (id) {
            // Mark individual notification as read
            await Notification.findOneAndUpdate(
                { _id: id, user: req.user.id },
                { isRead: true }
            );
        } else {
            // Bulk mark all as read
            await Notification.updateMany(
                { user: req.user.id, isRead: false },
                { isRead: true }
            );
        }

        res.status(200).json({ success: true, message: 'Notifications updated' });
    } catch (err) {
        console.error("Notification Update Error:", err);
        res.status(400).json({ success: false, message: err.message });
    }
};
