const db = require('../config/db');
const { calculateFeesCore, APP_TYPE_TO_STATUS } = require('./feeController');

/**
 * Evaluate a requirement condition against the business profile.
 */
function evaluateRequirementCondition(reqRule, business, appTypeStatus) {
    const cf = reqRule.condition_field;
    const cv = reqRule.condition_value;
  
    if (!cf || cf === 'always' || cf === '') return true;
  
    if (cf === 'industry_category') {
      return business.industry_category === cv;
    }
  
    if (cf === 'business_status') {
      return appTypeStatus === cv;
    }
  
    return false;
}

// @desc    Calculate permit readiness for a business
// @route   GET /api/readiness/:businessId?application_type=NEW
// @access  Private
const getReadiness = async (req, res) => {
    try {
        const businessId = parseInt(req.params.businessId, 10);
        const applicationType = req.query.application_type || 'NEW';
        
        if (!['NEW', 'RENEWAL'].includes(applicationType)) {
            return res.status(400).json({ message: 'application_type must be NEW or RENEWAL.' });
        }

        const [bizRows] = await db.query('SELECT * FROM businesses WHERE id = ?', [businessId]);
        if (bizRows.length === 0) return res.status(404).json({ message: 'Business not found' });
        
        const business = bizRows[0];
        if (req.user.role === 'business_owner' && business.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const categories = [];
        const actionRequired = [];
        let earnedScore = 0;

        const appTypeStatus = APP_TYPE_TO_STATUS[applicationType] || applicationType;

        // --- 1. Business Profile (20%) ---
        const reqFields = [
            { field: 'business_name', label: 'Business Name' },
            { field: 'business_type', label: 'Business Type' },
            { field: 'industry_category', label: 'Industry Category' },
            { field: 'address', label: 'Business Address' }
        ];
        
        const missingProfileFields = [];
        for (const rf of reqFields) {
            if (!business[rf.field] || String(business[rf.field]).trim() === '') {
                missingProfileFields.push(rf.label);
            }
        }

        if (missingProfileFields.length === 0) {
            categories.push({ label: 'Business Profile', status: 'Complete', score: 20, detail: 'All required fields are complete' });
            earnedScore += 20;
        } else {
            categories.push({ label: 'Business Profile', status: 'Incomplete', score: 0, detail: `${missingProfileFields.length} field(s) missing` });
            missingProfileFields.forEach(mf => {
                actionRequired.push({ type: 'profile', text: `Missing ${mf}`, actionText: 'Update Business Profile', link: '/profile' });
            });
        }

        // --- 2. Requirements (20%) ---
        // Determine which permit requirements actually apply to this business
        const [allReqRules] = await db.query('SELECT * FROM permit_requirements');
        const applicableRequirements = allReqRules.filter(r => evaluateRequirementCondition(r, business, appTypeStatus));
        
        if (applicableRequirements.length > 0) {
            categories.push({ label: 'Requirements', status: 'Complete', score: 20, detail: `${applicableRequirements.length} requirement(s) identified` });
            earnedScore += 20;
        } else {
            // If no requirements configured/applicable, it's not a block, just 20%
            categories.push({ label: 'Requirements', status: 'Complete', score: 20, detail: 'No specific requirements identified' });
            earnedScore += 20;
        }

        // --- 3. Documents (20%) ---
        const [bizReqs] = await db.query('SELECT * FROM business_requirements WHERE business_id = ?', [businessId]);
        const submittedDocIds = bizReqs.filter(br => br.status === 'Submitted' || br.status === 'Approved').map(br => br.requirement_id);
        
        let missingDocs = [];
        for (const ar of applicableRequirements) {
            if (!submittedDocIds.includes(ar.id)) {
                missingDocs.push({ id: ar.id, name: ar.permit_name });
            }
        }

        if (missingDocs.length === 0) {
            categories.push({ label: 'Documents', status: 'Complete', score: 20, detail: `${applicableRequirements.length}/${applicableRequirements.length} documents provided` });
            earnedScore += 20;
        } else {
            categories.push({ label: 'Documents', status: 'Incomplete', score: 0, detail: `${applicableRequirements.length - missingDocs.length}/${applicableRequirements.length} documents provided` });
            missingDocs.forEach(md => {
                actionRequired.push({ type: 'document', text: `${md.name} is missing.`, actionText: 'Upload Document', document_name: md.name, requirement_id: md.id });
            });
        }

        // --- 4. Fees (20%) ---
        const [feeRules] = await db.query('SELECT * FROM tax_fee_rules WHERE is_active = 1 ORDER BY category, id');
        const feeData = calculateFeesCore(business, appTypeStatus, feeRules);
        
        if (!feeData.is_incomplete) {
            categories.push({ label: 'Fees', status: 'Complete', score: 20, detail: 'Estimated successfully' });
            earnedScore += 20;
        } else {
            categories.push({ label: 'Fees', status: 'Incomplete', score: 0, detail: 'Fee assessment incomplete' });
            feeData.missing_info_reasons.forEach(mr => {
                actionRequired.push({ type: 'fee', text: mr, actionText: 'Update Business Profile', link: '/profile' });
            });
        }

        // --- 5. Existing Permits (20%) ---
        const [permits] = await db.query(
            `SELECT * FROM permits WHERE business_id = ? AND status = 'Approved' AND (expiration_date IS NULL OR expiration_date >= CURDATE())`,
            [businessId]
        );
        const hasValidPermit = permits.length > 0;
        
        if (applicationType === 'NEW') {
            categories.push({ label: 'Existing Permits', status: 'Complete', score: 20, detail: 'No blocking issue detected' });
            earnedScore += 20;
        } else {
            // For renewal, use the existing logic mapping
            if (hasValidPermit) {
                categories.push({ label: 'Existing Permits', status: 'Complete', score: 20, detail: `${permits.length} valid permit(s)` });
                earnedScore += 20;
            } else {
                categories.push({ label: 'Existing Permits', status: 'Incomplete', score: 0, detail: 'No valid permit found for renewal' });
                actionRequired.push({ type: 'permit', text: 'No active permit found to renew.', actionText: 'View Permits', link: '/permits' });
            }
        }

        // --- Overall State ---
        let overallState = 'READY';
        let recommendation = 'Your application has the required information and documents needed for submission.';
        
        if (earnedScore < 100 && earnedScore >= 60) {
            overallState = 'READY_WITH_ACTIONS';
            recommendation = 'Complete the remaining items before submitting your application.';
        } else if (earnedScore < 60) {
            overallState = 'NOT_READY';
            recommendation = 'Complete the required items before submitting your application.';
        }

        res.json({
            business_id: businessId,
            business_name: business.business_name,
            application_type: applicationType,
            readiness_score: earnedScore,
            overall_state: overallState,
            recommendation,
            categories,
            action_required: actionRequired,
            fee_assessment: feeData
        });

    } catch (error) {
        console.error('Readiness Error:', error);
        res.status(500).json({ message: 'Unable to calculate permit readiness.' });
    }
};

module.exports = { getReadiness };
