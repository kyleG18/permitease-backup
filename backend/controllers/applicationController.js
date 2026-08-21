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
const logHistory = async (applicationId, actorUserId, action, oldStatus, newStatus, remarks = null) => {
    await db.query(
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

        // Load applicable requirements for the business
        const [requirements] = await db.query(
            `SELECT br.id, br.requirement_id, br.status AS req_status, br.document_id,
                    pr.permit_name, pr.description,
                    d.document_name, d.file_path, d.upload_date
             FROM business_requirements br
             JOIN permit_requirements pr ON br.requirement_id = pr.id
             LEFT JOIN documents d ON br.document_id = d.id
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
    try {
        const { business_id, application_type } = req.body;

        if (!business_id || !application_type) {
            return res.status(400).json({ message: 'Business and application type are required.' });
        }

        if (!['NEW', 'RENEWAL'].includes(application_type)) {
            return res.status(400).json({ message: 'Application type must be NEW or RENEWAL.' });
        }

        // Verify business belongs to this user
        const [biz] = await db.query(
            'SELECT id, business_name FROM businesses WHERE id = ? AND user_id = ?',
            [business_id, req.user.id]
        );
        if (biz.length === 0) {
            return res.status(403).json({ message: 'Business not found or does not belong to you.' });
        }

        // Prevent duplicate active application creation
        let existingApps = [];
        if (application_type === 'RENEWAL') {
            const [rows] = await db.query(
                `SELECT id, status FROM applications 
                 WHERE business_id = ? AND application_type = 'RENEWAL' 
                 AND status NOT IN ('APPROVED', 'REJECTED', 'CANCELLED') 
                 AND user_id = ?`,
                [business_id, req.user.id]
            );
            existingApps = rows;
        } else {
            const [rows] = await db.query(
                `SELECT id, status FROM applications 
                 WHERE business_id = ? AND application_type = 'NEW' 
                 AND status NOT IN ('APPROVED', 'REJECTED', 'CANCELLED') 
                 AND user_id = ?`,
                [business_id, req.user.id]
            );
            existingApps = rows;
        }

        if (existingApps.length > 0) {
            // Return existing active application to avoid duplicating
            return res.status(200).json({
                id: existingApps[0].id,
                message: 'Existing active application recovered.',
                status: existingApps[0].status
            });
        }

        const [result] = await db.query(
            `INSERT INTO applications (user_id, business_id, application_type, status)
             VALUES (?, ?, ?, 'DRAFT')`,
            [req.user.id, business_id, application_type]
        );

        // Log history
        await logHistory(result.insertId, req.user.id, 'Application Created', null, 'DRAFT');

        res.status(201).json({
            id: result.insertId,
            message: 'Draft application created successfully.',
            status: 'DRAFT'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Unable to create application. Please try again.' });
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
             WHERE a.id = ?`, 
            [req.params.id]
        );
        if (rows.length === 0) { await conn.rollback(); return res.status(404).json({ message: 'Application not found.' }); }

        const app = rows[0];

        // Check if permit already exists for this application to ensure idempotency
        const [existingPermits] = await conn.query('SELECT id, verification_code FROM permits WHERE application_id = ?', [app.id]);
        if (existingPermits.length > 0 && app.status === 'APPROVED') {
            await conn.rollback();
            return res.status(200).json({ message: 'Application is already approved and permit exists.', status: 'APPROVED' });
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

        // Generate permit number
        const permitNumber = `PMT-${currentYear}-${String(app.id).padStart(5, '0')}`;
        const permitName = app.application_type === 'NEW' ? 'New Business Permit' : 'Renewal Business Permit';

        // Generate unique verification code
        let verificationCode = permitGenerator.generateVerificationCode();
        let isUnique = false;
        while (!isUnique) {
            const [codeCheck] = await conn.query('SELECT id FROM permits WHERE verification_code = ?', [verificationCode]);
            if (codeCheck.length === 0) {
                isUnique = true;
            } else {
                verificationCode = permitGenerator.generateVerificationCode();
            }
        }

        // Generate PDF
        const permitData = {
            permit_number: permitNumber,
            application_number: app.application_number,
            business_name: app.business_name,
            owner_name: app.owner_name,
            business_type: app.business_type,
            industry_category: app.industry_category || 'N/A',
            address: app.address,
            permit_type: app.application_type,
            issue_date: issueDate,
            expiration_date: expirationDate,
            verification_code: verificationCode
        };

        try {
            tempPdfPath = await permitGenerator.generatePermitDocument(permitData);
        } catch (pdfError) {
            console.error('PDF Generation Error:', pdfError);
            await conn.rollback();
            return res.status(500).json({ message: 'Failed to generate permit document. Approval aborted.' });
        }

        // Finalize PDF path
        const finalPdfPath = permitGenerator.finalizePermitDocument(tempPdfPath, permitNumber);

        // Insert Permit
        await conn.query(
            `INSERT INTO permits (business_id, application_id, permit_name, permit_number, issue_date, expiration_date, status, verification_code, pdf_path)
             VALUES (?, ?, ?, ?, ?, ?, 'Approved', ?, ?)`,
            [app.business_id, app.id, permitName, permitNumber, issueDate, expirationDate, verificationCode, finalPdfPath]
        );

        await conn.commit();

        // Fire-and-forget rich notifications for APPROVED + PERMIT ISSUED
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

        res.json({ message: 'Application approved and permit generated.', status: 'APPROVED' });
    } catch (error) {
        await conn.rollback();
        if (tempPdfPath) permitGenerator.cleanupTempFile(tempPdfPath);
        console.error(error);
        res.status(500).json({ message: 'Unable to approve application. Please try again.' });
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
        res.status(500).json({ message: 'Unable to reject application. Please try again.' });
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
    getPreparationSummaryPDF
};
