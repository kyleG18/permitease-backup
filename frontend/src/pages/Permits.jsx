import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FileText, Download, CheckCircle, AlertTriangle, XCircle, ExternalLink, Shield } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const getValidityBadge = (expDate) => {
  if (!expDate) return { label: 'Unknown', color: '#64748B', bg: '#F1F5F9' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expDate);
  if (today > exp) return { label: 'Expired', color: '#991B1B', bg: '#FEE2E2' };
  const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 60) return { label: `Expiring in ${daysLeft}d`, color: '#92400E', bg: '#FEF3C7' };
  return { label: 'Valid', color: '#166534', bg: '#DCFCE7' };
};

const ValidityBadge = ({ expDate }) => {
  const cfg = getValidityBadge(expDate);
  return (
    <span style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
};

export default function Permits() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/permits`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        // Filter only Approved/Verified preparations
        const issued = Array.isArray(data) ? data.filter(p => p.status === 'Approved') : [];
        setPermits(issued);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load permits.'); setLoading(false); });
  }, []);

  const handleDownload = async (permitId, permitNumber) => {
    try {
      const res = await fetch(`${API}/permits/${permitId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Download failed.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${permitNumber || 'permit'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download permit PDF.');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading permits...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: 'var(--primary-green)', fontSize: '1.6rem', fontWeight: '700' }}>My Permits</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', fontSize: '0.9rem' }}>
          Preparation submissions verified by the BPLO. Note: This is not an official permit record. Official permits are issued by the BPLO after physical processing.
        </p>
      </div>

      {permits.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '3rem', textAlign: 'center' }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No Verified Submissions Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Your preparation submission will appear here once the BPLO marks it as Verified. Official permits are processed at the physical BPLO office.
          </p>
          <Link to="/applications" style={{ display: 'inline-block', backgroundColor: 'var(--primary-green)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
            View Applications
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {permits.map(permit => {
            const badge = getValidityBadge(permit.expiration_date);
            const isExpired = badge.label === 'Expired';
            return (
              <div key={permit.id} style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', border: isExpired ? '1px solid #FEE2E2' : '1px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Shield size={20} color="var(--primary-green)" />
                      <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '700', color: 'var(--primary-green)' }}>{permit.permit_number}</span>
                      <ValidityBadge expDate={permit.expiration_date} />
                    </div>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: 'var(--text-dark)' }}>{permit.business_name}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{permit.permit_name}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '1.5rem', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Issued</div>
                      <div style={{ color: 'var(--text-dark)', fontWeight: '600' }}>{permit.issue_date ? new Date(permit.issue_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Expires</div>
                      <div style={{ color: isExpired ? '#991B1B' : 'var(--text-dark)', fontWeight: '600' }}>{permit.expiration_date ? new Date(permit.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Verification</div>
                      <div style={{ color: permit.verification_code ? '#166534' : 'var(--text-muted)', fontWeight: '600' }}>{permit.verification_code ? 'Available' : 'Pending'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                  <Link to={`/permits/${permit.id}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-green)', color: 'var(--primary-green)', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
                    <FileText size={15} /> View Details
                  </Link>

                  {permit.pdf_path && (
                    <button onClick={() => handleDownload(permit.id, permit.permit_number)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--primary-green)', color: 'white', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                      <Download size={15} /> Download Preparation Summary
                    </button>
                  )}

                  {permit.verification_code && (
                    <Link to={`/verify-permit/${permit.verification_code}`} target="_blank"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-dark)', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
                      <ExternalLink size={15} /> Verify
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
