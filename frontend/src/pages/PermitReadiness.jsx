import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, ArrowRight, Building2, UploadCloud, Edit } from 'lucide-react';

const API = 'http://localhost:5000/api';

function formatPHP(amount) {
  return '₱' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const CategoryIcon = ({ status }) => {
  if (status === 'Complete') return <CheckCircle2 size={18} color="#16A34A" />;
  if (status === 'Incomplete') return <AlertCircle size={18} color="#D97706" />;
  return <XCircle size={18} color="#DC2626" />;
};

export default function PermitReadiness() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse URL parameters
  const queryParams = new URLSearchParams(location.search);
  const initialBizId = queryParams.get('businessId') || '';
  const initialType = queryParams.get('type') || 'NEW';
  
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState(initialBizId);
  const [applicationType, setApplicationType] = useState(initialType);
  
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const headers = { Authorization: `Bearer ${token}` };

  // Load Businesses
  useEffect(() => {
    fetch(`${API}/businesses`, { headers })
      .then(r => r.json())
      .then(data => {
        const bizList = Array.isArray(data) ? data : [];
        setBusinesses(bizList);
        if (bizList.length > 0 && !selectedBizId) {
          setSelectedBizId(String(bizList[0].id));
        }
      })
      .catch(() => setError('Unable to load businesses.'));
  }, []);

  // Check Readiness
  useEffect(() => {
    if (selectedBizId && applicationType) {
      setLoading(true);
      setError('');
      fetch(`${API}/readiness/${selectedBizId}?application_type=${applicationType}`, { headers })
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.message || 'Error fetching readiness');
          return data;
        })
        .then(data => setReadiness(data))
        .catch(err => {
          console.error(err);
          setError('Unable to calculate permit readiness.');
          setReadiness(null);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedBizId, applicationType]);

  const handleContinue = async () => {
    if (!selectedBizId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: selectedBizId, application_type: applicationType })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to create application.');
        setSubmitting(false);
        return;
      }
      navigate(`/applications/${data.id}`);
    } catch {
      setError('Unable to continue to application.');
      setSubmitting(false);
    }
  };

  if (businesses.length === 0 && !loading && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '900px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <AlertCircle size={48} color="var(--warning)" style={{ marginBottom: '1rem', opacity: 0.7 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.75rem' }}>No Business Profile Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            You need to create a business profile before assessing readiness.
          </p>
          <button onClick={() => navigate('/profile')} style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
            Create Business Profile
          </button>
        </div>
      </div>
    );
  }

  const score = readiness?.readiness_score ?? 0;
  const isReady = readiness?.overall_state === 'READY';
  const isAlmostReady = readiness?.overall_state === 'READY_WITH_ACTIONS';
  const stateLabel = isReady ? 'READY TO SUBMIT' : isAlmostReady ? 'ALMOST READY' : 'NOT READY TO SUBMIT';
  const stateColor = isReady ? '#16A34A' : isAlmostReady ? '#D97706' : '#DC2626';

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Permit Readiness</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Check if your business is ready before starting a permit application.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Business</label>
          <select value={selectedBizId} onChange={e => setSelectedBizId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
            {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Application Type</label>
          <select value={applicationType} onChange={e => setApplicationType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
            <option value="NEW">New Business Permit</option>
            <option value="RENEWAL">Renewal</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
          Checking permit readiness...
        </div>
      ) : readiness ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Score Card */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '2rem', boxShadow: 'var(--shadow-card)', borderTop: `4px solid ${stateColor}` }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Readiness Score</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: stateColor, lineHeight: '1' }}>{score}%</div>
              <div style={{ padding: '0.25rem 0.75rem', backgroundColor: `${stateColor}15`, color: stateColor, borderRadius: '999px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                {isReady ? '✓' : '⚠'} {stateLabel}
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{readiness.recommendation}</div>
          </div>

          {/* Checklist */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={18} color="var(--primary-green)" /> Readiness Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {readiness.categories.map(cat => (
                <div key={cat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CategoryIcon status={cat.status} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-dark)' }}>{cat.label}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: cat.status === 'Complete' ? '#16A34A' : '#D97706' }}>{cat.status === 'Complete' ? `✓ ${cat.score}%` : `⚠ ${cat.score}%`}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Required */}
          {readiness.action_required && readiness.action_required.length > 0 && (
            <div style={{ backgroundColor: '#FEF3C7', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid #FDE68A' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E' }}><AlertCircle size={18} /> Action Required</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {readiness.action_required.map((act, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'white', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#78350F', fontWeight: '500' }}>
                      <span style={{ color: '#D97706' }}>•</span> {act.text}
                    </div>
                    {act.link && (
                      <Link to={act.link} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary-green)', textDecoration: 'none', padding: '0.35rem 0.75rem', border: '1px solid var(--primary-green)', borderRadius: '999px', backgroundColor: '#F0FDF4' }}>
                        {act.type === 'document' ? <UploadCloud size={14} /> : <Edit size={14} />} {act.actionText}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Cost Summary */}
          {readiness.fee_assessment && (
            <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Estimated Permit Cost</h3>
              
              {readiness.fee_assessment.is_incomplete ? (
                <div style={{ color: '#D97706', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '500' }}>
                  ⚠ Incomplete
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: '400' }}>
                    Cannot calculate full estimate because required business information is missing.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {readiness.fee_assessment.breakdown.map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-dark)' }}>
                      <span>{b.name}</span>
                      <span style={{ fontWeight: '500' }}>{formatPHP(b.amount)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>ESTIMATED TOTAL</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary-green)' }}>{formatPHP(readiness.fee_assessment.total_estimated_amount)}</span>
                  </div>
                </div>
              )}
              
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{readiness.fee_assessment.disclaimer}</div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={submitting || (isReady === false && isAlmostReady === false)} // Only disable if totally NOT ready, though users might still want to proceed and fix later? Prompt says: "The readiness page should NOT automatically submit. user must explicitly submit". If we disable it on NOT_READY, it's safer. Actually let's allow it but they have to fix it in draft.
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
              backgroundColor: submitting ? '#9CA3AF' : 'var(--primary-green)', color: 'white', 
              border: 'none', padding: '1rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', 
              cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '1rem', marginTop: '0.5rem' 
            }}
          >
            {submitting ? 'Creating Draft...' : <>Continue to Application <ArrowRight size={18} /></>}
          </button>

        </div>
      ) : null}
    </div>
  );
}
