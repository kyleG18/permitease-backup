const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { logAudit } = require('../services/auditService');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { full_name, contact_number } = req.body;
        
        if (!full_name || !contact_number) {
            return res.status(400).json({ message: 'Please provide full name and contact number' });
        }

        await db.query('UPDATE users SET full_name = ?, contact_number = ? WHERE id = ?', [full_name, contact_number, req.user.id]);
        
        await logAudit(req.user.id, full_name, req.user.role, 'Profile Update', 'User updated their profile information', req.ip);
        
        res.json({ message: 'Profile updated successfully', full_name });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Update user password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ message: 'Please provide current and new password' });
        }

        const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        
        if (!await bcrypt.compare(current_password, users[0].password)) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
        
        await logAudit(req.user.id, req.user.full_name, req.user.role, 'Password Change', 'User changed their password', req.ip);
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { updateProfile, updatePassword };
