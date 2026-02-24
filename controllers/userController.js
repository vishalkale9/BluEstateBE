const User = require('../models/User');

/**
 * @desc    Get all users with stats
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().sort('-createdAt');

        // Calculate Stats for the Admin Header
        const totalUsers = users.length;
        const verifiedUsers = users.filter(u => u.kycStatus === 'verified').length;
        const pendingKYC = users.filter(u => u.kycStatus === 'pending').length;
        const admins = users.filter(u => u.role === 'admin').length;

        res.status(200).json({
            success: true,
            summary: {
                totalUsers,
                verifiedUsers,
                pendingKYC,
                admins
            },
            count: users.length,
            data: users
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get single user details
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Update user role or status
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res) => {
    try {
        const { role, kycStatus } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role, kycStatus },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            data: {}
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
