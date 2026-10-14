const fs = require('fs');
const file = 'frontend/src/pages/Assessment.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const newCode = `                ))}
              </div>
            )}

            {currentResult.ai_assessment && Array.isArray(currentResult.ai_assessment.recommended_permits) && currentResult.ai_assessment.recommended_permits.length > 0 && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0fdfa', borderRadius: 'var(--radius-md)', border: '1px solid #ccfbf1' }}>
                <h3 style={{ fontSize: '1rem', color: '#0f766e', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BrainCircuit size={18} color="#0d9488" />
                  AI Advisory Recommendations
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#115e59', marginBottom: '1rem' }}>Based on your business activities, you might also need to consider these additional permits:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {currentResult.ai_assessment.recommended_permits.map((req, i) => (
                    <div key={'ai-'+i} style={{ border: '1px solid #99f6e4', borderRadius: 'var(--radius-md)', padding: '1.25rem', background: 'white', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <AlertCircle size={18} style={{ color: '#0ea5e9', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', color: '#0f172a' }}>{req.permit_name}</h4>
                          {req.reason && <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>{req.reason}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>`.split('\n');

const before = lines.slice(0, 215);
const after = lines.slice(219);
const finalLines = [...before, ...newCode, ...after];

fs.writeFileSync(file, finalLines.join('\n'));
console.log('Successfully replaced lines 216-219');
