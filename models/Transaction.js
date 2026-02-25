const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['Deposit', 'Withdrawal', 'Primary_Purchase', 'Secondary_Purchase', 'Secondary_Sale', 'Rent_Yield'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
    },
    shares: {
        type: Number,
        default: 0
    },
    description: String,
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId // Can be Investment ID or Listing ID
    },
    transactionHash: String
}, {
    timestamps: true
});

// Index for fast statement generation
transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
