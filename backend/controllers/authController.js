const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { logAudit } = require('../services/auditService');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { full_name, email, contact_number, password, confirmPassword } = req.body;

        if (!full_name || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: 'Please add all required fields' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Password validation: minimum 6 characters (no special character or complex format required)
        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters' 
            });
        }

        // Validate Philippine contact number format if provided
        if (contact_number && String(contact_number).trim() !== '') {
            const cleanContact = String(contact_number).replace(/[\s\-()]/g, '');
            const phPhoneRegex = /^(09\d{9}|\+639\d{9})$/;
            if (!phPhoneRegex.test(cleanContact)) {
                return res.status(400).json({
                    message: 'Please provide a valid 11-digit Philippine mobile number starting with 09 (e.g., 09158938768).'
                });
            }
        }

        // Check if email is already registered
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                message: 'This email is already registered. Please log in or use a different email address.' 
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // New user: insert
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, contact_number, password, role) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, contact_number, hashedPassword, 'business_owner']
        );

        if (result.insertId) {
            const userId = result.insertId;
            const userFullName = full_name;
            await logAudit(userId, userFullName, 'business_owner', 'User Registration', 'New business owner account created', req.ip);

            return res.status(201).json({
                _id: userId,
                full_name: userFullName,
                email,
                role: 'business_owner',
                token: generateToken(userId, 'business_owner')
            });
        } else {
            return res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'An internal server error occurred during registration. Please try again later.' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        // Check for user email case-insensitively and trimmed
        const [users] = await db.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?', [cleanEmail]);
        const user = users[0];

        if (user && (await bcrypt.compare(password, user.password))) {
            if (user.status === 'inactive') {
                return res.status(401).json({ message: 'Account is inactive. Please contact support.' });
            }

            // Log audit
            await logAudit(user.id, user.full_name, user.role, 'User Login', 'Successful login', req.ip);

            res.json({
                _id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id, user.role)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An internal server error occurred during login. Please try again later.' });
    }
};

// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d'
    });
};

module.exports = {
    registerUser,
    loginUser
};
