const db = require('../config/db');

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

        const applicableRules = rules.filter(rule => {
            // Rule Engine Logic
            if (rule.condition_field === 'always') return true;
            
            // e.g., condition_field = 'industry_category', condition_value = 'Food & Beverage'
            const businessValue = business[rule.condition_field];
            
            if (businessValue !== undefined) {
                // simple string match for now
                return String(businessValue).toLowerCase() === String(rule.condition_value).toLowerCase();
            }
            return false;
        });

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
                await db.query(
                    'INSERT INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
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

        // Get checklist
        const [checklist] = await db.query(`
            SELECT br.*, pr.permit_name, pr.description, pr.is_mandatory, d.document_name, d.file_path 
            FROM business_requirements br
            JOIN permit_requirements pr ON br.requirement_id = pr.id
            LEFT JOIN documents d ON br.document_id = d.id
            WHERE br.business_id = ?
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

module.exports = { evaluateCompliance, getCompliance };
