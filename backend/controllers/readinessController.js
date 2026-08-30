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
        let earnedPoints = 0;
        let totalPoints = 0;

        const appTypeStatus = APP_TYPE_TO_STATUS[applicationType] || applicationType;

        // --- 1. Business Profile ---
        totalPoints += 20;
        const reqFields = [
            { field: 'business_name', label: 'Business Name' },
            { field: 'business_type', label: 'Business Type' },
            { field: 'industry_category', label: 'Industry Category' },
            { field: 'address', label: 'Business Address' }
        ];
        
        const missingProfileFields = reqFields.filter(rf => !business[rf.field] || String(business[rf.field]).trim() === '');

        if (missingProfileFields.length === 0) {
            categories.push({ label: 'Business Profile', status: 'Complete', max: 20, score: 20, detail: 'All required fields are complete' });
            earnedPoints += 20;
        } else {
            categories.push({ label: 'Business Profile', status: 'Incomplete', max: 20, score: 0, detail: `${missingProfileFields.length} field(s) missing` });
            missingProfileFields.forEach(mf => {
                actionRequired.push({ type: 'profile', text: `Missing ${mf.label}`, actionText: 'Update Business Profile', link: '/profile' });
            });
        }

        // --- 2. Documents & Requirements (Combined conceptually for scoring) ---
        const [allReqRules] = await db.query('SELECT * FROM permit_requirements');
        const applicableRequirements = allReqRules.filter(r => evaluateRequirementCondition(r, business, appTypeStatus));
        
        const [bizReqs] = await db.query('SELECT * FROM business_requirements WHERE business_id = ?', [businessId]);
        const submittedDocIds = bizReqs.filter(br => br.status === 'Submitted' || br.status === 'Approved').map(br => br.requirement_id);
        
        const missingDocs = applicableRequirements.filter(ar => !submittedDocIds.includes(ar.id));

        // Requirements category (Is it known what they need?)
        totalPoints += 20;
        if (applicableRequirements.length > 0) {
            if (missingDocs.length === 0) {
                categories.push({ label: 'Requirements', status: 'Complete', max: 20, score: 20, detail: 'All requirements met' });
                earnedPoints += 20;
            } else {
                categories.push({ label: 'Requirements', status: 'Incomplete', max: 20, score: 0, detail: 'Pending requirement fulfillment' });
            }
        } else {
            categories.push({ label: 'Requirements', status: 'Incomplete', max: 20, score: 0, detail: 'No applicable permit requirements found. Contact the BPLO.' });
            actionRequired.push({ type: 'profile', text: 'No permit requirements are configured for your business type.', actionText: 'Update Profile', link: '/profile' });
        }

        // Documents category (Have they uploaded them?)
        totalPoints += 40; // Weight documents heavily
        if (missingDocs.length === 0 && applicableRequirements.length > 0) {
            categories.push({ label: 'Documents', status: 'Complete', max: 40, score: 40, detail: `${applicableRequirements.length}/${applicableRequirements.length} documents provided` });
            earnedPoints += 40;
        } else {
            const uploadedCount = applicableRequirements.length - missingDocs.length;
            const docScore = applicableRequirements.length > 0 ? Math.floor((uploadedCount / applicableRequirements.length) * 40) : 0;
            categories.push({ label: 'Documents', status: 'Incomplete', max: 40, score: docScore, detail: `${uploadedCount}/${applicableRequirements.length} documents provided` });
            earnedPoints += docScore;
            missingDocs.forEach(md => {
                actionRequired.push({ type: 'document', text: `${md.permit_name} is missing.`, actionText: 'Upload Document', document_name: md.permit_name, requirement_id: md.id });
            });
        }

        // --- 3. Fees ---
        const [feeRules] = await db.query('SELECT * FROM tax_fee_rules WHERE is_active = 1 ORDER BY category, id');
        const feeData = calculateFeesCore(business, appTypeStatus, feeRules);
        
        totalPoints += 20;
        // Fees should only give points if documents are also complete, otherwise they aren't "ready"
        if (!feeData.is_incomplete && missingDocs.length === 0) {
            categories.push({ label: 'Fees', status: 'Complete', max: 20, score: 20, detail: 'Estimated successfully' });
            earnedPoints += 20;
        } else if (!feeData.is_incomplete) {
            categories.push({ label: 'Fees', status: 'Incomplete', max: 20, score: 0, detail: 'Pending document completion' });
        } else {
            categories.push({ label: 'Fees', status: 'Incomplete', max: 20, score: 0, detail: 'Fee assessment incomplete' });
            feeData.missing_info_reasons.forEach(mr => {
                actionRequired.push({ type: 'fee', text: mr, actionText: 'Update Business Profile', link: '/profile' });
            });
        }

        // --- 4. Existing Permits (Only for Renewal) ---
        if (applicationType === 'RENEWAL') {
            totalPoints += 20;
            const [permits] = await db.query(
                `SELECT * FROM permits WHERE business_id = ? AND status = 'Approved' AND (expiration_date IS NULL OR expiration_date >= CURDATE())`,
                [businessId]
            );
            if (permits.length > 0) {
                categories.push({ label: 'Existing Permits', status: 'Complete', max: 20, score: 20, detail: `${permits.length} valid permit(s)` });
                earnedPoints += 20;
            } else {
                categories.push({ label: 'Existing Permits', status: 'Incomplete', max: 20, score: 0, detail: 'No valid permit found for renewal' });
                actionRequired.push({ type: 'permit', text: 'No active permit found to renew.', actionText: 'View Permits', link: '/permits' });
            }
        }

        // --- Overall State ---
        const readinessPercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        
        let overallState = 'READY';
        let recommendation = 'Your application has the required information and documents needed for submission.';
        
        if (readinessPercentage < 100 && readinessPercentage >= 80) {
            overallState = 'READY_WITH_ACTIONS';
            recommendation = 'Almost there! Complete the remaining items before submitting your application.';
        } else if (readinessPercentage < 80) {
            overallState = 'NOT_READY';
            recommendation = 'Complete the required items before submitting your application.';
        }

        // Only override to 0 if they genuinely haven't done any documents
        const displayScore = (missingDocs.length === applicableRequirements.length && applicableRequirements.length > 0) ? 0 : readinessPercentage;

        res.json({
            business_id: businessId,
            business_name: business.business_name,
            application_type: applicationType,
            readiness_score: displayScore,
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
