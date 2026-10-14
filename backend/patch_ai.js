const fs = require('fs');
const path = './services/aiService.js';
let content = fs.readFileSync(path, 'utf8');

const oldPromptBlock = "Based on the provided business profile, identify the likely required local permits and clearances. Use the LGU's available configured requirements to match against the business activities.";
const newPromptBlock = `Based on the provided business profile, identify the likely required local permits and clearances. Use the LGU's available configured requirements to match against the business activities.

Take into account the full business context, including:
- Ownership Type: \${businessDescription.ownership_type}
- Primary Products/Services: \${businessDescription.primary_products}
- Complete Address: \${businessDescription.address}
- Specific Location IDs: (Province: \${businessDescription.province_id}, City: \${businessDescription.city_municipality_id})
- Conditional Business Characteristics: \${businessDescription.business_characteristics || 'None provided'}

IMPORTANT LOCATION RULE: 
If the city/municipality ID indicates a location OTHER than the Municipality of Roxas, Oriental Mindoro (PSGC code for Roxas usually), acknowledge this in the advice. PermitEase detailed rules are scoped to Roxas, Oriental Mindoro. For other locations, provide standard national advisory but mention that specific LGU rules may vary and the user should consult their local BPLO.`;

content = content.replace(oldPromptBlock, newPromptBlock);
fs.writeFileSync(path, content);
console.log('Updated aiService.js');
