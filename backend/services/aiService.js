const Groq = require('groq-sdk');
const axios = require('axios');
require('dotenv').config();

// Default models for primary and fallback providers
const getGroqModel = () => process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const getOpenRouterModel = () => process.env.OPENROUTER_MODEL || 'openrouter/free';

/**
 * Initialize Groq client securely. Reads exclusively from GROQ_API_KEY environment variable.
 */
const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        return null;
    }
    return new Groq({ apiKey: apiKey.trim() });
};

/**
 * Check if at least one AI provider (Groq or OpenRouter) is configured.
 */
const isAiConfigured = () => {
    const groqKey = process.env.GROQ_API_KEY;
    const orKey = process.env.OPENROUTER_API_KEY;
    return !!((groqKey && groqKey.trim()) || (orKey && orKey.trim()));
};

/**
 * Unified multi-provider LLM executor with automatic failover:
 * Tier 1 (Primary): Groq API (ultra-fast sub-second LPU inference)
 * Tier 2 (Fallback): OpenRouter API (resilient zero-cost free model router)
 */
const callLLM = async (messages, { temperature = 0.2, max_tokens = 4096 } = {}) => {
    let lastError = null;

    // 1. Try Groq (Primary)
    const groq = getGroqClient();
    if (groq) {
        try {
            const completion = await groq.chat.completions.create({
                model: getGroqModel(),
                messages,
                temperature,
                max_tokens
            });
            const content = completion.choices[0]?.message?.content || '';
            if (content.trim()) {
                return content;
            }
        } catch (groqErr) {
            console.warn('[aiService] Groq API call failed or rate-limited:', groqErr.message);
            lastError = groqErr;
        }
    }

    // 2. Try OpenRouter (Secondary Fallback)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && typeof openrouterKey === 'string' && openrouterKey.trim()) {
        try {
            console.log('[aiService] Failing over to OpenRouter (model:', getOpenRouterModel(), ')...');
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: getOpenRouterModel(),
                    messages,
                    temperature,
                    max_tokens
                },
                {
                    headers: {
                        'Authorization': `Bearer ${openrouterKey.trim()}`,
                        'HTTP-Referer': 'https://permitease.ph',
                        'X-Title': 'PermitEase Roxas',
                        'Content-Type': 'application/json'
                    },
                    timeout: 25000 // 25s timeout for OpenRouter free endpoints
                }
            );
            const content = response.data?.choices?.[0]?.message?.content || '';
            if (content.trim()) {
                console.log('[aiService] OpenRouter fallback succeeded (model:', response.data?.model || getOpenRouterModel(), ')');
                return content;
            }
        } catch (orErr) {
            const errMsg = orErr.response?.data?.error?.message || orErr.message;
            console.warn('[aiService] OpenRouter fallback call failed:', errMsg);
            lastError = orErr;
        }
    }

    if (lastError) throw lastError;
    throw new Error('No AI provider configured (neither GROQ_API_KEY nor OPENROUTER_API_KEY is available).');
};

/**
 * Safely extract and parse JSON from an AI response text (handles think tags and markdown fences).
 */
const parseCleanJson = (rawText) => {
    let text = rawText || '{}';
    if (text.includes('</think>')) {
        text = text.split('</think>')[1];
    } else if (text.includes('<think>')) {
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*/gi, '');
    }
    let jsonText = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end >= start) {
        jsonText = jsonText.substring(start, end + 1);
    }
    return JSON.parse(jsonText);
};

/**
 * Rule-based fallback assessment engine for Roxas, Oriental Mindoro.
 * Ensures the system never crashes even if external AI APIs are unreachable.
 */
const generateRuleBasedAssessment = (biz) => {
    biz = (typeof biz === 'object' && biz !== null) ? biz : { business_description: String(biz || '') };
    const text = (
        (biz.business_name || '') + ' ' +
        (biz.business_type || '') + ' ' +
        (biz.industry_category || '') + ' ' +
        (biz.business_description || '') + ' ' +
        (biz.primary_products || '') + ' ' +
        (biz._textSummary || '')
    ).toLowerCase();

    let category = 'Retail & Trading';
    let type = 'General Merchandise / Retail';
    let confidence = 0.90;

    if (text.includes('food') || text.includes('bake') || text.includes('restaurant') || text.includes('cafe') || text.includes('eatery') || text.includes('carinderia') || text.includes('bread') || text.includes('coffee') || text.includes('drink') || text.includes('snack') || text.includes('bbq')) {
        category = 'Food & Beverage';
        type = (text.includes('bake') || text.includes('bread')) ? 'Bakery / Bakeshop' : (text.includes('cafe') || text.includes('coffee')) ? 'Cafe / Coffee Shop' : 'Restaurant / Eatery';
    } else if (text.includes('sari-sari') || text.includes('grocery') || text.includes('store') || text.includes('shop') || text.includes('retail') || text.includes('merchandise')) {
        category = 'Retail & Trading';
        type = text.includes('sari-sari') ? 'Sari-Sari Store' : 'Retail Store / Grocery';
    } else if (text.includes('service') || text.includes('repair') || text.includes('salon') || text.includes('laundry') || text.includes('barber') || text.includes('vulcaniz') || text.includes('tailor')) {
        category = 'Services';
        type = 'Personal & Professional Services';
    } else if (text.includes('manufactur') || text.includes('process') || text.includes('factory') || text.includes('craft')) {
        category = 'Manufacturing';
        type = 'Small-Scale Manufacturing & Processing';
    } else if (text.includes('hotel') || text.includes('resort') || text.includes('inn') || text.includes('lodge') || text.includes('beach')) {
        category = 'Tourism & Hospitality';
        type = 'Accommodation / Lodging';
    } else if (text.includes('farm') || text.includes('fish') || text.includes('poultry') || text.includes('agri')) {
        category = 'Agriculture';
        type = 'Agricultural & Fishery Products';
    }

    return {
        supportedLGU: true,
        industry_category: category,
        business_type: type,
        confidence: confidence,
        recommended_permits: [
            {
                permit_name: "Mayor's Business Permit",
                reason: "Primary regulatory clearance to operate a business within the Municipality of Roxas."
            },
            {
                permit_name: "Barangay Business Clearance",
                reason: "Prerequisite clearance issued by the local barangay where the business is located."
            },
            {
                permit_name: "Sanitary Permit / Health Certification",
                reason: "Required under the Code on Sanitation of the Philippines (PD 856) and Roxas Municipal Revenue Code."
            },
            {
                permit_name: "Fire Safety Inspection Certificate (FSIC)",
                reason: "Mandatory fire protection clearance issued by the Bureau of Fire Protection (BFP) Roxas."
            }
        ],
        missing_information: [],
        reasoning: `Based on your business profile (${type} under ${category}), standard regulatory clearances and Mayor's Business Permit apply under Roxas municipal ordinances.`
    };
};

/**
 * Generate a structured JSON assessment from a natural language business description.
 */
const generateStructuredAssessment = async (business, availablePermits, knowledgeDocs = []) => {
    let businessDescription = {};
    if (typeof business === 'string') {
        try {
            businessDescription = JSON.parse(business);
        } catch (e) {
            businessDescription = {
                business_description: business,
                city_municipality_id: '175212000'
            };
        }
    } else if (business && typeof business === 'object') {
        businessDescription = business;
    }

    if (!businessDescription.city_municipality_id) {
        businessDescription.city_municipality_id = '175212000';
    }

    const targetLguId = '175212000';
    if (businessDescription.city_municipality_id !== targetLguId) {
        return {
            supportedLGU: false,
            industry_category: businessDescription.industry_category || 'Unknown',
            business_type: businessDescription.business_type || 'Unknown',
            confidence: 1.0,
            recommended_permits: [],
            missing_information: [],
            reasoning: "PermitEase currently provides detailed permit preparation and estimation features for the Municipality of Roxas, Oriental Mindoro. Your location has been saved, but LGU-specific permit assessment is not currently configured for this location."
        };
    }

    if (!isAiConfigured()) {
        console.warn('[aiService] Neither GROQ_API_KEY nor OPENROUTER_API_KEY is configured. Falling back to rule-based assessment.');
        return generateRuleBasedAssessment(businessDescription);
    }

    const kbSection = (knowledgeDocs && knowledgeDocs.length > 0)
        ? `\nOfficial Knowledge Base & Municipal Ordinances (Municipality of Roxas):\n${knowledgeDocs.map((d, i) => `${i + 1}. "${d.title}"`).join('\n')}\n*Note: Cite and reference applicable Knowledge Base ordinances or guidelines in your reasoning where appropriate.*\n`
        : '\nOfficial Knowledge Base: Standard Roxas Citizen\'s Charter, Municipal Revenue Code, and Local Government Code (RA 7160).\n';

    const prompt = `You are an AI assistant for the Municipality of Roxas PermitEase system.
Your task is to analyze the user's business profile and activities to return a STRICT JSON object containing your best assessment.
DO NOT provide official permit requirements. Only provide an advisory classification.
${kbSection}
Available Industry Categories configured in PermitEase:
- Food & Beverage
- Retail
- Services
- Manufacturing
- Agriculture
- Others

Available Business Types (Examples):
- Restaurant, Cafe, Sari-sari Store, Salon, Tech Startup, Farm, etc.

User's Business Information:
${typeof businessDescription === 'object' ? JSON.stringify(businessDescription, null, 2) : businessDescription}

Instructions:
1. Analyze the business name, type, and ESPECIALLY the "business_description" (activities) to understand what they actually do.
2. If "business_description" is missing or too short, return a lower confidence score and add "missing_information" (e.g. "Please describe the specific products or services you offer").
3. Assign the closest "industry_category".
4. Determine the specific "business_type".
5. Based on the business activities, suggest a list of potentially applicable advisory permits.

Take into account the full business context, including:
- Ownership Type: ${businessDescription.ownership_type}
- Primary Products/Services: ${businessDescription.primary_products}
- Complete Address: ${businessDescription.address}
- Specific Location IDs: (Province: ${businessDescription.province_id}, City: ${businessDescription.city_municipality_id})
- Conditional Business Characteristics: ${businessDescription.business_characteristics || 'None provided'}

You MUST respond ONLY with valid JSON exactly matching this structure, with no markdown code blocks and no surrounding text:
{
  "industry_category": "Your closest guess from the available industry categories",
  "business_type": "Your short description of the business type (e.g. 'Restaurant', 'Retail Store')",
  "confidence": 0.95,
  "recommended_permits": [
    {
      "permit_name": "Name of the Permit",
      "reason": "Why this permit is likely required based on their specific activities"
    }
  ],
  "missing_information": ["Any crucial missing details needed for a better assessment, or empty array"],
  "reasoning": "Brief explanation of how you arrived at this classification."
}`;

    try {
        const rawText = await callLLM([{ role: 'user', content: prompt }], { temperature: 0.1, max_tokens: 4096 });
        const parsedResult = parseCleanJson(rawText);
        
        if (!parsedResult.industry_category || !parsedResult.business_type || typeof parsedResult.confidence !== 'number') {
            throw new Error('AI returned an incomplete JSON structure.');
        }

        return parsedResult;
    } catch (error) {
        console.error('[aiService] generateStructuredAssessment error:', error.message);
        console.warn('[aiService] Falling back to rule-based assessment.');
        return generateRuleBasedAssessment(businessDescription);
    }
};

/**
 * Generate a conversational response for the AI Chatbot.
 */
const generateChatResponse = async (messages, userContext, staticContext, availablePermits, knowledgeDocs, preferredLanguage = "en", isAdvisory = false) => {
    if (!isAiConfigured()) {
        return "I'm currently in offline mode — AI is not configured. Please contact the System Administrator!";
    }

    // Determine greeting behavior based on context (only greet once on the first turn of main chat)
    const hasPreviousAssistantResponse = messages.some(m => m.role === 'assistant');
    const isFirstMessage = !hasPreviousAssistantResponse && messages.filter(m => m.role === 'user').length <= 1;

    const greetingInstruction = isAdvisory
        ? 'CRITICAL MANDATORY: Do NOT greet or introduce yourself under any circumstances. Do NOT say Hello, Hi, Mabuhay, Welcome, or I am PermitEase AI Assistant. Skip all introductions completely. Go directly to the first structured section heading or answer.'
        : isFirstMessage
            ? 'This is the start of the conversation. Greet the user with a brief, friendly one-sentence welcome, then immediately answer.'
            : 'CRITICAL MANDATORY: Do NOT greet or introduce yourself again. Do NOT say Hello, Welcome, or repeat I am PermitEase AI Assistant. The user already knows who you are. Jump directly into your answer.';

    const systemPrompt = `You are the official "PermitEase AI Assistant", an intelligent and welcoming business advisor for the Municipality of Roxas, Oriental Mindoro.

${greetingInstruction}

PRIMARY PURPOSE & FLEXIBLE SCOPE GUIDELINES:
1. CORE EXPERTISE & BROAD BUSINESS CONNECTION:
   - Your primary mission is to assist entrepreneurs and business owners with Philippine business permits, LGU clearances (Mayor's Permit, Sanitary, FSIC, Zoning, ESO, Barangay Clearance), taxes, fees, and compliance in Roxas.
   - BROAD & CONNECTED SCOPE: You are NOT overly rigid. You WELCOME and assist with ANY topic that relates to running, starting, managing, or complying with a business in the Philippines.
   - Topics you enthusiastically answer and connect back to business operation:
     * Starting, registering, or managing a business (DTI, SEC, BIR, SSS, PhilHealth, Pag-IBIG, DOLE)
     * General Philippine business laws, labor regulations, contracts, lease agreements, and tenancy
     * Bookkeeping, cash flow, invoicing, basic accounting, and financial planning
     * Fire safety best practices, environmental guidelines, sanitation, health cards, and food safety standards
     * Marketing ideas, customer service tips, location scouting, and commercial viability
     * Tourism clearances, resort/hotel requirements, sari-sari store operations, eateries/carinderias, retail, and agriculture businesses
     * Municipal ordinances, local commerce, and navigating government offices (BOSS, BPLO, Treasury, MPDO, MEO)

2. GENTLE GUIDANCE FOR COMPLETELY UNRELATED TOPICS:
   - Only decline topics that have ZERO connection to business, entrepreneurship, commerce, or government compliance (e.g., video games, celebrity gossip, sci-fi creative writing, complex programming scripts unrelated to commerce).
   - When declining, be helpful and bridge back to business:
     * In English: "That topic falls outside business and permit assistance, but I'm here to help with anything regarding starting, running, or licensing your business in Roxas. How can I assist you with your business today?"
     * In Tagalog: "Medyo malayo na po iyan sa usaping pang-negosyo at mga permit, pero handa po akong tumulong sa anumang may kinalaman sa pagsisimula, pagpapatakbo, o pagkuha ng permit para sa iyong negosyo dito sa Roxas. Paano ko po kayo matutulungan ngayon?"

3. ROLE AS PREPARATION COMPANION:
   - Provide clear, practical, and actionable guidance.
   - While you can explain laws, ordinances, and fee structures, remind users when necessary that final assessments, inspections, and formal approvals are performed by the official offices (BPLO, MHO, BFP, MTO).

4. DATA GROUNDING & ANTI-HALLUCINATION:
   - For specific user questions regarding THEIR business (e.g., "What am I missing?", "How much is my fee?"), use the REAL-TIME DATA provided below.
   - For general Philippine business concepts and municipal rules, share helpful, accurate knowledge.

5. LANGUAGE PREFERENCE (MANDATORY ENFORCEMENT):
   - Active language setting: ${preferredLanguage === 'tl' ? 'TAGALOG / FILIPINO' : 'ENGLISH'}.
   - If setting is 'tl': Your entire response MUST be in Tagalog/Filipino (with polite 'po/opo').
   - If setting is 'en': Your entire response MUST be in English. NEVER use Tagalog if the setting is 'en'.
   - Maintain a warm, encouraging, respectful, and senior-friendly tone.
   - Use clean, well-spaced text with simple bullet points (•) and natural headings.

Configured LGU Permit Requirements:
${JSON.stringify(availablePermits, null, 2)}

Available Knowledge Base Topics:
${knowledgeDocs.join(', ')}

==========================================================
OFFICIAL MUNICIPALITY RULES:
==========================================================
${staticContext}

${userContext}

Instructions & Clean Formatting Rules:
1. Answer the user's question clearly, concisely, and conversationally. Aim for 2-3 short, focused paragraphs or a tidy bulleted list. Avoid unnecessary fluff.
2. FORMATTING RULES (CLEAN & READABLE):
   - NEVER output empty bullet points or lone dots. Every bullet point (•) MUST be followed by the clearance name and a brief note.
   - DO NOT OVERUSE ASTERISKS (**) OR DASHES (---). Avoid visual clutter!
   - DO NOT place asterisks around whole sentences or random headers. Use standard capitalization for section headings (e.g. "1. Required Documents").
   - DO NOT put horizontal divider lines (---) between every single paragraph.
   - Use clean, standard bullet points (•) or numbers (1., 2., 3.).
   - Keep answers clean, natural, and friendly—like a helpful municipal officer typing in chat.
3. When answering "What requirements am I missing?", summarize the unique missing clearances (e.g., Barangay Clearance, Sanitary Permit, FSIC, Mayor's Permit) in a clean, deduplicated bulleted list.
4. When answering "How much do I need to pay?", state the ESTIMATED TOTAL and 3-4 primary fee components from the real-time data, and remind the user that it is an advisory estimate.
5. Remind users of the annual January 1 to 20 renewal window when discussing renewals.`;

    const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    try {
        let response = await callLLM(fullMessages, { temperature: 0.3, max_tokens: 4096 });
        if (response.includes('</think>')) {
            response = response.split('</think>')[1].trim();
        } else if (response.includes('<think>')) {
            response = response.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*/gi, '').trim();
        }

        // Remove repetitive greetings if it's an advisory query or a follow-up turn in chat
        if (isAdvisory || !isFirstMessage) {
            response = response
                .replace(/^(hello!?|hi!?|mabuhay!?|greetings!?)[^\n]*?(permitease|ai assistant|municipality of roxas|kyle tech|business)[^\n]*?\n*/i, '')
                .replace(/^(i am (the )?permitease ai assistant[^\n]*?\n*)/i, '')
                .replace(/^(as the official permitease[^\n]*?\n*)/i, '')
                .replace(/^(regarding your question about[^\n]*?\n*)/i, '')
                .replace(/^(hello!?|hi!?|mabuhay!?|greetings!?)\s*[,!\.-]?\s*/i, '')
                .trim();
        }

        return response;
    } catch (error) {
        console.error('[aiService] generateChatResponse error:', error.message);
        return 'I apologize, but I encountered a temporary error connecting to the AI service. Please try again in a moment.';
    }
};

/**
 * Generate a structured JSON fee estimate using AI.
 */
const generateFeeEstimate = async (businessData, rulesData) => {
    const targetLguId = '175212000';
    if (businessData.city_municipality_id !== targetLguId) {
        return {
            supportedLGU: false,
            estimationAvailable: false,
            estimatedTax: null,
            estimatedFees: null,
            business_summary: {
                business_name: businessData.business_name,
                business_type: businessData.business_type,
                application_type: businessData.business_status
            },
            estimation_confidence: "NOT SUPPORTED",
            local_business_tax: [],
            regulatory_fees: [],
            total_estimated_amount: null,
            summary: "PermitEase currently provides detailed permit preparation and estimation features for the Municipality of Roxas, Oriental Mindoro. Your location has been saved, but LGU-specific estimation is not currently configured for this location."
        };
    }
    if (!isAiConfigured()) {
        throw new Error('AI Assessment is temporarily unavailable. Neither GROQ_API_KEY nor OPENROUTER_API_KEY is configured on the server.');
    }

    const prompt = `You are an AI fee estimation assistant for the Municipality of Roxas PermitEase system.
Your task is to estimate business permit assessments based ONLY on the provided configured LGU rules and business profile.

BUSINESS PROFILE:
${JSON.stringify(businessData, null, 2)}

CONFIGURED LGU FEE RULES:
${JSON.stringify(rulesData, null, 2)}

INSTRUCTIONS:
1. Identify the business type, status (New/Renewal), sales, capitalization, employees, and floor area.
2. Evaluate each rule. Separate them into "Local Business Tax" (taxes based on sales/receipts or capitalization) and "Regulatory Fees" (Mayor's permit, sanitary, BFP, garbage, etc.).
3. For taxes:
   - For Renewal, use Gross Sales/Receipts.
   - For New Business, use Capitalization (if rule applies).
4. For BFP Fire Safety Inspection Fee: Compute as 15% of all other LGU regulatory fees (exclude Local Business Tax from this 15% basis if that is standard, or just 15% of LGU fees), with a minimum of 500.
5. If an exact rate is missing or cannot be computed reliably, set amount to null, and status to "TO BE ASSESSED". Do NOT invent amounts.
6. Return a STRICT JSON object exactly matching this structure (no markdown, no other text):

{
  "business_summary": {
    "business_name": "Name",
    "business_type": "Type",
    "application_type": "Status"
  },
  "estimation_confidence": "HIGH|MEDIUM|LOW|REQUIRES LGU CONFIRMATION",
  "local_business_tax": [
    {
      "name": "Local Business Tax",
      "basis": "Gross Sales/Receipts or Capitalization amount",
      "rate": "Rule or Bracket applied",
      "calculation": "Step-by-step formula",
      "amount": 100.00,
      "status": "ESTIMATED|TO BE ASSESSED"
    }
  ],
  "regulatory_fees": [
    {
      "name": "Fee Name",
      "basis": "Calculation Basis",
      "amount": 100.00,
      "status": "ESTIMATED|TO BE ASSESSED"
    }
  ],
  "missing_information": ["List missing fields if any"],
  "explanation": "Brief explanation."
}`;

    try {
        const rawText = await callLLM([{ role: 'user', content: prompt }], { temperature: 0.1, max_tokens: 4096 });
        return parseCleanJson(rawText);
    } catch (error) {
        console.error('[aiService] generateFeeEstimate error:', error.message);
        throw new Error('AI Fee Estimation service is temporarily unavailable. Please try again later.');
    }
};

module.exports = {
    generateStructuredAssessment,
    generateChatResponse,
    generateFeeEstimate
};