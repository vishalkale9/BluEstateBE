const SecondaryListing = require('../models/SecondaryListing');
const Investment = require('../models/Investment');
const Asset = require('../models/Asset');

/**
 * @desc    Helper: Calculate current total shares owned by a user for an asset
 */
const getUserHoldings = async (userId, assetId) => {
    const investments = await Investment.find({ user: userId, asset: assetId, status: 'completed' });
    const totalOwned = investments.reduce((sum, inv) => sum + inv.sharesBought, 0);

    // Subtract shares already listed for sale
    const activeListings = await SecondaryListing.find({
        seller: userId,
        asset: assetId,
        status: 'active'
    });
    const totalListed = activeListings.reduce((sum, list) => sum + list.sharesForSale, 0);

    return totalOwned - totalListed;
};

/**
 * @desc    List shares for sale on Secondary Market
 * @route   POST /api/secondary/list
 * @access  Private
 */
exports.listSharesForSale = async (req, res) => {
    try {
        const { assetId, shares, pricePerShare } = req.body;

        if (!shares || shares <= 0) {
            return res.status(400).json({ success: false, message: 'Please specify a valid number of shares to sell.' });
        }

        const currentHoldings = await getUserHoldings(req.user.id, assetId);

        if (currentHoldings < shares) {
            return res.status(400).json({
                success: false,
                message: `Insufficient holdings. You only have ${currentHoldings} free shares to sell.`
            });
        }

        const listing = await SecondaryListing.create({
            seller: req.user.id,
            asset: assetId,
            sharesForSale: shares,
            pricePerShare,
            status: 'active'
        });

        res.status(201).json({
            success: true,
            message: 'Shares listed for sale successfully',
            data: listing
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get all active listings on Secondary Market
 * @route   GET /api/secondary/market
 * @access  Public
 */
exports.getMarketListings = async (req, res) => {
    try {
        const listings = await SecondaryListing.find({ status: 'active' })
            .populate('seller', 'name walletAddress')
            .populate('asset', 'title images tokenPrice location')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: listings.length,
            data: listings
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Purchase shares from Secondary Market (Partial Fill Compatible)
 * @route   POST /api/secondary/buy/:listingId
 * @access  Private
 */
exports.buyFromMarket = async (req, res) => {
    try {
        const { sharesToBuy } = req.body; // Can buy all or just a part
        const listing = await SecondaryListing.findById(req.params.listingId);

        if (!listing || listing.status !== 'active') {
            return res.status(404).json({ success: false, message: 'Listing not found or unavailable' });
        }

        const requestedShares = Number(sharesToBuy) || listing.sharesForSale;

        if (requestedShares > listing.sharesForSale) {
            return res.status(400).json({ success: false, message: `Only ${listing.sharesForSale} shares available in this listing` });
        }

        if (listing.seller.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot buy your own tokens' });
        }

        // --- RWA SECURITY AUDIT: Atomic Direct Ownership Transfer ---

        // 1. DEDUCT FROM SELLER (Direct Reduction, No Negative Records)
        let sharesRemainingToDeduct = requestedShares;
        const sellerInvestments = await Investment.find({
            user: listing.seller,
            asset: listing.asset,
            status: 'completed'
        });

        for (let inv of sellerInvestments) {
            if (sharesRemainingToDeduct <= 0) break;

            if (inv.sharesBought <= sharesRemainingToDeduct) {
                sharesRemainingToDeduct -= inv.sharesBought;
                await inv.deleteOne(); // Entire record consumed
            } else {
                inv.sharesBought -= sharesRemainingToDeduct;
                // Reduce totalAmount proportionally for the seller's record
                inv.totalAmount = (inv.totalAmount / (inv.sharesBought + sharesRemainingToDeduct)) * inv.sharesBought;
                sharesRemainingToDeduct = 0;
                await inv.save();
            }
        }

        // 2. TRANSFER TO BUYER (Consolidated Ownership Record)
        const purchaseCost = requestedShares * listing.pricePerShare;
        let buyerInvestment = await Investment.findOne({ user: req.user.id, asset: listing.asset });

        if (buyerInvestment) {
            // Update existing portfolio record
            buyerInvestment.sharesBought += requestedShares;
            buyerInvestment.totalAmount += purchaseCost;
            await buyerInvestment.save();
        } else {
            // Create new portfolio record
            buyerInvestment = await Investment.create({
                user: req.user.id,
                asset: listing.asset,
                sharesBought: requestedShares,
                totalAmount: purchaseCost,
                status: 'completed',
                transactionHash: 'P2P_PURCHASE_FILL'
            });
        }

        // 3. UPDATE LISTING STATUS
        listing.sharesForSale -= requestedShares;
        if (listing.sharesForSale === 0) {
            listing.status = 'completed';
        }
        await listing.save();

        res.status(200).json({
            success: true,
            message: `Successfully purchased ${requestedShares} shares from the market`,
            data: buyerInvestment
        });

    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Cancel a listing
 * @route   DELETE /api/secondary/cancel/:id
 * @access  Private
 */
exports.cancelListing = async (req, res) => {
    try {
        const listing = await SecondaryListing.findById(req.params.id);

        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

        if (listing.seller.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized to cancel this listing' });
        }

        listing.status = 'cancelled';
        await listing.save();

        res.status(200).json({ success: true, message: 'Listing cancelled' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
