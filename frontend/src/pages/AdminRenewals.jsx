import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CalendarClock, CheckCircle, AlertTriangle, XCircle, FileText, Search, Eye } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const AdminRenewals = () => {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState({ summary: {}, permits: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    // Only lgu_admin and system_admin can access
    if (user?.role === 'business_owner') {
      navigate('/access-denied');
      return;
    }

    const fetchRenewals = async () => {
      try {
        const r = await fetch(`${API}/renewals/admin`, { headers });
        const json = await r.json();
        if (!r.ok) throw new Error(json.message || 'Error fetching renewals');
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRenewals();
  }, [user]);

  const getBadgeClass = (status) => {
    if (status === 'EXPIRED') return 'badge-expired';
    if (status === 'EXPIRING_SOON') return 'badge-pending';
    return 'badge-approved';
  };

  const filteredPermits = data.permits.filter(p => {
    const matchFilter = activeFilter === 'ALL' || p.renewal_status === activeFilter;
    const matchSearch = (p.business_name || '').toLowerCase().includes(search.toLowerCase()) || 
                        (p.permit_number || '').toLowerCase().includes(search.toLowerCase()) ||
                        (p.owner_name || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-dark)', marginBottom: '0.25rem', fontSize: '1.6rem' }}>Renewal Monitoring (LGU)</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Municipality-wide permit expiration and renewal tracking.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" onClick={() => setActiveFilter('ALL')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'ALL' ? '3px solid var(--primary-green)' : '3px solid transparent', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <FileText size={20} color="var(--primary-green)" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Issued Permits</h4>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-dark)' }}>{data.summary.totalPermits || 0}</div>
        </div>
        <div className="card" onClick={() => setActiveFilter('ACTIVE')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'ACTIVE' ? '3px solid #16A34A' : '3px solid transparent', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={20} color="#16A34A" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Active</h4>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-dark)' }}>{data.summary.activePermits || 0}</div>
        </div>
        <div className="card" onClick={() => setActiveFilter('EXPIRING_SOON')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'EXPIRING_SOON' ? '3px solid #D97706' : '3px solid transparent', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} color="#D97706" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Expiring Soon</h4>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-dark)' }}>{data.summary.expiringSoon || 0}</div>
        </div>
        <div className="card" onClick={() => setActiveFilter('EXPIRED')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'EXPIRED' ? '3px solid #DC2626' : '3px solid transparent', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <XCircle size={20} color="#DC2626" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Expired</h4>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-dark)' }}>{data.summary.expiredPermits || 0}</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search business, owner, or permit..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
          />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong>{data.summary.renewalsInProgress || 0}</strong> Renewal Applications In Progress
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: '800px', marginBottom: 0 }}>
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Owner</th>
              <th>Permit No.</th>
              <th>Expiration Date</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading records...</td></tr>
            ) : filteredPermits.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No records found.</td></tr>
            ) : (
              filteredPermits.map(p => (
                <tr key={p.permit_id}>
                  <td><strong>{p.business_name}</strong></td>
                  <td>{p.owner_name}</td>
                  <td>{p.permit_number || 'N/A'}</td>
                  <td>{p.expiration_date ? new Date(p.expiration_date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <span style={{ fontWeight: '600', color: p.renewal_status === 'EXPIRED' ? '#DC2626' : p.renewal_status === 'EXPIRING_SOON' ? '#D97706' : 'inherit' }}>
                      {p.days_remaining !== null ? (p.days_remaining < 0 ? `${Math.abs(p.days_remaining)}d overdue` : `${p.days_remaining}d`) : '-'}
                    </span>
                  </td>
                  <td><span className={`badge ${getBadgeClass(p.renewal_status)}`}>{p.renewal_status.replace('_', ' ')}</span></td>
                  <td>
                    {p.active_renewal_id ? (
                      <button onClick={() => navigate(`/admin/applications/${p.active_renewal_id}`)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                        <Eye size={14} /> View App
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Active App</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRenewals;
