const fs = require('fs');
const path = './services/aiService.js';
let content = fs.readFileSync(path, 'utf8');

// For generateStructuredAssessment
const oldAssessmentPromptStart = `User's Business Information:
\${typeof businessDescription === 'object' ? JSON.stringify(businessDescription, null, 2) : businessDescription}

Instructions:`;

const newAssessmentPromptStart = `User's Business Information:
\${typeof businessDescription === 'object' ? JSON.stringify(businessDescription, null, 2) : businessDescription}

Instructions:
0. IMPORTANT LOCATION RULE: If the business city_municipality_id is NOT '175212000' (Municipality of Roxas, Oriental Mindoro), YOU MUST return an empty array for recommended_permits and include a clear message in your reasoning: "PermitEase currently provides detailed permit preparation features for the Municipality of Roxas, Oriental Mindoro. Your location has been saved, but LGU-specific permit assessment is not currently configured for this location." DO NOT invent or assume requirements for unsupported LGUs.`;

content = content.replace(oldAssessmentPromptStart, newAssessmentPromptStart);

// For generateFeeEstimate
const oldFeePromptStart = `INSTRUCTIONS:
1. Identify the business type, status (New/Renewal), sales, capitalization, employees, and floor area.`;

const newFeePromptStart = `INSTRUCTIONS:
0. IMPORTANT LOCATION RULE: If the business city_municipality_id is NOT '175212000' (Municipality of Roxas, Oriental Mindoro), YOU MUST return empty arrays for local_business_tax and regulatory_fees, total_estimated_amount = 0, and the summary/confidence must state: "PermitEase currently provides detailed estimation features for the Municipality of Roxas, Oriental Mindoro. Your location has been saved, but LGU-specific estimation is not currently configured for this location." DO NOT fabricate amounts.
1. Identify the business type, status (New/Renewal), sales, capitalization, employees, and floor area.`;

content = content.replace(oldFeePromptStart, newFeePromptStart);

fs.writeFileSync(path, content);
console.log('Patched aiService.js again');
