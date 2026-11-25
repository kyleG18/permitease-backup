/**
 * renewalReminderService.js
 * 
 * Processes permit expiration reminders for all active permits.
 * 
 * Reminder thresholds: 60 days, 30 days, 7 days, and expiration day.
 * 
 * IMPORTANT:
 * - Uses the existing permit expiration dates from the DB (source of truth).
 * - Duplicate protection via event_key (INSERT IGNORE in notificationService).
 * - Email failures do NOT stop the process or remove the notification.
 * - Safe to call repeatedly; idempotent.
 */

const db = require('../config/db');
const notificationService = require('./notificationService');

const REMINDER_THRESHOLDS = [60, 30, 7]; // days before expiration

/**
 * Calculate days remaining until a date (can be negative if expired)
 */
const getDaysRemaining = (expirationDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDate);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
};

/**
 * Process all permit reminder notifications.
 * @returns {Promise<{processed: number, skipped: number, errors: number}>}
 */
const processRenewalReminders = async () => {
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    console.log('[RenewalReminderService] Starting reminder processing...');

    try {
        // Fetch all active (Approved) permits with owner info
        // Use business-specific notification email if set, else fall back to account email
        const [permits] = await db.query(`
            SELECT p.id, p.permit_number, p.expiration_date, p.business_id,
                   b.business_name, b.user_id,
                   COALESCE(b.email, u.email) AS email, u.full_name
            FROM permits p
            JOIN businesses b ON p.business_id = b.id
            JOIN users u ON b.user_id = u.id
            WHERE p.status = 'Approved'
              AND p.expiration_date IS NOT NULL
        `);

        console.log(`[RenewalReminderService] Evaluating ${permits.length} permit(s)...`);

        for (const permit of permits) {
            const daysRemaining = getDaysRemaining(permit.expiration_date);

            const user = { id: permit.user_id, email: permit.email, full_name: permit.full_name };
            const business = { business_name: permit.business_name };

            // Check each reminder threshold
            for (const threshold of REMINDER_THRESHOLDS) {
                if (daysRemaining === threshold) {
                    try {
                        const result = await notificationService.notifyRenewalReminder(permit, user, business, daysRemaining);
                        if (result.created) {
                            processed++;
                            console.log(`[RenewalReminderService] ✅ Sent ${threshold}d reminder for permit ${permit.permit_number} (email: ${result.emailSent})`);
                        } else {
                            skipped++;
                            console.log(`[RenewalReminderService] ⏭  Skipped ${threshold}d reminder for ${permit.permit_number} (already sent)`);
                        }
                    } catch (e) {
                        errors++;
                        console.error(`[RenewalReminderService] ❌ Error for ${permit.permit_number}:`, e.message);
                    }
                }
            }

            // Check for expiration (today is the day of expiration, or past)
            if (daysRemaining <= 0) {
                try {
                    const result = await notificationService.notifyPermitExpired(permit, user, business);
                    if (result.created) {
                        processed++;
                        console.log(`[RenewalReminderService] ✅ Sent EXPIRED notice for permit ${permit.permit_number} (email: ${result.emailSent})`);
                    } else {
                        skipped++;
                    }
                } catch (e) {
                    errors++;
                    console.error(`[RenewalReminderService] ❌ Error (expired) for ${permit.permit_number}:`, e.message);
                }
            }
        }

        // 2. Evaluate Business Registration Expirations (DTI 5-year BN, SEC, CDA, etc.)
        const REG_THRESHOLDS = [90, 60, 30, 7];
        const [regBusinesses] = await db.query(`
            SELECT b.id, b.business_name, b.user_id, b.registration_type, b.registration_number, b.registration_expiry_date,
                   COALESCE(b.email, u.email) AS email, u.full_name
            FROM businesses b
            JOIN users u ON b.user_id = u.id
            WHERE b.registration_expiry_date IS NOT NULL
        `);

        console.log(`[RenewalReminderService] Evaluating ${regBusinesses.length} business registration(s)...`);
        for (const biz of regBusinesses) {
            const daysRemaining = getDaysRemaining(biz.registration_expiry_date);
            const user = { id: biz.user_id, email: biz.email, full_name: biz.full_name };

            if (REG_THRESHOLDS.includes(daysRemaining) || daysRemaining <= 0) {
                try {
                    const result = await notificationService.notifyRegistrationExpiry(biz, user, daysRemaining);
                    if (result.created) processed++;
                    else skipped++;
                } catch (e) {
                    errors++;
                    console.error(`[RenewalReminderService] ❌ Reg expiry error for biz ${biz.id}:`, e.message);
                }
            }
        }

        // 3. Evaluate Supporting Document Expirations (e.g. Lease Contract, DTI cert, Clearances)
        const [expiringDocs] = await db.query(`
            SELECT d.id, d.document_name, d.expiration_date, b.business_name, b.user_id,
                   COALESCE(b.email, u.email) AS email, u.full_name
            FROM documents d
            JOIN businesses b ON d.business_id = b.id
            JOIN users u ON b.user_id = u.id
            WHERE d.expiration_date IS NOT NULL
        `);

        console.log(`[RenewalReminderService] Evaluating ${expiringDocs.length} document expiration(s)...`);
        for (const doc of expiringDocs) {
            const daysRemaining = getDaysRemaining(doc.expiration_date);
            const user = { id: doc.user_id, email: doc.email, full_name: doc.full_name };

            if (REMINDER_THRESHOLDS.includes(daysRemaining) || daysRemaining <= 0) {
                try {
                    const result = await notificationService.notifyDocumentExpiry(doc, user, daysRemaining);
                    if (result.created) processed++;
                    else skipped++;
                } catch (e) {
                    errors++;
                    console.error(`[RenewalReminderService] ❌ Doc expiry error for doc ${doc.id}:`, e.message);
                }
            }
        }

    } catch (err) {
        console.error('[RenewalReminderService] Fatal error:', err.message);
        errors++;
    }

    console.log(`[RenewalReminderService] Done. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
    return { processed, skipped, errors };
};

module.exports = { processRenewalReminders, getDaysRemaining };
