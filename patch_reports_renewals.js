const fs = require('fs');

// Patch Reports.jsx
let reports = fs.readFileSync('./frontend/src/pages/Reports.jsx', 'utf8');
reports = reports.replace(
    '<p className="text-muted m-0" style={{ fontSize: \'0.875rem\' }}>Active Permits</p>',
    '<p className="text-muted m-0" style={{ fontSize: \'0.875rem\' }}>Verified Submissions</p>'
);
reports = reports.replace(
    '<p className="text-muted m-0" style={{ fontSize: \'0.875rem\' }}>Expired Permits</p>',
    '<p className="text-muted m-0" style={{ fontSize: \'0.875rem\' }}>Expired Submissions</p>'
);
fs.writeFileSync('./frontend/src/pages/Reports.jsx', reports);

// Patch Renewals.jsx
let renewals = fs.readFileSync('./frontend/src/pages/Renewals.jsx', 'utf8');
renewals = renewals.replace(
    '<h4 style={{ margin: 0, color: \'var(--text-muted)\', fontSize: \'0.85rem\', textTransform: \'uppercase\' }}>Total Permits</h4>',
    '<h4 style={{ margin: 0, color: \'var(--text-muted)\', fontSize: \'0.85rem\', textTransform: \'uppercase\' }}>Total Submissions</h4>'
);
fs.writeFileSync('./frontend/src/pages/Renewals.jsx', renewals);

// Patch AdminAnalytics.jsx
let analytics = fs.readFileSync('./frontend/src/pages/AdminAnalytics.jsx', 'utf8');
analytics = analytics.replace(
    'title="Active Permits"',
    'title="Verified Submissions"'
);
analytics = analytics.replace(
    'title="Expired Permits"',
    'title="Expired Submissions"'
);
fs.writeFileSync('./frontend/src/pages/AdminAnalytics.jsx', analytics);

console.log('Patched remaining pages');
