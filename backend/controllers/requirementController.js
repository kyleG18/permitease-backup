const db = require('../config/db');

// @desc    Get all permit requirements
// @route   GET /api/requirements
// @access  Public
const getRequirements = async (req, res) => {
    try {
        const [requirements] = await db.query('SELECT * FROM permit_requirements ORDER BY created_at DESC');
        res.json(requirements);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get single requirement
// @route   GET /api/requirements/:id
// @access  Public
const getRequirement = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM permit_requirements WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Requirement not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Create a permit requirement (Admin)
// @route   POST /api/requirements
// @access  Private
const createRequirement = async (req, res) => {
    try {
        const { 
            permit_name, 
            description, 
            applicable_business_type, 
            renewal_period, 
            required_documents,
            issuing_agency,
            ordinance_reference,
            estimated_fee,
            is_mandatory,
            condition_field,
            condition_value
        } = req.body;

        if (!permit_name || !applicable_business_type) {
            return res.status(400).json({ message: 'Permit name and applicable business type are required' });
        }

        const [result] = await db.query(
            `INSERT INTO permit_requirements (
                permit_name, description, applicable_business_type, renewal_period, required_documents,
                issuing_agency, ordinance_reference, estimated_fee, is_mandatory, condition_field, condition_value
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                permit_name, 
                description || null, 
                applicable_business_type, 
                renewal_period || 'Annual', 
                required_documents || null,
                issuing_agency || 'BPLO / LGU Roxas',
                ordinance_reference || 'Municipal Ordinance & RA 7160',
                Number(estimated_fee) || 0.00,
                is_mandatory === undefined ? 1 : (is_mandatory ? 1 : 0),
                condition_field || 'always',
                condition_value || ''
            ]
        );
        res.status(201).json({ id: result.insertId, message: 'Requirement created successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Update a permit requirement
// @route   PUT /api/requirements/:id
// @access  Private
const updateRequirement = async (req, res) => {
    try {
        const { 
            permit_name, 
            description, 
            applicable_business_type, 
            renewal_period, 
            required_documents,
            issuing_agency,
            ordinance_reference,
            estimated_fee,
            is_mandatory,
            condition_field,
            condition_value
        } = req.body;

        await db.query(
            `UPDATE permit_requirements SET 
                permit_name=?, description=?, applicable_business_type=?, renewal_period=?, required_documents=?,
                issuing_agency=?, ordinance_reference=?, estimated_fee=?, is_mandatory=?, condition_field=?, condition_value=? 
            WHERE id=?`,
            [
                permit_name, 
                description || null, 
                applicable_business_type, 
                renewal_period || 'Annual', 
                required_documents || null,
                issuing_agency || 'BPLO / LGU Roxas',
                ordinance_reference || 'Municipal Ordinance & RA 7160',
                Number(estimated_fee) || 0.00,
                is_mandatory === undefined ? 1 : (is_mandatory ? 1 : 0),
                condition_field || 'always',
                condition_value || '',
                req.params.id
            ]
        );
        res.json({ message: 'Requirement updated successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Delete a permit requirement
// @route   DELETE /api/requirements/:id
// @access  Private
const deleteRequirement = async (req, res) => {
    try {
        await db.query('DELETE FROM permit_requirements WHERE id = ?', [req.params.id]);
        res.json({ message: 'Requirement deleted successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { getRequirements, getRequirement, createRequirement, updateRequirement, deleteRequirement };
