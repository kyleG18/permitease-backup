const db = require('../config/db');

// @desc    Get all businesses for the logged-in user
// @route   GET /api/businesses
// @access  Private
const getBusinesses = async (req, res) => {
    try {
        const [businesses] = await db.query(
            'SELECT * FROM businesses WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(businesses);
    } catch (error) {
        console.error(error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get single business
// @route   GET /api/businesses/:id
// @access  Private
const getBusiness = async (req, res) => {
    try {
        const [businesses] = await db.query(
            'SELECT * FROM businesses WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (businesses.length === 0) {
            return res.status(404).json({ message: 'Business not found' });
        }
        res.json(businesses[0]);
    } catch (error) {
        console.error(error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Create a new business
// @route   POST /api/businesses
// @access  Private
const createBusiness = async (req, res) => {
    try {
        const { business_name, business_type, industry_category, address, employees, business_status, date_established, capitalization, gross_sales, floor_area } = req.body;

        if (!business_name || !business_type || !industry_category || !address) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const [result] = await db.query(
            'INSERT INTO businesses (user_id, business_name, business_type, industry_category, address, employees, business_status, date_established, capitalization, gross_sales, floor_area) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, business_name, business_type, industry_category, address, employees || 0, business_status || 'New Application', date_established || null, capitalization || 0, gross_sales || 0, floor_area || 0]
        );

        res.status(201).json({ id: result.insertId, message: 'Business created successfully' });
    } catch (error) {
        console.error(error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Update a business
// @route   PUT /api/businesses/:id
// @access  Private
const updateBusiness = async (req, res) => {
    try {
        const { business_name, business_type, industry_category, address, employees, business_status, date_established, capitalization, gross_sales, floor_area } = req.body;

        const [existing] = await db.query('SELECT * FROM businesses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Business not found' });
        }

        await db.query(
            'UPDATE businesses SET business_name=?, business_type=?, industry_category=?, address=?, employees=?, business_status=?, date_established=?, capitalization=?, gross_sales=?, floor_area=? WHERE id=?',
            [business_name, business_type, industry_category, address, employees, business_status, date_established || null, capitalization || 0, gross_sales || 0, floor_area || 0, req.params.id]
        );

        res.json({ message: 'Business updated successfully' });
    } catch (error) {
        console.error(error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Delete a business
// @route   DELETE /api/businesses/:id
// @access  Private
const deleteBusiness = async (req, res) => {
    try {
        const [existing] = await db.query('SELECT * FROM businesses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Business not found' });
        }

        await db.query('DELETE FROM businesses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Business deleted successfully' });
    } catch (error) {
        console.error(error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { getBusinesses, getBusiness, createBusiness, updateBusiness, deleteBusiness };
