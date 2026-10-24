const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { generateChatResponse } = require('../services/aiService');

// Fetch live user context: compliance, readiness, fee estimate, permits
const buildUserContext = async (userId) => {
    try {
        const [businesses] = await db.query('SELECT * FROM businesses WHERE user_id = ?', [userId]);
        if (businesses.length === 0) return 'User has no registered businesses yet.';

        const biz = businesses[0];
        const bizId = biz.id;

        // Compliance checklist
        const [checklist] = await db.query(`
            SELECT pr.permit_name, br.status
            FROM business_requirements br
            JOIN permit_requirements pr ON br.requirement_id = pr.id
            WHERE br.business_id = ?
        `, [bizId]);

        const missing = checklist.filter(c => c.status === 'Missing').map(c => c.permit_name);
        const submitted = checklist.filter(c => c.status === 'Submitted' || c.status === 'Approved').map(c => c.permit_name);

        // Latest compliance score
        const [assessments] = await db.query(
            'SELECT compliance_score, readiness_score FROM assessments WHERE business_id = ? ORDER BY created_at DESC LIMIT 1',
            [bizId]
        );
        const compScore = assessments.length > 0 ? assessments[0].compliance_score : 'Not yet evaluated';
        const readScore = assessments.length > 0 ? assessments[0].readiness_score : 'Not yet evaluated';

        // Tax estimate (Official DB rules)
        const [taxRules] = await db.query('SELECT * FROM tax_fee_rules WHERE is_active = TRUE');
        const breakdown = [];
        let total = 0;
        for (const rule of taxRules) {
            if (rule.condition_field !== 'always') {
                const bizVal = String(biz[rule.condition_field] || '').toLowerCase();
                if (bizVal !== String(rule.condition_value || '').toLowerCase()) continue;
            }
            let amount = 0;
            if (rule.basis === 'fixed') amount = parseFloat(rule.fixed_amount);
            else if (rule.basis === 'gross_sales') amount = parseFloat(biz.gross_sales || 0) * parseFloat(rule.rate);
            else if (rule.basis === 'capitalization') amount = parseFloat(biz.capitalization || 0) * parseFloat(rule.rate);
            else if (rule.basis === 'floor_area') amount = parseFloat(biz.floor_area || 0) * parseFloat(rule.rate);
            else if (rule.basis === 'employees') amount = parseInt(biz.employees || 0) * parseFloat(rule.rate);
            breakdown.push(`${rule.name}: ₱${amount.toFixed(2)}`);
            total += amount;
        }

        // Next expiring permit
        const [permits] = await db.query(
            `SELECT permit_name, expiration_date, status FROM permits WHERE business_id = ? ORDER BY expiration_date ASC LIMIT 3`,
            [bizId]
        );

        // Recent Applications
        const [applications] = await db.query(
            `SELECT application_number, status, application_type FROM applications WHERE business_id = ? ORDER BY created_at DESC LIMIT 1`,
            [bizId]
        );
        const appInfo = applications.length > 0 
            ? `Application ${applications[0].application_number} (${applications[0].application_type}) is currently: ${applications[0].status}`
            : 'No active applications.';

        return `
==========================================================
REAL-TIME DATA FOR THIS USER (DO NOT FABRICATE, USE ONLY THIS)
==========================================================
Business Name: ${biz.business_name}
Business Type: ${biz.business_type}
Industry: ${biz.industry_category}
Status: ${biz.business_status}
Capitalization: ₱${Number(biz.capitalization || 0).toLocaleString()}
Gross Sales: ₱${Number(biz.gross_sales || 0).toLocaleString()}

APPLICATION STATUS:
${appInfo}

COMPLIANCE SCORE: ${compScore}${compScore !== 'Not yet evaluated' ? '%' : ''}
PERMIT READINESS SCORE: ${readScore}${readScore !== 'Not yet evaluated' ? '%' : ''}

SUBMITTED REQUIREMENTS (${submitted.length}):
${submitted.length > 0 ? submitted.map(s => `- ${s}`).join('\n') : '- None submitted yet.'}

MISSING REQUIREMENTS (${missing.length}):
${missing.length > 0 ? missing.map(m => `- ${m} ← MUST UPLOAD`).join('\n') : '- None missing! All requirements submitted.'}

ESTIMATED PERMIT FEES:
${breakdown.length > 0 ? breakdown.join('\n') : '- Update business profile with capitalization/gross sales for an estimate.'}
ESTIMATED TOTAL: ₱${total.toFixed(2)}
Note: This is an estimate only. Final fees are assessed by the BPLO.

RECENT PERMITS:
${permits.length > 0 ? permits.map(p => `- ${p.permit_name}: ${p.status}${p.expiration_date ? `, expires ${new Date(p.expiration_date).toLocaleDateString('en-PH')}` : ''}`).join('\n') : '- No permits on record.'}
==========================================================
`;
    } catch (e) {
        console.error('Error building user context:', e.message);
        return 'Could not retrieve user context.';
    }
};

// @desc    Send a chat message
// @route   POST /api/chat
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const rawQuestion = req.body.question || req.body.message;
        const language = req.body.language || 'en';
        
        if (!rawQuestion || typeof rawQuestion !== 'string') {
            return res.status(400).json({ message: 'Question is required and must be text.' });
        }
        const question = rawQuestion.trim();
        if (question.length === 0) {
            return res.status(400).json({ message: 'Question cannot be empty.' });
        }
        if (question.length > 4000) {
            return res.status(400).json({ message: 'Question is too long. Maximum 4000 characters.' });
        }

        // 1. Fetch permit requirements for context
        const [requirements] = await db.query('SELECT permit_name, description FROM permit_requirements');

        // 2. Fetch knowledge base context
        const [knowledgeDocsResult] = await db.query('SELECT title FROM knowledge_base');
        const knowledgeDocs = knowledgeDocsResult.map(d => d.title);

        // 3. Read static AI Context File
        let staticContext = '';
        try {
            staticContext = fs.readFileSync(path.join(__dirname, '../services/ai_context.md'), 'utf8');
        } catch (e) {
            console.warn('ai_context.md not found, proceeding without it.');
        }

        // 4. Fetch recent chat history (last 5 exchanges)
        const [history] = await db.query(
            'SELECT question, response FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
            [req.user.id]
        );
        history.reverse(); // chronological order

        // 5. Build live user context
        const userContext = await buildUserContext(req.user.id);

        // 6. Format messages array for Groq
        const messages = [];
        for (const msg of history) {
            messages.push({ role: 'user', content: msg.question });
            messages.push({ role: 'assistant', content: msg.response });
        }
        messages.push({ role: 'user', content: question.trim() });

        // 7. Call AI Service
        let response = '';
        try {
            response = await generateChatResponse(messages, userContext, staticContext, requirements, knowledgeDocs, language);
        } catch (aiError) {
            return res.status(503).json({ message: aiError.message });
        }

        // 8. Save to DB
        await db.query(
            'INSERT INTO chat_history (user_id, question, response) VALUES (?, ?, ?)',
            [req.user.id, question.trim(), response]
        );

        res.json({ question: question.trim(), response, reply: response });
    } catch (error) {
        console.error('[ChatController] Error:', error);
        res.status(500).json({ 
            message: 'An internal server error occurred. Please try again later.',
            detail: error.message 
        });
    }
};

// @desc    Get chat history for user
// @route   GET /api/chat/history
// @access  Private
const getChatHistory = async (req, res) => {
    try {
        const [history] = await db.query(
            'SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC',
            [req.user.id]
        );
        res.json(history);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { sendMessage, getChatHistory };
