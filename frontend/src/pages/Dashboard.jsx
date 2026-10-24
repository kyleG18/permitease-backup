import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, Clock,
  Building2, ClipboardCheck, Receipt, BarChart2,
  ShieldCheck, AlertCircle, ChevronRight, BrainCircuit, Calendar,
  TrendingUp, Bell, ArrowRight, Info, MapPin, Zap
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

  // KPI metric cards data
  const kpiCards = [
    {
      icon: Building2,
      label: 'My Businesses',
      value: loading ? '…' : (stats?.total_businesses ?? 0),
      sub: 'Registered profiles',
      accent: 'var(--government-navy)',
      accentBg: 'rgba(23,32,51,0.07)',
      to: '/profile',
    },
    {
      icon: ShieldCheck,
      label: 'Permit Readiness',
      value: loading ? '…' : `${stats?.compliance_score ?? 0}%`,
      sub: readScore >= 80 ? 'On track' : readScore >= 50 ? 'In progress' : 'Needs attention',
      accent: readScore >= 80 ? 'var(--success)' : readScore >= 50 ? 'var(--warning)' : 'var(--danger)',
      accentBg: readScore >= 80 ? 'var(--success-light)' : readScore >= 50 ? 'var(--warning-light)' : 'var(--danger-light)',
      to: '/applications',
    },
    {
      icon: FileText,
      label: 'Total Requirements',
      value: loading ? '…' : (stats?.total_requirements ?? 0),
      sub: 'Municipal checklist',
      accent: 'var(--info)',
      accentBg: 'var(--info-light)',
      to: '/permits',
    },
    {
      icon: CheckCircle,
      label: 'BPLO Verified',
      value: loading ? '…' : (stats?.bplo_verified_count ?? 0),
      sub: 'Confirmed by officer',
      accent: 'var(--success)',
      accentBg: 'var(--success-light)',
      to: '/permits',
    },
    {
      icon: AlertCircle,
      label: 'Missing Items',
      value: loading ? '…' : (stats?.missing_requirements ?? 0),
      sub: 'Action needed',
      accent: 'var(--danger)',
      accentBg: 'var(--danger-light)',
      to: '/permits',
    },
    {
      icon: BrainCircuit,
      label: 'AI Assessment',
      value: loading ? '…' : (stats?.assessment_completed ? 'Done' : 'Pending'),
      sub: stats?.assessment_completed ? 'Clearances identified' : 'Not yet run',
      accent: stats?.assessment_completed ? 'var(--success)' : 'var(--text-secondary)',
      accentBg: stats?.assessment_completed ? 'var(--success-light)' : 'var(--border-light)',
      to: '/assessment',
    },
  ];

  // Quick action tiles
  const quickActions = [
    {
      icon: ShieldCheck,
      label: 'Verify Requirements',
      desc: 'BPLO checklist, remarks & upload proofs',
      to: '/permits',
      primary: true,
    },
    {
      icon: ClipboardCheck,
      label: 'Prepare Application',
      desc: 'Document readiness & Form BPLO-01',
      to: '/applications',
      primary: false,
    },
    {
      icon: BrainCircuit,
      label: 'AI Assessment',
      desc: 'Identify permits with AI guidance',
      to: '/assessment',
      primary: false,
    },
    {
      icon: Receipt,
      label: 'Cost Estimation',
      desc: 'Estimate local taxes & regulatory fees',
      to: '/tax-estimation',
      primary: false,
    },
  ];

  const timelineSteps = [
    { title: 'AI Assessment',      desc: 'Identify clearances for your business', done: !!stats?.assessment_completed, to: '/assessment' },
    { title: 'Verify Requirements', desc: 'BPLO review & upload document proofs', done: (stats?.bplo_verified_count ?? 0) > 0 || (stats?.ready_requirements ?? 0) > 0, to: '/permits' },
    { title: 'Cost Estimation',    desc: 'Estimate municipal taxes & fees',       done: !!estimate, to: '/tax-estimation' },
    { title: 'Prepare Application', desc: 'Review Form BPLO-01 & readiness',      done: readScore >= 80, to: '/applications' },
    { title: 'Submit at BOSS / eBPLS', desc: 'File at Municipal Hall or online', done: false, to: '/applications' },
  ];

  const stepsCompleted = timelineSteps.filter(s => s.done).length;
  const progressPct = Math.round((stepsCompleted / timelineSteps.length) * 100);

  const officialSteps = [
    { num: 1, title: 'File',    desc: 'Submit application & supporting documents at BPLO.' },
    { num: 2, title: 'Assess',  desc: 'LGU assesses applicable taxes, fees & other charges.' },
    { num: 3, title: 'Payment', desc: 'Pay the officially assessed amounts.' },
    { num: 4, title: 'Claim',   desc: 'Receive your business permit & other documents.' },
  ];

  return (
    <div className="animate-fade-in db-msme">

      {/* ── HERO SECTION (untouched) ───────────────────────────────────────── */}
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

      {/* ── KPI METRIC CARDS ──────────────────────────────────────────────── */}
      <div className="db-kpi-grid">
        {kpiCards.map((card, idx) => (
          <Link key={idx} to={card.to} className="db-kpi-card">
            <div className="db-kpi-card__accent" style={{ backgroundColor: card.accent }} />
            <div className="db-kpi-card__body">
              <div className="db-kpi-card__icon" style={{ backgroundColor: card.accentBg, color: card.accent }}>
                <card.icon size={18} strokeWidth={2} />
              </div>
              <div className="db-kpi-card__meta">
                <div className="db-kpi-card__label">{card.label}</div>
                <div className="db-kpi-card__value" style={{ color: card.accent }}>{card.value}</div>
                <div className="db-kpi-card__sub">{card.sub}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── READINESS + QUICK ACTIONS ─────────────────────────────────────── */}
      <div className="db-row">

        {/* Permit Readiness — upgraded */}
        <div className="card db-readiness-v2">
          <div className="db-readiness-v2__header">
            <div className="db-readiness-v2__title-row">
              <div className="db-readiness-v2__icon-wrap">
                <ShieldCheck size={20} strokeWidth={2} />
              </div>
              <div>
                <h2 className="db-readiness-v2__title">Permit Readiness</h2>
                <p className="db-readiness-v2__biz">{stats?.businesses?.[0]?.business_name || 'Your Business'}</p>
              </div>
            </div>
            {readScore === 100 ? (
              <span className="db-badge db-badge--green">&#10003; Complete</span>
            ) : (
              <span className="db-badge db-badge--amber">In Progress</span>
            )}
          </div>

          {/* Score ring area */}
          <div className="db-readiness-v2__score-area">
            <div className="db-score-ring-wrap">
              <svg className="db-score-ring" viewBox="0 0 80 80" aria-hidden="true">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border-light)" strokeWidth="7" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke={readColor}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - readScore / 100)}`}
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.9s ease' }}
                />
              </svg>
              <div className="db-score-ring__label">
                <span className="db-score-ring__pct" style={{ color: readColor }}>{readScore}%</span>
                <span className="db-score-ring__sub">ready</span>
              </div>
            </div>

            <div className="db-readiness-v2__breakdown">
              <div className="db-breakdown-item db-breakdown-item--ok">
                <CheckCircle size={14} />
                <span><strong>{reqHave}</strong> Met</span>
              </div>
              <div className="db-breakdown-item db-breakdown-item--warn">
                <AlertCircle size={14} />
                <span><strong>{reqNeed}</strong> Incomplete</span>
              </div>
              <div className="db-breakdown-item db-breakdown-item--muted">
                <Clock size={14} />
                <span><strong>{reqNotChecked}</strong> Unchecked</span>
              </div>
              {(stats?.bplo_verified_count ?? 0) > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#166534', backgroundColor: '#DCFCE7', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', margin: '0.25rem 0' }}>
                  <ShieldCheck size={12} /> {stats.bplo_verified_count} BPLO Verified
                </div>
              )}
              <p className="db-readiness-v2__desc">
                {readScore === 100
                  ? "All requirements are in order. You're ready to proceed."
                  : 'Track and verify missing clearances with BPLO to reach 100% readiness.'}
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to={readScore === 0 && !readiness ? '/assessment' : '/applications'} className="db-readiness-v2__cta-btn" style={{ flex: 1, minWidth: '130px', textAlign: 'center', justifyContent: 'center' }}>
                  {readScore === 0 && !readiness ? 'Start AI Assessment' : 'Prepare Application'} <ArrowRight size={14} />
                </Link>
                <Link to="/permits" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-dark)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600', backgroundColor: 'white' }}>
                  <ShieldCheck size={14} color="var(--primary-green)" /> Verify
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions — tile grid */}
        <div className="card db-quick-actions-v2">
          <div className="db-quick-actions-v2__header">
            <Zap size={17} strokeWidth={2} style={{ color: 'var(--primary-green)' }} />
            <h2 className="db-quick-actions-v2__title">Quick Actions</h2>
          </div>
          <div className="db-quick-actions-v2__grid">
            {quickActions.map((action, idx) => (
              <Link key={idx} to={action.to} className={`db-qa-tile${action.primary ? ' db-qa-tile--primary' : ''}`}>
                <div className="db-qa-tile__icon">
                  <action.icon size={20} strokeWidth={1.75} />
                </div>
                <div className="db-qa-tile__label">{action.label}</div>
                <div className="db-qa-tile__desc">{action.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── PREPARATION PROGRESS + ESTIMATED COST ─────────────────────────── */}
      <div className="db-row">

        {/* Preparation Progress */}
        <div className="card db-progress-v2">
          <div className="db-section-title">
            <TrendingUp size={18} style={{ color: 'var(--primary-green)' }} />
            <h2>Permit Preparation Journey</h2>
            <Link to="/assessment" className="db-section-link">Details <ChevronRight size={13} /></Link>
          </div>

          {/* Progress bar summary */}
          <div className="db-journey-summary">
            <span className="db-journey-summary__text">{stepsCompleted} of {timelineSteps.length} steps complete</span>
            <span className="db-journey-summary__pct" style={{ color: progressPct === 100 ? 'var(--success)' : 'var(--warning)' }}>{progressPct}%</span>
          </div>
          <div className="db-journey-bar">
            <div className="db-journey-bar__fill" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Step list */}
          <div className="db-step-list">
            {timelineSteps.map((step, i) => (
              <Link key={i} to={step.to || '/assessment'} style={{ textDecoration: 'none', color: 'inherit' }} className={`db-step-item${step.done ? ' db-step-item--done' : ''}`}>
                <div className="db-step-item__dot">
                  {step.done ? <CheckCircle size={14} /> : <span>{i + 1}</span>}
                </div>
                <div className="db-step-item__connector" aria-hidden="true" />
                <div className="db-step-item__content">
                  <div className="db-step-item__title">{step.title}</div>
                  <div className="db-step-item__desc">{step.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="card db-cost-v2">
          <div className="db-section-title">
            <Receipt size={18} style={{ color: 'var(--primary-green)' }} />
            <h2>Estimated Permit Cost</h2>
            <Link to="/tax-estimation" className="db-section-link">Details <ChevronRight size={13} /></Link>
          </div>

          <div className="db-cost-v2__rows">
            <div className="db-cost-v2__row">
              <div className="db-cost-v2__row-label">
                <span className="db-cost-v2__dot" style={{ backgroundColor: 'var(--government-navy)' }} />
                Local Business Tax
              </div>
              <span className={`db-cost-v2__amount${hasUnassessedTax ? ' db-cost-v2__amount--assessed' : ''}`}>
                {estimate ? (hasUnassessedTax ? 'To Be Assessed' : formatCurrency(taxTotal)) : '—'}
              </span>
            </div>
            <div className="db-cost-v2__row">
              <div className="db-cost-v2__row-label">
                <span className="db-cost-v2__dot" style={{ backgroundColor: 'var(--primary-green)' }} />
                Regulatory Fees
              </div>
              <span className={`db-cost-v2__amount${hasUnassessedFee ? ' db-cost-v2__amount--assessed' : ''}`}>
                {estimate ? (hasUnassessedFee ? 'To Be Assessed' : formatCurrency(feeTotal)) : '—'}
              </span>
            </div>
          </div>

          <div className="db-cost-v2__total">
            <span>Estimated Total</span>
            <span className="db-cost-v2__total-value">
              {estimate
                ? ((hasUnassessedFee || hasUnassessedTax) ? 'To Be Assessed' : formatCurrency(taxTotal + feeTotal))
                : '—'}
            </span>
          </div>

          <div className="db-cost-v2__note">
            <Info size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>Estimates only. Final amounts are officially assessed by the LGU/BPLO.</span>
          </div>

          {!estimate && (
            <Link to="/tax-estimation" className="db-cost-v2__cta">
              Run Cost Estimation <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* ── OFFICIAL PROCESS + NOTIFICATIONS ──────────────────────────────── */}
      <div className="db-row db-row--bottom">

        {/* Official Process — polished */}
        <div className="card db-official-v2">
          <div className="db-section-title" style={{ marginBottom: '1.5rem' }}>
            <div className="db-official-v2__icon-wrap" aria-hidden="true">
              <Info size={13} />
            </div>
            <h2>How the Official Permit Process Works</h2>
          </div>

          <div className="db-official-v2__steps">
            {officialSteps.map((step, i) => (
              <div key={i} className="db-official-step">
                <div className="db-official-step__left">
                  <div className="db-official-step__num">{step.num}</div>
                  {i < officialSteps.length - 1 && <div className="db-official-step__line" />}
                </div>
                <div className="db-official-step__content">
                  <div className="db-official-step__title">{step.title}</div>
                  <div className="db-official-step__desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="db-official-v2__disclaimer">
            <AlertCircle size={12} style={{ flexShrink: 0 }} />
            PermitEase helps you prepare for these steps. It does not replace official BPLO assessment or payment.
          </div>
        </div>

        {/* Right col: Renewal + Notifications */}
        <div className="db-right-col">

          {stats?.next_expiration && (
            <div className={`card db-renewal-v2${stats?.days_to_expiration <= 30 ? ' db-renewal-v2--urgent' : ''}`}>
              <div className="db-renewal-v2__title">
                <AlertTriangle size={15} />
                Renewal Alert
              </div>
              <p className="db-renewal-v2__body">
                {stats?.days_to_expiration < 0
                  ? 'Your business permit has expired. Review your renewal requirements.'
                  : `Your business permit expires in ${stats?.days_to_expiration} days.`}
              </p>
              <Link to="/renewals" className="db-renewal-v2__link">
                View Renewals <ArrowRight size={13} />
              </Link>
            </div>
          )}

          <div className="card db-notif-v2">
            <div className="db-notif-v2__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={15} style={{ color: 'var(--primary-green)' }} />
                <span>Notifications</span>
              </div>
              {notifications.length > 0 && (
                <Link to="/notifications" className="db-notif-v2__view-all">View All</Link>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="db-notif-v2__empty">
                <div className="db-notif-v2__empty-icon">
                  <CheckCircle size={22} strokeWidth={1.75} />
                </div>
                <p>All caught up! No new notifications.</p>
              </div>
            ) : (
              <div className="db-notif-v2__list">
                {notifications.map(n => (
                  <div key={n.id} className="db-notif-item">
                    <div className="db-notif-item__dot" aria-hidden="true" />
                    <div>
                      <div className="db-notif-item__title">{n.title}</div>
                      <div className="db-notif-item__body">{n.message?.substring(0, 70)}…</div>
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
              <Link to="/permits" className="btn btn-primary btn-block" style={{ justifyContent: 'flex-start', fontWeight: '700' }}>
                <ShieldCheck size={16} /> Verify Requirements Hub
              </Link>
              <Link to="/admin/applications" className="btn btn-outline btn-block" style={{ justifyContent: 'flex-start' }}>
                <ClipboardCheck size={16} /> Review Pre-Assessments
              </Link>
              <Link to="/requirements" className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start' }}>
                <FileText size={16} /> Permit Rules Config
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
