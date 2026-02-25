const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['KYC_UPDATE', 'TRANSACTION_SUCCESS', 'YIELD_CREDITED', 'MARKET_ALERT', 'SYSTEM'],
        default: 'SYSTEM'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: String
}, {
    timestamps: true
});

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
