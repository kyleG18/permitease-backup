import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, ArrowRight, Clock,
  Building2, ClipboardCheck, Receipt, TrendingUp, Users, BarChart2,
  ShieldCheck, AlertCircle, Zap, ChevronRight, BrainCircuit
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-dark)', lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: '500' }}>{label}</div>
    </div>
  </div>
);

const ScoreBar = ({ score, label, color }) => (
  <div style={{ marginBottom: '0.75rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.825rem' }}>
      <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>{label}</span>
      <span style={{ color, fontWeight: '700' }}>{score}%</span>
    </div>
    <div style={{ height: '8px', backgroundColor: '#F3F4F6', borderRadius: '999px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${score}%`, backgroundColor: color, borderRadius: '999px', transition: 'width 0.8s ease' }} />
    </div>
  </div>
);

const statusStyle = (s) => ({
  Approved: { color: '#16A34A', bg: '#DCFCE7' },
  Pending:  { color: '#D97706', bg: '#FEF3C7' },
  Expired:  { color: '#DC2626', bg: '#FEE2E2' },
  Rejected: { color: '#6B7280', bg: '#F3F4F6' },
}[s] || { color: '#6B7280', bg: '#F3F4F6' });

// ===========================================================================
// BUSINESS OWNER DASHBOARD
// ===========================================================================
const BusinessOwnerDashboard = ({ user, stats, loading }) => {
  const [readiness, setReadiness] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [recentPermits, setRecentPermits] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const headers = { Authorization: `Bearer ${user.token}` };

  useEffect(() => {
    axios.get(`${API}/permits`, { headers }).then(r => setRecentPermits(r.data.slice(0, 5))).catch(() => {});
    axios.get(`${API}/notifications`, { headers }).then(r => setNotifications(r.data.slice(0, 4))).catch(() => {});

    // Load readiness + estimate for first business
    if (stats?.businesses?.length > 0) {
      const bizId = stats.businesses[0].id;
      axios.get(`${API}/readiness/${bizId}`, { headers }).then(r => setReadiness(r.data)).catch(() => {});
      axios.get(`${API}/taxes/estimate/${bizId}`, { headers }).then(r => setEstimate(r.data)).catch(() => {});
    }
  }, [stats]);

  if (!loading && stats?.total_businesses === 0) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '3rem', boxShadow: 'var(--shadow-card)' }}>
          <h2 style={{ color: 'var(--primary-green)', marginBottom: '1rem' }}>Welcome to PermitEase</h2>
          <p style={{ color: 'var(--text-dark)', fontWeight: '500', marginBottom: '0.5rem' }}>Your account is ready.</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Let's set up your business profile first so PermitEase can determine your permit requirements.
          </p>
          <Link to="/onboarding" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.75rem 2rem', fontWeight: '600' }}>
            Set Up My Business
          </Link>
        </div>
      </div>
    );
  }

  const compScore = stats?.compliance_score ?? 0;
  const compColor = compScore >= 80 ? '#16A34A' : compScore >= 50 ? '#D97706' : '#DC2626';
  const readScore = readiness?.readiness_score ?? 0;
  const readColor = readScore >= 80 ? '#16A34A' : readScore >= 50 ? '#D97706' : '#DC2626';

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>Welcome back, {user?.full_name}! 👋</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your PermitEase compliance overview — Municipality of Roxas</p>
        </div>
        <div style={{ background: 'var(--light-green)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--primary-green)', fontWeight: '500' }}>
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={Building2}     label="Businesses"        value={loading ? '...' : stats?.total_businesses}   color="#2563EB" bg="#DBEAFE" />
        <StatCard icon={FileText}      label="Total Permits"     value={loading ? '...' : stats?.total_permits}      color="#7C3AED" bg="#EDE9FE" />
        <StatCard icon={CheckCircle}   label="Active Permits"    value={loading ? '...' : stats?.active_permits}     color="#16A34A" bg="#DCFCE7" />
        <StatCard icon={AlertTriangle} label="Expiring Soon"     value={loading ? '...' : stats?.expiring_soon}      color="#D97706" bg="#FEF3C7" />
        <StatCard icon={XCircle}       label="Expired"           value={loading ? '...' : stats?.expired_permits}    color="#DC2626" bg="#FEE2E2" />
        <StatCard icon={Clock}         label="Pending Review"    value={loading ? '...' : stats?.pending_applications} color="#6B7280" bg="#F3F4F6" />
      </div>

      {/* Main 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>


          {/* Permit Readiness Checklist */}
          {readiness && (
            <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={18} color="var(--primary-green)" /> Permit Readiness — {readiness.business_name}</h3>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: readColor }}>{readScore}%</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <tbody>
                  {readiness.categories?.map(cat => {
                    const done = cat.status === 'Complete' || cat.status === 'Valid' || cat.status === 'Computed';
                    return (
                      <tr key={cat.label} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.7rem 0', fontWeight: '500', color: 'var(--text-dark)' }}>{cat.label}</td>
                        <td style={{ padding: '0.7rem 0', textAlign: 'center' }}>
                          <span style={{ padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', color: done ? '#16A34A' : '#D97706', backgroundColor: done ? '#DCFCE7' : '#FEF3C7' }}>
                            {cat.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 0', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.775rem' }}>{cat.score}/{cat.max} pts</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {readiness.recommendation && (
                <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', backgroundColor: readScore >= 90 ? '#F0FDF4' : '#FFFBEB', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: readScore >= 90 ? '#166534' : '#92400E', borderLeft: `3px solid ${readScore >= 90 ? '#22C55E' : '#F59E0B'}` }}>
                  💡 {readiness.recommendation}
                </div>
              )}
            </div>
          )}

          {/* Recent Permits */}
          <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--primary-green)" /> Recent Permits</h3>
              <Link to="/permits" style={{ fontSize: '0.825rem', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500' }}>
                View All <ChevronRight size={14} />
              </Link>
            </div>
            {recentPermits.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.875rem' }}>
                No permits yet. <Link to="/permits">Add your first permit →</Link>
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Permit', 'Business', 'Expires', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPermits.map(p => {
                    const ss = statusStyle(p.status);
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.8rem 0', fontWeight: '600', color: 'var(--text-dark)' }}>{p.permit_name}</td>
                        <td style={{ padding: '0.8rem 0', color: 'var(--text-muted)', fontSize: '0.825rem' }}>{p.business_name}</td>
                        <td style={{ padding: '0.8rem 0', fontSize: '0.825rem' }}>{p.expiration_date ? new Date(p.expiration_date).toLocaleDateString('en-PH') : '—'}</td>
                        <td style={{ padding: '0.8rem 0' }}>
                          <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', color: ss.color, backgroundColor: ss.bg }}>{p.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Fee Estimate Summary */}
          {estimate && (
            <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Receipt size={16} color="var(--primary-green)" /> Fee Estimate</h3>
                <Link to="/tax-estimate" style={{ fontSize: '0.775rem', color: 'var(--primary-green)', fontWeight: '500' }}>Details →</Link>
              </div>
              {estimate.breakdown?.slice(0, 4).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.825rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>₱{Number(item.estimated_amount).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0', fontWeight: '700', fontSize: '0.95rem' }}>
                <span>Estimated Total</span>
                <span style={{ color: 'var(--primary-green)' }}>₱{Number(estimate.estimated_total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.4 }}>*Estimate only. Official amount determined by BPLO.</p>
            </div>
          )}

          {/* Renewal Alert */}
          {stats?.next_expiration && (
            <div style={{ backgroundColor: stats?.days_to_expiration <= 30 ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${stats?.days_to_expiration <= 30 ? '#FCA5A5' : '#FDE047'}`, borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={16} color={stats?.days_to_expiration <= 30 ? '#DC2626' : '#D97706'} />
                <span style={{ fontWeight: '700', fontSize: '0.875rem', color: stats?.days_to_expiration <= 30 ? '#991B1B' : '#78350F' }}>Renewal Alert</span>
              </div>
              <p style={{ fontSize: '0.825rem', color: stats?.days_to_expiration <= 30 ? '#991B1B' : '#78350F', margin: 0 }}>
                {stats?.days_to_expiration < 0 
                  ? 'Your business permit has expired. Review your renewal requirements.' 
                  : `Your business permit expires in ${stats?.days_to_expiration} days.`}
              </p>
              <Link to="/renewals" style={{ display: 'block', marginTop: '0.75rem', textAlign: 'center', padding: '0.5rem', backgroundColor: stats?.days_to_expiration <= 30 ? '#DC2626' : '#D97706', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', fontWeight: '600' }}>
                View Renewals →
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { to: '/readiness', icon: ClipboardCheck, label: 'View Permit Readiness', primary: true },
                { to: '/tax-estimate', icon: Receipt, label: 'View Fee Estimate', primary: false },
                { to: '/assessment', icon: BrainCircuit, label: 'AI Permit Assessor', primary: false },
                { to: '/permits', icon: FileText, label: 'My Permits', primary: false },
              ].map(({ to, icon: Icon, label, primary }) => (
                <Link key={to} to={to} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: '600', backgroundColor: primary ? 'var(--primary-green)' : 'var(--light-green)', color: primary ? 'white' : 'var(--primary-green)', textDecoration: 'none', transition: 'opacity 0.15s' }}>
                  <Icon size={15} /> {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Notifications</h3>
              <Link to="/notifications" style={{ fontSize: '0.775rem', color: 'var(--primary-green)', fontWeight: '500' }}>All →</Link>
            </div>
            {notifications.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', textAlign: 'center' }}>No notifications.</p>
              : notifications.map(n => (
                <div key={n.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.825rem', color: 'var(--text-dark)' }}>{n.title}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{n.message?.substring(0, 65)}...</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// LGU / SYSTEM ADMIN DASHBOARD
// ===========================================================================
const AdminDashboard = ({ user, stats, loading }) => {
  const compColor = (stats?.compliance_rate ?? 0) >= 80 ? '#16A34A' : '#D97706';

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>LGU Compliance Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Municipality of Roxas — Business Permit Management Overview</p>
        </div>
        <div style={{ background: 'var(--light-green)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--primary-green)', fontWeight: '500' }}>
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={Building2}     label="Total Businesses"   value={loading ? '...' : stats?.total_businesses}       color="#2563EB" bg="#DBEAFE" />
        <StatCard icon={FileText}      label="Total Permits"      value={loading ? '...' : stats?.total_permits}          color="#7C3AED" bg="#EDE9FE" />
        <StatCard icon={Clock}         label="Pending Review"     value={loading ? '...' : stats?.pending_applications}   color="#D97706" bg="#FEF3C7" />
        <StatCard icon={CheckCircle}   label="Approved"           value={loading ? '...' : stats?.approved_applications}  color="#16A34A" bg="#DCFCE7" />
        <StatCard icon={XCircle}       label="Rejected"           value={loading ? '...' : stats?.rejected_applications}  color="#DC2626" bg="#FEE2E2" />
        <StatCard icon={AlertTriangle} label="Expiring (60 days)" value={loading ? '...' : stats?.expiring_soon}          color="#B45309" bg="#FEF3C7" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Municipal Compliance Rate */}
          <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} color="var(--primary-green)" /> Municipal Compliance Rate
            </h3>
            <ScoreBar score={stats?.compliance_rate ?? 0} label="Overall Municipal Compliance" color={compColor} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ backgroundColor: '#F0FDF4', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#16A34A' }}>{stats?.total_requirements ?? 0}</div>
                <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '500', marginTop: '0.15rem' }}>Total Requirements</div>
              </div>
              <div style={{ backgroundColor: '#FEF2F2', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#DC2626' }}>{stats?.missing_requirements ?? 0}</div>
                <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: '500', marginTop: '0.15rem' }}>Missing Submissions</div>
              </div>
            </div>
          </div>

          {/* Recent Applications */}
          <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--primary-green)" /> Recent Applications
            </h3>
            {stats?.recent_applications?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No applications yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Business', 'Permit', 'Date', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent_applications?.map(a => {
                    const ss = statusStyle(a.status);
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.8rem 0', fontWeight: '600', color: 'var(--text-dark)' }}>{a.business_name}</td>
                        <td style={{ padding: '0.8rem 0', color: 'var(--text-muted)', fontSize: '0.825rem' }}>{a.permit_name}</td>
                        <td style={{ padding: '0.8rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString('en-PH')}</td>
                        <td style={{ padding: '0.8rem 0' }}>
                          <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', color: ss.color, backgroundColor: ss.bg }}>{a.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Top Missing Requirements */}
          <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} color="#DC2626" /> Common Missing Requirements
            </h3>
            {stats?.top_missing_requirements?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>No missing requirements on record.</p>
            ) : stats?.top_missing_requirements?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.7rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontWeight: '500', color: 'var(--text-dark)' }}>{item.permit_name}</span>
                </div>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0 }}>{item.missing_count} businesses</span>
              </div>
            ))}
          </div>

          {/* Quick Admin Links */}
          <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>Quick Admin Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { to: '/requirements', label: 'Manage Permit Requirements', icon: ClipboardCheck },
                { to: '/tax-estimate', label: 'Tax & Fee Rules', icon: Receipt },
                { to: '/reports', label: 'View Reports', icon: BarChart2 },
                { to: '/knowledge', label: 'Knowledge Base', icon: FileText },
              ].map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: '600', backgroundColor: 'var(--light-green)', color: 'var(--primary-green)', textDecoration: 'none' }}>
                  <Icon size={15} /> {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// MAIN DASHBOARD (Role Router)
// ===========================================================================
const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const config = { headers: { Authorization: `Bearer ${user.token}` } };
    axios.get(`${API}/dashboard/stats`, config)
      .then(r => setStats(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (user?.role === 'lgu_admin' || user?.role === 'system_admin') {
    return <AdminDashboard user={user} stats={stats} loading={loading} />;
  }

  return <BusinessOwnerDashboard user={user} stats={stats} loading={loading} />;
};

export default Dashboard;
