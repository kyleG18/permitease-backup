const fs = require('fs');
const pages = [
  './frontend/src/pages/Assessment.jsx',
  './frontend/src/pages/TaxEstimation.jsx',
  './frontend/src/pages/FeeEstimation.jsx'
];

for (const p of pages) {
  let content = fs.readFileSync(p, 'utf8');
  const targetIdStr = "const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId));";
  const msgCheck = "const isSupportedLgu = selectedBiz?.city_municipality_id === '175212000';";

  if (content.includes(targetIdStr) && !content.includes('isSupportedLgu')) {
    content = content.replace(
      targetIdStr,
      `${targetIdStr}\n  ${msgCheck}`
    );
    
    const alertStr = `
            {!isSupportedLgu && selectedBiz && (
              <div style={{ padding: '1rem', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.4' }}>
                  <strong>Location Notice:</strong> PermitEase currently provides detailed features for the Municipality of Roxas, Oriental Mindoro. Your location has been saved, but LGU-specific rules are not currently configured for this location.
                </p>
              </div>
            )}
    `;
    
    // Inject right after the loading state check or before the main card
    if (content.includes('className="card" style={{ padding: \'2rem\' }}>')) {
      content = content.replace(
        'className="card" style={{ padding: \'2rem\' }}>',
        `className="card" style={{ padding: '2rem' }}>\n${alertStr}`
      );
    }
    
    fs.writeFileSync(p, content);
    console.log(`Patched ${p}`);
  }
}
