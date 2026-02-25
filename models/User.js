const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String, select: false },
    walletAddress: { type: String, unique: true, lowercase: true, sparse: true },
    nonce: { type: String, default: () => Math.floor(Math.random() * 1000000).toString() },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    kycStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'rejected'],
        default: 'unverified'
    },
    kycDetails: {
        fullName: String,
        dob: Date,
        documentType: { type: String, enum: ['Passport', 'ID_Card', 'Drivers_License'] },
        documentNumber: String
    },
    kycDocument: String, // Filename of the uploaded ID photo
    kycRejectionReason: String,
    walletBalance: {
        type: Number,
        default: 0
    },
    totalEarned: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', UserSchema);