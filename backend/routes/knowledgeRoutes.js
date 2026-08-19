const express = require('express');
const router = express.Router();
const { getKnowledgeDocs, uploadKnowledgeDoc, deleteKnowledgeDoc } = require('../controllers/knowledgeController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.get('/', getKnowledgeDocs);
router.post('/upload', protect, requireRole(['lgu_admin', 'system_admin']), uploadKnowledgeDoc);
router.delete('/:id', protect, requireRole(['lgu_admin', 'system_admin']), deleteKnowledgeDoc);

module.exports = router;
