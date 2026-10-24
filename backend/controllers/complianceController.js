const db = require('../config/db');

/**
 * Evaluate a requirement condition against the business profile.
 * Mirrors the logic in readinessController.js — keep both in sync when adding new condition types.
 *
 * Supported condition_field values:
 *   'always'               — always applicable
 *   'industry_category'    — exact match on business.industry_category
 *   'business_status'      — NOTE: complianceController does not receive appTypeStatus;
 *                           this field is handled via readinessController instead.
 *                           Here we match against business.business_status for evaluate triggers.
 *   'premises_type'        — case-insensitive exact match on business.premises_type
 *   'business_type_contains' — pipe-separated list; matches if any token equals
 *                             business.business_type OR business.industry_category
 *                             (case-insensitive full-value comparison, not substring)
 *
 * Unknown condition_field → returns false (not applicable).
 */
function evaluateConditionForCompliance(rule, business) {
    const cf = (rule.condition_field || '').trim();
    const cv = (rule.condition_value || '').trim();

    if (!cf || cf === 'always') return true;

    if (cf === 'industry_category') {
        return (business.industry_category || '').trim() === cv;
    }

    if (cf === 'business_status') {
        // complianceController matches directly against the stored business.business_status value
        return (business.business_status || '').trim() === cv;
    }

    if (cf === 'premises_type') {
        return (business.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
    }

    // business_type_contains: pipe-separated list, full-value match (no substring)
    if (cf === 'business_type_contains') {
        const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
        const bizType = (business.business_type || '').trim().toLowerCase();
        const indCat  = (business.industry_category || '').trim().toLowerCase();
        return tokens.some(t => t === bizType || t === indCat);
    }

    return false; // unknown condition_field → not applicable
}

// @desc    Evaluate and update compliance requirements for a business
// @route   POST /api/compliance/evaluate/:businessId
// @access  Private
const evaluateCompliance = async (req, res) => {
    try {
        const businessId = req.params.businessId;

        // Verify ownership
        const [biz] = await db.query('SELECT * FROM businesses WHERE id = ?', [businessId]);
        if (biz.length === 0) return res.status(404).json({ message: 'Business not found' });
        
        if (req.user.role === 'business_owner' && biz[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const business = biz[0];

        // 1. Fetch all system requirements
        const [rules] = await db.query('SELECT * FROM permit_requirements');

        const applicableRules = rules.filter(rule => evaluateConditionForCompliance(rule, business));

        // 2. Fetch existing business_requirements to not overwrite statuses
        const [existingReqs] = await db.query('SELECT * FROM business_requirements WHERE business_id = ?', [businessId]);
        const existingReqMap = new Map(existingReqs.map(r => [r.requirement_id, r]));

        // 3. Upsert applicable requirements
        let total = applicableRules.length;
        let compliantCount = 0;

        for (const rule of applicableRules) {
            let status = 'Missing';
            
            const existing = existingReqMap.get(rule.id);
            if (existing) {
                status = existing.status;
            }

            if (status === 'Approved' || status === 'Submitted') {
                compliantCount++;
            }

            if (!existing) {
                // INSERT IGNORE: if a concurrent evaluate request already inserted this row
                // (race condition — both passed the existingReqMap check before either committed),
                // the unique key (business_id, requirement_id) prevents duplicates and IGNORE
                // silently discards the second insert rather than throwing an error.
                await db.query(
                    'INSERT IGNORE INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
                    [businessId, rule.id, status]
                );
            }
        }

        // 4. Calculate compliance score
        const score = total > 0 ? Math.round((compliantCount / total) * 100) : 100;
        
        // Save score to a historical assessment record
        try {
            const [aCols] = await db.query(`SHOW COLUMNS FROM \`assessments\` LIKE 'compliance_score'`);
            if (aCols.length > 0) {
                await db.query(
                    'INSERT INTO assessments (user_id, business_id, compliance_score, assessment_result) VALUES (?, ?, ?, ?)',
                    [req.user.id, businessId, score, JSON.stringify({ note: 'Automated Rule Evaluation', total, compliantCount })]
                );
            } else {
                await db.query(
                    'INSERT INTO assessments (user_id, business_id, assessment_result) VALUES (?, ?, ?)',
                    [req.user.id, businessId, JSON.stringify({ note: 'Automated Rule Evaluation', total, compliantCount, compliance_score: score })]
                );
            }
        } catch (e) {
            console.warn('[ComplianceController] Save historical assessment notice:', e.message);
        }

        res.json({ message: 'Compliance evaluated', compliance_score: score, applicable_count: total });

    } catch (error) {
        console.error('Evaluate Compliance Error:', error);
        res.status(500).json({ 
            message: 'An internal server error occurred. Please try again later.',
            detail: error.message 
        });
    }
};

// @desc    Get detailed compliance status for a business
// @route   GET /api/compliance/business/:businessId
// @access  Private
const getCompliance = async (req, res) => {
    try {
        const businessId = req.params.businessId;

        const [biz] = await db.query('SELECT * FROM businesses WHERE id = ?', [businessId]);
        if (biz.length === 0) return res.status(404).json({ message: 'Business not found' });

        if (req.user.role === 'business_owner' && biz[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const business = biz[0];

        // Safe reconciliation: ensure newly applicable requirements appear in business_requirements without resetting existing progress
        const [rules] = await db.query('SELECT * FROM permit_requirements');
        const applicableRules = rules.filter(rule => evaluateConditionForCompliance(rule, business));
        
        if (applicableRules.length > 0) {
            const [existingRows] = await db.query('SELECT requirement_id FROM business_requirements WHERE business_id = ?', [businessId]);
            const existingSet = new Set(existingRows.map(r => r.requirement_id));

            for (const rule of applicableRules) {
                if (!existingSet.has(rule.id)) {
                    await db.query(
                        'INSERT IGNORE INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
                        [businessId, rule.id, 'Missing']
                    );
                }
            }
        }

        // Detect available columns to avoid errors on older Railway schemas
        let brCols = new Set();
        try {
            const [cols] = await db.query(`SHOW COLUMNS FROM \`business_requirements\``);
            brCols = new Set(cols.map(c => c.Field));
        } catch (e) {}

        let prCols = new Set();
        try {
            const [cols] = await db.query(`SHOW COLUMNS FROM \`permit_requirements\``);
            prCols = new Set(cols.map(c => c.Field));
        } catch (e) {}

        let hasDocsTable = false;
        try {
            const [tbls] = await db.query(`SHOW TABLES LIKE 'documents'`);
            hasDocsTable = tbls.length > 0;
        } catch (e) {}

        let hasComplianceScore = false;
        try {
            const [aCols] = await db.query(`SHOW COLUMNS FROM \`assessments\` LIKE 'compliance_score'`);
            hasComplianceScore = aCols.length > 0;
        } catch (e) {}

        // Dynamic column selectors
        const hasDocumentId = brCols.has('document_id');
        const hasRemarks = brCols.has('remarks');
        const hasCreatedAt = brCols.has('created_at');
        const hasUpdatedAt = brCols.has('updated_at');
        const hasBploStatus = brCols.has('bplo_status');
        const hasBploNotes = brCols.has('bplo_notes');
        const hasBploVerifiedAt = brCols.has('bplo_verified_at');
        const hasBploVerifiedBy = brCols.has('bplo_verified_by');
        const hasIsMandatory = prCols.has('is_mandatory');
        const hasPrDesc = prCols.has('description');

        const docIdSelect = hasDocumentId ? 'br.document_id,' : 'NULL AS document_id,';
        const remarksSelect = hasRemarks ? 'br.remarks,' : 'NULL AS remarks,';
        const createdAtSelect = hasCreatedAt ? 'br.created_at,' : 'NULL AS created_at,';
        const updatedAtSelect = hasUpdatedAt ? 'br.updated_at,' : 'NULL AS updated_at,';
        const bploStatusSelect = hasBploStatus ? 'br.bplo_status,' : '"AI Suggested" AS bplo_status,';
        const bploNotesSelect = hasBploNotes ? 'br.bplo_notes,' : 'NULL AS bplo_notes,';
        const bploVerifiedAtSelect = hasBploVerifiedAt ? 'br.bplo_verified_at,' : 'NULL AS bplo_verified_at,';
        const bploVerifiedBySelect = hasBploVerifiedBy ? 'br.bplo_verified_by,' : 'NULL AS bplo_verified_by,';
        const isMandatorySelect = hasIsMandatory ? 'pr.is_mandatory,' : '1 AS is_mandatory,';
        const prDescSelect = hasPrDesc ? 'pr.description,' : 'NULL AS description,';

        const canJoinDocs = hasDocumentId && hasDocsTable;
        const docJoin = canJoinDocs ? 'LEFT JOIN documents d ON br.document_id = d.id' : '';
        const docFieldsSelect = canJoinDocs
            ? 'd.document_name, d.file_path'
            : 'NULL AS document_name, NULL AS file_path';

        const [checklist] = await db.query(`
            SELECT br.id, br.business_id, br.requirement_id, br.status,
                   ${docIdSelect}
                   ${remarksSelect}
                   ${createdAtSelect}
                   ${updatedAtSelect}
                   ${bploStatusSelect}
                   ${bploNotesSelect}
                   ${bploVerifiedAtSelect}
                   ${bploVerifiedBySelect}
                   pr.permit_name, ${prDescSelect} ${isMandatorySelect}
                   ${docFieldsSelect}
            FROM business_requirements br
            JOIN permit_requirements pr ON br.requirement_id = pr.id
            ${docJoin}
            WHERE br.business_id = ?
            ORDER BY pr.id ASC
        `, [businessId]);

        // Get latest score (safely)
        let score = 0;
        if (hasComplianceScore) {
            try {
                const [scoreRows] = await db.query(
                    'SELECT compliance_score FROM assessments WHERE business_id = ? ORDER BY created_at DESC LIMIT 1',
                    [businessId]
                );
                score = scoreRows.length > 0 ? (scoreRows[0].compliance_score || 0) : 0;
            } catch (e) {
                score = 0;
            }
        } else if (checklist.length > 0) {
            const compliant = checklist.filter(c => ['Approved', 'Submitted', 'Have'].includes(c.status)).length;
            score = Math.round((compliant / checklist.length) * 100);
        }

        res.json({
            business_id: businessId,
            compliance_score: score,
            checklist
        });

    } catch (error) {
        console.error('getCompliance error:', error);
        res.status(500).json({ 
            message: 'An internal server error occurred. Please try again later.',
            detail: error.message 
        });
    }
};


// @desc    Update a specific requirement status
// @route   PUT /api/compliance/business/:businessId/requirement/:requirementId
// @access  Private
const updateRequirementStatus = async (req, res) => {
    try {
        const { businessId, requirementId } = req.params;
        const { status } = req.body;

        // Verify ownership
        const [biz] = await db.query('SELECT user_id FROM businesses WHERE id = ?', [businessId]);
        if (biz.length === 0) return res.status(404).json({ message: 'Business not found' });
        
        if (req.user.role === 'business_owner' && biz[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this business' });
        }

        // Validate status
        if (!['Missing', 'Submitted', 'Approved', 'Have', 'Not Required'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if requirement exists for business
        const [existing] = await db.query('SELECT * FROM business_requirements WHERE business_id = ? AND requirement_id = ?', [businessId, requirementId]);
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Requirement not found for this business' });
        }

        try {
            await db.query(
                'UPDATE business_requirements SET status = ? WHERE business_id = ? AND requirement_id = ?',
                [status, businessId, requirementId]
            );
        } catch (updateErr) {
            if (updateErr.message && (updateErr.message.includes('enum') || updateErr.message.includes('Data truncated'))) {
                try {
                    await db.query(`ALTER TABLE \`business_requirements\` MODIFY COLUMN status ENUM('Missing', 'Submitted', 'Approved', 'Rejected', 'Expired', 'Have', 'Not Required') DEFAULT 'Missing'`);
                    await db.query(
                        'UPDATE business_requirements SET status = ? WHERE business_id = ? AND requirement_id = ?',
                        [status, businessId, requirementId]
                    );
                } catch (retryErr) {
                    throw retryErr;
                }
            } else {
                throw updateErr;
            }
        }

        res.json({ message: 'Status updated successfully', status });
    } catch (error) {
        console.error('Update Requirement Error:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            detail: error.message 
        });
    }
};

// @desc    BPLO verifies/updates a requirement for a business
// @route   PUT /api/compliance/business/:bizId/requirement/:reqId/bplo-verify
// @access  Admin only (lgu_admin, system_admin)
const bploVerifyRequirement = async (req, res) => {
    try {
        const { bizId, reqId } = req.params;
        const { bplo_status, bplo_notes } = req.body;

        const validStatuses = ['AI Suggested', 'BPLO Verified', 'Not Required', 'Needs Review'];
        if (!validStatuses.includes(bplo_status)) {
            return res.status(400).json({ message: 'Invalid bplo_status value' });
        }

        const [biz] = await db.query('SELECT id FROM businesses WHERE id = ?', [bizId]);
        if (biz.length === 0) return res.status(404).json({ message: 'Business not found' });

        const [req_row] = await db.query(
            'SELECT id FROM business_requirements WHERE business_id = ? AND requirement_id = ?',
            [bizId, reqId]
        );
        if (req_row.length === 0) return res.status(404).json({ message: 'Requirement not found for this business' });

        // Ensure BPLO columns exist before updating
        try {
            const [bploCols] = await db.query(`SHOW COLUMNS FROM \`business_requirements\` LIKE 'bplo_status'`);
            if (bploCols.length === 0) {
                await db.query(`ALTER TABLE \`business_requirements\` ADD COLUMN bplo_status ENUM('AI Suggested', 'BPLO Verified', 'Not Required', 'Needs Review') NOT NULL DEFAULT 'AI Suggested'`);
                await db.query(`ALTER TABLE \`business_requirements\` ADD COLUMN bplo_notes TEXT NULL`);
                await db.query(`ALTER TABLE \`business_requirements\` ADD COLUMN bplo_verified_at TIMESTAMP NULL`);
                await db.query(`ALTER TABLE \`business_requirements\` ADD COLUMN bplo_verified_by INT NULL`);
            }
        } catch (colErr) {
            console.warn('[bploVerifyRequirement] Ensure columns notice:', colErr.message);
        }

        await db.query(
            `UPDATE business_requirements 
             SET bplo_status = ?, bplo_notes = ?, bplo_verified_at = NOW(), bplo_verified_by = ?
             WHERE business_id = ? AND requirement_id = ?`,
            [bplo_status, bplo_notes || null, req.user.id, bizId, reqId]
        );

        res.json({ message: 'Requirement BPLO status updated', bplo_status, bplo_notes });
    } catch (error) {
        console.error('BPLO Verify Error:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            detail: error.message 
        });
    }
};

module.exports = { evaluateCompliance, getCompliance, updateRequirementStatus, bploVerifyRequirement };

