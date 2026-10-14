const fs = require('fs');
const path = './frontend/src/pages/Dashboard.jsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Update admin dashboard title
c = c.replace(
  "LGU Compliance Dashboard",
  "BPLO Preparation Support Dashboard"
);
c = c.replace(
  "Municipality of Roxas \u2014 Business Permit Management Overview",
  "Municipality of Roxas \u2014 Business Permit Preparation Overview"
);

// 2. Update "Municipal Compliance Rate" section label
c = c.replace(
  "Municipal Compliance Rate",
  "Municipal Preparation Readiness"
);
c = c.replace(
  "Overall Municipal Compliance",
  "Average Preparation Readiness"
);

// 3. Update "Recent Applications" section -> "Recent Pre-Assessment Submissions"
c = c.replace(
  '<h3 style={{ margin: 0, color: \'var(--government-navy)\' }}>Recent Applications</h3>',
  '<h3 style={{ margin: 0, color: \'var(--government-navy)\' }}>Recent Pre-Assessment Submissions</h3>'
);
c = c.replace(
  "'No applications yet.'",
  "'No pre-assessment submissions yet.'"
);

// 4. Update table header "Permit" -> "Preparation Ref."
c = c.replace(
  "{['Business', 'Permit', 'Date', 'Status'].map(h => <th key={h}>{h}</th>)}",
  "{['Business', 'Preparation Ref.', 'Date', 'Status'].map(h => <th key={h}>{h}</th>)}"
);

// 5. Add scope disclaimer banner at top of admin section
const disclaimer = `      {/* PermitEase Scope Notice */}
      <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: '#78350F', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: '700', flexShrink: 0 }}>??</span>
        <span><strong>PermitEase is a Preparation Support Tool.</strong> Metrics shown reflect preparation and readiness data only. PermitEase does not approve, issue, or process official business permits. All official permit processing is handled by the BPLO.</span>
      </div>\n`;

c = c.replace(
  `      {/* Stat Cards */}\n      <div className="stats-grid">`,
  disclaimer + `      {/* Stat Cards */}\n      <div className="stats-grid">`
);

fs.writeFileSync(path, c);
console.log('Patched AdminDashboard in Dashboard.jsx');
