const fs = require('fs');
const path = './frontend/src/pages/Permits.jsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Comment about "officially issued"
c = c.replace(
    "// Filter only Approved permits (the officially issued ones)",
    "// Filter only Approved/Verified preparations"
);

// 2. Page subtitle
c = c.replace(
    "Officially issued business permits for your registered businesses.",
    "Preparation submissions verified by the BPLO. Note: This is not an official permit record. Official permits are issued by the BPLO after physical processing."
);

// 3. Empty state heading
c = c.replace(
    "<h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No Issued Permits</h3>",
    "<h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No Verified Submissions Yet</h3>"
);

// 4. Empty state body
c = c.replace(
    "Permits are issued once your application is approved by the LGU.",
    "Your preparation submission will appear here once the BPLO marks it as Verified. Official permits are processed at the physical BPLO office."
);

// 5. CTA link label
c = c.replace(
    ">View Applications</",
    ">View My Pre-Assessments</"
);

fs.writeFileSync(path, c);
console.log('Patched Permits.jsx');
