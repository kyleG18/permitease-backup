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

        // Check if user exists
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, contact_number, password, role) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, contact_number, hashedPassword, 'business_owner']
        );

        if (result.insertId) {
            // Log audit
            await logAudit(result.insertId, full_name, 'business_owner', 'User Registration', 'New business owner account created', req.ip);

            res.status(201).json({
                _id: result.insertId,
                full_name,
                email,
                role: 'business_owner',
                token: generateToken(result.insertId, 'business_owner')
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        console.error('Registration error:', error); res.status(500).json({ message: 'An internal server error occurred during registration. Please try again later.' });
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

        // Check for user email
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
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
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        console.error('Login error:', error); res.status(500).json({ message: 'An internal server error occurred during login. Please try again later.' });
    }
};

// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = {
    registerUser,
    loginUser,
};
