import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Shield, Search, Download, ExternalLink } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const getDynamicStatus = (expDate) => {
  if (!expDate) return 'Unknown';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > new Date(expDate) ? 'EXPIRED' : 'VALID';
};

const StatusBadge = ({ expDate }) => {
  const status = getDynamicStatus(expDate);
  const cfg = {
    VALID:    { color: '#166534', bg: '#DCFCE7' },
    EXPIRED:  { color: '#991B1B', bg: '#FEE2E2' },
    Unknown:  { color: '#64748B', bg: '#F1F5F9' },
  }[status] || { color: '#64748B', bg: '#F1F5F9' };
  return (
    <span style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', color: cfg.color, backgroundColor: cfg.bg }}>
      {status}
    </span>
  );
};

export default function AdminPermits() {
  const { token } = useContext(AuthContext);
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/permits/admin/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setPermits(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Failed to load permits.'); setLoading(false); });
  }, []);

  const handleDownload = async (id, number) => {
    const res = await fetch(`${API}/permits/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { alert('Download failed.'); return; }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${number}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  const filtered = permits.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      (p.permit_number || '').toLowerCase().includes(q) ||
      (p.business_name || '').toLowerCase().includes(q) ||
      (p.owner_name || '').toLowerCase().includes(q);
    const dynamicStatus = getDynamicStatus(p.expiration_date);
    const matchesFilter = filter === 'ALL' || dynamicStatus === filter;
    return matchesSearch && matchesFilter;
  });

  const validCount = permits.filter(p => getDynamicStatus(p.expiration_date) === 'VALID').length;
  const expiredCount = permits.filter(p => getDynamicStatus(p.expiration_date) === 'EXPIRED').length;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading permits...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>{error}</div>;

  return (
    <div className="admin-permits-container animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: 'var(--primary-green)', fontSize: '1.6rem', fontWeight: '700' }}>Preparation Records</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', fontSize: '0.9rem' }}>BPLO-verified preparation submission summaries. These are not official issued permits.</p>
      </div>

      {/* Summary Cards */}
      <div className="admin-permits-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Issued', count: permits.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Valid', count: validCount, color: '#166534', bg: '#DCFCE7' },
          { label: 'Expired', count: expiredCount, color: '#991B1B', bg: '#FEE2E2' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', color }}>{count}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="admin-permits-toolbar" style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
          <Search size={16} color="var(--text-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by permit no., business, or owner…" style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', backgroundColor: 'white' }}>
          <option value="ALL">All Statuses</option>
          <option value="VALID">Valid</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-scroll-wrap" style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-light)' }}>
              {['Permit No.', 'Business', 'Owner', 'Type', 'Issued', 'Expires', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No permits found.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={14} color="var(--primary-green)" />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary-green)' }}>{p.permit_number}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-dark)', fontWeight: '600' }}>{p.business_name}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{p.owner_name}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.permit_name}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{fmt(p.issue_date)}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{fmt(p.expiration_date)}</td>
                <td style={{ padding: '0.75rem 1rem' }}><StatusBadge expDate={p.expiration_date} /></td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {p.pdf_path && (
                      <button onClick={() => handleDownload(p.id, p.permit_number)}
                        title="Download Preparation Summary"
                        style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Download size={14} color="var(--text-dark)" />
                      </button>
                    )}
                    {p.verification_code && (
                      <Link to={`/verify-permit/${p.verification_code}`} target="_blank"
                        title="Public Verification"
                        style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'white', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                        <ExternalLink size={14} color="var(--text-dark)" />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
