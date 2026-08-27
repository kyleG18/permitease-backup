import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

export default function VerifyPermit() {
  const { verificationCode } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/permits/verify/${verificationCode}`)
      .then(async r => {
        const data = await r.json();
        setResult({ httpStatus: r.status, ...data });
        setLoading(false);
      })
      .catch(() => {
        setResult({ status: 'ERROR', message: 'Unable to contact verification server.' });
        setLoading(false);
      });
  }, [verificationCode]);

  const StatusConfig = {
    VALID:    { Icon: CheckCircle, iconColor: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0', title: 'VALID PERMIT',   subtitle: 'This permit is authentic and currently valid.' },
    EXPIRED:  { Icon: AlertCircle, iconColor: '#D97706', bg: '#FEF3C7', border: '#FDE68A', title: 'EXPIRED PERMIT', subtitle: 'This permit is authentic but has expired.' },
    INVALID:  { Icon: XCircle,     iconColor: '#DC2626', bg: '#FEE2E2', border: '#FECACA', title: 'INVALID PERMIT', subtitle: 'No permit record was found for this code.' },
    ERROR:    { Icon: AlertCircle, iconColor: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', title: 'VERIFICATION ERROR', subtitle: 'An error occurred during verification.' },
  };

  const cfg = StatusConfig[result?.status] || StatusConfig.ERROR;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Shield size={22} color="#16A34A" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PermitEase</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>Municipality of Roxas · Digital Permit Verification</p>
        </div>

        {/* Verification Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: '0.95rem' }}>Verifying permit...</div>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, padding: '2.5rem', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
                <cfg.Icon size={52} color={cfg.iconColor} style={{ marginBottom: '1rem' }} />
                <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: cfg.iconColor, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>{cfg.title}</h1>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{cfg.subtitle}</p>
              </div>

              {/* Permit Details */}
              {result?.data && (
                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {[
                      { label: 'Permit Number', value: result.data.permit_number },
                      { label: 'Business Name', value: result.data.business_name },
                      { label: 'Business Type', value: result.data.business_type },
                      { label: 'Industry', value: result.data.industry_category },
                      { label: 'Permit Type', value: result.data.permit_type },
                      { label: 'Municipality', value: result.data.municipality },
                      { label: 'Date Issued', value: fmt(result.data.issue_date) },
                      { label: 'Valid Until', value: fmt(result.data.expiration_date) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1E293B', textAlign: 'right', maxWidth: '55%' }}>{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Row */}
              <div style={{ padding: '1rem 2rem 2rem' }}>
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.2rem' }}>Verification Code</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: '700', color: '#16A34A', letterSpacing: '0.08em' }}>{verificationCode}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.5' }}>
          This is a system-generated permit verification. <br />
          For official inquiries, contact the Municipality of Roxas BPLO.
        </p>
      </div>
    </div>
  );
}
