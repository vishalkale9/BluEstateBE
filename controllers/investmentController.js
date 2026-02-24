const Investment = require('../models/Investment');
const Asset = require('../models/Asset');

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

        // 2. Fetch Asset
        const asset = await Asset.findById(assetId);
        if (!asset) {
            return res.status(404).json({ success: false, message: 'Property listing not found' });
        }

        // 2. Validate Inventory
        if (asset.availableShares < sharesToBuy) {
            return res.status(400).json({
                success: false,
                message: `Insufficient shares available. Only ${asset.availableShares} left.`
            });
        }

        // 3. Financial Calculation
        const totalCost = sharesToBuy * asset.tokenPrice;

        // 4. Update Asset Inventory FIRST (Atomic update)
        asset.availableShares -= sharesToBuy;

        // Auto-update asset status if sold out
        if (asset.availableShares === 0) {
            asset.status = 'sold';
        }

        await asset.save();

        // 5. Create Investment Record
        const investment = await Investment.create({
            user: req.user.id,
            asset: assetId,
            sharesBought: sharesToBuy,
            totalAmount: totalCost,
            status: 'completed'
        });

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
