const db = require('../config/db');
const { generateStructuredAssessment } = require('../services/aiService');

// @desc    Create an assessment / get permit recommendations based on description
// @route   POST /api/assessments
// @access  Private
const createAssessment = async (req, res) => {
    try {
        const { business_description } = req.body;

        if (!business_description) {
            return res.status(400).json({ message: 'Business description is required.' });
        }

        if (business_description.length > 1000) {
            return res.status(400).json({ message: 'Description is too long. Maximum 1000 characters.' });
        }

        // 1. Fetch available permits for context (if needed by AI, though AI service gets it via description now)
        const [allRequirements] = await db.query('SELECT permit_name, description, condition_field, condition_value, applicable_business_type, required_documents FROM permit_requirements');

        // 2. Call AI Service to get structured prediction
        let aiResult;
        try {
            aiResult = await generateStructuredAssessment(business_description, allRequirements);
        } catch (aiError) {
            return res.status(503).json({ message: aiError.message });
        }

        // 3. Cross-reference AI classification with actual database rules
        const predictedIndustry = aiResult.industry_category;
        const predictedType = aiResult.business_type;

        // Deterministic PermitEase assessment based on AI's predicted industry
        const officialRequirements = [];
        
        for (const reqRule of allRequirements) {
            let applicable = false;
            
            // "always" applies to everyone
            if (reqRule.condition_field === 'always') {
                applicable = true;
            } 
            // matching industry category
            else if (reqRule.condition_field === 'industry_category' && 
                     String(reqRule.condition_value).toLowerCase() === String(predictedIndustry).toLowerCase()) {
                applicable = true;
            }
            // we could also match by business_type if they configured it that way
            else if (reqRule.condition_field === 'business_type' && 
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

        // 4. Save to assessments table for history (business_id is null)
        const assessmentPayload = {
            ai_assessment: aiResult,
            official_assessment: officialRequirements
        };

        const [inserted] = await db.query(
            'INSERT INTO assessments (user_id, business_id, assessment_result, compliance_score) VALUES (?, NULL, ?, ?)',
            [req.user.id, JSON.stringify(assessmentPayload), 0]
        );

        res.status(201).json({
            id: inserted.insertId,
            ai_assessment: aiResult,
            official_assessment: officialRequirements
        });

    } catch (error) {
        console.error('[AssessmentController] createAssessment error:', error.message);
        res.status(500).json({ message: 'Server error: ' + error.message });
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
        res.status(500).json({ message: 'Server error: ' + error.message });
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
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

module.exports = { createAssessment, getAssessments, getAssessment };
