const fs = require('fs');
const path = './frontend/src/pages/LGUApplications.jsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  "{['Application #', 'Business', 'Owner', 'Type', 'Submitted', 'Status', 'Action'].map(h => (",
  "{['Application #', 'Business', 'Owner', 'Type', 'Readiness', 'Status', 'Action'].map(h => ("
);

// We replace the submitted_at column with Readiness column, but wait, Submitted is useful. Let's replace Type with Readiness, or just add Readiness.
c = c.replace(
  "{['Application #', 'Business', 'Owner', 'Type', 'Readiness', 'Status', 'Action'].map(h => (",
  "{['Application #', 'Business', 'Owner', 'Readiness', 'Submitted', 'Status', 'Action'].map(h => ("
);

c = c.replace(
  `<td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{app.application_type === 'NEW' ? 'New Business' : 'Renewal'}</td>`,
  `{/* Removed Type to save space for Readiness */}
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                    {app.total_reqs > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, backgroundColor: '#E2E8F0', height: '6px', borderRadius: '3px', width: '60px' }}>
                          <div style={{ backgroundColor: (app.ready_reqs/app.total_reqs) === 1 ? '#16A34A' : '#D97706', height: '100%', borderRadius: '3px', width: \`\${(app.ready_reqs/app.total_reqs)*100}%\` }}></div>
                        </div>
                        <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{Math.round((app.ready_reqs/app.total_reqs)*100)}%</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                    )}
                  </td>`
);

fs.writeFileSync(path, c);
console.log('Patched LGUApplications.jsx');
