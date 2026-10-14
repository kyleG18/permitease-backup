const fs = require('fs');
const path = './frontend/src/pages/Onboarding.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import { BUSINESS_TYPES, getCategoriesForType }")) {
    content = content.replace(
        "import { Building2, MapPin, Calculator, CheckCircle2, ArrowRight, ArrowLeft, Globe, AlertCircle } from 'lucide-react';", 
        "import { Building2, MapPin, Calculator, CheckCircle2, ArrowRight, ArrowLeft, Globe, AlertCircle } from 'lucide-react';\nimport { BUSINESS_TYPES, getCategoriesForType } from '../data/businessCategories';"
    );
    fs.writeFileSync(path, content);
    console.log('Added missing import to Onboarding.jsx');
} else {
    console.log('Import already exists');
}
