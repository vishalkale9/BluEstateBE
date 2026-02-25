const User = require('../models/User');

/**
 * @desc    Submit KYC details and document
 * @route   POST /api/kyc/submit
 * @access  Private
 */
exports.submitKYC = async (req, res) => {
    try {
        const { fullName, dob, documentType, documentNumber } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an ID document photo' });
        }

        const user = await User.findById(req.user.id);

        if (user.kycStatus === 'verified') {
            return res.status(400).json({ success: false, message: 'User is already verified' });
        }

        user.kycDetails = {
            fullName,
            dob,
            documentType,
            documentNumber
        };
        user.kycDocument = req.file.filename;
        user.kycStatus = 'pending';

        await user.save();

        res.status(200).json({
            success: true,
            message: 'KYC documents submitted successfully. Please wait for admin approval.',
            data: { status: user.kycStatus }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get all pending KYC requests (Admin Only)
 * @route   GET /api/kyc/list
 * @access  Private/Admin
 */
exports.getKYCList = async (req, res) => {
    try {
        const pendingUsers = await User.find({ kycStatus: 'pending' })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: pendingUsers.length,
            data: pendingUsers
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Verify/Approve or Reject KYC (Admin Only)
 * @route   PUT /api/kyc/verify/:id
 * @access  Private/Admin
 */
exports.verifyUser = async (req, res) => {
    try {
        const { status, reason } = req.body; // status: 'verified' or 'rejected'

        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.kycStatus = status;
        if (status === 'rejected' && reason) {
            user.kycRejectionReason = reason;
        }

        await user.save();

        // --- RWA AUDIT: Notification ---
        const { sendNotification } = require('../utils/rwaAudit');
        await sendNotification(
            user._id,
            `KYC ${status.toUpperCase()}`,
            status === 'verified'
                ? 'Congratulations! Your account is now verified and you can start investing.'
                : `Your KYC was rejected. Reason: ${reason || 'Incomplete documents'}. Please resubmit.`,
            'KYC_UPDATE'
        );

        res.status(200).json({
            success: true,
            message: `User KYC has been ${status}`,
            data: { id: user._id, status: user.kycStatus }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
