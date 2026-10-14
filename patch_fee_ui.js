const fs = require('fs');

// --- FeeEstimation.jsx --------------------------------------------------------
const feePath = './frontend/src/pages/FeeEstimation.jsx';
let fee = fs.readFileSync(feePath, 'utf8');

// 1. Replace the result panel (lines 152-180) so supportedLGU:false shows a notice, not ?0
const oldResultPanel = `          {!estimate ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>No fee estimate yet</div>
              <div style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>Enter or review the required business information on the left to estimate applicable regulatory fees.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '36px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  ?{totalFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>Estimated</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '1rem' }}>Based on the information provided.</div>
              
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)', marginBottom: '2rem' }}>
                {feeList.length} Applicable / Potentially Applicable Charges
              </div>

              {needsAssessment && (
                <div style={{ padding: '1rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '13px', color: '#92400E', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Official Assessment Required:</strong> Some fees cannot be exactly calculated yet and will be determined during official processing.
                  </div>
                </div>
              )}
            </>
          )}`;

const newResultPanel = `          {!estimate ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>No fee estimate yet</div>
              <div style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>Enter or review the required business information on the left to estimate applicable regulatory fees.</div>
            </div>
          ) : estimate.supportedLGU === false ? (
            <div style={{ padding: '1.25rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="#92400E" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '0.25rem', fontSize: '14px' }}>Estimation Unavailable for This Location</div>
                <div style={{ fontSize: '13px', color: '#78350F', lineHeight: '1.5' }}>{estimate.summary}</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '36px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  ?{totalFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>Estimated</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '1rem' }}>Based on the information provided.</div>
              
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)', marginBottom: '2rem' }}>
                {feeList.length} Applicable / Potentially Applicable Charges
              </div>

              {needsAssessment && (
                <div style={{ padding: '1rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '13px', color: '#92400E', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Official Assessment Required:</strong> Some fees cannot be exactly calculated yet and will be determined during official processing.
                  </div>
                </div>
              )}
            </>
          )}`;

fee = fee.replace(oldResultPanel, newResultPanel);

// 2. Also hide the breakdown table if unsupported
fee = fee.replace(
  '{estimate && feeList.length > 0 && (',
  '{estimate && estimate.supportedLGU !== false && feeList.length > 0 && ('
);

fs.writeFileSync(feePath, fee);
console.log('Patched FeeEstimation.jsx');
