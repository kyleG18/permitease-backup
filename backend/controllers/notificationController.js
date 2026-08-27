const db = require('../config/db');

// @desc    Get all notifications for authenticated user (with RBAC ownership)
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const [notifications] = await db.query(
            `SELECT id, type, title, message, status, related_application_id, related_permit_id, email_sent, email_sent_at, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 100`,
            [req.user.id]
        );
        res.json(notifications);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get unread notification count for the authenticated user
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
    try {
        const [[row]] = await db.query(
            `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND status = 'Unread'`,
            [req.user.id]
        );
        res.json({ count: row.count });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Mark single notification as read (ownership enforced)
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        await db.query(
            `UPDATE notifications SET status = 'Read' WHERE id = ? AND user_id = ?`,
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Mark ALL notifications as read (ownership enforced via user_id)
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
    try {
        await db.query(
            `UPDATE notifications SET status = 'Read' WHERE user_id = ?`,
            [req.user.id]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Delete a notification (ownership enforced)
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
    try {
        await db.query(
            `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
