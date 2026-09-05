import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, Clock,
  Building2, ClipboardCheck, Receipt, BarChart2,
  ShieldCheck, AlertCircle, ChevronRight, BrainCircuit
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const StatCard = ({ icon: Icon, label, value, colorClass }) => (
  <div className="stat-card">
    <div className={`stat-icon ${colorClass}`}>
      <Icon size={20} strokeWidth={2.5} />
    </div>
    <div className="stat-info">
      <h4>{label}</h4>
      <div className="value">{value ?? '—'}</div>
    </div>
  </div>
);

const ScoreBar = ({ score, label, color }) => (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8125rem' }}>
      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{label}</span>
      <span style={{ color, fontWeight: '700' }}>{score}%</span>
    </div>
    <div style={{ height: '6px', backgroundColor: 'var(--border-light)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${score}%`, backgroundColor: color, borderRadius: 'var(--radius-full)', transition: 'width 0.8s ease' }} />
    </div>
  </div>
);

const statusStyle = (s) => ({
  Approved: { color: 'var(--status-approved)', bg: 'var(--status-approved-bg)' },
  Pending:  { color: 'var(--status-pending)', bg: 'var(--status-pending-bg)' },
  Expired:  { color: 'var(--status-expired)', bg: 'var(--status-expired-bg)' },
  Rejected: { color: 'var(--status-rejected)', bg: 'var(--status-rejected-bg)' },
}[s] || { color: 'var(--status-rejected)', bg: 'var(--status-rejected-bg)' });

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

    if (stats?.businesses?.length > 0) {
      const bizId = stats.businesses[0].id;
      axios.get(`${API}/readiness/${bizId}`, { headers }).then(r => setReadiness(r.data)).catch(() => {});
      axios.get(`${API}/taxes/estimate/${bizId}`, { headers }).then(r => setEstimate(r.data)).catch(() => {});
    }
  }, [stats]);

  if (!loading && stats?.total_businesses === 0) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card">
          <h2 style={{ color: 'var(--government-navy)', marginBottom: '1rem' }}>Welcome to PermitEase</h2>
          <p style={{ color: 'var(--text-primary)', fontWeight: '500', marginBottom: '0.5rem' }}>Your account is ready.</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Let's set up your business profile first so PermitEase can determine your permit requirements.
          </p>
          <Link to="/onboarding" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
            Set Up My Business
          </Link>
        </div>
      </div>
    );
  }

  const readScore = readiness?.readiness_score ?? 0;
  const readColor = readScore >= 80 ? 'var(--success)' : readScore >= 50 ? 'var(--warning)' : 'var(--danger)';

  // Greet based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="animate-fade-in">
      {/* Dashboard Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--government-navy)', marginBottom: '0.35rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            {greeting}, {user?.full_name?.split(' ')[0]}. Here's your current business permit compliance overview.
          </p>
        </div>
        <div style={{ 
          background: 'var(--primary-green-light)', borderRadius: 'var(--radius-full)', 
          padding: '0.4rem 1rem', fontSize: '0.75rem', color: 'var(--primary-green-dark)', 
          fontWeight: '600', letterSpacing: '0.03em' 
        }}>
          {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Permit Overview */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
          Permit Overview
        </h3>
        <div style={{ 
          display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '1rem 1.25rem', 
          backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)', 
          borderRadius: 'var(--radius-md)' 
        }}>
          {[
            { label: 'Businesses', value: stats?.total_businesses, icon: Building2 },
            { label: 'Total Permits', value: stats?.total_permits, icon: FileText },
            { label: 'Active', value: stats?.active_permits, icon: CheckCircle, color: 'var(--success)' },
            { label: 'Pending', value: stats?.pending_applications, icon: Clock },
            { label: 'Expiring Soon', value: stats?.expiring_soon, icon: AlertTriangle, color: 'var(--warning)' },
            { label: 'Expired', value: stats?.expired_permits, icon: XCircle, color: 'var(--danger)' }
          ].map((item, idx) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingRight: '1.5rem', borderRight: idx !== 5 ? '1px solid var(--border-light)' : 'none' }}>
              <item.icon size={16} color={item.color || 'var(--text-muted)'} />
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: item.color || 'var(--text-primary)', lineHeight: 1 }}>
                  {loading ? '...' : (item.value || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 2-col grid */}
      <div className="dashboard-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Permit Readiness Card - Focal Point */}
          {readiness && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', color: 'var(--government-navy)', margin: '0 0 0.25rem' }}>Permit Readiness</h2>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{readiness.business_name}</div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: readColor, lineHeight: 1 }}>{readScore}%</div>
                </div>
                
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: readScore === 0 ? 'var(--text-secondary)' : readColor, marginBottom: '1rem' }}>
                  {readScore === 0 ? 'Not yet ready' : (readScore >= 90 ? 'Ready to Submit' : 'In Progress')}
                </div>
                
                <ScoreBar score={readScore} label={readScore === 0 ? 'Progress' : 'Overall Progress'} color={readColor} />
              </div>

              <div style={{ padding: '0.5rem 1.5rem' }}>
                {readiness.categories?.map((cat, i) => {
                  const isDone = cat.status === 'Complete' || cat.status === 'Valid' || cat.status === 'Computed';
                  return (
                    <div key={cat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: i !== readiness.categories.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isDone ? <CheckCircle size={18} color="var(--success)" /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--border-medium)' }} />}
                        <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>{cat.label}</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: isDone ? '600' : '400', color: isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {isDone ? 'Complete' : 'Incomplete'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {readiness.recommendation && (
                <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--background)', borderTop: '1px solid var(--border-light)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <AlertCircle size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{readiness.recommendation}</span>
                </div>
              )}
            </div>
          )}

          {/* Recent Permits */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recent Permits
              </h3>
              {recentPermits.length > 0 && (
                <Link to="/permits" style={{ fontSize: '0.8125rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  View All <ChevronRight size={14} />
                </Link>
              )}
            </div>
            
            {recentPermits.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
                <FileText size={24} color="var(--text-light)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem', margin: '0 0 0.25rem' }}>No permits yet.</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>Once you have an issued permit, it will appear here.</p>
                <Link to="/applications/new" className="btn btn-outline btn-sm">Start Application</Link>
              </div>
            ) : (
              <div className="table-responsive" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {['Permit Type', 'Status', 'Date'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', fontSize: '0.75rem' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {recentPermits.map(p => {
                      const ss = statusStyle(p.status);
                      return (
                        <tr key={p.id}>
                          <td style={{ padding: '1rem', fontWeight: '500', fontSize: '0.875rem' }}>{p.permit_name}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: ss.color }}>{p.status}</span>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            {p.expiration_date ? new Date(p.expiration_date).toLocaleDateString('en-PH') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Next Step & Quick Actions */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Next Step
            </h3>
            
            {readScore < 100 ? (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem', margin: '0 0 0.5rem' }}>Your permit application is not ready yet.</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>Complete your outstanding requirements and documents before submitting.</p>
                <Link to="/readiness" className="btn btn-primary btn-block">Complete Requirements &rarr;</Link>
              </div>
            ) : (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem', margin: '0 0 0.5rem' }}>You are ready to apply.</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>All requirements are met. You can now submit your application.</p>
                <Link to="/applications/new" className="btn btn-primary btn-block">Submit Application &rarr;</Link>
              </div>
            )}

            {/* Tax & Fee Estimate via AI */}
            <div style={{ marginBottom: '2rem', padding: '1rem 1.25rem', backgroundColor: 'var(--accent-gold-light)', borderRadius: 'var(--radius-md)', border: '1px solid #E8D38A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <Receipt size={15} color="var(--accent-gold)" />
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tax &amp; Fee Estimate</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 1rem', lineHeight: 1.55 }}>
                Use our AI tool to get an estimated breakdown of your permit fees.
              </p>
              <Link to="/assessment" style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                padding: '0.55rem 1rem', backgroundColor: 'var(--accent-gold)', color: '#fff', 
                borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: '600', 
                textDecoration: 'none', width: '100%'
              }}>
                <BrainCircuit size={14} /> Estimate with AI →
              </Link>
            </div>

            <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { icon: BrainCircuit, label: 'AI Permit Assessment', to: '/assessment' },
                { icon: FileText, label: 'View issued permits', to: '/permits' },
                { icon: ClipboardCheck, label: 'My Applications', to: '/applications' }
              ].map(action => (
                <Link key={action.label} to={action.to} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'var(--text-primary)', transition: 'background-color var(--transition-fast)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <action.icon size={16} color="var(--text-secondary)" />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{action.label}</span>
                  </div>
                  <ChevronRight size={14} color="var(--text-light)" />
                </Link>
              ))}
            </div>
          </div>

          {/* Renewal Alert */}
          {stats?.next_expiration && (
            <div style={{ padding: '1.25rem', backgroundColor: stats?.days_to_expiration <= 30 ? 'var(--danger-light)' : 'var(--warning-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', color: stats?.days_to_expiration <= 30 ? 'var(--danger)' : 'var(--warning)' }}>
                <AlertTriangle size={16} /> Renewal Alert
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                {stats?.days_to_expiration < 0 
                  ? 'Your business permit has expired. Review your renewal requirements.' 
                  : `Your business permit expires in ${stats?.days_to_expiration} days.`}
              </p>
              <Link to="/renewals" style={{ fontSize: '0.8125rem', fontWeight: '600', color: stats?.days_to_expiration <= 30 ? 'var(--danger)' : 'var(--warning)', marginTop: '0.25rem' }}>
                View Renewals &rarr;
              </Link>
            </div>
          )}

          {/* Notifications */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Notifications
              </h3>
              <Link to="/notifications" style={{ fontSize: '0.8125rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                View All <ChevronRight size={14} />
              </Link>
            </div>
            
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                <CheckCircle size={20} color="var(--success)" style={{ marginBottom: '0.75rem' }} />
                <p style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9375rem', margin: '0 0 0.25rem' }}>You're all caught up.</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No notifications require your attention.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ display: 'flex', gap: '0.875rem', padding: '1rem 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-green)', marginTop: '6px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{n.title}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message?.substring(0, 80)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Fee Estimate Summary */}
          {estimate && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--government-navy)' }}>Fee Estimate</h3>
              </div>
              {estimate.breakdown?.slice(0, 3).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>₱{Number(item.estimated_amount).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0', fontWeight: '700', fontSize: '0.9375rem' }}>
                <span>Estimated Total</span>
                <span style={{ color: 'var(--primary-green)' }}>₱{Number(estimate.estimated_total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.4 }}>*Estimate only. Official amount determined by BPLO.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// LGU / SYSTEM ADMIN DASHBOARD
// ===========================================================================
const AdminDashboard = ({ user, stats, loading }) => {
  const compColor = (stats?.compliance_rate ?? 0) >= 80 ? 'var(--success)' : 'var(--warning)';

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--government-navy)', marginBottom: '0.35rem' }}>LGU Compliance Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Municipality of Roxas — Business Permit Management Overview</p>
        </div>
        <div style={{ 
          background: 'var(--primary-green-light)', borderRadius: 'var(--radius-full)', 
          padding: '0.4rem 1rem', fontSize: '0.75rem', color: 'var(--primary-green-dark)', 
          fontWeight: '600', letterSpacing: '0.03em' 
        }}>
          {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard icon={Building2}     label="Total Businesses"   value={loading ? '...' : stats?.total_businesses}       colorClass="navy" />
        <StatCard icon={FileText}      label="Total Permits"      value={loading ? '...' : stats?.total_permits}          colorClass="gold" />
        <StatCard icon={Clock}         label="Pending Review"     value={loading ? '...' : stats?.pending_applications}   colorClass="orange" />
        <StatCard icon={CheckCircle}   label="Approved"           value={loading ? '...' : stats?.approved_applications}  colorClass="green" />
        <StatCard icon={XCircle}       label="Rejected"           value={loading ? '...' : stats?.rejected_applications}  colorClass="red" />
        <StatCard icon={AlertTriangle} label="Expiring (60 days)" value={loading ? '...' : stats?.expiring_soon}          colorClass="orange" />
      </div>

      <div className="dashboard-grid">
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Municipal Compliance Rate */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: 'none' }}>
              <h3 style={{ margin: 0, color: 'var(--government-navy)' }}>Municipal Compliance Rate</h3>
            </div>
            <ScoreBar score={stats?.compliance_rate ?? 0} label="Overall Municipal Compliance" color={compColor} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
              <div style={{ backgroundColor: 'var(--success-light)', padding: '1.25rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid #C3E6D1' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--success)', lineHeight: 1 }}>{stats?.total_requirements ?? 0}</div>
                <div style={{ fontSize: '0.75rem', color: '#10592C', fontWeight: '600', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Requirements</div>
              </div>
              <div style={{ backgroundColor: 'var(--danger-light)', padding: '1.25rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid #F2C7C7' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--danger)', lineHeight: 1 }}>{stats?.missing_requirements ?? 0}</div>
                <div style={{ fontSize: '0.75rem', color: '#8B1E1E', fontWeight: '600', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Missing Submissions</div>
              </div>
            </div>
          </div>

          {/* Recent Applications */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, color: 'var(--government-navy)' }}>Recent Applications</h3>
              <Link to="/admin/applications" className="btn btn-ghost btn-sm">View All <ChevronRight size={14} /></Link>
            </div>
            {stats?.recent_applications?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 0', fontSize: '0.875rem' }}>No applications yet.</p>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      {['Business', 'Permit', 'Date', 'Status'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recent_applications?.map(a => {
                      const ss = statusStyle(a.status);
                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: '600' }}>{a.business_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{a.permit_name}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{new Date(a.created_at).toLocaleDateString('en-PH')}</td>
                          <td>
                            <span className="badge" style={{ color: ss.color, backgroundColor: ss.bg }}>{a.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Quick Admin Links */}
          <div className="card">
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: 'var(--government-navy)' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/requirements" className="btn btn-outline btn-block" style={{ justifyContent: 'flex-start' }}>
                <ClipboardCheck size={16} /> Manage Requirements
              </Link>
              <Link to="/tax-estimate" className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start' }}>
                <Receipt size={16} /> Tax & Fee Rules
              </Link>
              <Link to="/reports" className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start' }}>
                <BarChart2 size={16} /> View Reports
              </Link>
              <Link to="/knowledge" className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start' }}>
                <FileText size={16} /> Knowledge Base
              </Link>
            </div>
          </div>

          {/* Top Missing Requirements */}
          <div className="card">
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: 'var(--government-navy)' }}>Common Missing Requirements</h3>
            {stats?.top_missing_requirements?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No missing requirements on record.</p>
            ) : stats?.top_missing_requirements?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{item.permit_name}</span>
                </div>
                <span className="badge" style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)' }}>
                  {item.missing_count}
                </span>
              </div>
            ))}
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
