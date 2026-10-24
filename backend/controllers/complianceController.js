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
        await db.query(
            'INSERT INTO assessments (user_id, business_id, compliance_score, assessment_result) VALUES (?, ?, ?, ?)',
            [req.user.id, businessId, score, JSON.stringify({ note: 'Automated Rule Evaluation', total, compliantCount })]
        );

        res.json({ message: 'Compliance evaluated', compliance_score: score, applicable_count: total });

    } catch (error) {
        console.error('Evaluate Compliance Error:', error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
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

        // Get checklist
        const [checklist] = await db.query(`
            SELECT br.*, pr.permit_name, pr.description, pr.is_mandatory, d.document_name, d.file_path 
            FROM business_requirements br
            JOIN permit_requirements pr ON br.requirement_id = pr.id
            LEFT JOIN documents d ON br.document_id = d.id
            WHERE br.business_id = ?
            ORDER BY pr.id ASC
        `, [businessId]);

        // Get latest score
        const [assessments] = await db.query(
            'SELECT compliance_score FROM assessments WHERE business_id = ? ORDER BY created_at DESC LIMIT 1',
            [businessId]
        );

        const score = assessments.length > 0 ? assessments[0].compliance_score : 0;

        res.json({
            business_id: businessId,
            compliance_score: score,
            checklist
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
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
        if (!['Missing', 'Submitted', 'Approved'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if requirement exists for business
        const [existing] = await db.query('SELECT * FROM business_requirements WHERE business_id = ? AND requirement_id = ?', [businessId, requirementId]);
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Requirement not found for this business' });
        }

        await db.query(
            'UPDATE business_requirements SET status = ? WHERE business_id = ? AND requirement_id = ?',
            [status, businessId, requirementId]
        );

        res.json({ message: 'Status updated successfully', status });
    } catch (error) {
        console.error('Update Requirement Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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

        await db.query(
            `UPDATE business_requirements 
             SET bplo_status = ?, bplo_notes = ?, bplo_verified_at = NOW(), bplo_verified_by = ?
             WHERE business_id = ? AND requirement_id = ?`,
            [bplo_status, bplo_notes || null, req.user.id, bizId, reqId]
        );

        res.json({ message: 'Requirement BPLO status updated', bplo_status, bplo_notes });
    } catch (error) {
        console.error('BPLO Verify Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { evaluateCompliance, getCompliance, updateRequirementStatus, bploVerifyRequirement };

