const db = require('../config/db');
const { calculateFeesCore } = require('./feeController');

// @desc    Get deterministic estimated tax and fee breakdown for a business
// @route   GET /api/taxes/estimate/:businessId
// @access  Private
const getEstimate = async (req, res) => {
    try {
        const businessId = req.params.businessId;

        if (!businessId || isNaN(parseInt(businessId, 10))) {
            return res.status(400).json({ message: 'Invalid business ID.' });
        }

        const [biz] = await db.query('SELECT * FROM businesses WHERE id = ?', [businessId]);
        if (biz.length === 0) return res.status(404).json({ message: 'Business not found' });

        if (req.user.role === 'business_owner' && biz[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const business = biz[0];

        // LGU Scope Check — detailed estimation only supported for Municipality of Roxas (PSGC 175212000)
        const ROXAS_PSGC = '175212000';
        if (business.city_municipality_id && business.city_municipality_id !== ROXAS_PSGC) {
            return res.json({
                supportedLGU: false,
                estimationAvailable: false,
                estimatedTax: null,
                estimatedFees: null,
                business_summary: {
                    business_name: business.business_name,
                    business_type: business.business_type,
                    application_type: business.business_status
                },
                estimation_confidence: 'NOT SUPPORTED',
                local_business_tax: [],
                regulatory_fees: [],
                total_estimated_amount: null,
                summary: 'PermitEase currently provides detailed permit preparation and estimation features for the Municipality of Roxas, Oriental Mindoro. Your location has been saved, but LGU-specific estimation is not currently configured for this location.'
            });
        }

        // Validate numeric inputs
        const grossSales = parseFloat(business.gross_sales);
        const capitalization = parseFloat(business.capitalization);

        if (isNaN(grossSales) && isNaN(capitalization)) {
            return res.json({
                supportedLGU: true,
                estimationAvailable: false,
                business_summary: {
                    business_name: business.business_name,
                    business_type: business.business_type,
                    application_type: business.business_status
                },
                estimation_confidence: 'REQUIRES LGU CONFIRMATION',
                local_business_tax: [],
                regulatory_fees: [],
                total_estimated_amount: null,
                summary: 'Gross sales and capitalization data are required for a meaningful estimate. Please update your business profile.',
                disclaimer: 'All amounts are estimates only. Final assessment is subject to the official process of the Municipality of Roxas, Oriental Mindoro / BPLO.'
            });
        }

        if ((!isNaN(grossSales) && grossSales < 0) || (!isNaN(capitalization) && capitalization < 0)) {
            return res.status(400).json({ message: 'Gross sales and capitalization must be non-negative values.' });
        }

        // Load active rules
        const [rules] = await db.query('SELECT * FROM tax_fee_rules WHERE is_active = 1 ORDER BY category, id');

        const appTypeStatus = business.business_status || 'New Application';

        // DETERMINISTIC CALCULATION — no LLM involvement in arithmetic
        const feeData = calculateFeesCore(business, appTypeStatus, rules);

        const localBusinessTaxItems = feeData.breakdown
            .filter(i => i.category && i.category.toLowerCase().includes('tax'))
            .map(i => ({
                name: i.name,
                basis: i.basis,
                amount: i.amount,
                status: i.status === 'calculated' ? 'ESTIMATED' : 'TO BE ASSESSED',
                reason: i.reason || null
            }));

        const regulatoryFeeItems = feeData.breakdown
            .filter(i => !i.category || !i.category.toLowerCase().includes('tax'))
            .map(i => ({
                name: i.name,
                basis: i.basis,
                amount: i.amount,
                status: i.status === 'calculated' ? 'ESTIMATED' : 'TO BE ASSESSED',
                reason: i.reason || null
            }));

        return res.json({
            supportedLGU: true,
            estimationAvailable: true,
            business_summary: {
                business_name: business.business_name,
                business_type: business.business_type,
                application_type: business.business_status
            },
            estimation_confidence: feeData.is_incomplete ? 'REQUIRES LGU CONFIRMATION' : 'HIGH',
            local_business_tax: localBusinessTaxItems,
            regulatory_fees: regulatoryFeeItems,
            total_estimated_amount: feeData.total_estimated_amount,
            is_incomplete: feeData.is_incomplete,
            missing_info_reasons: feeData.missing_info_reasons,
            disclaimer: 'All amounts are estimates only and are based on configured rules for the Municipality of Roxas, Oriental Mindoro. Final fees, taxes, and assessments are subject to the official process of the BPLO.',
            isEstimate: true
        });

    } catch (error) {
        console.error('Tax Estimate Error:', error);
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
