const Groq = require('groq-sdk');
require('dotenv').config();

// The user can override this in .env. Fallback to the current production model.
const getModel = () => process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

/**
 * Initialize Groq client securely. Returns null if API key is missing.
 */
const getGroqClient = () => {
    if (!process.env.GROQ_API_KEY) {
        return null;
    }
    return new Groq({ apiKey: process.env.GROQ_API_KEY });
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
const generateStructuredAssessment = async (business, availablePermits) => {
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

    const groq = getGroqClient();
    if (!groq) {
        console.warn('[aiService] GROQ_API_KEY is not configured. Falling back to rule-based assessment.');
        return generateRuleBasedAssessment(businessDescription);
    }

    const prompt = `You are an AI assistant for the Municipality of Roxas PermitEase system.
Your task is to analyze the user's business profile and activities to return a STRICT JSON object containing your best assessment.
DO NOT provide official permit requirements. Only provide an advisory classification.

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
        const completion = await groq.chat.completions.create({
            model: getModel(),
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 4096
        });

        let rawText = completion.choices[0]?.message?.content || '{}';
        if (rawText.includes('</think>')) {
            rawText = rawText.split('</think>')[1];
        } else if (rawText.includes('<think>')) {
             throw new Error("AI response truncated. Please try again.");
        }
        
        let jsonText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end >= start) {
            jsonText = jsonText.substring(start, end + 1);
        }
        
        const parsedResult = JSON.parse(jsonText);
        
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
const generateChatResponse = async (messages, userContext, staticContext, availablePermits, knowledgeDocs, preferredLanguage = "en") => {
    const groq = getGroqClient();
    if (!groq) {
        return "I'm currently in offline mode — AI is not configured. Please contact the System Administrator!";
    }

    const systemPrompt = `You are the official "PermitEase AI Assistant", an intelligent and welcoming business advisor for the Municipality of Roxas, Oriental Mindoro.

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
1. Answer the user's question clearly and conversationally. Connect concepts to practical business advice and compliance.
2. FORMATTING RULES (CLEAN & READABLE):
   - DO NOT OVERUSE ASTERISKS (**) OR DASHES (---). Avoid markdown visual clutter!
   - DO NOT place asterisks around whole sentences or random headers. Use standard capitalization for section headings (e.g. "1. Required Documents" instead of "### 1. **Required Documents**").
   - DO NOT put horizontal divider lines (---) between every single paragraph.
   - Use simple numbers (1., 2., 3.) or standard bullet points (•) for lists. Do not bold every bullet item.
   - Keep answers clean, natural, and friendly—like a knowledgeable human officer typing in chat, not a raw robotic markdown template.
3. When answering "How much do I need to pay?", cite the ESTIMATED PERMIT FEES from the real-time data and mention that it is an estimate.
4. When answering "What requirements am I missing?", cite the MISSING REQUIREMENTS list.
5. Remind users of the annual January 1 to 20 renewal window when discussing renewals.`;

    const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    try {
        const completion = await groq.chat.completions.create({
            model: getModel(),
            messages: fullMessages,
            temperature: 0.3,
            max_tokens: 4096
        });

        let response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        if (response.includes('</think>')) {
            response = response.split('</think>')[1].trim();
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
    const groq = getGroqClient();
    if (!groq) {
        throw new Error('AI Assessment is temporarily unavailable. GROQ_API_KEY is not configured on the server.');
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
        const completion = await groq.chat.completions.create({
            model: getModel(),
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 4096
        });

        let rawText = completion.choices[0]?.message?.content || '{}';
        if (rawText.includes('</think>')) {
            rawText = rawText.split('</think>')[1];
        } else if (rawText.includes('<think>')) {
             throw new Error("AI response truncated. Please try again.");
        }

        let jsonText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end >= start) {
            jsonText = jsonText.substring(start, end + 1);
        }

        return JSON.parse(jsonText);
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
