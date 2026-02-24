const mongoose = require('mongoose');

const secondaryListingSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    sharesForSale: {
        type: Number,
        required: [true, 'Please specify shares for sale'],
        min: [0, 'Must sell at least 0 shares']
    },
    pricePerShare: {
        type: Number,
        required: [true, 'Please specify price per share']
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index for fast searching by asset
secondaryListingSchema.index({ asset: 1, status: 1 });

module.exports = mongoose.model('SecondaryListing', secondaryListingSchema);
