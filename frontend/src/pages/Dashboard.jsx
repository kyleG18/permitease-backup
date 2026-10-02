import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, Clock,
  Building2, ClipboardCheck, Receipt, BarChart2,
  ShieldCheck, AlertCircle, ChevronRight, BrainCircuit, Calendar
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
      <div className="value">{value ?? 'â€”'}</div>
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
  const [notifications, setNotifications] = useState([]);
  const headers = { Authorization: `Bearer ${user.token}` };

  useEffect(() => {
    axios.get(`${API}/notifications`, { headers }).then(r => setNotifications(r.data.slice(0, 4))).catch(() => {});
    if (stats?.businesses?.length > 0) {
      const bizId = stats.businesses[0].id;
      axios.get(`${API}/readiness/${bizId}`, { headers }).then(r => setReadiness(r.data)).catch(() => {});
      axios.get(`${API}/tax/estimate/${bizId}`, { headers }).then(r => setEstimate(r.data)).catch(() => {});
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

  let reqHave = 0, reqNeed = 0, reqNotChecked = 0;
  if (readiness?.categories) {
    readiness.categories.forEach(cat => {
      if (cat.status === 'Complete' || cat.status === 'Valid' || cat.status === 'Computed') reqHave++;
      else if (cat.status === 'Incomplete') reqNeed++;
      else reqNotChecked++;
    });
  }
  const totalReqs = (readiness?.categories || []).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] || 'User';
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const step1Done = true;
  const step2Done = readScore === 100;
  const step3Done = !!estimate;
  const step4Done = false;

  let taxTotal = 0, hasUnassessedTax = false;
  if (estimate?.local_business_tax) {
    estimate.local_business_tax.forEach(t => {
      if (t.status === 'TO BE ASSESSED' || t.amount === null) hasUnassessedTax = true;
      else taxTotal += (t.amount || 0);
    });
  }
  let feeTotal = 0, hasUnassessedFee = false;
  if (estimate?.regulatory_fees) {
    estimate.regulatory_fees.forEach(f => {
      if (f.status === 'TO BE ASSESSED' || f.amount === null) hasUnassessedFee = true;
      else feeTotal += (f.amount || 0);
    });
  }

  const formatCurrency = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);

  return (
    <div className="animate-fade-in db-msme">

      {/* HERO SECTION */}
      <div className="db-hero">
        <div className="db-hero__overlay" aria-hidden="true" />
        
        <div className="db-hero__inner">
          <div className="db-hero__header">
            <div>
              <div className="db-hero__greeting">{greeting},</div>
              <h1 className="db-hero__name">Welcome back, {firstName}!</h1>
              <p className="db-hero__sub">{"Here's your PermitEase overview \u2014 Municipality of Roxas."}</p>
            </div>
            <div className="db-hero__date">
              <Calendar size={15} />
              {currentDate}
            </div>
          </div>

          <div className="db-hero__text">
            <div className="db-hero__city-title">Roxas City Business Permit</div>
            <div className="db-hero__tagline">Prepare. Comply. Grow.</div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="db-stats">
        {[
          { label: 'Businesses',        value: stats?.total_businesses,     icon: Building2,     color: 'var(--primary-green)',    to: '/profile',    link: 'View Details' },
          { label: 'Readiness %',        value: stats?.compliance_score ? `${stats.compliance_score}%` : '0%', icon: ShieldCheck, color: stats?.compliance_score >= 80 ? 'var(--success)' : 'var(--warning)', to: '/readiness', link: 'View Readiness' },
          { label: 'Total Reqs',         value: stats?.total_requirements || 0, icon: FileText,   color: 'var(--government-navy)', to: '/readiness',  link: 'View Requirements' },
          { label: 'Ready',              value: stats?.ready_requirements  || 0, icon: CheckCircle, color: 'var(--success)',         to: '/readiness',  link: 'View Checklist' },
          { label: 'Missing',            value: stats?.missing_requirements || 0, icon: AlertCircle, color: 'var(--danger)',         to: '/readiness',  link: 'Complete Now' },
          { label: 'Assessment',         value: stats?.assessment_completed ? 'Done' : 'Pending', icon: BrainCircuit, color: stats?.assessment_completed ? 'var(--success)' : 'var(--text-secondary)', to: '/assessment', link: 'View Assessment' },
        ].map((item, idx) => (
          <div key={idx} className="card db-stat-card">
            <item.icon size={22} strokeWidth={1.75} style={{ color: item.color }} />
            <div className="db-stat-card__value">{loading ? '...' : (item.value ?? 0)}</div>
            <div className="db-stat-card__label">{item.label}</div>
            <Link to={item.to} className="db-stat-card__link">{item.link} &rarr;</Link>
          </div>
        ))}
      </div>

      {/* â”€â”€ READINESS + QUICK ACTIONS â”€â”€ */}
      <div className="db-row">

        {/* Permit Readiness */}
        <div className="card db-readiness">
          <div className="db-readiness__header">
            <div className="db-readiness__title">
              <ShieldCheck size={20} style={{ color: 'var(--government-navy)' }} />
              <h2>Permit Readiness &mdash; {stats?.businesses?.[0]?.business_name || 'Your Business'}</h2>
            </div>
            {readScore === 100 ? (
              <span className="db-badge db-badge--green" style={{ fontSize: '0.8125rem' }}>Complete</span>
            ) : (
              <span className="db-badge db-badge--amber" style={{ fontSize: '0.8125rem' }}>In Progress</span>
            )}
          </div>
          
          <div className="db-progress-container">
            <div className="db-progress-bar">
              <div className="db-progress-bar__fill" style={{ width: `${readScore}%`, backgroundColor: readColor }} />
            </div>
            <div className="db-progress-text">
              {reqHave} / {totalReqs || 0} pts
            </div>
          </div>

          <div className="db-readiness__desc">
            {readScore === 100 
              ? "You have completed all required requirements for your business permit."
              : "You are currently preparing your requirements. Keep going!"}
          </div>

          <div className="db-readiness__cta">
            {readScore === 0 && !readiness ? (
              <Link to="/assessment" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', borderColor: 'var(--border-medium)' }}>
                Start AI Permit Assessment <ChevronRight size={16} />
              </Link>
            ) : (
              <Link to="/readiness" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', borderColor: 'var(--border-medium)' }}>
                View Requirements <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>
        {/* Quick Actions */}
        <div className="card db-quick-actions">
          <h2 className="db-quick-actions__title">Quick Actions</h2>
          <div className="db-quick-actions__list">
            <Link to="/readiness" className="db-quick-action db-quick-action--primary">
              <span className="db-quick-action__left"><ClipboardCheck size={17}/> View Permit Readiness</span>
              <ChevronRight size={15}/>
            </Link>
            <Link to="/assessment" className="db-quick-action">
              <span className="db-quick-action__left"><BrainCircuit size={17}/> AI Permit Assessment</span>
              <ChevronRight size={15}/>
            </Link>
            <Link to="/tax-estimation" className="db-quick-action">
              <span className="db-quick-action__left"><Receipt size={17}/> Tax Estimation</span>
              <ChevronRight size={15}/>
            </Link>
            <Link to="/fee-estimation" className="db-quick-action">
              <span className="db-quick-action__left"><Receipt size={17}/> Fee Estimation</span>
              <ChevronRight size={15}/>
            </Link>
          </div>
        </div>
      </div>

      {/* â”€â”€ PREPARATION PROGRESS + ESTIMATED COST â”€â”€ */}
      <div className="db-row">

        {/* Preparation Progress */}
        <div className="card db-progress-section">
          <div className="db-section-title">
            <BarChart2 size={20} style={{ color: 'var(--primary-green)' }} />
            <h2>Permit Preparation Progress</h2>
            <Link to="/readiness" className="db-section-link">View Details <ChevronRight size={13}/></Link>
          </div>

          {/* Horizontal timeline â€” collapses to vertical on mobile via CSS */}
          <div className="db-timeline">
            <div className="db-timeline__track">
              <div className="db-timeline__fill" style={{
                width: step2Done ? '80%' : step1Done ? '20%' : '0%'
              }} />
            </div>
            {[
              { title: 'AI Assessment',       desc: 'Identify requirements',  done: step1Done },
              { title: 'Permit Readiness',    desc: 'Check what you have',    done: step2Done },
              { title: 'Cost Estimation',     desc: 'Estimate taxes & fees',  done: step3Done },
              { title: 'Download Form',       desc: 'Prepare documents',      done: step4Done },
              { title: 'BPLO Processing',     desc: 'Official assessment',    done: false     },
            ].map((step, i) => (
              <div key={i} className="db-timeline__step">
                <div className={`db-timeline__dot${step.done ? ' db-timeline__dot--done' : ''}`}>
                  {step.done ? <CheckCircle size={16}/> : <span>{i + 1}</span>}
                </div>
                <div className="db-timeline__label">{step.title}</div>
                <div className="db-timeline__desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="card db-cost-card">
          <div className="db-section-title">
            <Receipt size={20} style={{ color: 'var(--primary-green)' }} />
            <h2>Estimated Preparation Cost</h2>
            <Link to="/tax-estimation" className="db-section-link">View Details <ChevronRight size={13}/></Link>
          </div>

          <div className="db-cost-rows">
            <div className="db-cost-row">
              <span>Local Business Tax</span>
              <span className={hasUnassessedTax ? 'db-cost-row__assessed' : ''}>
                {estimate ? (hasUnassessedTax ? 'To Be Assessed' : formatCurrency(taxTotal)) : 'Not estimated yet'}
              </span>
            </div>
            <div className="db-cost-row">
              <span>Regulatory Fees</span>
              <span className={hasUnassessedFee ? 'db-cost-row__assessed' : ''}>
                {estimate ? (hasUnassessedFee ? 'To Be Assessed' : formatCurrency(feeTotal)) : 'Not estimated yet'}
              </span>
            </div>
            <div className="db-cost-row db-cost-row--total">
              <span>Estimated Total</span>
              <span>
                {estimate
                  ? ((hasUnassessedFee || hasUnassessedTax) ? 'To Be Assessed' : formatCurrency(taxTotal + feeTotal))
                  : 'â€”'}
              </span>
            </div>
          </div>

          <div className="db-cost-note">
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }}/>
            <span>Estimates only. Final taxes, fees &amp; charges are determined by the LGU/BPLO during official assessment.</span>
          </div>
        </div>
      </div>

      {/* â”€â”€ OFFICIAL PROCESS + RENEWAL / NOTIFICATIONS â”€â”€ */}
      <div className="db-row db-row--bottom">

        {/* Official Process */}
        <div className="card db-official-process">
          <div className="db-section-title">
            <div className="db-official-process__icon" aria-hidden="true">i</div>
            <h2>How the Official Permit Process Works</h2>
          </div>
          <div className="db-process-steps">
            {[
              { num: 1, title: 'File',    desc: 'Submit application & supporting documents at BPLO.' },
              { num: 2, title: 'Assess',  desc: 'LGU assesses applicable taxes, fees & other charges.' },
              { num: 3, title: 'Payment', desc: 'Pay the officially assessed amounts.' },
              { num: 4, title: 'Claim',   desc: 'Receive your business permit & other documents.' },
            ].map((step, i) => (
              <div key={i} className="db-process-step">
                <div className="db-process-step__num">{step.num}</div>
                <div>
                  <div className="db-process-step__title">{step.title}</div>
                  <div className="db-process-step__desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="db-official-process__note">
            PermitEase helps you prepare for these steps. It does not replace official BPLO assessment or payment.
          </p>
        </div>

        {/* Right: Renewal + Notifications */}
        <div className="db-right-col">

          {stats?.next_expiration && (
            <div className={`card db-renewal-alert${stats?.days_to_expiration <= 30 ? ' db-renewal-alert--urgent' : ''}`}>
              <div className="db-renewal-alert__title">
                <AlertTriangle size={15}/> Renewal Alert
              </div>
              <p className="db-renewal-alert__body">
                {stats?.days_to_expiration < 0
                  ? 'Your business permit has expired. Review your renewal requirements.'
                  : `Your business permit expires in ${stats?.days_to_expiration} days.`}
              </p>
              <Link to="/renewals" className="db-renewal-alert__link">View Renewals &rarr;</Link>
            </div>
          )}

          <div className="card db-notifications">
            <div className="db-notifications__header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={15} style={{ color: 'var(--text-secondary)' }}/> Notifications
              </span>
              {notifications.length > 0 && (
                <Link to="/notifications" className="db-notifications__all">View All</Link>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="db-notifications__empty">
                <CheckCircle size={20} style={{ color: 'var(--success)', opacity: 0.5 }}/>
                <p>No new notifications â€” you're all caught up!</p>
              </div>
            ) : (
              <div className="db-notifications__list">
                {notifications.map(n => (
                  <div key={n.id} className="db-notification-item">
                    <div className="db-notification-item__dot" aria-hidden="true"/>
                    <div>
                      <div className="db-notification-item__title">{n.title}</div>
                      <div className="db-notification-item__body">{n.message?.substring(0, 70)}â€¦</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
  const compColor = (stats?.compliance_rate ?? 0) >= 80 ? 'var(--success)' : 'var(--warning)';

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--government-navy)', marginBottom: '0.35rem' }}>BPLO Preparation Support Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Municipality of Roxas â€” Business Permit Management Overview</p>
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
        <StatCard icon={Building2}     label="Registered MSMEs"       value={loading ? '...' : stats?.total_businesses}              colorClass="navy" />
        <StatCard icon={ClipboardCheck} label="Pending Verification"   value={loading ? '...' : stats?.pending_pre_assessments}       colorClass="orange" />
        <StatCard icon={CheckCircle}   label="Verified (This System)"  value={loading ? '...' : stats?.verified_pre_assessments}      colorClass="green" />
        <StatCard icon={AlertTriangle} label="Avg. Readiness %"        value={loading ? '...' : (stats?.avg_readiness_pct != null ? `${stats.avg_readiness_pct}%` : 'N/A')} colorClass="gold" />
        <StatCard icon={XCircle}       label="Correction Requests"     value={loading ? '...' : stats?.correction_requests}           colorClass="red" />
        <StatCard icon={FileText}      label="Total Requirements"      value={loading ? '...' : stats?.total_requirements}            colorClass="navy" />
      </div>

      <div className="dashboard-grid">
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Municipal Preparation Readiness */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: 'none' }}>
              <h3 style={{ margin: 0, color: 'var(--government-navy)' }}>Municipal Compliance Rate</h3>
            </div>
            <ScoreBar score={stats?.compliance_rate ?? 0} label="Average Preparation Readiness" color={compColor} />
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
              <h3 style={{ margin: 0, color: 'var(--government-navy)' }}>Recent Pre-Assessment Submissions</h3>
              <Link to="/admin/applications" className="btn btn-ghost btn-sm">View All <ChevronRight size={14} /></Link>
            </div>
            {stats?.recent_applications?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 0', fontSize: '0.875rem' }}>No applications yet.</p>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      {['Business', 'Preparation Ref.', 'Date', 'Status'].map(h => <th key={h}>{h}</th>)}
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
              <Link to="/tax-estimation" className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start' }}>
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

