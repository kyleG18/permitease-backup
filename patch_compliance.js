const fs = require('fs');
const pathCtrl = './backend/controllers/complianceController.js';
let ctrl = fs.readFileSync(pathCtrl, 'utf8');

const updateLogic = `
// @desc    Update a specific requirement status
// @route   PUT /api/compliance/business/:businessId/requirement/:requirementId
// @access  Private
const updateRequirementStatus = async (req, res) => {
    try {
        const { businessId, requirementId } = req.params;
        const { status } = req.body;

        // Verify ownership
        const [biz] = await db.query('SELECT user_id FROM businesses WHERE id = ?', [businessId]);
        if (biz.length === 0) return res.status(404).json({ message: 'Business not found' });
        
        if (req.user.role === 'business_owner' && biz[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this business' });
        }

        // Validate status
        if (!['Missing', 'Submitted', 'Approved'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if requirement exists for business
        const [existing] = await db.query('SELECT * FROM business_requirements WHERE business_id = ? AND requirement_id = ?', [businessId, requirementId]);
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Requirement not found for this business' });
        }

        await db.query(
            'UPDATE business_requirements SET status = ? WHERE business_id = ? AND requirement_id = ?',
            [status, businessId, requirementId]
        );

        res.json({ message: 'Status updated successfully', status });
    } catch (error) {
        console.error('Update Requirement Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { evaluateCompliance, getCompliance, updateRequirementStatus };
`;

ctrl = ctrl.replace('module.exports = { evaluateCompliance, getCompliance };', updateLogic);
fs.writeFileSync(pathCtrl, ctrl);

const pathRoute = './backend/routes/complianceRoutes.js';
let route = fs.readFileSync(pathRoute, 'utf8');
route = route.replace('const { evaluateCompliance, getCompliance } = require', 'const { evaluateCompliance, getCompliance, updateRequirementStatus } = require');
route = route.replace('module.exports = router;', 'router.put(\'/business/:businessId/requirement/:requirementId\', protect, updateRequirementStatus);\n\nmodule.exports = router;');
fs.writeFileSync(pathRoute, route);

console.log('Patched compliance controller and routes');
