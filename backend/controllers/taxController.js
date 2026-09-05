const db = require('../config/db');

const { generateFeeEstimate } = require('../services/aiService');

// @desc    Get estimated tax and fee breakdown for a business
// @route   GET /api/taxes/estimate/:businessId
// @access  Private
const getEstimate = async (req, res) => {
    try {
        const businessId = req.params.businessId;

        const [biz] = await db.query('SELECT * FROM businesses WHERE id = ?', [businessId]);
        if (biz.length === 0) return res.status(404).json({ message: 'Business not found' });

        if (req.user.role === 'business_owner' && biz[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const business = biz[0];
        const [rules] = await db.query('SELECT * FROM tax_fee_rules WHERE is_active = TRUE');

        try {
            const aiEstimate = await generateFeeEstimate(business, rules);
            res.json(aiEstimate);
        } catch (aiError) {
            console.error('AI Estimation failed:', aiError);
            res.status(503).json({ message: aiError.message });
        }

    } catch (error) {
        console.error('Tax Estimate Error:', error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get all tax/fee rules (admin)
// @route   GET /api/taxes/rules
// @access  Private (LGU Admin / System Admin)
const getRules = async (req, res) => {
    try {
        const [rules] = await db.query('SELECT * FROM tax_fee_rules ORDER BY category, name');
        res.json(rules);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Create a tax/fee rule
// @route   POST /api/taxes/rules
// @access  Private (LGU Admin / System Admin)
const createRule = async (req, res) => {
    try {
        const { name, description, category, basis, rate, fixed_amount, condition_field, condition_value } = req.body;
        if (!name || !category || !basis) {
            return res.status(400).json({ message: 'Name, category, and basis are required' });
        }

        const [result] = await db.query(
            'INSERT INTO tax_fee_rules (name, description, category, basis, rate, fixed_amount, condition_field, condition_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, category, basis, rate || 0, fixed_amount || 0, condition_field || 'always', condition_value || '']
        );

        res.status(201).json({ id: result.insertId, message: 'Rule created successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Update a tax/fee rule
// @route   PUT /api/taxes/rules/:id
// @access  Private (LGU Admin / System Admin)
const updateRule = async (req, res) => {
    try {
        const { name, description, category, basis, rate, fixed_amount, condition_field, condition_value, is_active } = req.body;
        await db.query(
            'UPDATE tax_fee_rules SET name=?, description=?, category=?, basis=?, rate=?, fixed_amount=?, condition_field=?, condition_value=?, is_active=? WHERE id=?',
            [name, description, category, basis, rate || 0, fixed_amount || 0, condition_field || 'always', condition_value || '', is_active !== undefined ? is_active : 1, req.params.id]
        );
        res.json({ message: 'Rule updated successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Delete a tax/fee rule
// @route   DELETE /api/taxes/rules/:id
// @access  Private (System Admin)
const deleteRule = async (req, res) => {
    try {
        await db.query('DELETE FROM tax_fee_rules WHERE id=?', [req.params.id]);
        res.json({ message: 'Rule deleted successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { getEstimate, getRules, createRule, updateRule, deleteRule };
