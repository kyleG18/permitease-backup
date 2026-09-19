const db = require('../config/db');
const { generateStructuredAssessment } = require('../services/aiService');

// @desc    Create an assessment / get permit recommendations based on description
// @route   POST /api/assessments
// @access  Private
const createAssessment = async (req, res) => {
    try {
        const { business_description, business_id } = req.body;

        let descriptionToUse = business_description;
        let resolvedBusinessId = business_id || null;

        // If a business_id was provided, fetch the profile and build description automatically
        if (business_id) {
            const [businesses] = await db.query(
                'SELECT * FROM businesses WHERE id = ? AND user_id = ?',
                [business_id, req.user.id]
            );
            if (businesses.length === 0) {
                return res.status(404).json({ message: 'Business profile not found.' });
            }
            const biz = businesses[0];
            // Build a rich description from the actual business profile data
            const parts = [
                `Business name: ${biz.business_name}.`,
                `Type of business: ${biz.business_type}.`,
                `Industry/Category: ${biz.industry_category}.`,
                biz.business_description ? `Description of activities: ${biz.business_description}.` : null,
                biz.address ? `Located at: ${biz.address}.` : null,
                biz.employees ? `Number of employees: ${biz.employees}.` : null,
                biz.floor_area ? `Floor area: ${biz.floor_area} sqm.` : null,
                biz.capitalization ? `Capitalization: PHP ${Number(biz.capitalization).toLocaleString()}.` : null,
                biz.gross_sales ? `Gross sales: PHP ${Number(biz.gross_sales).toLocaleString()}.` : null,
                biz.business_status ? `Application type: ${biz.business_status}.` : null,
            ].filter(Boolean);
            descriptionToUse = parts.join(' ');
        }

        if (!descriptionToUse || !descriptionToUse.trim()) {
            return res.status(400).json({ message: 'A business profile or description is required.' });
        }

        if (descriptionToUse.length > 2000) {
            descriptionToUse = descriptionToUse.substring(0, 2000);
        }

        // 1. Fetch all configured permit requirements
        const [allRequirements] = await db.query('SELECT permit_name, description, condition_field, condition_value, applicable_business_type, required_documents FROM permit_requirements');

        // 2. Call AI Service to classify and assess
        let aiResult;
        try {
            aiResult = await generateStructuredAssessment(descriptionToUse, allRequirements);
        } catch (aiError) {
            return res.status(503).json({ message: aiError.message });
        }

        // 3. Cross-reference AI classification with actual database rules
        const predictedIndustry = aiResult.industry_category;
        const predictedType = aiResult.business_type;

        const officialRequirements = [];
        for (const reqRule of allRequirements) {
            let applicable = false;
            if (reqRule.condition_field === 'always') {
                applicable = true;
            } else if (reqRule.condition_field === 'industry_category' &&
                     String(reqRule.condition_value).toLowerCase() === String(predictedIndustry).toLowerCase()) {
                applicable = true;
            } else if (reqRule.condition_field === 'business_type' &&
                     String(reqRule.condition_value).toLowerCase() === String(predictedType).toLowerCase()) {
                applicable = true;
            }
            if (applicable) {
                officialRequirements.push({
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

        res.status(201).json({
            id: inserted.insertId,
            ai_assessment: aiResult,
            official_assessment: officialRequirements
        });

    } catch (error) {
        console.error('[AssessmentController] createAssessment error:', error.message);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get all assessments for user
// @route   GET /api/assessments
// @access  Private
const getAssessments = async (req, res) => {
    try {
        // Fetch all assessments (both business-linked and description-based)
        const [assessments] = await db.query(
            `SELECT a.*, b.business_name FROM assessments a LEFT JOIN businesses b ON a.business_id = b.id WHERE a.user_id = ? ORDER BY a.created_at DESC`,
            [req.user.id]
        );
        res.json(assessments);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get single assessment
// @route   GET /api/assessments/:id
// @access  Private
const getAssessment = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM assessments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Assessment not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { createAssessment, getAssessments, getAssessment };
