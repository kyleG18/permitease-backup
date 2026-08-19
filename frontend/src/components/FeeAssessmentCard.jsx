import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';

const API = 'http://localhost:5000/api';

function formatPHP(amount) {
  return '₱' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Group breakdown items by category */
function groupByCategory(breakdown) {
  const map = {};
  for (const item of breakdown) {
    if (!map[item.category]) map[item.category] = [];
    map[item.category].push(item);
  }
  return map;
}

export default function FeeAssessmentCard({ applicationId, isAdminView = false }) {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    setLoading(true);
    setError('');
    fetch(`${API}/applications/${applicationId}/fees`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.message && !d.breakdown) { setError(d.message); }
        else { setData(d); }
        setLoading(false);
      })
      .catch(() => { setError('Unable to calculate the estimated permit cost.'); setLoading(false); });
  }, [applicationId]);

  if (loading) {
    return (
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading fee assessment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const grouped = groupByCategory(data.breakdown || []);

  return (
    <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-dark)' }}>
            {isAdminView ? 'System Estimate' : 'Estimated Permit Cost'}
          </div>
          {isAdminView && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>LGU View — System Calculated</div>
          )}
        </div>
        {data.is_incomplete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700' }}>
            <AlertTriangle size={12} />
            INCOMPLETE
          </div>
        )}
      </div>

      {/* Fee Line Items grouped by category */}
      <div style={{ padding: '1rem 1.5rem' }}>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{category}</div>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-dark)', flex: 1 }}>{item.name}</div>
                {item.status === 'calculated' ? (
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>{formatPHP(item.amount)}</div>
                ) : (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#D97706', fontSize: '0.8rem', fontWeight: '600' }}>
                      <AlertTriangle size={12} />
                      Unable to calculate
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem', maxWidth: '180px', textAlign: 'right' }}>{item.reason}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Divider */}
        <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {data.is_incomplete ? 'Partial Estimated Total' : 'Estimated Total'}
              </div>
              {data.is_incomplete && (
                <div style={{ fontSize: '0.72rem', color: '#D97706', marginTop: '0.15rem' }}>
                  Some fees could not be calculated
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: data.is_incomplete ? '#D97706' : 'var(--primary-green)' }}>
                {formatPHP(data.total_estimated_amount)}
              </div>
              {data.is_incomplete && (
                <div style={{ fontSize: '0.7rem', color: '#D97706' }}>+ uncalculated fees</div>
              )}
            </div>
          </div>
        </div>

        {/* Missing Info Section */}
        {data.is_incomplete && data.missing_info_reasons.length > 0 && (
          <div style={{ marginTop: '1rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400E', marginBottom: '0.35rem' }}>Missing Information</div>
            {data.missing_info_reasons.map((r, i) => (
              <div key={i} style={{ fontSize: '0.78rem', color: '#78350F', marginBottom: '0.2rem' }}>• {r}</div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Info size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {data.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}
