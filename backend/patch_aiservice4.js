const fs = require('fs');
const path = './services/aiService.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /const generateStructuredAssessment = async \(business, availablePermits\) => \{[\s\S]*?\n\};/m;

const newFn = `const generateStructuredAssessment = async (business, availablePermits) => {
    const businessDescription = typeof business === 'string' ? JSON.parse(business) : business;
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
        throw new Error('AI Assessment is temporarily unavailable. GROQ_API_KEY is not configured on the server.');
    }

    const prompt = \`You are an AI assistant for the Municipality of Roxas PermitEase system.
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
\${typeof businessDescription === 'object' ? JSON.stringify(businessDescription, null, 2) : businessDescription}

Instructions:
1. Analyze the business name, type, and ESPECIALLY the "business_description" (activities) to understand what they actually do.
2. If "business_description" is missing or too short, return a lower confidence score and add "missing_information" (e.g. "Please describe the specific products or services you offer").
3. Assign the closest "industry_category".
4. Determine the specific "business_type".
5. Based on the business activities, suggest a list of potentially applicable advisory permits.

Take into account the full business context, including:
- Ownership Type: \${businessDescription.ownership_type}
- Primary Products/Services: \${businessDescription.primary_products}
- Complete Address: \${businessDescription.address}
- Specific Location IDs: (Province: \${businessDescription.province_id}, City: \${businessDescription.city_municipality_id})
- Conditional Business Characteristics: \${businessDescription.business_characteristics || 'None provided'}

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
}\`;

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
        
        let jsonText = rawText.replace(/\\x60\\x60\\x60json\\n?/gi, '').replace(/\\x60\\x60\\x60\\n?/g, '').trim();
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
        if (error instanceof SyntaxError) {
            throw new Error('AI returned malformed JSON. Please try again.');
        }
        throw new Error('AI Assessment service is temporarily unavailable. Please try again later.');
    }
};`;

content = content.replace(regex, newFn);
fs.writeFileSync(path, content);
console.log('Patched aiService.js generateStructuredAssessment completely');
