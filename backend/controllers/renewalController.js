const db = require('../config/db');

/**
 * Calculates the dynamic renewal status based on days remaining.
 * @param {Date|string} expirationDate 
 * @returns {object} { days_remaining, status }
 */
const calculateRenewalStatus = (expirationDate) => {
    if (!expirationDate) return { days_remaining: null, status: 'Unknown' };
    
    // We treat the "current date" as the start of the day in local time for consistent calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    
    const diffTime = expDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status = 'ACTIVE';
    if (daysRemaining < 0) {
        status = 'EXPIRED';
    } else if (daysRemaining <= 60) {
        status = 'EXPIRING_SOON';
    }
    
    return { days_remaining: daysRemaining, status };
};

/**
 * GET /api/renewals/my
 * Retrieves all permits for the authenticated business owner, 
 * attaching dynamic expiration statuses and checking for active renewal applications.
 */
const getMyPermitRenewals = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Fetch permits joining business info. Only permits owned by this user.
        // Also left join applications to detect active renewals.
        const [rows] = await db.query(
            `SELECT p.id as permit_id, p.permit_number, p.permit_name, p.issue_date, p.expiration_date, p.status as permit_status,
                    b.id as business_id, b.business_name,
                    a.id as active_renewal_id, a.status as renewal_application_status, a.application_number
             FROM permits p
             JOIN businesses b ON p.business_id = b.id
             LEFT JOIN applications a ON a.business_id = b.id 
                AND a.application_type = 'RENEWAL' 
                AND a.status NOT IN ('APPROVED', 'REJECTED', 'CANCELLED')
             WHERE b.user_id = ?
             ORDER BY p.expiration_date ASC`,
            [userId]
        );
        
        const summary = {
            totalPermits: rows.length,
            activePermits: 0,
            expiringSoon: 0,
            expiredPermits: 0
        };
        
        const permits = rows.map(row => {
            const { days_remaining, status } = calculateRenewalStatus(row.expiration_date);
            
            if (status === 'ACTIVE') summary.activePermits++;
            if (status === 'EXPIRING_SOON') summary.expiringSoon++;
            if (status === 'EXPIRED') summary.expiredPermits++;
            
            return {
                ...row,
                days_remaining,
                renewal_status: status
            };
        });
        
        res.json({ summary, permits });
    } catch (error) {
        console.error('getMyPermitRenewals error:', error);
        res.status(500).json({ message: 'Unable to retrieve your permit renewals.' });
    }
};

/**
 * GET /api/admin/renewals
 * Retrieves municipality-wide permits with renewal monitoring.
 * Accessible only by lgu_admin and system_admin.
 */
const getAdminRenewalMonitoring = async (req, res) => {
    try {
        const role = req.user.role;
        if (!['lgu_admin', 'system_admin'].includes(role)) {
            return res.status(403).json({ message: 'Access denied: Requires administrative privileges.' });
        }
        
        const [rows] = await db.query(
            `SELECT p.id as permit_id, p.permit_number, p.permit_name, p.issue_date, p.expiration_date, p.status as permit_status,
                    b.id as business_id, b.business_name,
                    u.full_name as owner_name,
                    a.id as active_renewal_id, a.status as renewal_application_status, a.application_number
             FROM permits p
             JOIN businesses b ON p.business_id = b.id
             JOIN users u ON b.user_id = u.id
             LEFT JOIN applications a ON a.business_id = b.id 
                AND a.application_type = 'RENEWAL' 
                AND a.status NOT IN ('APPROVED', 'REJECTED', 'CANCELLED')
             ORDER BY p.expiration_date ASC`
        );
        
        const summary = {
            totalPermits: rows.length,
            activePermits: 0,
            expiringSoon: 0,
            expiredPermits: 0,
            renewalsInProgress: 0
        };
        
        const permits = rows.map(row => {
            const { days_remaining, status } = calculateRenewalStatus(row.expiration_date);
            
            if (status === 'ACTIVE') summary.activePermits++;
            if (status === 'EXPIRING_SOON') summary.expiringSoon++;
            if (status === 'EXPIRED') summary.expiredPermits++;
            if (row.active_renewal_id) summary.renewalsInProgress++;
            
            return {
                ...row,
                days_remaining,
                renewal_status: status
            };
        });
        
        res.json({ summary, permits });
    } catch (error) {
        console.error('getAdminRenewalMonitoring error:', error);
        res.status(500).json({ message: 'Unable to retrieve municipality-wide permit renewals.' });
    }
};

module.exports = {
    getMyPermitRenewals,
    getAdminRenewalMonitoring,
    calculateRenewalStatus
};
