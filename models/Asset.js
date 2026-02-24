const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    location: {
        type: String,
        required: [true, 'Please add a location']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    totalShares: {
        type: Number,
        required: [true, 'Please add total shares']
    },
    availableShares: {
        type: Number,
        required: [true, 'Please add available shares']
    },
    tokenPrice: {
        type: Number,
        required: [true, 'Please add token price']
    },
    apr: {
        type: Number,
        required: [true, 'Please add the expected annual percentage return (APR)']
    },
    category: {
        type: String,
        required: [true, 'Please specify a category'],
        enum: ['Residential', 'Commercial', 'Industrial', 'Land', 'Villas']
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    amenities: {
        type: [String],
        default: []
    },
    area: {
        type: Number,
        required: [true, 'Please specify the area in sq ft']
    },
    images: {
        type: [String], // Array of local file paths
        default: []
    },
    status: {
        type: String,
        enum: ['available', 'sold', 'fully_funded'],
        default: 'available'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Asset', assetSchema);
