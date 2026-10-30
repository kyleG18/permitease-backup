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
    <div className="admin-permits-container animate-fade-in" style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
          <div style={{ padding: '0.45rem', backgroundColor: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#15803D" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.08em' }}>BPLO RECORDS REGISTRY</span>
        </div>
        <h1 style={{ margin: 0, color: '#0F172A', fontSize: '1.65rem', fontWeight: '800' }}>Preparation Records</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', fontSize: '0.9rem' }}>BPLO-verified preparation submission summaries. These are not official issued permits.</p>
      </div>

      {/* Summary Cards */}
      <div className="admin-permits-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Issued', count: permits.length, color: '#0F172A', borderAccent: '#15803D' },
          { label: 'Valid', count: validCount, color: '#15803D', borderAccent: '#15803D' },
          { label: 'Expired', count: expiredCount, color: '#DC2626', borderAccent: '#DC2626' },
        ].map(({ label, count, color, borderAccent }) => (
          <div key={label} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', borderLeft: `4px solid ${borderAccent}`, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color }}>{count}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.2rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="admin-permits-toolbar" style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
          <Search size={16} color="var(--text-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by permit no., business, or owner…" style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.875rem', backgroundColor: 'white' }}>
          <option value="ALL">All Statuses</option>
          <option value="VALID">Valid</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-scroll-wrap" style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(90deg, #15803D 0%, #166534 100%)', color: '#FFFFFF' }}>
              {['Permit No.', 'Business', 'Owner', 'Type', 'Issued', 'Expires', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
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
