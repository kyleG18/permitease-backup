/**
 * notificationService.js
 * 
 * Centralized service for creating internal notifications and triggering emails.
 * 
 * DESIGN RULES:
 *  - The internal notification record is ALWAYS created, even if email fails.
 *  - Email failures are logged but do NOT throw exceptions back to callers.
 *  - event_key provides duplicate protection; INSERT IGNORE prevents duplicate rows.
 *  - user_id ownership is enforced at the controller level; here we trust the caller
 *    has already resolved the correct user_id.
 */

const db = require('../config/db');
const emailService = require('./emailService');

/**
 * Core helper: Create an internal notification + send email.
 * Uses INSERT IGNORE on event_key to prevent duplicates.
 *
 * @param {Object} opts
 * @param {number}  opts.userId
 * @param {string}  opts.type            - e.g. 'APPLICATION_SUBMITTED'
 * @param {string}  opts.title
 * @param {string}  opts.message
 * @param {string}  opts.eventKey        - UNIQUE key to prevent duplicate notifications
 * @param {number}  [opts.relatedApplicationId]
 * @param {number}  [opts.relatedPermitId]
 * @param {Function} opts.emailFn        - async fn that returns boolean (was sent)
 * @returns {Promise<{created: boolean, emailSent: boolean}>}
 */
const createNotification = async ({
    userId,
    type,
    title,
    message,
    eventKey,
    relatedApplicationId = null,
    relatedPermitId = null,
    emailFn = null
}) => {
    let created = false;
    let emailSent = false;

    try {
        // INSERT IGNORE means if event_key already exists, nothing is inserted
        const [result] = await db.query(
            `INSERT IGNORE INTO notifications 
             (user_id, type, title, message, event_key, related_application_id, related_permit_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Unread')`,
            [userId, type, title, message, eventKey, relatedApplicationId, relatedPermitId]
        );

        created = result.affectedRows > 0;

        if (!created) {
            // Already exists — skip email to prevent duplicates
            return { created: false, emailSent: false };
        }

        const insertId = result.insertId;

        // Send email if a function was provided
        if (emailFn) {
            try {
                emailSent = await emailFn();
            } catch (emailErr) {
                console.error('[NotificationService] Email function failed:', emailErr.message);
                emailSent = false;
            }

            // Update the email delivery status on the notification record
            await db.query(
                `UPDATE notifications SET email_sent = ?, email_sent_at = ? WHERE id = ?`,
                [emailSent ? 1 : 0, emailSent ? new Date() : null, insertId]
            ).catch(e => console.error('[NotificationService] Failed to update email_sent:', e.message));
        }

    } catch (err) {
        console.error('[NotificationService] createNotification error:', err.message);
    }

    return { created, emailSent };
};

// ─────────────────────────────────────────────────────────
// Specific notification creators for each application event
// ─────────────────────────────────────────────────────────

const notifyApplicationSubmitted = async (app, user, business) => {
    const submittedAt = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    return createNotification({
        userId: user.id,
        type: 'APPLICATION_SUBMITTED',
        title: 'Application Submitted',
        message: `Your application ${app.application_number} for ${business.business_name} has been submitted successfully.`,
        eventKey: `APP_SUBMITTED:${app.id}`,
        relatedApplicationId: app.id,
        emailFn: () => emailService.sendApplicationSubmittedEmail({
            userEmail: user.email,
            userName: user.full_name,
            businessName: business.business_name,
            applicationNumber: app.application_number,
            applicationType: app.application_type,
            submittedAt
        })
    });
};

const notifyApplicationUnderReview = async (app, user, business) => {
    return createNotification({
        userId: user.id,
        type: 'APPLICATION_UNDER_REVIEW',
        title: 'Application Under Review',
        message: `Your application ${app.application_number} is now being reviewed by the LGU.`,
        eventKey: `APP_UNDER_REVIEW:${app.id}`,
        relatedApplicationId: app.id,
        emailFn: () => emailService.sendApplicationUnderReviewEmail({
            userEmail: user.email,
            userName: user.full_name,
            businessName: business.business_name,
            applicationNumber: app.application_number
        })
    });
};

const notifyCorrectionRequested = async (app, user, business, correctionNotes) => {
    return createNotification({
        userId: user.id,
        type: 'CORRECTION_REQUESTED',
        title: 'Correction Required',
        message: `Your application ${app.application_number} requires corrections. Notes: ${correctionNotes || 'See PermitEase for details.'}`,
        eventKey: `APP_CORRECTION:${app.id}:${Date.now()}`, // allow repeated corrections
        relatedApplicationId: app.id,
        emailFn: () => emailService.sendCorrectionRequestedEmail({
            userEmail: user.email,
            userName: user.full_name,
            businessName: business.business_name,
            applicationNumber: app.application_number,
            correctionNotes
        })
    });
};

const notifyApplicationApproved = async (app, user, business, permit) => {
    const expirationDisplay = permit?.expiration_date
        ? new Date(permit.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;
    return createNotification({
        userId: user.id,
        type: 'APPLICATION_APPROVED',
        title: 'Application Approved',
        message: `Congratulations! Your application ${app.application_number} has been approved. Permit ${permit?.permit_number || ''} has been issued.`,
        eventKey: `APP_APPROVED:${app.id}`,
        relatedApplicationId: app.id,
        relatedPermitId: permit?.id || null,
        emailFn: () => emailService.sendApplicationApprovedEmail({
            userEmail: user.email,
            userName: user.full_name,
            businessName: business.business_name,
            applicationNumber: app.application_number,
            permitNumber: permit?.permit_number || null,
            expirationDate: expirationDisplay
        })
    });
};

const notifyApplicationRejected = async (app, user, business, rejectionReason) => {
    return createNotification({
        userId: user.id,
        type: 'APPLICATION_REJECTED',
        title: 'Application Rejected',
        message: `Your application ${app.application_number} has been rejected. Reason: ${rejectionReason || 'See PermitEase for details.'}`,
        eventKey: `APP_REJECTED:${app.id}`,
        relatedApplicationId: app.id,
        emailFn: () => emailService.sendApplicationRejectedEmail({
            userEmail: user.email,
            userName: user.full_name,
            businessName: business.business_name,
            applicationNumber: app.application_number,
            rejectionReason
        })
    });
};

const notifyPermitIssued = async (permit, user, business) => {
    const expirationDisplay = permit.expiration_date
        ? new Date(permit.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;
    return createNotification({
        userId: user.id,
        type: 'PERMIT_ISSUED',
        title: 'Permit Issued',
        message: `Your business permit ${permit.permit_number} has been issued. It is valid until ${expirationDisplay}.`,
        eventKey: `PERMIT_ISSUED:${permit.id}`,
        relatedPermitId: permit.id,
        emailFn: () => emailService.sendPermitIssuedEmail({
            userEmail: user.email,
            userName: user.full_name,
            businessName: business.business_name,
            permitNumber: permit.permit_number,
            verificationCode: permit.verification_code,
            expirationDate: expirationDisplay
        })
    });
};

// ─────────────────────────────────────────────────────────
// Renewal reminder notifications (called by renewal reminder service)
// ─────────────────────────────────────────────────────────

const notifyRenewalReminder = async (permit, user, business, daysRemaining) => {
    const thresholdKey = daysRemaining <= 7 ? '7' : daysRemaining <= 30 ? '30' : '60';
    const expirationDisplay = new Date(permit.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    return createNotification({
        userId: user.id,
        type: 'RENEWAL_REMINDER',
        title: `Permit Expiring in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
        message: `Your permit ${permit.permit_number} for ${business.business_name} expires on ${expirationDisplay}. Please initiate renewal.`,
        eventKey: `RENEWAL_${thresholdKey}_DAYS:${permit.id}`,
        relatedPermitId: permit.id,
        emailFn: () => emailService.sendRenewalReminderEmail({
            userEmail: user.email,
            userName: user.full_name,
            businessName: business.business_name,
            permitNumber: permit.permit_number,
            expirationDate: expirationDisplay,
            daysRemaining
        })
    });
};

const notifyPermitExpired = async (permit, user, business) => {
    const expirationDisplay = new Date(permit.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    return createNotification({
        userId: user.id,
        type: 'PERMIT_EXPIRED',
        title: 'Permit Expired',
        message: `Your permit ${permit.permit_number} for ${business.business_name} expired on ${expirationDisplay}. Please renew immediately.`,
        eventKey: `PERMIT_EXPIRED:${permit.id}`,
        relatedPermitId: permit.id,
        emailFn: () => emailService.sendPermitExpiredEmail({
            userEmail: user.email,
            userName: user.full_name,
            businessName: business.business_name,
            permitNumber: permit.permit_number,
            expirationDate: expirationDisplay
        })
    });
};

module.exports = {
    createNotification,
    notifyApplicationSubmitted,
    notifyApplicationUnderReview,
    notifyCorrectionRequested,
    notifyApplicationApproved,
    notifyApplicationRejected,
    notifyPermitIssued,
    notifyRenewalReminder,
    notifyPermitExpired
};
