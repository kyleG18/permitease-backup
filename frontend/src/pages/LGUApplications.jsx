import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ClipboardList, Search } from 'lucide-react';

const API = 'http://localhost:5000/api';

const STATUS_CONFIG = {
  SUBMITTED:        { label: 'Submitted',        color: '#2563EB', bg: '#DBEAFE' },
  UNDER_REVIEW:     { label: 'Under Review',     color: '#D97706', bg: '#FEF3C7' },
  NEEDS_CORRECTION: { label: 'Needs Correction', color: '#DC2626', bg: '#FEE2E2' },
  APPROVED:         { label: 'Approved',         color: '#16A34A', bg: '#DCFCE7' },
  REJECTED:         { label: 'Rejected',         color: '#991B1B', bg: '#FEE2E2' },
  CANCELLED:        { label: 'Cancelled',        color: '#64748B', bg: '#F1F5F9' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600', color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
};

const FILTERS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED'];

export default function LGUApplications() {
  const { token } = useContext(AuthContext);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  const load = (status) => {
    setLoading(true);
    const url = status === 'ALL'
      ? `${API}/applications/admin/all`
      : `${API}/applications/admin/all?status=${status}`;
    fetch(url, { headers })
      .then(r => r.json())
      .then(data => { setApplications(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const filtered = applications.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.application_number?.toLowerCase().includes(s) ||
      a.business_name?.toLowerCase().includes(s) ||
      a.owner_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--text-dark)' }}>Permit Applications</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>Review and process business permit applications from the municipality</p>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: `2px solid ${filter === f ? 'var(--primary-green)' : 'var(--border-color)'}`, backgroundColor: filter === f ? 'var(--light-green)' : 'white', color: filter === f ? 'var(--primary-green)' : 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search applications..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.875rem', width: '240px' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading applications...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
          <ClipboardList size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No Applications Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>There are currently no permit applications matching your selected filter.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)' }}>
                {['Application #', 'Business', 'Owner', 'Type', 'Submitted', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--primary-green)', fontFamily: 'monospace', fontSize: '0.875rem' }}>{app.application_number}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{app.business_name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{app.owner_name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{app.application_type === 'NEW' ? 'New Business' : 'Renewal'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '1rem' }}><StatusBadge status={app.status} /></td>
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/admin/applications/${app.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 1rem', backgroundColor: 'var(--primary-green)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none' }}>
                      Review
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
