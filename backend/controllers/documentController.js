const path = require('path');
const multer = require('multer');
const db = require('../config/db');
const fs = require('fs');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create a unique filename to avoid conflicts
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

const getUserBusinessIds = async (userId) => {
    const [businesses] = await db.query('SELECT id FROM businesses WHERE user_id = ?', [userId]);
    return businesses.map(b => b.id);
};

// @desc    Get all documents for user's businesses
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
    try {
        const businessIds = await getUserBusinessIds(req.user.id);
        if (businessIds.length === 0) return res.json([]);

        const placeholders = businessIds.map(() => '?').join(',');
        const [docs] = await db.query(
            `SELECT d.*, b.business_name FROM documents d JOIN businesses b ON d.business_id = b.id WHERE d.business_id IN (${placeholders}) ORDER BY d.upload_date DESC`,
            businessIds
        );
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Upload a document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = [
    upload.single('file'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'Please upload a file' });

            const { business_id, document_name, expiration_date, requirement_id } = req.body;
            if (!business_id || !document_name) {
                return res.status(400).json({ message: 'Business and document name are required' });
            }

            const file_path = req.file.filename;

            const [result] = await db.query(
                'INSERT INTO documents (business_id, document_name, file_path, expiration_date) VALUES (?, ?, ?, ?)',
                [business_id, document_name, file_path, expiration_date || null]
            );

            // Link to requirement if provided
            if (requirement_id) {
                await db.query(
                    'UPDATE business_requirements SET document_id = ?, status = ? WHERE business_id = ? AND requirement_id = ?',
                    [result.insertId, 'Submitted', business_id, requirement_id]
                );
            }

            await db.query(
                'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
                [req.user.id, 'Document Uploaded', `Document "${document_name}" has been uploaded successfully.`]
            );

            res.status(201).json({ id: result.insertId, message: 'Document uploaded successfully', file_path });
        } catch (error) {
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    }
];

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Document not found' });

        // Delete physical file
        const filePath = path.join(__dirname, '../uploads', rows[0].file_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await db.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

module.exports = { getDocuments, uploadDocument, deleteDocument };
