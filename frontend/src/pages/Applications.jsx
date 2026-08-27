import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FileText, Plus, Eye, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Send, Ban } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',            color: '#64748B', bg: '#F1F5F9' },
  SUBMITTED:        { label: 'Submitted',        color: '#2563EB', bg: '#DBEAFE' },
  UNDER_REVIEW:     { label: 'Under Review',     color: '#D97706', bg: '#FEF3C7' },
  NEEDS_CORRECTION: { label: 'Needs Correction', color: '#DC2626', bg: '#FEE2E2' },
  APPROVED:         { label: 'Approved',         color: '#16A34A', bg: '#DCFCE7' },
  REJECTED:         { label: 'Rejected',         color: '#991B1B', bg: '#FEE2E2' },
  CANCELLED:        { label: 'Cancelled',        color: '#64748B', bg: '#F1F5F9' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600', color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
};

export default function Applications() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/applications`, { headers })
      .then(r => r.json())
      .then(data => { setApplications(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Unable to load applications.'); setLoading(false); });
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--text-dark)' }}>My Applications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>Track all your business permit applications</p>
        </div>
        <Link to="/readiness" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-green)', color: 'white', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
          <Plus size={18} /> New Application
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading applications...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger)' }}>{error}</div>
      ) : applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
          <FileText size={56} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No Applications Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>You have not submitted a business permit application.</p>
          <button
            onClick={() => navigate('/applications/new')}
            style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
          >
            Start New Application
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)' }}>
                {['Application #', 'Business', 'Type', 'Date', 'Status', 'Last Updated', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.map((app, i) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary-green)', fontFamily: 'monospace' }}>
                    {app.application_number || <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>Draft</span>}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{app.business_name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{app.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(app.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '1rem' }}><StatusBadge status={app.status} /></td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(app.updated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/applications/${app.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', backgroundColor: 'var(--light-green)', color: 'var(--primary-green)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none' }}>
                      <Eye size={14} /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
