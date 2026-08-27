const db = require('../config/db');
const { logAudit } = require('../services/auditService');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  System Admin
const getUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, full_name, email, contact_number, role, status, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  System Admin
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['business_owner', 'lgu_admin', 'system_admin'];
        
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Check if updating self (prevent self-demotion out of system_admin)
        if (parseInt(req.params.id) === req.user.id && role !== 'system_admin') {
            return res.status(400).json({ message: 'You cannot remove your own System Admin role.' });
        }

        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
        
        await logAudit(req.user.id, req.user.full_name, req.user.role, 'Update User Role', `Changed user ID ${req.params.id} role to ${role}`, req.ip);
        
        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Update user status (active/inactive)
// @route   PUT /api/admin/users/:id/status
// @access  System Admin
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (status !== 'active' && status !== 'inactive') {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Prevent self-deactivation
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ message: 'You cannot deactivate your own account.' });
        }

        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
        
        await logAudit(req.user.id, req.user.full_name, req.user.role, 'Update User Status', `Changed user ID ${req.params.id} status to ${status}`, req.ip);
        
        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get all audit logs
// @route   GET /api/admin/audit-logs
// @access  System Admin
const getAuditLogs = async (req, res) => {
    try {
        const [logs] = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500');
        res.json(logs);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { getUsers, updateUserRole, updateUserStatus, getAuditLogs };
