const Investment = require('../models/Investment');
const Asset = require('../models/Asset');
const User = require('../models/User');

/**
 * @desc    Invest in an asset (Buy Shares/Tokens)
 * @route   POST /api/investments/buy
 * @access  Private
 */
exports.investInAsset = async (req, res) => {
    try {
        const { assetId, shares } = req.body;
        const sharesToBuy = Number(shares);

        if (!sharesToBuy || sharesToBuy <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid number of shares' });
        }

        // 1. Check KYC Status
        if (req.user.kycStatus !== 'verified') {
            return res.status(403).json({
                success: false,
                message: 'Please complete your KYC verification before investing.'
            });
        }

        // 2. Fetch Asset & User for balance check
        const asset = await Asset.findById(assetId);
        const user = await User.findById(req.user.id);

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Property listing not found' });
        }

        const totalCost = sharesToBuy * asset.tokenPrice;

        // 3. Financial Guard: Check Wallet Balance
        if (user.walletBalance < totalCost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. Required: $${totalCost}, Available: $${user.walletBalance}`
            });
        }

        // 4. ATOMIC UPDATE: Asset Inventory (Prevents Race Conditions)
        const updatedAsset = await Asset.findOneAndUpdate(
            { _id: assetId, availableShares: { $gte: sharesToBuy } },
            {
                $inc: { availableShares: -sharesToBuy },
                $set: { status: (asset.availableShares - sharesToBuy === 0) ? 'sold' : 'available' }
            },
            { returnDocument: 'after' }
        );

        if (!updatedAsset) {
            return res.status(400).json({
                success: false,
                message: `Transaction failed: Not enough shares available or concurrent update detected.`
            });
        }

        // 5. ATOMIC UPDATE: User Wallet Deduction
        user.walletBalance -= totalCost;
        await user.save();

        // 6. Consolidate Investment Record (Expert RWA Strategy)
        let investment = await Investment.findOne({ user: req.user.id, asset: assetId });

        if (investment) {
            investment.sharesBought += sharesToBuy;
            investment.totalAmount += totalCost;
            await investment.save();
        } else {
            investment = await Investment.create({
                user: req.user.id,
                asset: assetId,
                sharesBought: sharesToBuy,
                totalAmount: totalCost,
                status: 'completed'
            });
        }


        // --- RWA AUDIT: Transaction Ledger & Notifications ---
        const { recordTransaction, sendNotification } = require('../utils/rwaAudit');

        await recordTransaction({
            user: req.user.id,
            type: 'Primary_Purchase',
            amount: -totalCost, // Outflow
            asset: assetId,
            shares: sharesToBuy,
            description: `Purchased ${sharesToBuy} shares of ${asset.title} (Primary Market)`,
            referenceId: investment._id
        });

        await sendNotification(
            req.user.id,
            'Investment Successful',
            `You have successfully purchased ${sharesToBuy} shares of ${asset.title}.`,
            'TRANSACTION_SUCCESS'
        );

        res.status(201).json({
            success: true,
            message: `Successfully invested in ${asset.title}`,
            data: investment
        });

    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message || 'Investment failed'
        });
    }
};

/**
 * @desc    Get Current User's Portfolio
 * @route   GET /api/investments/portfolio
 * @access  Private
 */
exports.getMyPortfolio = async (req, res) => {
    try {
        const investments = await Investment.find({ user: req.user.id })
            .populate({
                path: 'asset',
                select: 'title location images tokenPrice apr category'
            })
            .sort('-createdAt');

        // Calculate Portfolio Summary Metrics
        const totalInvested = investments.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalShares = investments.reduce((sum, inv) => sum + inv.sharesBought, 0);

        res.status(200).json({
            success: true,
            count: investments.length,
            summary: {
                totalInvested,
                totalShares,
                currency: 'USD'
            },
            data: investments
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * @desc    Get Global Sales Analytics (Admin Only)
 * @route   GET /api/investments/all
 * @access  Private/Admin
 */
exports.getGlobalSales = async (req, res) => {
    try {
        const investments = await Investment.find()
            .populate('user', 'name email walletAddress')
            .populate('asset', 'title price images tokenPrice category')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: investments.length,
            data: investments
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};
