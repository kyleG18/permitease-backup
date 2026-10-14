const fs = require('fs');
const file = 'backend/services/aiService.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `Instructions:
1. Analyze the business name, type, and ESPECIALLY the "business_description" (activities) to understand what they actually do.
2. If "business_description" is missing or too short, return a lower confidence score and add "missing_information" (e.g. "Please describe the specific products or services you offer").
3. Assign the closest "industry_category".
4. Determine the specific "business_type".
5. Based on the business activities, suggest a list of potentially applicable advisory permits.

You MUST respond ONLY with valid JSON exactly matching this structure, with no markdown code blocks and no surrounding text:
{
  "industry_category": "Your closest guess from the available industry categories",
  "business_type": "Your short description of the business type (e.g. 'Restaurant', 'Retail Store')",
  "confidence": 0.95,
  "summary": "A 1-2 sentence professional summary of the business.",
  "questions": ["Follow-up question 1?", "Follow-up question 2?"],
  "recommended_permits": [
    { "permit_name": "Name of permit", "reason": "Why it might apply" }
  ]
}`;

// regex match to ignore line endings
const regex = /Instructions:[\s\S]*?4\. Determine the specific "business_type"\.[\s\S]*?You MUST respond ONLY with valid JSON exactly matching this structure, with no markdown code blocks and no surrounding text:[\s\S]*?\{[\s\S]*?"questions": \["Follow-up question 1\?", "Follow-up question 2\?"\]\r?\n\}/;

if (regex.test(content)) {
  fs.writeFileSync(file, content.replace(regex, replacement));
  console.log('Successfully replaced aiService.js');
} else {
  console.log('Target not found in aiService.js');
}
