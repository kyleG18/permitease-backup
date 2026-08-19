const path = require('path');
const multer = require('multer');
const db = require('../config/db');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/knowledge');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ storage, fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'), false);
}});

// @desc    Get all knowledge base documents
// @route   GET /api/knowledge
// @access  Public
const getKnowledgeDocs = async (req, res) => {
    try {
        const [docs] = await db.query('SELECT * FROM knowledge_base ORDER BY uploaded_at DESC');
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Upload a knowledge base document
// @route   POST /api/knowledge/upload
// @access  Private
const uploadKnowledgeDoc = [
    upload.single('file'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'Please upload a PDF file' });
            const { title } = req.body;
            if (!title) return res.status(400).json({ message: 'Document title is required' });

            const document_path = 'knowledge/' + req.file.filename;

            const [result] = await db.query(
                'INSERT INTO knowledge_base (title, document_path) VALUES (?, ?)',
                [title, document_path]
            );
            res.status(201).json({ id: result.insertId, message: 'Document uploaded to knowledge base' });
        } catch (error) {
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    }
];

// @desc    Delete a knowledge base document
// @route   DELETE /api/knowledge/:id
// @access  Private
const deleteKnowledgeDoc = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM knowledge_base WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Document not found' });

        const filePath = path.join(__dirname, '../uploads', rows[0].document_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await db.query('DELETE FROM knowledge_base WHERE id = ?', [req.params.id]);
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

module.exports = { getKnowledgeDocs, uploadKnowledgeDoc, deleteKnowledgeDoc };
