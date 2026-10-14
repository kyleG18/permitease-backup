const fs = require('fs');
const path = './frontend/src/pages/Onboarding.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes("import { BUSINESS_TYPES, getCategoriesForType }")) {
    content = content.replace("import { CheckCircle2, ChevronRight, Store, MapPin, Calculator, FileText, ChevronLeft, AlertCircle } from 'lucide-react';", "import { CheckCircle2, ChevronRight, Store, MapPin, Calculator, FileText, ChevronLeft, AlertCircle } from 'lucide-react';\nimport { BUSINESS_TYPES, getCategoriesForType } from '../data/businessCategories';");
}

// Replace business_type select
const oldTypeSelect = `<select className="form-control" name="business_type" value={formData.business_type} onChange={handleChange}>
                      <option value="">Select Business Type</option>
                      <option value="Retail">Retail</option>
                      <option value="Food and Dining">Food & Dining</option>
                      <option value="Services">Services</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Wholesale">Wholesale</option>
                    </select>`;
const newTypeSelect = `<select className="form-control" name="business_type" value={formData.business_type} onChange={handleChange}>
                      <option value="">Select Business Type</option>
                      {BUSINESS_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>`;
content = content.replace(oldTypeSelect, newTypeSelect);

// Replace industry_category select
const regexCat = /<select className="form-control" name="industry_category" value=\{formData\.industry_category\} onChange=\{handleChange\}>[\s\S]*?<\/select>/;
const newCatSelect = `<select className="form-control" name="industry_category" value={formData.industry_category} onChange={handleChange}>
                      <option value="">Select Category</option>
                      {getCategoriesForType(formData.business_type).map((group, idx) => (
                        <optgroup key={idx} label={group.group}>
                          {group.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </optgroup>
                      ))}
                    </select>`;
content = content.replace(regexCat, newCatSelect);

// Also fix conditional questions logic
const oldFoodLogic = `const isFood = formData.business_type === 'Food and Dining';`;
const newFoodLogic = `const isFood = formData.business_type === 'Food & Beverage' || (formData.industry_category || '').includes('Restaurant');`;
content = content.replace(oldFoodLogic, newFoodLogic);

const oldMfgLogic = `const isMfg = formData.business_type === 'Manufacturing';`;
const newMfgLogic = `const isMfg = formData.business_type === 'Manufacturing & Processing';`;
content = content.replace(oldMfgLogic, newMfgLogic);

const oldServiceLogic = `const isService = formData.business_type === 'Services';`;
const newServiceLogic = `const isService = formData.business_type === 'Services (Personal & Professional)';`;
content = content.replace(oldServiceLogic, newServiceLogic);

fs.writeFileSync(path, content);
console.log('Patched Onboarding.jsx');
