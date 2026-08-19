const db = require('../config/db');

/**
 * Log an action to the audit logs table.
 * 
 * @param {Number} userId - The ID of the user performing the action
 * @param {String} userName - The name of the user performing the action
 * @param {String} userRole - The role of the user performing the action
 * @param {String} action - A short description of the action (e.g., 'User Login', 'Create Permit')
 * @param {String} details - Additional details about the action
 * @param {String} ipAddress - The IP address of the request
 */
const logAudit = async (userId, userName, userRole, action, details, ipAddress = '') => {
    try {
        await db.query(
            'INSERT INTO audit_logs (user_id, user_name, user_role, action, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, userName, userRole, action, details, ipAddress]
        );
    } catch (error) {
        console.error('Failed to write to audit log:', error);
    }
};

module.exports = { logAudit };
