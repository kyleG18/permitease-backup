const fs = require('fs');
const path = './backend/controllers/documentController.js';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
`            const { business_id, document_name, expiration_date, requirement_id } = req.body;
            if (!business_id || !document_name) {
                return res.status(400).json({ message: 'Business and document name are required' });
            }`,
`            const { business_id, document_name, expiration_date, requirement_id } = req.body;
            if (!business_id || !document_name) {
                return res.status(400).json({ message: 'Business and document name are required' });
            }

            // Verify business ownership
            const [biz] = await db.query('SELECT user_id FROM businesses WHERE id = ?', [business_id]);
            if (biz.length === 0) return res.status(404).json({ message: 'Business not found' });
            
            const isOwner = biz[0].user_id === req.user.id;
            const isAdmin = ['lgu_admin', 'system_admin'].includes(req.user.role);
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: 'Not authorized to upload documents for this business.' });
            }`
);

c = c.replace(
`const deleteDocument = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Document not found' });`,
`const deleteDocument = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT d.*, b.user_id FROM documents d JOIN businesses b ON d.business_id = b.id WHERE d.id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Document not found' });
        
        const isOwner = rows[0].user_id === req.user.id;
        const isAdmin = ['lgu_admin', 'system_admin'].includes(req.user.role);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this document.' });
        }`
);

const downloadDoc = `

// @desc    Download a document securely
// @route   GET /api/documents/download/:id
// @access  Private
const downloadDocument = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT d.file_path, b.user_id FROM documents d JOIN businesses b ON d.business_id = b.id WHERE d.id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Document not found' });

        const isOwner = rows[0].user_id === req.user.id;
        const isAdmin = ['lgu_admin', 'system_admin'].includes(req.user.role);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to download this document.' });
        }

        const filePath = path.join(__dirname, '../uploads', rows[0].file_path);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server.' });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

module.exports = { getDocuments, uploadDocument, deleteDocument, downloadDocument };`;

c = c.replace(
`module.exports = { getDocuments, uploadDocument, deleteDocument };`,
downloadDoc
);

fs.writeFileSync(path, c);
console.log('Patched documentController.js');
