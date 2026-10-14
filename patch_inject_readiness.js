const fs = require('fs');
const path = './frontend/src/pages/LGUApplicationReview.jsx';
let c = fs.readFileSync(path, 'utf8');

const readinessBlock = `          {/* Permit Readiness Score */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--government-navy)' }}>
                <Shield size={18} /> Permit Readiness
              </h3>
              <span style={{ fontWeight: '700', fontSize: '1.25rem', color: readColor }}>{readScore}%</span>
            </div>
            
            {totalReqs > 0 ? (
              <>
                <div style={{ backgroundColor: '#F1F5F9', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{ backgroundColor: readColor, height: '100%', width: \`\${readScore}%\`, transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  <span>{readyReqs} Ready</span>
                  <span>{totalReqs - readyReqs} Still Needed</span>
                  <span>{totalReqs} Total</span>
                </div>
              </>
            ) : null}

            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checklist</h3>
            {app.requirements.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No requirements linked to this business yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {app.requirements.map(req => {
                  const done = ['Submitted', 'Approved'].includes(req.req_status);
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: done ? '#F0FDF4' : '#FFF7ED', borderRadius: 'var(--radius-sm)', border: \`1px solid \${done ? '#BBF7D0' : '#FED7AA'}\` }}>
                      {done ? <CheckCircle size={18} color="#16A34A" /> : <AlertCircle size={18} color="#F59E0B" />}
                      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-dark)' }}>{req.permit_name}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: done ? '#16A34A' : '#D97706' }}>{done ? 'Ready' : 'Missing'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

`;

c = c.replace(
  "{/* Documents */}",
  readinessBlock + "          {/* Documents */}"
);

fs.writeFileSync(path, c);
console.log('Injected readiness block');
