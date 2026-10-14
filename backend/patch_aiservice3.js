const fs = require('fs');
const path = './services/aiService.js';
let content = fs.readFileSync(path, 'utf8');

// For Fee Estimate: intercept unsupported LGUs
const oldFeeStart = 'const generateFeeEstimate = async (businessData, rulesData) => {';
const newFeeStart = `const generateFeeEstimate = async (businessData, rulesData) => {
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
    }`;
content = content.replace(oldFeeStart, newFeeStart);


// For Structured Assessment: intercept unsupported LGUs
const oldAssessmentStart = 'const generateStructuredAssessment = async (business, availablePermits) => {';
const newAssessmentStart = `const generateStructuredAssessment = async (business, availablePermits) => {
    const businessDescription = typeof business === 'string' ? JSON.parse(business) : business;
    const targetLguId = '175212000';
    const isSupportedLgu = businessDescription.city_municipality_id === targetLguId;
`;
content = content.replace(oldAssessmentStart, newAssessmentStart);

// Now change the prompt inside generateStructuredAssessment to return empty requirements
const oldInstStart = 'Instructions:\n1. Analyze the business name';
const newInstStart = `Instructions:
0. IMPORTANT LOCATION RULE: If isSupportedLgu is false, YOU MUST return an empty array for recommended_permits and add supportedLGU: false to the root JSON object.
1. Analyze the business name`;
content = content.replace(oldInstStart, newInstStart);

fs.writeFileSync(path, content);
console.log('Patched aiService.js with short-circuit logic');
