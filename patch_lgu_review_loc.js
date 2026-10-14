const fs = require('fs');
const path = './frontend/src/pages/LGUApplicationReview.jsx';
let c = fs.readFileSync(path, 'utf8');

const newFields = `              {[
                { label: 'Business Name', value: app.business_name },
                { label: 'Business Category', value: app.business_type },
                { label: 'Ownership Type', value: app.ownership_type || '—' },
                { label: 'Primary Products', value: app.primary_products || '—' },
                { label: 'Premises Type', value: app.premises_type || '—' },
                { label: 'Address', value: app.address },
                { label: 'Location', value: resolvedLocation ? \`\${resolvedLocation.barangay}, \${resolvedLocation.city}\n\${resolvedLocation.province ? resolvedLocation.province + ', ' : ''}\${resolvedLocation.region}\` : 'Loading...' },
                { label: 'Owner', value: app.owner_name },
                { label: 'Contact', value: app.owner_contact || '—' },
                { label: 'Employees', value: app.employees },
                { label: 'Capitalization', value: app.capitalization ? \`?\${Number(app.capitalization).toLocaleString()}\` : '—' },
                { label: 'Gross Sales', value: app.gross_sales ? \`?\${Number(app.gross_sales).toLocaleString()}\` : '—' },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.label}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-dark)', whiteSpace: 'pre-line' }}>{f.value}</div>
                </div>
              ))}
            </div>`;

const oldFieldsRegex = /\{\[\s*\{\s*label:\s*'Business Name'[\s\S]*?\}\)\}\s*<\/div>/m;

c = c.replace(oldFieldsRegex, newFields);
fs.writeFileSync(path, c);
console.log('Patched Location in LGUApplicationReview.jsx');
