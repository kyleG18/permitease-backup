const db = require('../config/db');
const permitGenerator = require('../services/permitGenerator');
const notificationService = require('../services/notificationService');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Generate a unique application number: BP-YYYY-NNNNN
 */
const generateApplicationNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `BP-${year}-`;

    const [rows] = await db.query(
        `SELECT application_number FROM applications 
         WHERE application_number LIKE ? 
         ORDER BY application_number DESC LIMIT 1`,
        [`${prefix}%`]
    );

    let nextSeq = 1;
    if (rows.length > 0) {
        const last = rows[0].application_number;
        const lastSeq = parseInt(last.split('-')[2], 10);
        nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
};

/**
 * Log an event to application_history
 */
const logHistory = async (applicationId, actorUserId, action, oldStatus, newStatus, remarks = null, connection = db) => {
    const executor = connection || db;
    await executor.query(
        `INSERT INTO application_history (application_id, actor_user_id, action, old_status, new_status, remarks)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [applicationId, actorUserId, action, oldStatus || null, newStatus || null, remarks]
    );
};

// ─────────────────────────────────────────────
// BUSINESS OWNER ENDPOINTS
// ─────────────────────────────────────────────

/**
 * GET /api/applications
 * Returns all applications for the authenticated user.
 */
const getMyApplications = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.*, b.business_name, b.business_type
             FROM applications a
             JOIN businesses b ON a.business_id = b.id
             WHERE a.user_id = ?
             ORDER BY a.updated_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Unable to load applications.' });
    }
};

/**
 * GET /api/applications/:id
 * Returns a single application with business profile, requirements, and documents.
 * Owners can only access their own. Admins can access all.
 */
const getApplicationById = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.*, 
                    b.business_name, b.business_type, b.industry_category, b.address,
                    b.employees, b.business_status, b.date_established,
                    b.capitalization, b.gross_sales, b.floor_area,
                    b.ownership_type, b.primary_products, b.premises_type, b.business_characteristics,
                    b.island_group_id, b.region_id, b.province_id, b.city_municipality_id, b.barangay_id,
                    u.full_name AS owner_name, u.email AS owner_email, u.contact_number AS owner_contact,
                    r.full_name AS reviewer_name
             FROM applications a
             JOIN businesses b ON a.business_id = b.id
             JOIN users u ON a.user_id = u.id
             LEFT JOIN users r ON a.reviewed_by = r.id
             WHERE a.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        const app = rows[0];

        // Role-based access check
        const isOwner = app.user_id === req.user.id;
        const isAdmin = ['lgu_admin', 'system_admin'].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'You do not have permission to view this application.' });
        }

        // Load applicable requirements for the business (safely adapt to schema)
        let brCols = new Set();
        try {
            const [cols] = await db.query(`SHOW COLUMNS FROM \`business_requirements\``);
            brCols = new Set(cols.map(c => c.Field));
        } catch (e) {}

        const hasDocId = brCols.has('document_id');
        const hasBplo = brCols.has('bplo_status');
        const docSelect = hasDocId ? 'br.document_id,' : 'NULL AS document_id,';
        const bploSelect = hasBplo
            ? 'br.bplo_status, br.bplo_notes, br.bplo_verified_at,'
            : '"AI Suggested" AS bplo_status, NULL AS bplo_notes, NULL AS bplo_verified_at,';
        const docJoin = hasDocId ? 'LEFT JOIN documents d ON br.document_id = d.id' : '';
        const docFields = hasDocId ? 'd.document_name, d.file_path, d.upload_date' : 'NULL AS document_name, NULL AS file_path, NULL AS upload_date';

        const [requirements] = await db.query(
            `SELECT br.id, br.requirement_id, br.status AS req_status, ${docSelect}
                    ${bploSelect}
                    pr.permit_name, pr.description,
                    ${docFields}
             FROM business_requirements br
             JOIN permit_requirements pr ON br.requirement_id = pr.id
             ${docJoin}
             WHERE br.business_id = ?`,
            [app.business_id]
        );

        // Load all documents for this business
        const [documents] = await db.query(
            `SELECT * FROM documents WHERE business_id = ? ORDER BY upload_date DESC`,
            [app.business_id]
        );

        // Load history
        const [history] = await db.query(
            `SELECT ah.*, u.full_name AS actor_name
             FROM application_history ah
             JOIN users u ON ah.actor_user_id = u.id
             WHERE ah.application_id = ?
             ORDER BY ah.created_at ASC`,
            [app.id]
        );

        res.json({ ...app, requirements, documents, history });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Unable to load application.' });
    }
};

/**
 * POST /api/applications
 * Create a new DRAFT application.
 */
const createDraft = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { business_id, application_type } = req.body;

        if (!business_id || !application_type) {
            await conn.rollback();
            return res.status(400).json({ message: 'Business and application type are required.' });
        }

        if (!['NEW', 'RENEWAL'].includes(application_type)) {
            await conn.rollback();
            return res.status(400).json({ message: 'Application type must be NEW or RENEWAL.' });
        }

        // Verify business belongs to this user
        const [biz] = await conn.query(
            'SELECT id, business_name FROM businesses WHERE id = ? AND user_id = ?',
            [business_id, req.user.id]
        );
        if (biz.length === 0) {
            await conn.rollback();
            return res.status(403).json({ message: 'Business not found or does not belong to you.' });
        }

        // Prevent duplicate active application creation - use SELECT FOR UPDATE to lock rows
        let existingApps = [];
        if (application_type === 'RENEWAL') {
            const [rows] = await conn.query(
                `SELECT id, status FROM applications 
                 WHERE business_id = ? AND application_type = 'RENEWAL' 
                 AND status NOT IN ('APPROVED', 'REJECTED') 
                 AND user_id = ? FOR UPDATE`,
                [business_id, req.user.id]
            );
            existingApps = rows;
        } else {
            const [rows] = await conn.query(
                `SELECT id, status FROM applications 
                 WHERE business_id = ? AND application_type = 'NEW' 
                 AND status NOT IN ('APPROVED', 'REJECTED') 
                 AND user_id = ? FOR UPDATE`,
                [business_id, req.user.id]
            );
            existingApps = rows;
        }

        if (existingApps.length > 0) {
            await conn.rollback();
            return res.status(200).json({
                id: existingApps[0].id,
                message: 'Existing active application recovered.',
                status: existingApps[0].status
            });
        }

        const [result] = await conn.query(
            `INSERT INTO applications (user_id, business_id, application_type, status)
             VALUES (?, ?, ?, 'DRAFT')`,
            [req.user.id, business_id, application_type]
        );

        // Log history
        await logHistory(result.insertId, req.user.id, 'Application Created', null, 'DRAFT', null, conn);

        await conn.commit();

        res.status(201).json({
            id: result.insertId,
            message: 'Draft application created successfully.',
            status: 'DRAFT'
        });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ message: 'Unable to create application. Please try again.' });
    } finally {
        conn.release();
    }
};

/**
 * POST /api/applications/:id/submit
 * Submit a DRAFT or NEEDS_CORRECTION application.
 */
const submitApplication = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT a.*, b.business_name, b.business_type, b.address, b.industry_category
             FROM applications a JOIN businesses b ON a.business_id = b.id
             WHERE a.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: 'Application not found.' });
        }

        const app = rows[0];

        // Authorization
        if (app.user_id !== req.user.id) {
            await conn.rollback();
            return res.status(403).json({ message: 'You do not have permission to submit this application.' });
        }

        // Must be DRAFT or NEEDS_CORRECTION to submit
        if (!['DRAFT', 'NEEDS_CORRECTION'].includes(app.status)) {
            await conn.rollback();
            return res.status(400).json({ message: 'This application has already been submitted.' });
        }

        // Validate business has required info
        if (!app.business_name || !app.business_type || !app.address) {
            await conn.rollback();
            return res.status(400).json({ message: 'Please complete the required business information before submitting.' });
        }

        // Validate that all mandatory requirements have documents submitted
        let hasDocIdInBr = false;
        try {
            const [cols] = await conn.query(`SHOW COLUMNS FROM \`business_requirements\` LIKE 'document_id'`);
            hasDocIdInBr = cols.length > 0;
        } catch (e) {}
        const docIdClause = hasDocIdInBr ? 'br.document_id' : 'NULL as document_id';

        const [requirements] = await conn.query(
            `SELECT pr.id, pr.permit_name, br.status as req_status, ${docIdClause}
             FROM business_requirements br
             JOIN permit_requirements pr ON br.requirement_id = pr.id
             WHERE br.business_id = ? AND (pr.is_mandatory = 1 OR pr.is_mandatory IS NULL)`,
            [app.business_id]
        );

        const missingRequirements = requirements.filter(r => 
            r.req_status !== 'Submitted' && r.req_status !== 'Approved' && !r.document_id
        );

        if (missingRequirements.length > 0) {
            await conn.rollback();
            const missingNames = missingRequirements.map(r => r.permit_name).join(', ');
            return res.status(400).json({ 
                message: `Cannot submit: missing required documents for ${missingNames}. Please upload all required documents before submitting.` 
            });
        }

        // Generate application number if not yet assigned
        let appNumber = app.application_number;
        if (!appNumber) {
            appNumber = await generateApplicationNumber();
        }

        const oldStatus = app.status;
        const isResubmission = oldStatus === 'NEEDS_CORRECTION';

        await conn.query(
            `UPDATE applications 
             SET status = 'SUBMITTED', application_number = ?, submitted_at = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [appNumber, app.id]
        );

        const historyAction = isResubmission ? 'Application Resubmitted' : 'Application Submitted';
        await conn.query(
            `INSERT INTO application_history (application_id, actor_user_id, action, old_status, new_status)
             VALUES (?, ?, ?, ?, 'SUBMITTED')`,
            [app.id, req.user.id, historyAction, oldStatus]
        );

        await conn.commit();

        // Fire-and-forget: email + rich notification (after commit so email failure can't affect the transaction)
        const userRow = [{ id: req.user.id, email: req.user.email, full_name: req.user.full_name }];
        const [ownerRows] = await db.query('SELECT id, email, full_name FROM users WHERE id = ?', [req.user.id]);
        if (ownerRows.length > 0) {
            notificationService.notifyApplicationSubmitted(
                { id: app.id, application_number: appNumber, application_type: app.application_type },
                ownerRows[0],
                { business_name: app.business_name }
            ).catch(e => console.error('[notify] submitted failed:', e.message));
        }

        res.json({
            id: app.id,
            application_number: appNumber,
            business_name: app.business_name,
            application_type: app.application_type,
            status: 'SUBMITTED',
            message: 'Your application has been submitted for LGU review.'
        });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ message: 'Unable to submit application. Please try again.' });
    } finally {
        conn.release();
    }
};

// ─────────────────────────────────────────────
// LGU ADMIN ENDPOINTS
// ─────────────────────────────────────────────

/**
 * GET /api/admin/applications
 * Returns all applications for LGU review.
 */
const getAllApplications = async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT a.*, b.business_name, b.business_type,
                   u.full_name AS owner_name, u.email AS owner_email
            FROM applications a
            JOIN businesses b ON a.business_id = b.id
            JOIN users u ON a.user_id = u.id
        `;
        const params = [];

        if (status && status !== 'ALL') {
            query += ' WHERE a.status = ?';
            params.push(status);
        } else {
            // Default: show all non-draft
            query += ` WHERE a.status != 'DRAFT'`;
        }

        query += ' ORDER BY a.updated_at DESC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Unable to load applications.' });
    }
};

/**
 * POST /api/admin/applications/:id/start-review
 */
const startReview = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
        if (rows.length === 0) { await conn.rollback(); return res.status(404).json({ message: 'Application not found.' }); }

        const app = rows[0];
        if (app.status !== 'SUBMITTED') {
            await conn.rollback();
            return res.status(400).json({ message: `Cannot start review. Application is ${app.status}.` });
        }

        await conn.query(
            `UPDATE applications SET status = 'UNDER_REVIEW', reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [req.user.id, app.id]
        );

        await conn.query(
            `INSERT INTO application_history (application_id, actor_user_id, action, old_status, new_status)
             VALUES (?, ?, 'Review Started', 'SUBMITTED', 'UNDER_REVIEW')`,
            [app.id, req.user.id]
        );

        await conn.commit();

        // Fire-and-forget email + rich notification
        const [ownerRowsReview] = await db.query(
            'SELECT u.id, u.email, u.full_name, b.business_name FROM users u JOIN businesses b ON b.user_id = u.id WHERE u.id = ? LIMIT 1',
            [app.user_id]
        );
        if (ownerRowsReview.length > 0) {
            notificationService.notifyApplicationUnderReview(
                { id: app.id, application_number: app.application_number },
                ownerRowsReview[0],
                { business_name: ownerRowsReview[0].business_name }
            ).catch(e => console.error('[notify] under-review failed:', e.message));
        }

        res.json({ message: 'Review started.', status: 'UNDER_REVIEW' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ message: 'Unable to start review. Please try again.' });
    } finally {
        conn.release();
    }
};

/**
 * POST /api/admin/applications/:id/request-correction
 */
const requestCorrection = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { correction_notes } = req.body;
        if (!correction_notes || !correction_notes.trim()) {
            await conn.rollback();
            return res.status(400).json({ message: 'A correction reason is required.' });
        }

        const [rows] = await conn.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
        if (rows.length === 0) { await conn.rollback(); return res.status(404).json({ message: 'Application not found.' }); }

        const app = rows[0];
        if (app.status !== 'UNDER_REVIEW') {
            await conn.rollback();
            return res.status(400).json({ message: `Cannot request correction. Application is ${app.status}.` });
        }

        await conn.query(
            `UPDATE applications SET status = 'NEEDS_CORRECTION', correction_notes = ?, updated_at = NOW() WHERE id = ?`,
            [correction_notes.trim(), app.id]
        );

        await conn.query(
            `INSERT INTO application_history (application_id, actor_user_id, action, old_status, new_status, remarks)
             VALUES (?, ?, 'Correction Requested', 'UNDER_REVIEW', 'NEEDS_CORRECTION', ?)`,
            [app.id, req.user.id, correction_notes.trim()]
        );

        await conn.commit();

        // Fire-and-forget email + rich notification
        const [ownerRowsCorr] = await db.query(
            'SELECT u.id, u.email, u.full_name, b.business_name FROM users u JOIN businesses b ON b.user_id = u.id WHERE u.id = ? LIMIT 1',
            [app.user_id]
        );
        if (ownerRowsCorr.length > 0) {
            notificationService.notifyCorrectionRequested(
                { id: app.id, application_number: app.application_number },
                ownerRowsCorr[0],
                { business_name: ownerRowsCorr[0].business_name },
                correction_notes.trim()
            ).catch(e => console.error('[notify] correction failed:', e.message));
        }

        res.json({ message: 'Correction requested.', status: 'NEEDS_CORRECTION' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ message: 'Unable to request correction. Please try again.' });
    } finally {
        conn.release();
    }
};

/**
 * POST /api/admin/applications/:id/approve
 */
const approveApplication = async (req, res) => {
    let tempPdfPath = null;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT a.*, b.business_name, b.business_type, b.address, b.industry_category, 
                    u.full_name AS owner_name
             FROM applications a
             JOIN businesses b ON a.business_id = b.id
             JOIN users u ON a.user_id = u.id
             WHERE a.id = ? FOR UPDATE`, 
            [req.params.id]
        );
        if (rows.length === 0) { await conn.rollback(); return res.status(404).json({ message: 'Application not found.' }); }

        const app = rows[0];

        // Check if permit already exists for this application to ensure idempotency
        const [existingPermits] = await conn.query('SELECT id, verification_code FROM permits WHERE application_id = ?', [app.id]);
        if (existingPermits.length > 0 && app.status === 'APPROVED') {
            await conn.rollback();
            return res.status(200).json({ message: 'This preparation submission has already been marked as Verified.', status: 'APPROVED' });
        }

        if (app.status !== 'UNDER_REVIEW') {
            await conn.rollback();
            return res.status(400).json({ message: `Cannot approve. Application is ${app.status}.` });
        }

        // Update Application Status
        await conn.query(
            `UPDATE applications SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [req.user.id, app.id]
        );

        await conn.query(
            `INSERT INTO application_history (application_id, actor_user_id, action, old_status, new_status)
             VALUES (?, ?, 'Application Approved', 'UNDER_REVIEW', 'APPROVED')`,
            [app.id, req.user.id]
        );

        // Determine Expiration Date: December 31st of the current year (Standard rule)
        const currentYear = new Date().getFullYear();
        const expirationDate = `${currentYear}-12-31`;
        const issueDate = new Date().toISOString().split('T')[0];

        // Internal reference for DB / file naming only — NOT displayed as an official permit number
        const internalRef = permitGenerator.generateInternalRefCode();
        const permitNumber = `PE-${currentYear}-${String(app.id).padStart(5, '0')}`;
        const permitName = app.application_type === 'NEW' ? 'New Business Permit Preparation Summary' : 'Renewal Preparation Summary';

        // Internal code for DB uniqueness (used for file-naming, not as an official permit number)
        let verificationCode = permitGenerator.generateVerificationCode();
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 5;
        while (!isUnique && attempts < maxAttempts) {
            const [codeCheck] = await conn.query('SELECT id FROM permits WHERE verification_code = ? LIMIT 1', [verificationCode]);
            if (codeCheck.length === 0) {
                isUnique = true;
            } else {
                verificationCode = permitGenerator.generateVerificationCode();
                attempts++;
            }
        }
        if (!isUnique) {
            await conn.rollback();
            return res.status(500).json({ message: 'Failed to generate unique verification code. Please try again.' });
        }

        // Load checklist for the preparation summary
        const [checklist] = await conn.query(
            `SELECT br.status, pr.permit_name FROM business_requirements br
             JOIN permit_requirements pr ON br.requirement_id = pr.id
             WHERE br.business_id = ?`,
            [app.business_id]
        );

        // Generate Preparation Summary PDF (not an official permit)
        const permitData = {
            business_name: app.business_name,
            owner_name: app.owner_name,
            business_type: app.business_type,
            industry_category: app.industry_category || 'N/A',
            address: app.address,
            permit_type: app.application_type,
            assessment_date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
            checklist: checklist
        };

        try {
            tempPdfPath = await permitGenerator.generatePermitDocument(permitData);
        } catch (pdfError) {
            console.error('PDF Generation Error:', pdfError);
            await conn.rollback();
            return res.status(500).json({ message: 'Failed to generate preparation summary document. Verification aborted.' });
        }

        // Finalize PDF path using internal ref
        const finalPdfPath = permitGenerator.finalizePermitDocument(tempPdfPath, internalRef);

        // Insert Permit record with concurrency collision retry on unique_verification_code
        let permitInserted = false;
        let insertAttempts = 0;
        while (!permitInserted && insertAttempts < 3) {
            try {
                await conn.query(
                    `INSERT INTO permits (business_id, application_id, permit_name, permit_number, issue_date, expiration_date, status, verification_code, pdf_path)
                     VALUES (?, ?, ?, ?, ?, ?, 'Approved', ?, ?)`,
                    [app.business_id, app.id, permitName, permitNumber, issueDate, expirationDate, verificationCode, finalPdfPath]
                );
                permitInserted = true;
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY' && err.message && err.message.includes('verification_code')) {
                    verificationCode = permitGenerator.generateVerificationCode();
                    insertAttempts++;
                } else {
                    throw err;
                }
            }
        }
        if (!permitInserted) {
            await conn.rollback();
            if (tempPdfPath) permitGenerator.cleanupTempFile(tempPdfPath);
            return res.status(500).json({ message: 'Unable to generate unique verification code under concurrent load.' });
        }

        await conn.commit();

        // Fire-and-forget notification: preparation marked as Verified by BPLO
        const [ownerRowsApprove] = await db.query(
            'SELECT u.id, u.email, u.full_name, b.business_name FROM users u JOIN businesses b ON b.user_id = u.id WHERE u.id = ? LIMIT 1',
            [app.user_id]
        );
        if (ownerRowsApprove.length > 0) {
            const [permitRows] = await db.query('SELECT * FROM permits WHERE application_id = ? LIMIT 1', [app.id]);
            const issuedPermit = permitRows[0] || null;
            notificationService.notifyApplicationApproved(
                { id: app.id, application_number: app.application_number },
                ownerRowsApprove[0],
                { business_name: ownerRowsApprove[0].business_name },
                issuedPermit
            ).catch(e => console.error('[notify] approved failed:', e.message));

            if (issuedPermit) {
                notificationService.notifyPermitIssued(
                    issuedPermit,
                    ownerRowsApprove[0],
                    { business_name: ownerRowsApprove[0].business_name }
                ).catch(e => console.error('[notify] permit-issued failed:', e.message));
            }
        }

        res.json({ message: 'Preparation submission marked as Verified. BPLO processing must still be completed officially.', status: 'APPROVED' });
    } catch (error) {
        await conn.rollback();
        if (tempPdfPath) permitGenerator.cleanupTempFile(tempPdfPath);
        console.error(error);
        res.status(500).json({ message: 'Unable to mark as Verified. Please try again.' });
    } finally {
        conn.release();
    }
};

/**
 * POST /api/admin/applications/:id/reject
 */
const rejectApplication = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { rejection_reason } = req.body;
        if (!rejection_reason || !rejection_reason.trim()) {
            await conn.rollback();
            return res.status(400).json({ message: 'A rejection reason is required.' });
        }

        const [rows] = await conn.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
        if (rows.length === 0) { await conn.rollback(); return res.status(404).json({ message: 'Application not found.' }); }

        const app = rows[0];
        if (app.status !== 'UNDER_REVIEW') {
            await conn.rollback();
            return res.status(400).json({ message: `Cannot reject. Application is ${app.status}.` });
        }

        await conn.query(
            `UPDATE applications SET status = 'REJECTED', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [rejection_reason.trim(), req.user.id, app.id]
        );

        await conn.query(
            `INSERT INTO application_history (application_id, actor_user_id, action, old_status, new_status, remarks)
             VALUES (?, ?, 'Application Rejected', 'UNDER_REVIEW', 'REJECTED', ?)`,
            [app.id, req.user.id, rejection_reason.trim()]
        );

        await conn.commit();

        // Fire-and-forget email + rich notification
        const [ownerRowsReject] = await db.query(
            'SELECT u.id, u.email, u.full_name, b.business_name FROM users u JOIN businesses b ON b.user_id = u.id WHERE u.id = ? LIMIT 1',
            [app.user_id]
        );
        if (ownerRowsReject.length > 0) {
            notificationService.notifyApplicationRejected(
                { id: app.id, application_number: app.application_number },
                ownerRowsReject[0],
                { business_name: ownerRowsReject[0].business_name },
                rejection_reason.trim()
            ).catch(e => console.error('[notify] rejected failed:', e.message));
        }

        res.json({ message: 'Application rejected.', status: 'REJECTED' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ message: 'Unable to request corrections. Please try again.' });
    } finally {
        conn.release();
    }
};

/**
 * GET /api/applications/:id/history
 */
const getApplicationHistory = async (req, res) => {
    try {
        // First verify access
        const [appRows] = await db.query('SELECT user_id FROM applications WHERE id = ?', [req.params.id]);
        if (appRows.length === 0) return res.status(404).json({ message: 'Application not found.' });

        const isOwner = appRows[0].user_id === req.user.id;
        const isAdmin = ['lgu_admin', 'system_admin'].includes(req.user.role);
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied.' });

        const [history] = await db.query(
            `SELECT ah.*, u.full_name AS actor_name
             FROM application_history ah
             JOIN users u ON ah.actor_user_id = u.id
             WHERE ah.application_id = ?
             ORDER BY ah.created_at ASC`,
            [req.params.id]
        );

        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Unable to load application history.' });
    }
};

/**
 * GET /api/applications/:id/preparation-summary
 */
const getPreparationSummaryPDF = async (req, res) => {
    try {
        const [appRows] = await db.query(
            `SELECT a.*, b.business_name, b.business_type
             FROM applications a JOIN businesses b ON a.business_id = b.id
             WHERE a.id = ?`,
            [req.params.id]
        );
        if (appRows.length === 0) return res.status(404).json({ message: 'Application not found.' });

        const app = appRows[0];
        const isOwner = app.user_id === req.user.id;
        const isAdmin = ['lgu_admin', 'system_admin'].includes(req.user.role);
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied.' });

        const [requirements] = await db.query(
            `SELECT pr.permit_name, br.status AS req_status
             FROM business_requirements br
             JOIN permit_requirements pr ON br.requirement_id = pr.id
             WHERE br.business_id = ?`,
            [app.business_id]
        );

        const [documents] = await db.query(
            `SELECT document_name, upload_date FROM documents WHERE business_id = ? ORDER BY upload_date DESC`,
            [app.business_id]
        );

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Preparation_Summary_${app.application_number || 'Draft'}.pdf`);
        doc.pipe(res);

        // Header
        doc.font('Helvetica-Bold').fontSize(16).text('PERMITEASE', { align: 'center' });
        doc.fontSize(12).text('PHYSICAL DOCUMENT PREPARATION SUMMARY', { align: 'center' });
        doc.moveDown();

        doc.font('Helvetica').fontSize(10)
           .text('IMPORTANT:', { continued: true }).font('Helvetica-Bold')
           .text(' This checklist is a user preparation aid.');
        doc.font('Helvetica')
           .text('It does not represent official LGU instructions, approval, or submission requirements.');
        doc.moveDown(2);

        // App Info
        doc.font('Helvetica-Bold').text('Application Details');
        doc.font('Helvetica')
           .text(`Business Name: ${app.business_name}`)
           .text(`Application Type: ${app.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'}`)
           .text(`Application Number: ${app.application_number || 'Draft'}`)
           .text(`Date Generated: ${new Date().toLocaleDateString('en-PH')}`);

        if (app.walkin_date) {
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fillColor('#166534')
               .text(`Fast-Track Walk-in Window: ${new Date(app.walkin_date).toLocaleDateString('en-PH')} (${app.walkin_time_slot || 'All Day'})`)
               .text(`Queue Ticket Number: #${app.queue_ticket_number || 'PENDING'}`);
            doc.font('Helvetica').fillColor('black');
        }

        doc.moveDown(2);

        // Requirements
        doc.font('Helvetica-Bold').text('Application Requirements Checklist');
        doc.moveDown(0.5);
        if (requirements.length === 0) {
            doc.font('Helvetica').text('No requirements generated yet.');
        } else {
            requirements.forEach(req => {
                doc.font('Helvetica').text(`[   ] ${req.permit_name}`);
                doc.fillColor('gray').text(`      Digital Status: ${req.req_status}`, { indent: 20 });
                doc.fillColor('black').moveDown(0.5);
            });
        }
        doc.moveDown();

        // Uploaded Documents
        doc.font('Helvetica-Bold').text('Uploaded Documents');
        doc.moveDown(0.5);
        if (documents.length === 0) {
            doc.font('Helvetica').text('No documents uploaded yet.');
        } else {
            documents.forEach(docItem => {
                const uploadDate = new Date(docItem.upload_date).toLocaleDateString('en-PH');
                doc.font('Helvetica').text(`• ${docItem.document_name} (Uploaded: ${uploadDate})`);
            });
        }
        doc.moveDown(2);

        // Notes section
        doc.font('Helvetica-Bold').text('Preparation Notes:');
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Unable to generate preparation summary.' });
    }
};

/**
 * POST /api/applications/:id/schedule-walkin
 * Schedule a Fast-Track Walk-in Appointment at Roxas City Hall
 */
const scheduleWalkin = async (req, res) => {
    try {
        const { walkin_date, walkin_time_slot } = req.body;
        if (!walkin_date || !walkin_time_slot) {
            return res.status(400).json({ message: 'Walk-in date and batch time slot are required.' });
        }

        const [rows] = await db.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Application not found.' });

        const app = rows[0];
        const isOwner = app.user_id === req.user.id;
        const isAdmin = ['lgu_admin', 'system_admin'].includes(req.user.role);
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied.' });

        // Generate Daily Queue Ticket Number: e.g. RX-YYYY-NNNN
        const year = new Date(walkin_date).getFullYear();
        const ticketNum = `RX-${year}-${String(app.id).padStart(4, '0')}`;

        await db.query(
            `UPDATE applications 
             SET walkin_date = ?, walkin_time_slot = ?, queue_ticket_number = ?, walkin_status = 'SCHEDULED', updated_at = NOW()
             WHERE id = ?`,
            [walkin_date, walkin_time_slot, ticketNum, app.id]
        );

        // Log history
        await logHistory(
            app.id, 
            req.user.id, 
            'Walk-in Scheduled', 
            app.status, 
            app.status, 
            `Walk-in scheduled for ${walkin_date} (${walkin_time_slot}) • Queue Ticket #${ticketNum}`
        );

        // Notify user
        const notifTitle = 'Fast-Track Walk-in Scheduled';
        const notifMsg = `Your Roxas City Hall walk-in is scheduled for ${walkin_date} (${walkin_time_slot}). Your Queue Ticket is #${ticketNum}. Please bring your physical clearance folder.`;
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_application_id, status)
             VALUES (?, 'WALKIN_SCHEDULED', ?, ?, ?, 'Unread')`,
            [app.user_id, notifTitle, notifMsg, app.id]
        );

        res.json({
            success: true,
            message: 'Walk-in scheduled successfully!',
            walkin_date,
            walkin_time_slot,
            queue_ticket_number: ticketNum
        });
    } catch (error) {
        console.error('scheduleWalkin error:', error);
        res.status(500).json({ message: 'Unable to schedule walk-in appointment.' });
    }
};

/**
 * GET /api/applications/admin/walkin-roster
 * Retrieves daily walk-in queue and capacity roster for BPLO
 */
const getWalkinRoster = async (req, res) => {
    try {
        const { date } = req.query;
        // Default to today in local date format YYYY-MM-DD
        const targetDate = date || new Date().toISOString().split('T')[0];

        const [rows] = await db.query(
            `SELECT a.id, a.application_number, a.status as app_status,
                    a.walkin_date, a.walkin_time_slot, a.queue_ticket_number, a.walkin_status,
                    a.counter_verified_by, a.counter_verified_at,
                    b.business_name, b.business_type,
                    u.full_name as owner_name, u.contact_number as owner_contact, u.email as owner_email,
                    r.full_name as counter_officer_name
             FROM applications a
             JOIN businesses b ON a.business_id = b.id
             JOIN users u ON a.user_id = u.id
             LEFT JOIN users r ON a.counter_verified_by = r.id
             WHERE a.walkin_date = ?
             ORDER BY a.walkin_time_slot ASC, a.queue_ticket_number ASC`,
            [targetDate]
        );

        const summary = {
            targetDate,
            totalScheduled: rows.length,
            morningBatch: rows.filter(r => (r.walkin_time_slot || '').toLowerCase().includes('morning') || (r.walkin_time_slot || '').includes('8:00')).length,
            afternoonBatch: rows.filter(r => (r.walkin_time_slot || '').toLowerCase().includes('afternoon') || (r.walkin_time_slot || '').includes('1:00')).length,
            attendedCount: rows.filter(r => r.walkin_status === 'ATTENDED').length,
            pendingCount: rows.filter(r => r.walkin_status === 'SCHEDULED' || r.walkin_status === 'PENDING').length
        };

        res.json({ summary, roster: rows });
    } catch (error) {
        console.error('getWalkinRoster error:', error);
        res.status(500).json({ message: 'Unable to retrieve walk-in roster.' });
    }
};

/**
 * POST /api/applications/admin/:id/mark-attended
 * BPLO counter officer marks physical paper sighting complete at Window 1
 */
const markWalkinAttended = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Application not found.' });

        const app = rows[0];

        await db.query(
            `UPDATE applications 
             SET walkin_status = 'ATTENDED', counter_verified_by = ?, counter_verified_at = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [req.user.id, app.id]
        );

        await logHistory(
            app.id,
            req.user.id,
            'Physical Sighting Verified at Window 1',
            app.status,
            app.status,
            `Physical document folder sighted and verified by Officer ${req.user.full_name}. Forwarded to City Treasurer Cashier.`
        );

        // Notify user
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_application_id, status)
             VALUES (?, 'COUNTER_VERIFIED', 'Physical Documents Sighted', 'Your physical clearance folder has been verified at Window 1. Please proceed to the Cashier for payment.', ?, 'Unread')`,
            [app.user_id, app.id]
        );

        res.json({
            success: true,
            message: 'In-person sighting verified. Applicant forwarded to Cashier.',
            walkin_status: 'ATTENDED',
            counter_officer: req.user.full_name
        });
    } catch (error) {
        console.error('markWalkinAttended error:', error);
        res.status(500).json({ message: 'Unable to mark walk-in attendance.' });
    }
};

/**
 * POST /api/applications/admin/:id/confirm-walkin
 * BPLO officer checks availability and confirms the walk-in appointment
 */
const confirmWalkinAppointment = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Application not found.' });

        const app = rows[0];

        await db.query(
            `UPDATE applications 
             SET walkin_status = 'CONFIRMED', updated_at = NOW()
             WHERE id = ?`,
            [app.id]
        );

        await logHistory(
            app.id,
            req.user.id,
            'Walk-in Appointment Confirmed by BPLO',
            app.status,
            app.status,
            `Walk-in appointment on ${app.walkin_date} (${app.walkin_time_slot || 'Window 1'}) confirmed by BPLO Officer ${req.user.full_name}. Slot secured.`
        );

        const dateStr = app.walkin_date ? new Date(app.walkin_date).toLocaleDateString('en-PH') : 'your chosen date';
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_application_id, status)
             VALUES (?, 'WALKIN_CONFIRMED', 'Walk-in Slot Confirmed by BPLO', ?, ?, 'Unread')`,
            [
                app.user_id,
                `Your walk-in appointment on ${dateStr} (${app.walkin_time_slot || 'Window 1'}) has been CONFIRMED by BPLO. Queue Ticket: #${app.queue_ticket_number}. Please bring your 2 printed copies of Form BPLO-01 and clearances.`,
                app.id
            ]
        );

        res.json({
            success: true,
            message: 'Walk-in appointment confirmed. Applicant notified.',
            walkin_status: 'CONFIRMED'
        });
    } catch (error) {
        console.error('confirmWalkinAppointment error:', error);
        res.status(500).json({ message: 'Unable to confirm appointment.' });
    }
};

/**
 * PUT /api/applications/admin/:id/form-data
 * BPLO personnel or owner saves/edits all Form BPLO-01 fields
 */
const updateApplicationFormData = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM applications WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Application not found.' });
        const app = rows[0];

        const data = req.body || {};

        if (app.business_id) {
            await db.query(
                `UPDATE businesses SET 
                    business_name = COALESCE(?, business_name),
                    ownership_type = COALESCE(?, ownership_type),
                    address = COALESCE(?, address),
                    barangay = COALESCE(?, barangay),
                    floor_area = COALESCE(?, floor_area),
                    employees = COALESCE(?, employees),
                    capitalization = COALESCE(?, capitalization),
                    gross_sales = COALESCE(?, gross_sales),
                    owner_name = COALESCE(?, owner_name),
                    contact_number = COALESCE(?, contact_number),
                    email = COALESCE(?, email),
                    industry_category = COALESCE(?, industry_category),
                    business_type = COALESCE(?, business_type),
                    primary_products = COALESCE(?, primary_products)
                 WHERE id = ?`,
                [
                    data.business_name || null,
                    data.ownership_type || null,
                    data.address || data.street || null,
                    data.barangay || null,
                    data.floor_area !== undefined && data.floor_area !== '' ? Number(data.floor_area) : null,
                    data.employees !== undefined && data.employees !== '' ? Number(data.employees) : null,
                    data.capitalization !== undefined && data.capitalization !== '' ? Number(data.capitalization) : null,
                    data.gross_sales !== undefined && data.gross_sales !== '' ? Number(data.gross_sales) : null,
                    data.owner_name || (data.owner_given_name ? `${data.owner_given_name} ${data.owner_surname || ''}`.trim() : null),
                    data.contact_number || null,
                    data.email || null,
                    data.industry_category || null,
                    data.business_type || null,
                    data.primary_products || null,
                    app.business_id
                ]
            );
        }

        if (req.user.role === 'lgu_admin' || req.user.role === 'system_admin') {
            await logHistory(
                app.id,
                req.user.id,
                'Form BPLO-01 Updated by BPLO',
                app.status,
                app.status,
                `Official Form BPLO-01 fields updated and verified by BPLO Officer ${req.user.full_name}.`
            );
        }

        res.json({
            success: true,
            message: 'Application form details updated and reflected successfully.',
            formData: data
        });
    } catch (error) {
        console.error('updateApplicationFormData error:', error);
        res.status(500).json({ message: 'Unable to update form data.' });
    }
};

/**
 * POST /api/applications/schedule-walkin-by-business
 * MSME submits preferred walk-in visit date from the Schedule Walk-in page
 */
const scheduleWalkinByBusiness = async (req, res) => {
    try {
        const { business_id, walkin_date, walkin_time_slot } = req.body;
        if (!business_id || !walkin_date || !walkin_time_slot) {
            return res.status(400).json({ message: 'Business, walk-in date, and time slot are required.' });
        }

        // Check business ownership (system_admin can test any business)
        let bizRows;
        if (req.user.role === 'system_admin') {
            [bizRows] = await db.query('SELECT * FROM businesses WHERE id = ?', [business_id]);
        } else {
            [bizRows] = await db.query('SELECT * FROM businesses WHERE id = ? AND user_id = ?', [business_id, req.user.id]);
        }
        if (bizRows.length === 0) {
            return res.status(404).json({ message: 'Business not found or unauthorized.' });
        }
        const business = bizRows[0];

        // Find existing application or create a new draft
        let [appRows] = await db.query(
            'SELECT * FROM applications WHERE business_id = ? AND status != "CANCELLED" ORDER BY id DESC LIMIT 1',
            [business.id]
        );

        let appId;
        let appNumber;
        if (appRows.length > 0) {
            appId = appRows[0].id;
            appNumber = appRows[0].application_number;
        } else {
            const year = new Date().getFullYear();
            const [lastApp] = await db.query(
                "SELECT application_number FROM applications WHERE application_number LIKE ? ORDER BY id DESC LIMIT 1",
                [`BP-ROXAS-${year}-%`]
            );
            let seq = 1;
            if (lastApp.length > 0 && lastApp[0].application_number) {
                const parts = lastApp[0].application_number.split('-');
                seq = parseInt(parts[parts.length - 1], 10) + 1;
            }
            appNumber = `BP-ROXAS-${year}-${String(seq).padStart(4, '0')}`;
            const [createRes] = await db.query(
                `INSERT INTO applications (application_number, user_id, business_id, application_type, status)
                 VALUES (?, ?, ?, ?, 'DRAFT')`,
                [appNumber, business.user_id, business.id, (business.business_status || '').includes('Renewal') ? 'RENEWAL' : 'NEW']
            );
            appId = createRes.insertId;
        }

        const year = new Date(walkin_date).getFullYear();
        const ticketNum = `RX-${year}-${String(appId).padStart(4, '0')}`;

        await db.query(
            `UPDATE applications 
             SET walkin_date = ?, walkin_time_slot = ?, queue_ticket_number = ?, walkin_status = 'PENDING', updated_at = NOW()
             WHERE id = ?`,
            [walkin_date, walkin_time_slot, ticketNum, appId]
        );

        await logHistory(
            appId,
            req.user.id,
            'Walk-in Requested by MSME',
            'DRAFT',
            'DRAFT',
            `Preferred visit date submitted: ${walkin_date} (${walkin_time_slot}). Queue Ticket #${ticketNum}. Awaiting BPLO availability check.`
        );

        // 1. Notify the MSME applicant
        const notifTitle = 'Walk-in Visit Date Submitted';
        const notifMsg = `Your preferred visit date of ${walkin_date} (${walkin_time_slot}) for ${business.business_name} has been submitted to Roxas BPLO. Your Queue Ticket is #${ticketNum}.`;
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_application_id, status)
             VALUES (?, 'WALKIN_SCHEDULED', ?, ?, ?, 'Unread')`,
            [business.user_id, notifTitle, notifMsg, appId]
        );

        // 2. Notify BPLO Officers for availability check & confirmation
        try {
            const [lguAdmins] = await db.query("SELECT id FROM users WHERE role = 'lgu_admin'");
            for (const admin of lguAdmins) {
                await db.query(
                    `INSERT INTO notifications (user_id, type, title, message, related_application_id, status)
                     VALUES (?, 'WALKIN_REQUESTED', 'New Walk-in Appointment Request', ?, ?, 'Unread')`,
                    [admin.id, `MSME submitted Window 1 visit date on ${walkin_date} (${walkin_time_slot}) for ${business.business_name}. Ticket #${ticketNum}.`, appId]
                );
            }
        } catch (notifErr) {
            console.error('LGU admin notification error:', notifErr);
        }

        res.json({
            success: true,
            message: 'Walk-in visit request submitted successfully!',
            application_id: appId,
            application_number: appNumber,
            queue_ticket_number: ticketNum,
            walkin_date,
            walkin_time_slot,
            walkin_status: 'PENDING'
        });
    } catch (error) {
        console.error('scheduleWalkinByBusiness error:', error);
        res.status(500).json({ message: 'Unable to schedule walk-in.' });
    }
};

module.exports = {
    getMyApplications,
    getApplicationById,
    createDraft,
    submitApplication,
    getAllApplications,
    startReview,
    requestCorrection,
    approveApplication,
    rejectApplication,
    getApplicationHistory,
    getPreparationSummaryPDF,
    scheduleWalkin,
    scheduleWalkinByBusiness,
    getWalkinRoster,
    confirmWalkinAppointment,
    markWalkinAttended,
    updateApplicationFormData
};
