import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CalendarClock, CheckCircle, AlertTriangle, XCircle, FileText, ArrowRight, Eye } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const Renewals = () => {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState({ summary: {}, permits: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchRenewals = async () => {
      try {
        const r = await fetch(`${API}/renewals/my`, { headers });
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
  }, []);

  const getBadgeClass = (status) => {
    if (status === 'EXPIRED') return 'badge-expired';
    if (status === 'EXPIRING_SOON') return 'badge-pending';
    return 'badge-approved';
  };

  const filteredPermits = data.permits.filter(p => activeFilter === 'ALL' || p.renewal_status === activeFilter);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-dark)', marginBottom: '0.25rem', fontSize: '1.6rem' }}>Permit Renewal Center</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Monitor your permits and prepare for upcoming renewals.</p>
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
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Submissions</h4>
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

      {loading ? (
        <div className="text-center text-muted" style={{ padding: '4rem' }}>Loading renewals...</div>
      ) : filteredPermits.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <CalendarClock size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No permits found in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {filteredPermits.map(p => (
            <div key={p.permit_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', borderLeft: `4px solid ${p.renewal_status === 'ACTIVE' ? '#16A34A' : p.renewal_status === 'EXPIRING_SOON' ? '#D97706' : '#DC2626'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: 'var(--text-dark)' }}>{p.business_name}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span><strong>Permit:</strong> {p.permit_name}</span>
                    <span><strong>No:</strong> {p.permit_number || 'N/A'}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${getBadgeClass(p.renewal_status)}`} style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                    {p.renewal_status.replace('_', ' ')}
                  </span>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: p.renewal_status === 'EXPIRED' ? '#DC2626' : p.renewal_status === 'EXPIRING_SOON' ? '#D97706' : '#16A34A' }}>
                    {p.days_remaining !== null ? (p.days_remaining < 0 ? `${Math.abs(p.days_remaining)} days overdue` : `${p.days_remaining} days remaining`) : 'Unknown'}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Expires: <strong style={{ color: 'var(--text-dark)' }}>{p.expiration_date ? new Date(p.expiration_date).toLocaleDateString() : 'N/A'}</strong>
                </div>
                <div>
                  {p.active_renewal_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary-green)', fontWeight: '600' }}>Renewal Application In Progress</span>
                      <button onClick={() => navigate(`/applications/${p.active_renewal_id}`)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        <Eye size={16} /> View Application
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => navigate(`/readiness?businessId=${p.business_id}&type=RENEWAL`)} style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      Start Renewal <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Renewals;
