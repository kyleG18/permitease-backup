const fs = require('fs');
const path = './backend/controllers/assessmentController.js';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  "SELECT permit_name, description, condition_field",
  "SELECT id, permit_name, description, condition_field"
);

c = c.replace(
  "officialRequirements.push({",
  "officialRequirements.push({ requirement_id: reqRule.id,"
);

const insertLogic = `
        const [inserted] = await db.query(
            'INSERT INTO assessments (user_id, business_id, assessment_result, compliance_score) VALUES (?, ?, ?, ?)',
            [req.user.id, resolvedBusinessId, JSON.stringify(assessmentPayload), 0]
        );

        // Populate business_requirements for the UI
        if (resolvedBusinessId && officialRequirements.length > 0) {
            // First get existing to not overwrite status
            const [existingReqs] = await db.query('SELECT requirement_id, status FROM business_requirements WHERE business_id = ?', [resolvedBusinessId]);
            const existingMap = new Map(existingReqs.map(r => [r.requirement_id, r.status]));

            for (const req of officialRequirements) {
                if (!existingMap.has(req.requirement_id)) {
                    await db.query(
                        'INSERT INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
                        [resolvedBusinessId, req.requirement_id, 'Missing']
                    );
                }
            }
        }
`;

c = c.replace(
  /const \[inserted\] = await db\.query\([\s\S]*?\);/,
  insertLogic
);

fs.writeFileSync(path, c);
console.log('Patched assessmentController.js');
