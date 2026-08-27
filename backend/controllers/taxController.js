const db = require('../config/db');

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

        const breakdown = [];
        let total = 0;

        for (const rule of rules) {
            // Check if rule condition applies to this business
            if (rule.condition_field !== 'always') {
                const bizVal = String(business[rule.condition_field] || '').toLowerCase();
                const ruleVal = String(rule.condition_value || '').toLowerCase();
                if (bizVal !== ruleVal) continue;
            }

            let amount = 0;
            let basisLabel = '';
            let basisAmount = 0;

            switch (rule.basis) {
                case 'fixed':
                    amount = parseFloat(rule.fixed_amount);
                    basisLabel = 'Fixed Rate';
                    basisAmount = null;
                    break;
                case 'gross_sales':
                    basisAmount = parseFloat(business.gross_sales || 0);
                    amount = basisAmount * parseFloat(rule.rate);
                    basisLabel = `Gross Sales (₱${Number(basisAmount).toLocaleString()})`;
                    break;
                case 'capitalization':
                    basisAmount = parseFloat(business.capitalization || 0);
                    amount = basisAmount * parseFloat(rule.rate);
                    basisLabel = `Capitalization (₱${Number(basisAmount).toLocaleString()})`;
                    break;
                case 'floor_area':
                    basisAmount = parseFloat(business.floor_area || 0);
                    amount = basisAmount * parseFloat(rule.rate);
                    basisLabel = `Floor Area (${basisAmount} sqm)`;
                    break;
                case 'employees':
                    basisAmount = parseInt(business.employees || 0);
                    amount = basisAmount * parseFloat(rule.rate);
                    basisLabel = `No. of Employees (${basisAmount})`;
                    break;
                default:
                    amount = parseFloat(rule.fixed_amount || 0);
                    basisLabel = 'Fixed Rate';
            }

            breakdown.push({
                name: rule.name,
                category: rule.category,
                description: rule.description,
                basis: basisLabel,
                rate: rule.basis === 'fixed' ? 'Fixed' : `${(parseFloat(rule.rate) * 100).toFixed(2)}%`,
                estimated_amount: Math.round(amount * 100) / 100
            });

            total += amount;
        }

        res.json({
            business_name: business.business_name,
            breakdown,
            estimated_total: Math.round(total * 100) / 100,
            disclaimer: 'Estimated amount for reference only. Final taxes and fees are subject to official assessment by the Business Permits and Licensing Office (BPLO).'
        });

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
