const db = require('../config/db');

// @desc    Get system reports summary
// @route   GET /api/reports/summary
// @access  System Admin, LGU Admin
const getReportsSummary = async (req, res) => {
    try {
        const [[{ total_businesses }]] = await db.query('SELECT COUNT(*) as total_businesses FROM businesses');
        const [[{ total_permits }]] = await db.query('SELECT COUNT(*) as total_permits FROM permits');
        const [[{ active_permits }]] = await db.query('SELECT COUNT(*) as active_permits FROM permits WHERE status = "Approved" AND (expiration_date >= CURDATE() OR expiration_date IS NULL)');
        const [[{ expired_permits }]] = await db.query('SELECT COUNT(*) as expired_permits FROM permits WHERE status = "Expired" OR (status = "Approved" AND expiration_date < CURDATE())');
        
        // Count by business type
        const [businessesByType] = await db.query('SELECT business_type, COUNT(*) as count FROM businesses GROUP BY business_type');
        
        // Count by permit status
        const [permitsByStatus] = await db.query('SELECT status, COUNT(*) as count FROM permits GROUP BY status');

        // Total Assessments Run
        const [[{ total_assessments }]] = await db.query('SELECT COUNT(*) as total_assessments FROM assessments');

        res.json({
            overview: {
                total_businesses,
                total_permits,
                active_permits,
                expired_permits,
                total_assessments
            },
            businesses_by_type: businessesByType,
            permits_by_status: permitsByStatus
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

module.exports = { getReportsSummary };
