const db = require('../config/db');
const bcrypt = require('bcryptjs');
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

// @desc    Create a new user (admin only — for BPLO personnel, etc.)
// @route   POST /api/admin/users
// @access  System Admin
const createUser = async (req, res) => {
    try {
        const { full_name, email, password, role, contact_number } = req.body;

        if (!full_name || !email || !password || !role) {
            return res.status(400).json({ message: 'Full name, email, password, and role are required.' });
        }

        const validRoles = ['business_owner', 'lgu_admin', 'system_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role.' });
        }

        // Check if email already exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'A user with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, role, contact_number, status) VALUES (?, ?, ?, ?, ?, ?)',
            [full_name, email, hashedPassword, role, contact_number || null, 'active']
        );

        await logAudit(req.user.id, req.user.full_name, req.user.role, 'Create User', `Created user ${email} with role ${role}`, req.ip);

        res.status(201).json({ id: result.insertId, message: 'User created successfully.' });
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

// @desc    Get all audit logs (with optional period and role filters)
// @route   GET /api/admin/audit-logs
// @access  System Admin
const getAuditLogs = async (req, res) => {
    try {
        const { period, role, limit = 500 } = req.query;
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];

        if (role && role !== 'ALL') {
            query += ' AND user_role = ?';
            params.push(role);
        }

        if (period && period !== 'ALL') {
            const p = period.toUpperCase();
            if (p === 'DAY' || p === '1D') {
                query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
            } else if (p === 'WEEK' || p === '1W') {
                query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (p === 'MONTH' || p === '1M') {
                query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            } else if (p === 'YEAR' || p === '1Y') {
                query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            }
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(Math.min(parseInt(limit, 10) || 500, 1000));

        const [logs] = await db.query(query, params);
        res.json(logs);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { getUsers, createUser, updateUserRole, updateUserStatus, getAuditLogs };
