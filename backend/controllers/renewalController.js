const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const emailService = require('../services/emailService');

/**
 * Calculates the dynamic renewal status based on statutory Philippine Law:
 * Republic Act No. 7160 (Local Government Code of 1991) Sections 167 & 168:
 * - All business permits expire on December 31.
 * - Legal renewal window is January 1 to January 20.
 * - Past January 20, a 25% surcharge + 2% monthly interest (up to 72% max) applies.
 *
 * @param {Date|string} expirationDate 
 * @returns {object} Detailed statutory status
 */
const calculateRenewalStatus = (expirationDate) => {
    if (!expirationDate) return { days_remaining: null, status: 'Unknown', statutory_stage: 'UNKNOWN' };
    
    // Normalize to midnight local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    
    const diffTime = expDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Statutory Deadline: January 20 of succeeding year
    const expYear = expDate.getFullYear();
    const statutoryDeadline = new Date(expYear + 1, 0, 20); // January 20 of (expYear + 1)
    statutoryDeadline.setHours(0, 0, 0, 0);

    const deadlineDiff = statutoryDeadline.getTime() - today.getTime();
    const daysUntilDeadline = Math.ceil(deadlineDiff / (1000 * 60 * 60 * 24));

    let status = 'ACTIVE';
    let statutoryStage = 'ACTIVE';
    let surchargeRate = 0;
    let monthlyInterestRate = 0;
    let monthsLate = 0;

    if (daysRemaining < 0) {
        status = 'EXPIRED';
        if (today <= statutoryDeadline) {
            // Expired on Dec 31, but currently within the Jan 1 - Jan 20 statutory renewal window!
            statutoryStage = 'RENEWAL_WINDOW';
        } else {
            // Past January 20 -> Delinquent under RA 7160 Sec. 168
            statutoryStage = 'DELINQUENT';
            surchargeRate = 0.25; // 25% statutory surcharge
            const msPastDeadline = today.getTime() - statutoryDeadline.getTime();
            monthsLate = Math.max(1, Math.ceil(msPastDeadline / (1000 * 60 * 60 * 24 * 30)));
            // 2% per month or fraction thereof, capped at 72% (36 months) under RA 7160 Sec. 168
            monthlyInterestRate = Math.min(0.72, Math.round(monthsLate * 0.02 * 100) / 100);
        }
    } else if (daysRemaining <= 60) {
        status = 'EXPIRING_SOON';
        statutoryStage = 'EXPIRING_SOON';
    }

    return {
        days_remaining: daysRemaining,
        days_until_deadline: daysUntilDeadline,
        status,
        statutory_stage: statutoryStage,
        surcharge_rate: surchargeRate,
        monthly_interest_rate: monthlyInterestRate,
        months_late: monthsLate,
        statutory_deadline: statutoryDeadline.toISOString().split('T')[0]
    };
};

/**
 * GET /api/renewals/my
 * Retrieves all permits for the authenticated business owner.
 */
const getMyPermitRenewals = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [rows] = await db.query(
            `SELECT p.id as permit_id, p.permit_number, p.permit_name, p.issue_date, p.expiration_date, p.status as permit_status,
                    b.id as business_id, b.business_name,
                    a.id as active_renewal_id, a.status as renewal_application_status, a.application_number
             FROM permits p
             JOIN businesses b ON p.business_id = b.id
             LEFT JOIN applications a ON a.business_id = b.id 
                AND a.application_type = 'RENEWAL' 
                AND a.status NOT IN ('APPROVED', 'REJECTED')
             WHERE b.user_id = ?
             ORDER BY p.expiration_date ASC`,
            [userId]
        );
        
        const summary = {
            totalPermits: rows.length,
            activePermits: 0,
            expiringSoon: 0,
            expiredPermits: 0,
            delinquentPermits: 0
        };
        
        const permits = rows.map(row => {
            const stat = calculateRenewalStatus(row.expiration_date);
            
            if (stat.status === 'ACTIVE') summary.activePermits++;
            if (stat.status === 'EXPIRING_SOON') summary.expiringSoon++;
            if (stat.status === 'EXPIRED') summary.expiredPermits++;
            if (stat.statutory_stage === 'DELINQUENT') summary.delinquentPermits++;
            
            return {
                ...row,
                ...stat,
                renewal_status: stat.status
            };
        });
        
        res.json({ summary, permits });
    } catch (error) {
        console.error('getMyPermitRenewals error:', error);
        res.status(500).json({ message: 'Unable to retrieve your permit renewals.' });
    }
};

/**
 * GET /api/renewals/admin
 * Retrieves municipality-wide permits with statutory renewal radar.
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
                    b.id as business_id, b.business_name, b.business_type, b.capitalization, b.gross_sales,
                    u.id as user_id, u.full_name as owner_name, u.email as owner_email, u.contact_number as owner_contact,
                    a.id as active_renewal_id, a.status as renewal_application_status, a.application_number
             FROM permits p
             JOIN businesses b ON p.business_id = b.id
             JOIN users u ON b.user_id = u.id
             LEFT JOIN applications a ON a.business_id = b.id 
                AND a.application_type = 'RENEWAL' 
                AND a.status NOT IN ('APPROVED', 'REJECTED')
             ORDER BY p.expiration_date ASC`
        );
        
        const summary = {
            totalPermits: rows.length,
            activePermits: 0,
            expiringSoon: 0,
            renewalWindow: 0,
            delinquentPermits: 0,
            renewalsInProgress: 0
        };
        
        const permits = rows.map(row => {
            const stat = calculateRenewalStatus(row.expiration_date);
            
            if (stat.statutory_stage === 'ACTIVE') summary.activePermits++;
            if (stat.statutory_stage === 'EXPIRING_SOON') summary.expiringSoon++;
            if (stat.statutory_stage === 'RENEWAL_WINDOW') summary.renewalWindow++;
            if (stat.statutory_stage === 'DELINQUENT') summary.delinquentPermits++;
            if (row.active_renewal_id) summary.renewalsInProgress++;

            // Rough penalty estimate basis if gross sales or capital available
            let estimatedTaxBasis = parseFloat(row.gross_sales || row.capitalization || 0);
            let estimatedTax = estimatedTaxBasis > 0 ? estimatedTaxBasis * 0.01 : 1000; // baseline 1% or nominal ₱1000
            let estimatedPenalty = 0;
            if (stat.statutory_stage === 'DELINQUENT') {
                const surchargeAmount = estimatedTax * stat.surcharge_rate;
                const interestAmount = estimatedTax * stat.monthly_interest_rate;
                estimatedPenalty = Math.round((surchargeAmount + interestAmount) * 100) / 100;
            }
            
            return {
                ...row,
                ...stat,
                renewal_status: stat.status,
                estimated_penalty: estimatedPenalty
            };
        });
        
        res.json({ summary, permits });
    } catch (error) {
        console.error('getAdminRenewalMonitoring error:', error);
        res.status(500).json({ message: 'Unable to retrieve municipality-wide permit renewals.' });
    }
};

/**
 * POST /api/renewals/admin/send-notice/:permitId
 * Dispatches a statutory LGU notice to a specific business owner.
 */
const sendStatutoryNotice = async (req, res) => {
    try {
        const role = req.user.role;
        if (!['lgu_admin', 'system_admin'].includes(role)) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { permitId } = req.params;
        const { custom_message } = req.body || {};

        const [rows] = await db.query(
            `SELECT p.id as permit_id, p.permit_number, p.expiration_date,
                    b.business_name,
                    u.id as user_id, u.full_name as owner_name, u.email as owner_email
             FROM permits p
             JOIN businesses b ON p.business_id = b.id
             JOIN users u ON b.user_id = u.id
             WHERE p.id = ?`,
            [permitId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Permit record not found.' });
        }

        const permit = rows[0];
        const stat = calculateRenewalStatus(permit.expiration_date);
        const todayStr = new Date().toISOString().split('T')[0];

        let noticeTitle = 'Annual Business Permit Renewal Reminder';
        let noticeBody = `Official notice from Roxas City BPLO: Your permit (${permit.permit_number || 'N/A'}) for ${permit.business_name} expires on December 31. Please prepare your renewal requirements on PermitEase.`;

        if (stat.statutory_stage === 'RENEWAL_WINDOW') {
            noticeTitle = 'Action Required: Annual Renewal Window (Jan 1 - 20)';
            noticeBody = `Official notice from Roxas City BPLO: The legal renewal window is currently open. You have ${stat.days_until_deadline} day(s) until January 20 to renew without penalty under RA 7160.`;
        } else if (stat.statutory_stage === 'DELINQUENT') {
            noticeTitle = 'Statutory Delinquency Notice — Late Renewal Surcharge Active';
            noticeBody = `Official notice from Roxas City BPLO: Your permit for ${permit.business_name} has passed the statutory January 20 deadline. Under RA 7160 Section 168, a 25% surcharge + 2% monthly interest currently applies. Please renew immediately to avoid business closure proceedings.`;
        }

        if (custom_message && custom_message.trim()) {
            noticeBody = custom_message.trim();
        }

        const eventKey = `BPLO_STATUTORY_NOTICE:${permit.permit_id}:${todayStr}`;

        // Insert notification
        const [notifResult] = await db.query(
            `INSERT IGNORE INTO notifications 
             (user_id, type, title, message, event_key, related_permit_id, status)
             VALUES (?, 'RENEWAL_REMINDER', ?, ?, ?, ?, 'Unread')`,
            [permit.user_id, noticeTitle, noticeBody, eventKey, permit.permit_id]
        );

        // Send email via emailService
        let emailSent = false;
        try {
            emailSent = await emailService.sendStatutoryNoticeEmail({
                userEmail: permit.owner_email,
                userName: permit.owner_name,
                businessName: permit.business_name,
                permitNumber: permit.permit_number,
                expirationDate: permit.expiration_date ? new Date(permit.expiration_date).toLocaleDateString('en-PH') : 'Dec 31',
                noticeTitle,
                noticeBody,
                statutoryStage: stat.statutory_stage,
                daysUntilDeadline: stat.days_until_deadline
            });
        } catch (mailErr) {
            console.warn('[sendStatutoryNotice] Email delivery error:', mailErr.message);
        }

        // Audit Log
        await logAudit(
            req.user.id,
            req.user.full_name,
            req.user.role,
            'Send Statutory Notice',
            `Issued ${stat.statutory_stage} notice for permit ${permit.permit_number} (${permit.business_name})`,
            req.ip
        );

        res.json({
            success: true,
            message: `Official notice sent to ${permit.owner_email}`,
            email_sent: emailSent,
            notice_title: noticeTitle
        });
    } catch (error) {
        console.error('sendStatutoryNotice error:', error);
        res.status(500).json({ message: 'Unable to send statutory notice.' });
    }
};

/**
 * POST /api/renewals/admin/send-bulk-notices
 * Dispatches statutory notices in batch to all businesses matching a target stage.
 */
const sendBulkStatutoryNotices = async (req, res) => {
    try {
        const role = req.user.role;
        if (!['lgu_admin', 'system_admin'].includes(role)) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { target_stage } = req.body;
        if (!['EXPIRING_SOON', 'RENEWAL_WINDOW', 'DELINQUENT'].includes(target_stage)) {
            return res.status(400).json({ message: 'Invalid target stage. Must be EXPIRING_SOON, RENEWAL_WINDOW, or DELINQUENT.' });
        }

        const [rows] = await db.query(
            `SELECT p.id as permit_id, p.permit_number, p.expiration_date,
                    b.business_name,
                    u.id as user_id, u.full_name as owner_name, u.email as owner_email
             FROM permits p
             JOIN businesses b ON p.business_id = b.id
             JOIN users u ON b.user_id = u.id`
        );

        let sentCount = 0;
        let skippedCount = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        for (const permit of rows) {
            const stat = calculateRenewalStatus(permit.expiration_date);
            if (stat.statutory_stage !== target_stage) continue;

            const eventKey = `BPLO_BULK_NOTICE:${permit.permit_id}:${todayStr}`;

            let noticeTitle = 'Statutory Renewal Notice';
            let noticeBody = `Official notice from Roxas City BPLO: Annual renewal deadline is January 20 per RA 7160. Please file via PermitEase.`;

            if (target_stage === 'DELINQUENT') {
                noticeTitle = 'Statutory Delinquency Notice — RA 7160 Late Surcharge Active';
                noticeBody = `Official notice from Roxas City BPLO: Your permit for ${permit.business_name} has passed the statutory January 20 deadline. A 25% surcharge + 2% monthly interest is currently active under RA 7160 Section 168. Please file your renewal immediately.`;
            } else if (target_stage === 'RENEWAL_WINDOW') {
                noticeTitle = 'Annual Renewal Window Active (Deadline: January 20)';
                noticeBody = `Official notice from Roxas City BPLO: The legal renewal window is active. You have ${stat.days_until_deadline} day(s) until January 20 to renew without penalty.`;
            }

            const [result] = await db.query(
                `INSERT IGNORE INTO notifications 
                 (user_id, type, title, message, event_key, related_permit_id, status)
                 VALUES (?, 'RENEWAL_REMINDER', ?, ?, ?, ?, 'Unread')`,
                [permit.user_id, noticeTitle, noticeBody, eventKey, permit.permit_id]
            );

            if (result.affectedRows > 0) {
                sentCount++;
                emailService.sendStatutoryNoticeEmail({
                    userEmail: permit.owner_email,
                    userName: permit.owner_name,
                    businessName: permit.business_name,
                    permitNumber: permit.permit_number,
                    expirationDate: permit.expiration_date ? new Date(permit.expiration_date).toLocaleDateString('en-PH') : 'Dec 31',
                    noticeTitle,
                    noticeBody,
                    statutoryStage: stat.statutory_stage,
                    daysUntilDeadline: stat.days_until_deadline
                }).catch(e => console.warn('[bulkEmail] Error:', e.message));
            } else {
                skippedCount++;
            }
        }

        await logAudit(
            req.user.id,
            req.user.full_name,
            req.user.role,
            'Send Bulk Statutory Notices',
            `Dispatched ${sentCount} bulk notices for stage ${target_stage}`,
            req.ip
        );

        res.json({
            success: true,
            sent_count: sentCount,
            skipped_count: skippedCount,
            message: `Dispatched ${sentCount} notice(s) to ${target_stage.replace('_', ' ')} businesses.`
        });
    } catch (error) {
        console.error('sendBulkStatutoryNotices error:', error);
        res.status(500).json({ message: 'Unable to process bulk statutory notices.' });
    }
};

module.exports = {
    getMyPermitRenewals,
    getAdminRenewalMonitoring,
    calculateRenewalStatus,
    sendStatutoryNotice,
    sendBulkStatutoryNotices
};
