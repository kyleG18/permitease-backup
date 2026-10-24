const db = require('../config/db');
const { calculateFeesCore, APP_TYPE_TO_STATUS } = require('./feeController');

/**
 * Evaluate a requirement condition against the business profile.
 *
 * Supported condition_field values:
 *   'always'               — always applicable
 *   'industry_category'    — exact match on business.industry_category
 *   'business_status'      — exact match on appTypeStatus ('New Application' | 'Renewal')
 *   'premises_type'        — case-insensitive exact match on business.premises_type
 *   'business_type_contains' — pipe-separated list; matches if any token equals
 *                             business.business_type OR business.industry_category
 *                             (case-insensitive full-value comparison, not substring)
 *
 * Unknown condition_field → returns false (not applicable).
 */
function evaluateRequirementCondition(reqRule, business, appTypeStatus) {
    const cf = (reqRule.condition_field || '').trim();
    const cv = (reqRule.condition_value || '').trim();

    if (!cf || cf === 'always') return true;

    if (cf === 'industry_category') {
        return (business.industry_category || '').trim() === cv;
    }

    if (cf === 'business_status') {
        return (appTypeStatus || '').trim() === cv;
    }

    if (cf === 'premises_type') {
        return (business.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
    }

    // business_type_contains: pipe-separated list of values.
    // A token matches if it equals business.business_type OR business.industry_category
    // (case-insensitive full-value match — no substring matching to avoid false positives).
    if (cf === 'business_type_contains') {
        const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
        const bizType = (business.business_type || '').trim().toLowerCase();
        const indCat  = (business.industry_category || '').trim().toLowerCase();
        return tokens.some(t => t === bizType || t === indCat);
    }

    return false; // unknown condition_field → not applicable
}

// @desc    Calculate permit readiness for a business
// @route   GET /api/readiness/:businessId?application_type=NEW
// @access  Private
const getReadiness = async (req, res) => {
    try {
        const businessId = parseInt(req.params.businessId, 10);
        let applicationType = req.query.application_type ? req.query.application_type.toUpperCase() : null;
        let appTypeStatus = 'New Application';
        if (applicationType) {
            if (!['NEW', 'RENEWAL'].includes(applicationType)) {
                return res.status(400).json({ message: 'application_type must be NEW or RENEWAL.' });
            }
            appTypeStatus = APP_TYPE_TO_STATUS[applicationType] || applicationType;
        }

        const [bizRows] = await db.query('SELECT * FROM businesses WHERE id = ?', [businessId]);
        if (bizRows.length === 0) return res.status(404).json({ message: 'Business not found' });
        
        const business = bizRows[0];
        if (req.user.role === 'business_owner' && business.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // If application_type query param was not explicitly provided, use stored business.business_status
        if (!applicationType && business.business_status) {
            appTypeStatus = business.business_status.trim();
            applicationType = (appTypeStatus === 'Renewal' || appTypeStatus === 'RENEWAL') ? 'RENEWAL' : 'NEW';
        } else if (!applicationType) {
            applicationType = 'NEW';
        }

        const categories = [];
        const actionRequired = [];
        let earnedPoints = 0;
        let totalPoints = 0;

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

        // --- 2. Requirements Checklist (Has the owner reviewed and toggled their requirements?) ---
        const [allReqRules] = await db.query('SELECT * FROM permit_requirements');
        const applicableRequirements = allReqRules.filter(r => evaluateRequirementCondition(r, business, appTypeStatus));
        
        const [bizReqs] = await db.query('SELECT * FROM business_requirements WHERE business_id = ?', [businessId]);
        const haveDocs = bizReqs.filter(br => br.status === 'Submitted' || br.status === 'Approved').map(br => br.requirement_id);
        
        const missingDocs = applicableRequirements.filter(ar => !haveDocs.includes(ar.id));
        const reviewedCount = applicableRequirements.length - missingDocs.length;

        // Requirements category — 50 points total (replacing the old 20+40 split)
        // Partial credit: each requirement marked 'HAVE' earns proportional points
        totalPoints += 50;
        if (applicableRequirements.length > 0) {
            const reqScore = Math.floor((reviewedCount / applicableRequirements.length) * 50);
            if (missingDocs.length === 0) {
                categories.push({ label: 'Requirements Checklist', status: 'Complete', max: 50, score: 50, detail: `${reviewedCount} of ${applicableRequirements.length} requirement(s) marked as prepared` });
                earnedPoints += 50;
            } else {
                categories.push({ label: 'Requirements Checklist', status: 'Incomplete', max: 50, score: reqScore, detail: `${reviewedCount} of ${applicableRequirements.length} requirement(s) marked as prepared` });
                earnedPoints += reqScore;
                missingDocs.forEach(md => {
                    actionRequired.push({ type: 'requirement', text: `"${md.permit_name}" — mark as prepared once you have this ready.`, actionText: 'Go to Permit Readiness', link: '/readiness', document_name: md.permit_name, requirement_id: md.id });
                });
            }
        } else {
            categories.push({ label: 'Requirements Checklist', status: 'Incomplete', max: 50, score: 0, detail: 'No applicable permit requirements found. Contact the BPLO.' });
            actionRequired.push({ type: 'profile', text: 'No permit requirements are configured for your business type.', actionText: 'Update Profile', link: '/profile' });
        }

        // Document uploads are optional — shown as informational only, not scored
        const uploadedCount = bizReqs.filter(br => br.document_id != null).length;
        const uploadNote = uploadedCount > 0
            ? `${uploadedCount} document scan(s) uploaded. Uploads are optional — physical documents must be presented in person at the BPLO.`
            : 'Document uploads are optional. You may upload scans for your own reference.';
        categories.push({ label: 'Document Uploads (Optional)', status: uploadedCount > 0 ? 'Complete' : 'Optional', max: 0, score: 0, detail: uploadNote });

        // --- 3. Fees ---
        const [feeRules] = await db.query('SELECT * FROM tax_fee_rules WHERE is_active = 1 ORDER BY category, id');
        const feeData = calculateFeesCore(business, appTypeStatus, feeRules);
        
        totalPoints += 25;
        if (!feeData.is_incomplete) {
            categories.push({ label: 'Fee Estimation', status: 'Complete', max: 25, score: 25, detail: 'Fee estimate computed. Visit the BPLO for the official assessment.' });
            earnedPoints += 25;
        } else {
            categories.push({ label: 'Fee Estimation', status: 'Incomplete', max: 25, score: 0, detail: 'Update your business profile to compute the fee estimate.' });
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
                categories.push({ label: 'Existing Permits', status: 'Complete', max: 20, score: 20, detail: `${permits.length} valid permit(s) recorded.` });
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

        res.json({
            business_id: businessId,
            business_name: business.business_name,
            application_type: applicationType,
            readiness_score: readinessPercentage,
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
