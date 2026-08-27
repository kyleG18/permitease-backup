const db = require('../config/db');
const { sendPermitStatusEmail } = require('../services/emailService');

// Helper to get all business IDs for a user
const getUserBusinessIds = async (userId) => {
    const [businesses] = await db.query('SELECT id FROM businesses WHERE user_id = ?', [userId]);
    return businesses.map(b => b.id);
};

// @desc    Get all permits for user's businesses
// @route   GET /api/permits
// @access  Private
const getPermits = async (req, res) => {
    try {
        const businessIds = await getUserBusinessIds(req.user.id);
        if (businessIds.length === 0) return res.json([]);

        const placeholders = businessIds.map(() => '?').join(',');
        const [permits] = await db.query(
            `SELECT p.*, b.business_name FROM permits p JOIN businesses b ON p.business_id = b.id WHERE p.business_id IN (${placeholders}) ORDER BY p.created_at DESC`,
            businessIds
        );
        res.json(permits);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get single permit
// @route   GET /api/permits/:id
// @access  Private
const getPermit = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM permits WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Permit not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Create a permit
// @route   POST /api/permits
// @access  Private
const createPermit = async (req, res) => {
    try {
        const { business_id, permit_name, permit_number, issue_date, expiration_date, status, remarks } = req.body;
        if (!business_id || !permit_name) {
            return res.status(400).json({ message: 'Business and permit name are required' });
        }
        const [result] = await db.query(
            'INSERT INTO permits (business_id, permit_name, permit_number, issue_date, expiration_date, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [business_id, permit_name, permit_number, issue_date || null, expiration_date || null, status || 'Pending', remarks]
        );

        // Create a notification for the user
        await db.query(
            'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
            [req.user.id, 'Permit Added', `Your permit "${permit_name}" has been added successfully.`]
        );

        res.status(201).json({ id: result.insertId, message: 'Permit created successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Update a permit
// @route   PUT /api/permits/:id
// @access  Private
const updatePermit = async (req, res) => {
    try {
        const { permit_name, permit_number, issue_date, expiration_date, status, remarks } = req.body;
        
        // Fetch current permit to check if status changed and get user info for email
        const [existing] = await db.query(
            `SELECT p.status, p.permit_name, b.business_name, u.email, u.full_name 
             FROM permits p 
             JOIN businesses b ON p.business_id = b.id 
             JOIN users u ON b.user_id = u.id 
             WHERE p.id = ?`, 
            [req.params.id]
        );

        await db.query(
            'UPDATE permits SET permit_name=?, permit_number=?, issue_date=?, expiration_date=?, status=?, remarks=? WHERE id=?',
            [permit_name, permit_number, issue_date || null, expiration_date || null, status, remarks, req.params.id]
        );

        // Send email notification if status changed
        if (existing.length > 0 && existing[0].status !== status) {
            const user = existing[0];
            await sendPermitStatusEmail(user.email, user.full_name, user.business_name, permit_name, status, remarks);
            
            // Also add in-app notification
            await db.query(
                'INSERT INTO notifications (user_id, title, message) SELECT user_id, ?, ? FROM businesses b JOIN permits p ON p.business_id = b.id WHERE p.id = ?',
                ['Permit Status Updated', `Your permit "${permit_name}" is now ${status}.`, req.params.id]
            );
        }

        res.json({ message: 'Permit updated successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Delete a permit
// @route   DELETE /api/permits/:id
// @access  Private
const deletePermit = async (req, res) => {
    try {
        await db.query('DELETE FROM permits WHERE id = ?', [req.params.id]);
        res.json({ message: 'Permit deleted successfully' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};
const path = require('path');
const fs = require('fs');

// @desc    Verify a permit publicly
// @route   GET /api/permits/verify/:verificationCode
// @access  Public
const verifyPermit = async (req, res) => {
    try {
        const { verificationCode } = req.params;
        const [rows] = await db.query(
            `SELECT p.permit_number, p.permit_name, p.issue_date, p.expiration_date,
                    b.business_name, b.business_type, b.industry_category
             FROM permits p
             JOIN businesses b ON p.business_id = b.id
             WHERE p.verification_code = ?`,
            [verificationCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ status: 'INVALID', message: 'Permit record could not be found.' });
        }

        const permit = rows[0];
        
        // Dynamic expiration check
        const expDate = new Date(permit.expiration_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to midnight

        let validityStatus = 'VALID';
        if (today > expDate) {
            validityStatus = 'EXPIRED';
        }

        res.json({
            status: validityStatus,
            data: {
                permit_number: permit.permit_number,
                business_name: permit.business_name,
                business_type: permit.business_type,
                industry_category: permit.industry_category,
                permit_type: permit.permit_name,
                municipality: 'Municipality of Roxas', // Static as per requirements
                issue_date: permit.issue_date,
                expiration_date: permit.expiration_date
            }
        });

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ status: 'ERROR', message: 'An error occurred during verification.' });
    }
};

// @desc    Download a permit PDF
// @route   GET /api/permits/:id/download
// @access  Private
const downloadPermitPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT p.pdf_path, b.user_id FROM permits p JOIN businesses b ON p.business_id = b.id WHERE p.id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Permit not found' });
        }

        const permit = rows[0];
        
        // RBAC Check
        const isOwner = permit.user_id === req.user.id;
        const isAdmin = ['lgu_admin', 'system_admin'].includes(req.user.role);
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to download this permit.' });
        }

        if (!permit.pdf_path) {
            return res.status(404).json({ message: 'PDF document not generated for this permit.' });
        }

        const filePath = path.join(__dirname, '../../uploads', permit.pdf_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'PDF file not found on the server.' });
        }

        res.download(filePath);

    } catch (error) {
        console.error('Download error:', error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

// @desc    Get all permits for admin monitoring
// @route   GET /api/permits/admin/all
// @access  Private (Admin)
const getAllPermitsAdmin = async (req, res) => {
    try {
        const [permits] = await db.query(
            `SELECT p.id, p.permit_number, p.permit_name, p.issue_date, p.expiration_date, p.status, p.verification_code, p.pdf_path,
                    b.business_name, u.full_name AS owner_name
             FROM permits p 
             JOIN businesses b ON p.business_id = b.id
             JOIN users u ON b.user_id = u.id
             ORDER BY p.created_at DESC`
        );
        
        // Map dynamic status
        const mappedPermits = permits.map(p => {
            const expDate = new Date(p.expiration_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return {
                ...p,
                dynamic_status: today > expDate ? 'EXPIRED' : 'VALID'
            };
        });

        res.json(mappedPermits);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { 
    getPermits, 
    getPermit, 
    createPermit, 
    updatePermit, 
    deletePermit,
    verifyPermit,
    downloadPermitPdf,
    getAllPermitsAdmin
};
