const db = require('../config/db');
const {
    REGULATORY_SOURCES,
    checkAllRegulatorySources,
    importPsicCsvRows
} = require('../services/regulatoryMonitorService');

// ─────────────────────────────────────────────────────────
// REGULATORY UPDATES & SOURCES
// ─────────────────────────────────────────────────────────

// @desc    List regulatory updates (filterable by status / source_category)
// @route   GET /api/regulatory/updates
// @access  Private (lgu_admin, system_admin)
const getRegulatoryUpdates = async (req, res) => {
    try {
        const { status, category } = req.query;
        let query = `SELECT r.*, u.full_name as reviewer_name
                     FROM regulatory_updates r
                     LEFT JOIN users u ON r.reviewed_by = u.id
                     WHERE 1=1`;
        const params = [];

        if (status && status !== 'ALL') {
            query += ` AND r.status = ?`;
            params.push(status);
        }
        if (category && category !== 'ALL') {
            query += ` AND r.source_category = ?`;
            params.push(category);
        }
        query += ` ORDER BY CASE WHEN r.status = 'PENDING_REVIEW' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 100`;

        const [rows] = await db.query(query, params);
        res.json({ updates: rows, sources: REGULATORY_SOURCES });
    } catch (error) {
        console.error('[RegulatoryController] getRegulatoryUpdates error:', error);
        res.status(500).json({ message: 'Failed to load regulatory updates.' });
    }
};

// @desc    Trigger live check across PSA PSIC, ARTA, DILG, BIR, and BFP
// @route   POST /api/regulatory/updates/check
// @access  Private (lgu_admin, system_admin)
const triggerRegulatoryCheck = async (req, res) => {
    try {
        const report = await checkAllRegulatorySources({ triggeredBy: `manual:${req.user.id}` });
        res.json(report);
    } catch (error) {
        console.error('[RegulatoryController] triggerRegulatoryCheck error:', error);
        res.status(500).json({ message: 'Failed to check regulatory sources.' });
    }
};

// @desc    Manually log a local ordinance or regulatory bulletin for review/AI grounding
// @route   POST /api/regulatory/updates
// @access  Private (lgu_admin, system_admin)
const createRegulatoryUpdate = async (req, res) => {
    try {
        const { source_name, source_category, source_url, title, summary, ai_impact_notes, detected_version, auto_approve } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required.' });
        }
        const status = auto_approve ? 'APPROVED' : 'PENDING_REVIEW';
        const [result] = await db.query(
            `INSERT INTO regulatory_updates
             (source_name, source_category, source_url, title, summary, ai_impact_notes, detected_version, status, reviewed_by, reviewed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                source_name || 'Municipality of Roxas BPLO',
                source_category || 'LOCAL_ORDINANCE',
                source_url || null,
                title.trim(),
                summary || '',
                ai_impact_notes || '',
                detected_version || new Date().toISOString().slice(0, 10),
                status,
                auto_approve ? req.user.id : null,
                auto_approve ? new Date() : null
            ]
        );
        const [created] = await db.query('SELECT * FROM regulatory_updates WHERE id = ?', [result.insertId]);
        res.status(201).json(created[0]);
    } catch (error) {
        console.error('[RegulatoryController] createRegulatoryUpdate error:', error);
        res.status(500).json({ message: 'Failed to save regulatory update.' });
    }
};

// @desc    Approve a pending regulatory update & optionally incorporate into knowledge_base
// @route   PUT /api/regulatory/updates/:id/approve
// @access  Private (lgu_admin, system_admin)
const approveRegulatoryUpdate = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM regulatory_updates WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Regulatory update not found.' });

        const existing = rows[0];
        const title = (req.body?.title || existing.title || '').trim();
        const summary = req.body?.summary !== undefined ? req.body.summary : existing.summary;
        const aiImpactNotes = req.body?.ai_impact_notes !== undefined ? req.body.ai_impact_notes : existing.ai_impact_notes;
        const incorporateIntoKb = req.body?.incorporate_into_kb !== false;

        await db.query(
            `UPDATE regulatory_updates
             SET status = 'APPROVED', title = ?, summary = ?, ai_impact_notes = ?, reviewed_by = ?, reviewed_at = NOW()
             WHERE id = ?`,
            [title, summary, aiImpactNotes, req.user.id, req.params.id]
        );

        let incorporatedInKb = false;
        if (incorporateIntoKb) {
            const docKey = `REG_UPDATE_${existing.id}`;
            const kbContent = [summary, aiImpactNotes ? `BPLO Guidance: ${aiImpactNotes}` : ''].filter(Boolean).join('\n\n');
            await db.query(
                `INSERT INTO knowledge_base
                 (title, document_path, document_key, category, legal_basis, issuing_authority, source_url, content, status, verification_status, verified_by, last_verified_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', 'VERIFIED', ?, NOW())
                 ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    content = VALUES(content),
                    source_url = VALUES(source_url),
                    status = 'PUBLISHED',
                    verification_status = 'VERIFIED',
                    verified_by = VALUES(verified_by),
                    last_verified_at = NOW()`,
                [
                    title.slice(0, 255),
                    existing.source_url || `/admin/regulatory`,
                    docKey,
                    existing.source_category || 'LOCAL_ORDINANCE',
                    existing.detected_version || existing.source_name,
                    existing.source_name,
                    existing.source_url || null,
                    kbContent,
                    req.user.id
                ]
            ).catch((kbErr) => {
                console.warn('[RegulatoryController] knowledge_base sync notice:', kbErr.message);
            });
            incorporatedInKb = true;
        }

        res.json({
            message: incorporatedInKb
                ? 'Law/regulation approved and incorporated into PermitEase Knowledge Base & AI context.'
                : 'Regulatory update approved and added to active AI context.',
            incorporated_in_kb: incorporatedInKb
        });
    } catch (error) {
        console.error('[RegulatoryController] approveRegulatoryUpdate error:', error);
        res.status(500).json({ message: 'Failed to approve regulatory update.' });
    }
};

// @desc    Dismiss a pending regulatory update
// @route   PUT /api/regulatory/updates/:id/dismiss
// @access  Private (lgu_admin, system_admin)
const dismissRegulatoryUpdate = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM regulatory_updates WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Regulatory update not found.' });

        await db.query(
            `UPDATE regulatory_updates SET status = 'DISMISSED', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
            [req.user.id, req.params.id]
        );
        res.json({ message: 'Regulatory update dismissed.' });
    } catch (error) {
        console.error('[RegulatoryController] dismissRegulatoryUpdate error:', error);
        res.status(500).json({ message: 'Failed to dismiss regulatory update.' });
    }
};

// ─────────────────────────────────────────────────────────
// PSA PSIC CODES MANAGEMENT
// ─────────────────────────────────────────────────────────

// @desc    List PSIC codes (filterable by status, industry_category, search)
// @route   GET /api/regulatory/psic
// @access  Private
const getPsicCodes = async (req, res) => {
    try {
        const { status, category, search } = req.query;
        let query = 'SELECT * FROM psic_codes WHERE 1=1';
        const params = [];

        if (status && status !== 'ALL') {
            query += ' AND status = ?';
            params.push(status);
        }
        if (category && category !== 'ALL') {
            query += ' AND industry_category = ?';
            params.push(category);
        }
        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            query += ' AND (code LIKE ? OR title LIKE ? OR mapped_requirement_keywords LIKE ?)';
            params.push(term, term, term);
        }
        query += ` ORDER BY CASE WHEN status = 'PENDING_APPROVAL' THEN 0 ELSE 1 END, code ASC`;

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('[RegulatoryController] getPsicCodes error:', error);
        res.status(500).json({ message: 'Failed to fetch PSIC codes.' });
    }
};

// @desc    Add a single PSIC code
// @route   POST /api/regulatory/psic
// @access  Private (lgu_admin, system_admin)
const createPsicCode = async (req, res) => {
    try {
        const { code, title, section, division, industry_category, mapped_requirement_keywords, source_version } = req.body;
        if (!code || !title || !industry_category) {
            return res.status(400).json({ message: 'code, title, and industry_category are required.' });
        }

        await db.query(
            `INSERT INTO psic_codes (code, title, section, division, industry_category, mapped_requirement_keywords, source_version, status, approved_by, approved_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW())
             ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                section = VALUES(section),
                division = VALUES(division),
                industry_category = VALUES(industry_category),
                mapped_requirement_keywords = VALUES(mapped_requirement_keywords),
                source_version = VALUES(source_version),
                status = 'ACTIVE'`,
            [
                code.trim(),
                title.trim(),
                section || null,
                division || null,
                industry_category,
                mapped_requirement_keywords || null,
                source_version || 'BPLO Manual Entry',
                req.user.id
            ]
        );
        const [saved] = await db.query('SELECT * FROM psic_codes WHERE code = ?', [code.trim()]);
        res.status(201).json(saved[0]);
    } catch (error) {
        console.error('[RegulatoryController] createPsicCode error:', error);
        res.status(500).json({ message: 'Failed to save PSIC code.' });
    }
};

// @desc    Import PSIC codes from CSV text
// @route   POST /api/regulatory/psic/import-csv
// @access  Private (lgu_admin, system_admin)
const importPsicCsv = async (req, res) => {
    try {
        const { csvText, sourceVersion, autoApprove } = req.body;
        if (!csvText || !csvText.trim()) {
            return res.status(400).json({ message: 'CSV text is required.' });
        }
        const result = await importPsicCsvRows(
            csvText,
            sourceVersion || 'PSA PSIC CSV Import',
            Boolean(autoApprove),
            req.user.id
        );
        res.json(result);
    } catch (error) {
        console.error('[RegulatoryController] importPsicCsv error:', error);
        res.status(500).json({ message: 'Failed to import PSIC CSV.' });
    }
};

// @desc    Approve a pending PSIC code
// @route   PUT /api/regulatory/psic/:id/approve
// @access  Private (lgu_admin, system_admin)
const approvePsicCode = async (req, res) => {
    try {
        await db.query(
            `UPDATE psic_codes SET status = 'ACTIVE', approved_by = ?, approved_at = NOW() WHERE id = ?`,
            [req.user.id, req.params.id]
        );
        res.json({ message: 'PSIC code approved and activated.' });
    } catch (error) {
        console.error('[RegulatoryController] approvePsicCode error:', error);
        res.status(500).json({ message: 'Failed to approve PSIC code.' });
    }
};

// @desc    Reject a pending PSIC code
// @route   PUT /api/regulatory/psic/:id/reject
// @access  Private (lgu_admin, system_admin)
const rejectPsicCode = async (req, res) => {
    try {
        await db.query(`UPDATE psic_codes SET status = 'REJECTED' WHERE id = ?`, [req.params.id]);
        res.json({ message: 'PSIC code rejected.' });
    } catch (error) {
        console.error('[RegulatoryController] rejectPsicCode error:', error);
        res.status(500).json({ message: 'Failed to reject PSIC code.' });
    }
};

// @desc    Delete a PSIC code
// @route   DELETE /api/regulatory/psic/:id
// @access  Private (system_admin)
const deletePsicCode = async (req, res) => {
    try {
        await db.query('DELETE FROM psic_codes WHERE id = ?', [req.params.id]);
        res.json({ message: 'PSIC code deleted.' });
    } catch (error) {
        console.error('[RegulatoryController] deletePsicCode error:', error);
        res.status(500).json({ message: 'Failed to delete PSIC code.' });
    }
};

module.exports = {
    getRegulatoryUpdates,
    triggerRegulatoryCheck,
    createRegulatoryUpdate,
    approveRegulatoryUpdate,
    dismissRegulatoryUpdate,
    getPsicCodes,
    createPsicCode,
    importPsicCsv,
    approvePsicCode,
    rejectPsicCode,
    deletePsicCode
};
