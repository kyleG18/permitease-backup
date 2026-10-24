const db = require('../config/db');
const { generateStructuredAssessment } = require('../services/aiService');

// @desc    Create an assessment / get permit recommendations based on description
// @route   POST /api/assessments
// @access  Private
const createAssessment = async (req, res) => {
    try {
        const { business_description, business_id } = req.body;

        let bizObject = null;       // full business row — passed to AI for PSGC & new-field checks
        let descriptionToUse = business_description;  // fallback for manual text entry
        let resolvedBusinessId = business_id || null;

        // If a business_id was provided, fetch the full profile
        if (business_id) {
            let bizQuery = 'SELECT * FROM businesses WHERE id = ?';
            let bizParams = [business_id];
            if (req.user.role === 'business_owner') {
                bizQuery += ' AND user_id = ?';
                bizParams.push(req.user.id);
            }
            const [businesses] = await db.query(bizQuery, bizParams);
            if (businesses.length === 0) {
                return res.status(404).json({ message: 'Business profile not found.' });
            }
            const biz = businesses[0];
            bizObject = { ...biz };

            // Parse stored JSON fields
            if (biz.business_characteristics && typeof biz.business_characteristics === 'string') {
                try { bizObject.business_characteristics = JSON.parse(biz.business_characteristics); } catch(e) {}
            }

            // Build human-readable summary as supplementary context
            const parts = [
                `Business name: ${biz.business_name}.`,
                `Type: ${biz.business_type}.`,
                `Category: ${biz.industry_category}.`,
                biz.ownership_type ? `Ownership: ${biz.ownership_type}.` : null,
                biz.primary_products ? `Primary products/services: ${biz.primary_products}.` : null,
                biz.business_description ? `Operations: ${biz.business_description}.` : null,
                biz.premises_type ? `Premises: ${biz.premises_type}.` : null,
                biz.employees ? `Employees: ${biz.employees}.` : null,
                biz.floor_area ? `Floor area: ${biz.floor_area} sqm.` : null,
                biz.capitalization ? `Capitalization: PHP ${Number(biz.capitalization).toLocaleString()}.` : null,
                biz.gross_sales ? `Gross sales: PHP ${Number(biz.gross_sales).toLocaleString()}.` : null,
                biz.business_status ? `Application type: ${biz.business_status}.` : null,
            ].filter(Boolean);
            descriptionToUse = parts.join(' ');
            bizObject._textSummary = descriptionToUse;
        }

        if (!descriptionToUse || !descriptionToUse.trim()) {
            return res.status(400).json({ message: 'A business profile or description is required.' });
        }

        // 1. Fetch all configured permit requirements
        const [allRequirements] = await db.query('SELECT id, permit_name, description, condition_field, condition_value, applicable_business_type, required_documents FROM permit_requirements');

        // 2. Call AI Service to classify and assess
        let aiResult;
        try {
            aiResult = await generateStructuredAssessment(bizObject || descriptionToUse, allRequirements);
        } catch (aiError) {
            return res.status(503).json({ message: aiError.message });
        }

        // 3. Cross-reference AI classification and authoritative profile with actual database rules
        const predictedIndustry = aiResult.industry_category;
        const predictedType = aiResult.business_type;

        // Canonical mapping from simplified AI categories to canonical business types
        const AI_CATEGORY_TO_CANONICAL = {
            'food & beverage': 'Food & Beverage',
            'retail': 'Retail & Trading',
            'services': 'Services (Personal & Professional)',
            'manufacturing': 'Manufacturing & Processing',
            'agriculture': 'Agriculture, Fishery & Aquaculture',
            'others': 'Others',
        };
        const canonicalCategoryFromAI = AI_CATEGORY_TO_CANONICAL[String(predictedIndustry || '').trim().toLowerCase()] || '';

        // Canonical mapping for simplified AI business types (from aiService prompt examples)
        const AI_TYPE_TO_CANONICAL = {
            'restaurant': 'Restaurant / Full-Service Eatery',
            'cafe': 'Cafe / Coffee Shop',
            'fast food': 'Fast Food / Quick Service',
            'carenderia': 'Carenderia / Turo-Turo',
            'sari-sari store': 'Sari-Sari Store',
            'hotel': 'Hotel / Inn',
            'resort': 'Resort / Beach Resort',
            'hostel': 'Pension House / Hostel',
        };
        const canonicalTypeFromAI = AI_TYPE_TO_CANONICAL[String(predictedType || '').trim().toLowerCase()] || '';

        const APP_TYPE_TO_STATUS = {
            'NEW': 'New Application',
            'RENEWAL': 'Renewal',
        };

        const officialRequirements = [];
        for (const reqRule of allRequirements) {
            let applicable = false;
            const cf = (reqRule.condition_field || '').trim();
            const cv = (reqRule.condition_value || '').trim();

            if (cf === 'always' || !cf) {
                applicable = true;
            } else if (cf === 'industry_category') {
                const bizInd = bizObject ? (bizObject.industry_category || '').trim().toLowerCase() : '';
                const predInd = String(predictedIndustry || '').trim().toLowerCase();
                const canonCat = canonicalCategoryFromAI.toLowerCase();
                const cvLower = cv.toLowerCase();
                applicable = cvLower === bizInd || cvLower === predInd || cvLower === canonCat;
            } else if (cf === 'business_type_contains') {
                // Pipe-separated token list — matches against authoritative bizObject fields, AI predictions, or canonical mappings
                const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
                const pt = (predictedType     || '').trim().toLowerCase();
                const pi = (predictedIndustry || '').trim().toLowerCase();
                const canonCat  = canonicalCategoryFromAI.toLowerCase();
                const canonType = canonicalTypeFromAI.toLowerCase();
                const bt = bizObject ? (bizObject.business_type     || '').trim().toLowerCase() : '';
                const bi = bizObject ? (bizObject.industry_category || '').trim().toLowerCase() : '';
                applicable = tokens.some(t => t === pt || t === pi || t === canonCat || t === canonType || t === bt || t === bi);
            } else if (cf === 'premises_type') {
                // The business object (bizObject) has the actual stored premises_type if available
                if (bizObject && bizObject.premises_type) {
                    applicable = (bizObject.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
                }
            } else if (cf === 'business_status') {
                // Support business_status (AITR for Renewal, Building Permit/Zoning for New Application)
                const rawStatus = (bizObject && bizObject.business_status) ||
                                  req.body.business_status ||
                                  req.body.application_type;
                const statusToMatch = (rawStatus && (APP_TYPE_TO_STATUS[rawStatus.toUpperCase()] || rawStatus)) || '';
                if (statusToMatch) {
                    applicable = statusToMatch.trim().toLowerCase() === cv.toLowerCase();
                }
            }

            if (applicable) {
                officialRequirements.push({ requirement_id: reqRule.id,
                    permit_name: reqRule.permit_name,
                    description: reqRule.description,
                    required_documents: reqRule.required_documents
                });
            }
        }

        // 4. Save assessment — linked to business if business_id was given
        const assessmentPayload = {
            ai_assessment: aiResult,
            official_assessment: officialRequirements
        };

        
        const [inserted] = await db.query(
            'INSERT INTO assessments (user_id, business_id, assessment_result, compliance_score) VALUES (?, ?, ?, ?)',
            [req.user.id, resolvedBusinessId, JSON.stringify(assessmentPayload), 0]
        );

        // Populate business_requirements for the UI
        if (resolvedBusinessId && officialRequirements.length > 0) {
            // First get existing to not overwrite status
            const [existingReqs] = await db.query('SELECT requirement_id, status FROM business_requirements WHERE business_id = ?', [resolvedBusinessId]);
            const existingMap = new Map(existingReqs.map(r => [r.requirement_id, r.status]));

            for (const req of officialRequirements) {
                if (!existingMap.has(req.requirement_id)) {
                    await db.query(
                        'INSERT IGNORE INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
                        [resolvedBusinessId, req.requirement_id, 'Missing']
                    );
                }
            }
        }


        res.status(201).json({
            id: inserted.insertId,
            ai_assessment: aiResult,
            official_assessment: officialRequirements
        });

    } catch (error) {
        console.error('[AssessmentController] createAssessment error:', error);
        res.status(500).json({ 
            message: 'An internal server error occurred. Please try again later.',
            detail: error.message 
        });
    }
};

// @desc    Get all assessments
// @route   GET /api/assessments
// @access  Private
const getAssessments = async (req, res) => {
    try {
        let query = `SELECT a.*, b.business_name FROM assessments a LEFT JOIN businesses b ON a.business_id = b.id`;
        const params = [];
        if (req.user.role === 'business_owner') {
            query += ` WHERE a.user_id = ?`;
            params.push(req.user.id);
        }
        query += ` ORDER BY a.created_at DESC`;
        const [assessments] = await db.query(query, params);
        res.json(assessments);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            message: 'An internal server error occurred. Please try again later.',
            detail: error.message 
        });
    }
};

// @desc    Get single assessment
// @route   GET /api/assessments/:id
// @access  Private
const getAssessment = async (req, res) => {
    try {
        let query = 'SELECT * FROM assessments WHERE id = ?';
        const params = [req.params.id];
        if (req.user.role === 'business_owner') {
            query += ' AND user_id = ?';
            params.push(req.user.id);
        }
        const [rows] = await db.query(query, params);
        if (rows.length === 0) return res.status(404).json({ message: 'Assessment not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            message: 'An internal server error occurred. Please try again later.',
            detail: error.message 
        });
    }
};

module.exports = { createAssessment, getAssessments, getAssessment };
