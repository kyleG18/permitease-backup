const express = require('express');
const router = express.Router();
const { getDocuments, uploadDocument, deleteDocument, downloadDocument } = require('../controllers/documentController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.get('/', protect, requireRole(['business_owner', 'system_admin']), getDocuments);
router.post('/upload', protect, requireRole(['business_owner', 'system_admin']), uploadDocument);
router.delete('/:id', protect, requireRole(['business_owner', 'system_admin']), deleteDocument);
router.get('/download/:id', protect, downloadDocument);

module.exports = router;
