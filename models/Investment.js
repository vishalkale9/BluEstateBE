const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    sharesBought: {
        type: Number,
        required: [true, 'Please specify the number of shares'],
        min: [1, 'Must buy at least 1 share']
    },
    totalAmount: {
        type: Number,
        required: true
    },
    transactionHash: {
        type: String, // Future Sepolia on-chain verification
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    }
}, {
    timestamps: true
});

// Compound index to speed up portfolio fetching
investmentSchema.index({ user: 1, asset: 1 });

module.exports = mongoose.model('Investment', investmentSchema);
