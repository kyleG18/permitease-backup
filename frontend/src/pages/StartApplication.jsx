import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { Building2, ArrowRight, AlertCircle, FileText, Download } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

export default function StartApplication() {
  const { token } = useContext(AuthContext);
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';

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
    if (!selectedBiz) { setError(isTl ? 'Pumili muna ng negosyo.' : 'Please select a business.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: selectedBiz, application_type: applicationType })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || (isTl ? 'Hindi magawa ang aplikasyon.' : 'Unable to create application.')); setSubmitting(false); return; }
      navigate(`/applications/${data.id}`);
    } catch {
      setError(isTl ? 'Hindi magawa ang aplikasyon. Subukang muli.' : 'Unable to create application. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>{isTl ? 'Naglo-load...' : 'Loading...'}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '780px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary-green, #15803D)', marginBottom: '4px' }}>
            {isTl ? 'MUNICIPALITY OF ROXAS • FORM BPLO-01' : 'MUNICIPALITY OF ROXAS • FORM BPLO-01'}
          </div>
          <h1 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--text-dark, #0F172A)', fontWeight: '700' }}>
            {isTl ? 'Unified Application Form para sa Business Permit' : 'Unified Business Permit Application'}
          </h1>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            {isTl 
              ? 'Ihanda ang iyong opisyal na form para sa New Application o Renewal alinsunod sa Roxas BPLO guidelines' 
              : 'Prepare and pre-fill your official Roxas Unified Business Permit Application Form for submission'}
          </p>
        </div>

        <a
          href="/forms/Roxas_Business_Permit_Application_Form.pdf"
          download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'white',
            color: 'var(--government-navy, #0F172A)',
            border: '1px solid #CBD5E1',
            padding: '0.625rem 1rem',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '13px',
            textDecoration: 'none'
          }}
        >
          <Download size={15} />
          {isTl ? 'Blangkong PDF Form' : 'Blank PDF Form'}
        </a>
      </div>

      {businesses.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--warning)" style={{ marginBottom: '1rem', opacity: 0.7 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.75rem' }}>
            {isTl ? 'Walang Nahanap na Profile ng Negosyo' : 'No Business Profile Found'}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {isTl 
              ? 'Kailangan mo munang gumawa ng business profile bago simulan ang permit application.' 
              : 'You need to create a business profile before starting a permit application.'}
          </p>
          <button
            onClick={() => navigate('/profile')}
            style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
          >
            {isTl ? 'Gumawa ng Profile ng Negosyo' : 'Create Business Profile'}
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
            <label style={{ display: 'block', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              {isTl ? '1. Pumili ng Negosyo' : '1. Select Your Business'}
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
            <label style={{ display: 'block', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              {isTl ? '2. Uri ng Aplikasyon' : '2. Application Type'}
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { 
                  value: 'NEW', 
                  label: isTl ? 'Bagong Permit (New)' : 'New Business Permit', 
                  desc: isTl ? 'Unang beses na pagpaparehistro sa Roxas' : 'First-time municipal registration' 
                }, 
                { 
                  value: 'RENEWAL', 
                  label: isTl ? 'Pagpapanibago (Renewal)' : 'Renewal Application', 
                  desc: isTl ? 'Taunang renewal base sa nakaraang gross sales' : 'Annual renewal based on prior-year gross sales' 
                }
              ].map(opt => (
                <label key={opt.value} style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: `2px solid ${applicationType === opt.value ? 'var(--primary-green)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: applicationType === opt.value ? 'var(--light-green)' : 'white', transition: 'all 0.15s ease' }}>
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
            {submitting ? (isTl ? 'Ginagawa ang Form...' : 'Generating Form...') : <><span>{isTl ? 'Magpatuloy sa Unified Form' : 'Proceed to Unified Form'}</span> <ArrowRight size={18} /></>}
          </button>
        </div>
      )}
    </div>
  );
}
