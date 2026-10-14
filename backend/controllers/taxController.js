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
                id: i.id,
                name: i.name,
                description: i.description,
                category: i.category,
                basis: i.basis,
                rate: i.rate,
                fixed_amount: i.fixed_amount,
                amount: i.amount,
                status: i.status === 'calculated' ? 'ESTIMATED' : 'TO BE ASSESSED',
                reason: i.reason || null,
                calculation_details: i.calculation_details,
                verification_status: i.verification_status || 'unverified',
                source_reference: i.source_reference,
                notes: i.notes
            }));

        const regulatoryFeeItems = feeData.breakdown
            .filter(i => !i.category || !i.category.toLowerCase().includes('tax'))
            .map(i => ({
                id: i.id,
                name: i.name,
                description: i.description,
                category: i.category,
                basis: i.basis,
                rate: i.rate,
                fixed_amount: i.fixed_amount,
                amount: i.amount,
                status: i.status === 'calculated' ? 'ESTIMATED' : 'TO BE ASSESSED',
                reason: i.reason || null,
                calculation_details: i.calculation_details,
                verification_status: i.verification_status || 'unverified',
                source_reference: i.source_reference,
                notes: i.notes
            }));

        const totalTaxAmount = Math.round(localBusinessTaxItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) * 100) / 100;
        const totalFeeAmount = Math.round(regulatoryFeeItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) * 100) / 100;
        const hasUnassessedTax = localBusinessTaxItems.some(t => t.status === 'TO BE ASSESSED');
        const hasUnassessedFees = regulatoryFeeItems.some(f => f.status === 'TO BE ASSESSED');

        // Verified Payment Schedule under RA 7160 Sec. 165 & 167 (Quarterly Installments)
        const quarterlyTax = totalTaxAmount > 0 ? Math.round((totalTaxAmount / 4) * 100) / 100 : 0;
        const q4Adjustment = totalTaxAmount > 0 ? Math.round((totalTaxAmount - (quarterlyTax * 3)) * 100) / 100 : 0;
        
        const paymentSchedule = {
            available: totalTaxAmount > 0,
            statutory_source: 'Republic Act No. 7160 Sections 165 & 167',
            annual_option: {
                due_date: 'January 20',
                tax_due: totalTaxAmount,
                fees_due: totalFeeAmount,
                total_due: Math.round((totalTaxAmount + totalFeeAmount) * 100) / 100,
                description: 'Full annual payment on or before January 20'
            },
            quarterly_installments: [
                {
                    quarter: 'Q1',
                    period: '1st Quarter',
                    due_date: 'January 20',
                    tax_due: quarterlyTax,
                    fees_due: totalFeeAmount,
                    total_due: Math.round((quarterlyTax + totalFeeAmount) * 100) / 100,
                    description: '1st Quarter Business Tax (25%) + Annual Regulatory Fees'
                },
                {
                    quarter: 'Q2',
                    period: '2nd Quarter',
                    due_date: 'April 20',
                    tax_due: quarterlyTax,
                    fees_due: 0,
                    total_due: quarterlyTax,
                    description: '2nd Quarter Business Tax (25%)'
                },
                {
                    quarter: 'Q3',
                    period: '3rd Quarter',
                    due_date: 'July 20',
                    tax_due: quarterlyTax,
                    fees_due: 0,
                    total_due: quarterlyTax,
                    description: '3rd Quarter Business Tax (25%)'
                },
                {
                    quarter: 'Q4',
                    period: '4th Quarter',
                    due_date: 'October 20',
                    tax_due: q4Adjustment,
                    fees_due: 0,
                    total_due: q4Adjustment,
                    description: '4th Quarter Business Tax (balance)'
                }
            ]
        };

        // Statutory Penalty Rules under RA 7160 Sec. 168 (Late Surcharge & Monthly Interest)
        const penaltyRules = {
            statutory_source: 'Republic Act No. 7160 Section 168',
            surcharge_rate: 0.25,
            surcharge_label: '25% Surcharge on unpaid balance',
            monthly_interest_rate: 0.02,
            monthly_interest_label: '2% monthly interest (or fraction thereof)',
            max_interest_months: 36,
            max_interest_cap: 0.72,
            deadline_day: 'January 20'
        };

        return res.json({
            supportedLGU: true,
            estimationAvailable: true,
            business_summary: {
                business_name: business.business_name,
                business_type: business.business_type,
                industry_category: business.industry_category,
                application_type: business.business_status,
                gross_sales: grossSales,
                capitalization: capitalization,
                floor_area: business.floor_area,
                employees: business.employees,
                address: business.address
            },
            estimation_confidence: (feeData.is_incomplete || hasUnassessedTax || hasUnassessedFees) ? 'REQUIRES LGU CONFIRMATION' : 'HIGH',
            local_business_tax: localBusinessTaxItems,
            regulatory_fees: regulatoryFeeItems,
            total_tax_amount: totalTaxAmount,
            total_fee_amount: totalFeeAmount,
            total_estimated_amount: feeData.total_estimated_amount,
            has_unassessed_tax: hasUnassessedTax,
            has_unassessed_fees: hasUnassessedFees,
            payment_schedule: paymentSchedule,
            penalty_rules: penaltyRules,
            is_incomplete: feeData.is_incomplete,
            missing_info_reasons: feeData.missing_info_reasons,
            disclaimer: 'All amounts are preliminary estimates for preparation purposes only and are based on configured rules for the Municipality of Roxas, Oriental Mindoro and statutory limits under RA 7160 and RA 9514. Final fees, taxes, and assessments are subject to the official assessment and verification of the BPLO and Municipal Treasurer.',
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
        const { name, description, category, basis, rate, fixed_amount, condition_field, condition_value, source_reference, verification_status, effective_date, notes } = req.body;
        if (!name || !category || !basis) {
            return res.status(400).json({ message: 'Name, category, and basis are required' });
        }

        const [result] = await db.query(
            'INSERT INTO tax_fee_rules (name, description, category, basis, rate, fixed_amount, condition_field, condition_value, source_reference, verification_status, effective_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, category, basis, rate || 0, fixed_amount || 0, condition_field || 'always', condition_value || '', source_reference || null, verification_status || 'unverified', effective_date || null, notes || null]
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
        const { name, description, category, basis, rate, fixed_amount, condition_field, condition_value, is_active, source_reference, verification_status, effective_date, notes } = req.body;
        await db.query(
            'UPDATE tax_fee_rules SET name=?, description=?, category=?, basis=?, rate=?, fixed_amount=?, condition_field=?, condition_value=?, is_active=?, source_reference=?, verification_status=?, effective_date=?, notes=? WHERE id=?',
            [name, description, category, basis, rate || 0, fixed_amount || 0, condition_field || 'always', condition_value || '', is_active !== undefined ? is_active : 1, source_reference || null, verification_status || 'unverified', effective_date || null, notes || null, req.params.id]
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
