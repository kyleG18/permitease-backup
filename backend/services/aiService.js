const Groq = require('groq-sdk');
require('dotenv').config();

// The user can override this in .env. Fallback to the current production model.
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

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
 * Generate a structured JSON assessment from a natural language business description.
 */
const generateStructuredAssessment = async (businessDescription, availablePermits) => {
    const groq = getGroqClient();
    if (!groq) {
        throw new Error('AI Assessment is temporarily unavailable. GROQ_API_KEY is not configured on the server.');
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

You MUST respond ONLY with valid JSON exactly matching this structure, with no markdown code blocks and no surrounding text:
{
  "industry_category": "Your closest guess from the available industry categories",
  "business_type": "Your short description of the business type (e.g. 'Restaurant', 'Retail Store')",
  "confidence": 0.95,
  "summary": "A 1-2 sentence professional summary of the business.",
  "questions": ["Follow-up question 1?", "Follow-up question 2?"]
}

If you cannot determine the industry, output "Others" for industry_category and set a low confidence score (e.g., 0.2).`;

    try {
        const completion = await groq.chat.completions.create({
            model: DEFAULT_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 4096
        });

        let rawText = completion.choices[0]?.message?.content || '{}';
        
        // If there's a reasoning block, take only what comes after it
        if (rawText.includes('</think>')) {
            rawText = rawText.split('</think>')[1];
        } else if (rawText.includes('<think>')) {
             // It got truncated during reasoning
             throw new Error("AI response truncated. Please try again.");
        }

        // Strip markdown code fences if present (defense in depth)
        let jsonText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

        // Extract JSON substring to avoid trailing text
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end >= start) {
            jsonText = jsonText.substring(start, end + 1);
        }

        let parsedResult;
        try {
            parsedResult = JSON.parse(jsonText);
        } catch (e) {
            console.error("FAILED JSON:", jsonText);
            throw e;
        }
        
        // Validate expected structure
        if (!parsedResult.industry_category || !parsedResult.business_type || typeof parsedResult.confidence !== 'number') {
            throw new Error('AI returned an incomplete JSON structure.');
        }

        return parsedResult;
    } catch (error) {
        console.error('[aiService] generateStructuredAssessment error:', error.message);
        if (error instanceof SyntaxError) {
            throw new Error('AI returned malformed JSON. Please try again.');
        }
        // Mask raw Groq errors from users
        throw new Error('AI Assessment service is temporarily unavailable. Please try again later.');
    }
};

/**
 * Generate a conversational response for the AI Chatbot.
 */
const generateChatResponse = async (messages, userContext, staticContext, availablePermits, knowledgeDocs) => {
    const groq = getGroqClient();
    if (!groq) {
        return "I'm currently in offline mode — AI is not configured. Please contact the System Administrator!";
    }

    const systemPrompt = `You are the official "PermitEase AI Assistant" for the Municipality of Roxas.

LANGUAGE RULE (VERY IMPORTANT):
- If the user writes in Tagalog or Filipino, respond ENTIRELY in Tagalog/Filipino.
- If the user writes in English, respond in English.
- If mixed (Taglish), respond in Tagalog/Filipino.
- Always be polite and professional.

CRITICAL RULES — YOU MUST FOLLOW THESE (ANTI-HALLUCINATION):
1. NEVER invent or guess permit requirements, tax rates, or fees.
2. NEVER claim an estimate is an official government assessment.
3. NEVER approve or reject permit applications.
4. ALWAYS use the real-time data provided below for the user's compliance, requirements, and fees.
5. If the user asks about their requirements or fees, quote the data exactly from the REAL-TIME DATA section.
6. If you cannot find relevant data, say so honestly and direct them to visit the BPLO office. Do not guess.
7. NEVER change or modify application statuses or invent expiration dates.

Configured LGU Permit Requirements:
${JSON.stringify(availablePermits, null, 2)}

Available Knowledge Base Topics:
${knowledgeDocs.join(', ')}

==========================================================
OFFICIAL MUNICIPALITY RULES:
==========================================================
${staticContext}

${userContext}

Instructions:
1. Answer the user's question using the real-time data above when relevant.
2. Use bullet points and bold text for clarity.
3. When answering "How much do I need to pay?", cite the ESTIMATED PERMIT FEES from the real-time data.
4. When answering "What requirements am I missing?", cite the MISSING REQUIREMENTS list.
5. Always add a disclaimer when discussing fees that they are estimates only.`;

    const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    try {
        const completion = await groq.chat.completions.create({
            model: DEFAULT_MODEL,
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
            model: DEFAULT_MODEL,
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
