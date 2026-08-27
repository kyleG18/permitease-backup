import { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Download, ExternalLink, Shield, ChevronRight, QrCode } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const getValidityInfo = (expDate) => {
  if (!expDate) return { label: 'Unknown', color: '#64748B', bg: '#F1F5F9', icon: '?' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expDate);
  const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (today > exp) return { label: 'Expired', color: '#991B1B', bg: '#FEE2E2', icon: '✕', daysLeft };
  if (daysLeft <= 60) return { label: 'Expiring Soon', color: '#92400E', bg: '#FEF3C7', icon: '⚠', daysLeft };
  return { label: 'Valid', color: '#166534', bg: '#DCFCE7', icon: '✓', daysLeft };
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0.75rem 0' }}>
    <span style={{ width: '180px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: '500' }}>{value || '—'}</span>
  </div>
);

export default function PermitDetail() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [permit, setPermit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/permits/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.message && !data.id) { setError(data.message); } else { setPermit(data); }
        setLoading(false);
      })
      .catch(() => { setError('Unable to load permit.'); setLoading(false); });
  }, [id]);

  const handleDownload = async () => {
    try {
      const res = await fetch(`${API}/permits/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); alert(d.message || 'Download failed.'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${permit?.permit_number || 'permit'}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download permit PDF.'); }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading permit...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>{error}</div>;
  if (!permit) return null;

  const validity = getValidityInfo(permit.expiration_date);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link to="/permits" style={{ color: 'var(--primary-green)', textDecoration: 'none' }}>My Permits</Link>
        <ChevronRight size={14} />
        <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{permit.permit_number}</span>
      </div>

      {/* Header Card */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Shield size={24} color="var(--primary-green)" />
              <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-green)' }}>{permit.permit_number}</span>
            </div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.4rem', color: 'var(--text-dark)' }}>{permit.business_name}</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{permit.permit_name}</p>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem 1.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: validity.bg }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{validity.icon}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: validity.color }}>{validity.label}</div>
            {validity.daysLeft !== undefined && (
              <div style={{ fontSize: '0.75rem', color: validity.color, marginTop: '0.2rem' }}>
                {validity.daysLeft > 0 ? `${validity.daysLeft} days left` : `${Math.abs(validity.daysLeft)} days ago`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permit Information */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '2rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '700', color: 'var(--text-dark)' }}>Permit Information</h3>
        <InfoRow label="Permit Number" value={permit.permit_number} />
        <InfoRow label="Permit Type" value={permit.permit_name} />
        <InfoRow label="Date Issued" value={fmt(permit.issue_date)} />
        <InfoRow label="Valid Until" value={fmt(permit.expiration_date)} />
        <InfoRow label="Status" value={permit.status} />
      </div>

      {/* Verification */}
      {permit.verification_code && (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '2rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={18} color="var(--primary-green)" /> Digital Verification
          </h3>
          <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Verification Code</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary-green)', letterSpacing: '0.08em' }}>{permit.verification_code}</div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Share or scan this code to verify this permit is authentic. The public verification page does not require login.
          </p>
          <Link to={`/verify-permit/${permit.verification_code}`} target="_blank"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-dark)', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}>
            <ExternalLink size={15} /> Open Public Verification
          </Link>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {permit.pdf_path && (
          <button onClick={handleDownload}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--primary-green)', color: 'white', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>
            <Download size={17} /> Download PDF
          </button>
        )}
        <button onClick={() => navigate('/permits')}
          style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'white', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', color: 'var(--text-dark)' }}>
          Back to My Permits
        </button>
      </div>
    </div>
  );
}
