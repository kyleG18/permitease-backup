import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Building2, ArrowRight, AlertCircle } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function StartApplication() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBiz, setSelectedBiz] = useState('');
  const [applicationType, setApplicationType] = useState('NEW');
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/businesses`, { headers })
      .then(r => r.json())
      .then(data => { setBusinesses(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const handleContinue = async () => {
    if (!selectedBiz) { setError('Please select a business.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: selectedBiz, application_type: applicationType })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Unable to create application.'); setSubmitting(false); return; }
      navigate(`/applications/${data.id}`);
    } catch {
      setError('Unable to create application. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '700px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--text-dark)' }}>New Application</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>Start a new business permit application</p>
      </div>

      {businesses.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--warning)" style={{ marginBottom: '1rem', opacity: 0.7 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.75rem' }}>No Business Profile Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            You need to create a business profile before starting a permit application.
          </p>
          <button
            onClick={() => navigate('/profile')}
            style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
          >
            Create Business Profile
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '2rem' }}>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {/* Step 1: Select Business */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              1. Select Your Business
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {businesses.map(biz => (
                <label key={biz.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: `2px solid ${selectedBiz == biz.id ? 'var(--primary-green)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: selectedBiz == biz.id ? 'var(--light-green)' : 'white', transition: 'all 0.15s ease' }}>
                  <input type="radio" name="business" value={biz.id} checked={selectedBiz == biz.id} onChange={() => setSelectedBiz(biz.id)} style={{ accentColor: 'var(--primary-green)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: selectedBiz == biz.id ? 'var(--primary-green)' : '#E2E8F0', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={20} color={selectedBiz == biz.id ? 'white' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-dark)', fontSize: '0.95rem' }}>{biz.business_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{biz.business_type} · {biz.industry_category}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Step 2: Application Type */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              2. Application Type
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[{ value: 'NEW', label: 'New Business Permit', desc: 'First-time registration' }, { value: 'RENEWAL', label: 'Renewal', desc: 'Renew existing permit' }].map(opt => (
                <label key={opt.value} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: `2px solid ${applicationType === opt.value ? 'var(--primary-green)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: applicationType === opt.value ? 'var(--light-green)' : 'white', transition: 'all 0.15s ease' }}>
                  <input type="radio" name="app_type" value={opt.value} checked={applicationType === opt.value} onChange={() => setApplicationType(opt.value)} style={{ accentColor: 'var(--primary-green)' }} />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-dark)' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={submitting}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: submitting ? '#9CA3AF' : 'var(--primary-green)', color: 'white', border: 'none', padding: '0.9rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
          >
            {submitting ? 'Creating...' : <><span>Continue</span> <ArrowRight size={18} /></>}
          </button>
        </div>
      )}
    </div>
  );
}
