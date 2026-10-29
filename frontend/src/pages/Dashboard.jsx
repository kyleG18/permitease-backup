import { useContext, useEffect, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, Clock,
  Building2, ClipboardCheck, Receipt, BarChart2,
  ShieldCheck, AlertCircle, ChevronRight, BrainCircuit, Calendar,
  TrendingUp, Bell, ArrowRight, Info, Zap,
  Ticket, Scale, CalendarCheck, Activity, Users, ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
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
  const selfDeclaredReady = reqHave;
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
      value: loading ? '…' : `${readScore}%`,
      sub: readScore >= 80 ? 'On track' : readScore >= 50 ? 'In progress' : 'Needs attention',
      accent: readScore >= 80 ? 'var(--success)' : readScore >= 50 ? 'var(--warning)' : 'var(--danger)',
      accentBg: readScore >= 80 ? 'var(--success-light)' : readScore >= 50 ? 'var(--warning-light)' : 'var(--danger-light)',
      to: '/assessment',
    },
    {
      icon: CheckCircle,
      label: 'Self-Declared Ready',
      value: loading ? '…' : selfDeclaredReady,
      sub: selfDeclaredReady > 0 ? `of ${totalReqs} clearances marked` : 'Mark items in AI Assessment',
      accent: selfDeclaredReady > 0 ? 'var(--success)' : 'var(--text-secondary)',
      accentBg: selfDeclaredReady > 0 ? 'var(--success-light)' : 'var(--border-light)',
      to: '/assessment',
    },
    {
      icon: AlertCircle,
      label: 'Still Needed',
      value: loading ? '…' : (stats?.missing_requirements ?? 0),
      sub: (stats?.missing_requirements ?? 0) === 0 ? 'All clear!' : 'Action needed',
      accent: (stats?.missing_requirements ?? 0) === 0 ? 'var(--success)' : 'var(--danger)',
      accentBg: (stats?.missing_requirements ?? 0) === 0 ? 'var(--success-light)' : 'var(--danger-light)',
      to: '/assessment',
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
      icon: ClipboardCheck,
      label: 'Prepare Application',
      desc: 'Fill Form BPLO-01 & plan walk-in',
      to: '/applications',
      primary: true,
    },
    {
      icon: BrainCircuit,
      label: 'AI Assessment',
      desc: 'Identify permits with AI guidance',
      to: '/assessment',
      primary: false,
    },
    {
      icon: CalendarCheck,
      label: 'Schedule Walk-in',
      desc: 'Book your slot at BPLO Window 1',
      to: '/schedule-walkin',
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
    { title: 'AI Assessment',         desc: 'Identify clearances needed for your business', done: !!stats?.assessment_completed, to: '/assessment' },
    { title: 'Cost Estimation',        desc: 'Estimate municipal taxes & fees',               done: !!estimate, to: '/tax-estimation' },
    { title: 'Prepare Application',    desc: 'Fill & download Form BPLO-01',                  done: readScore >= 80, to: '/applications' },
    { title: 'Schedule Walk-in',       desc: 'Book your slot at BPLO Window 1',               done: !!stats?.active_walkin, to: '/schedule-walkin' },
    { title: 'Walk in to BPLO',        desc: 'File at Municipal Hall (Window 1)',              done: stats?.active_walkin?.walkin_status === 'ATTENDED', to: '/schedule-walkin' },
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

      {/* ── ACTIVE FAST-TRACK WALK-IN BANNER (IF SCHEDULED) ─────────────── */}
      {stats?.active_walkin && (
        <div style={{
          backgroundColor: stats.active_walkin.walkin_status === 'ATTENDED' ? '#F0FDF4' : '#EFF6FF',
          border: `1px solid ${stats.active_walkin.walkin_status === 'ATTENDED' ? '#BBF7D0' : '#BFDBFE'}`,
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '8px',
              backgroundColor: stats.active_walkin.walkin_status === 'ATTENDED' ? '#DCFCE7' : '#DBEAFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Calendar size={20} color={stats.active_walkin.walkin_status === 'ATTENDED' ? '#166534' : '#1D4ED8'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--government-navy)' }}>
                  Scheduled Walk-in: {stats.active_walkin.business_name}
                </span>
                {stats.active_walkin.walkin_status === 'ATTENDED' ? (
                  <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                    ✓ Documents Sighted
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                    Scheduled Window
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '0.2rem' }}>
                <strong>{new Date(stats.active_walkin.walkin_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                {' • '}
                <span>{stats.active_walkin.walkin_time_slot || 'Morning Window'}</span>
                {' • '}
                <span>Window 1, Ground Floor, Roxas Municipal Hall</span>
              </div>
            </div>
          </div>
          <Link
            to="/schedule-walkin"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              backgroundColor: 'white', color: 'var(--government-navy)', border: '1px solid #CBD5E1',
              padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '12.5px', fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            View Appointment & Form <ArrowRight size={13} />
          </Link>
        </div>
      )}

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
              <p className="db-readiness-v2__desc">
                {readScore === 100
                  ? "All requirements are in order. You're ready to walk in to BPLO."
                  : 'Run the AI Assessment and mark the items you already have to track your readiness.'}
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to={readScore === 0 && !readiness ? '/assessment' : '/applications'} className="db-readiness-v2__cta-btn" style={{ flex: 1, minWidth: '130px', textAlign: 'center', justifyContent: 'center' }}>
                  {readScore === 0 && !readiness ? 'Start AI Assessment' : 'Prepare Application'} <ArrowRight size={14} />
                </Link>
                <Link to="/assessment" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-dark)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600', backgroundColor: 'white' }}>
                  <BrainCircuit size={14} color="var(--primary-green)" /> Assessment
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

          <div className="card db-renewal-v2">
            <div className="db-renewal-v2__title">
              <Calendar size={15} />
              Annual Renewal Reminder
            </div>
            <p className="db-renewal-v2__body">
              Under RA 7160, business permits in the Municipality of Roxas are renewed annually every January 1–20 at Window 1.
            </p>
          </div>

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
// DONUT / CIRCULAR PROGRESS COMPONENT
// ===========================================================================
const DonutProgress = ({ percent = 68, size = 145, strokeWidth = 13, color = '#15803D' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(Number(percent) || 0, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', lineHeight: 1 }}>
          {clamped}%
        </div>
        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '3px' }}>
          On-Track
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// LGU / SYSTEM ADMIN DASHBOARD
// ===========================================================================
const AdminDashboard = ({ user, stats, loading }) => {
  const [dashboardView, setDashboardView] = useState('modern'); // 'modern' | 'classic'
  const compColor = (stats?.compliance_rate ?? 0) >= 80 ? 'var(--success)' : 'var(--warning)';
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] || 'Officer';

  // Statutory calculations derived from live municipal registry (RA 7160 & RA 11032)
  const statutoryTotal = useMemo(() => {
    return (stats?.active_count || 0) + (stats?.expiring_soon_count || 0) + (stats?.renewal_window_count || 0) + (stats?.delinquent_count || 0);
  }, [stats]);

  const activePct = statutoryTotal > 0 ? Math.round(((stats?.active_count || 0) / statutoryTotal) * 100) : 0;
  const expiringPct = statutoryTotal > 0 ? Math.round(((stats?.expiring_soon_count || 0) / statutoryTotal) * 100) : 0;
  const renewalPct = statutoryTotal > 0 ? Math.round(((stats?.renewal_window_count || 0) / statutoryTotal) * 100) : 0;
  const delinquentPct = statutoryTotal > 0 ? Math.round(((stats?.delinquent_count || 0) / statutoryTotal) * 100) : 0;

  // Determine current statutory period label
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  let statutoryPeriod = 'ACTIVE SEASON';
  let statutoryColor = '#166534';
  let statutoryBg = '#DCFCE7';
  if (month === 1 && day <= 20) {
    statutoryPeriod = 'RENEWAL WINDOW (Jan 1–20)';
    statutoryColor = '#1E40AF';
    statutoryBg = '#DBEAFE';
  } else if (month === 1 && day > 20) {
    statutoryPeriod = 'DELINQUENCY PERIOD';
    statutoryColor = '#9A3412';
    statutoryBg = '#FFEDD5';
  } else if (month === 12) {
    statutoryPeriod = 'PRE-RENEWAL WATCH (Dec)';
    statutoryColor = '#92400E';
    statutoryBg = '#FEF3C7';
  }

  const fmt = (n) => (n ?? 0).toLocaleString();

  return (
    <div className="animate-fade-in" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── HERO BANNER ────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundImage: "url('/images/roxas-hall.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 38%',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.25)',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        {/* Cinematic Government Dark Overlay with Forest Municipal Accent */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.94) 0%, rgba(20, 83, 45, 0.82) 48%, rgba(15, 23, 42, 0.58) 100%)',
          zIndex: 1
        }} />

        {/* Inner Content */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: '1.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          color: 'white'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '0.3rem 0.85rem',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#DCFCE7',
              marginBottom: '0.65rem'
            }}>
              <img src="/images/roxas-seal.png" alt="Roxas Seal" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
              Municipality of Roxas, Oriental Mindoro • {user?.role === 'system_admin' ? 'Admin Command Center' : 'BPLO Command Center'}
            </div>
            <h1 style={{
              margin: '0 0 0.35rem',
              fontSize: '28px',
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 4px rgba(0,0,0,0.35)'
            }}>
              {greeting}, {firstName}!
            </h1>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '0 1px 2px rgba(0,0,0,0.35)'
            }}>
              {user?.role === 'system_admin'
                ? 'System Administration & Security · User Access & Municipal Audit Logs'
                : 'Business Permit & Licensing Oversight · PermitEase Administration'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{
              fontSize: '12.5px',
              color: '#FFFFFF',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: '600'
            }}>
              <Calendar size={14} color="#86EFAC" /> {today}
            </div>
            <div style={{
              backgroundColor: statutoryBg,
              color: statutoryColor,
              borderRadius: '20px',
              padding: '0.35rem 0.95rem',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.05em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              RA 7160 — {statutoryPeriod}
            </div>
          </div>
        </div>
      </div>

      {/* ── VIEW SWITCHER BAR (TESTING DESIGN) ────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        padding: '0.6rem 1rem',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
          <Activity size={16} color="#15803D" />
          <span>Dashboard Layout Experience</span>
          <span style={{ fontSize: '10.5px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.04em' }}>
            TESTING MODE
          </span>
        </div>

        <div style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <button
            type="button"
            onClick={() => setDashboardView('modern')}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: dashboardView === 'modern' ? 700 : 500,
              backgroundColor: dashboardView === 'modern' ? '#15803D' : 'transparent',
              color: dashboardView === 'modern' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            ✦ Modern Grid (Testing)
          </button>
          <button
            type="button"
            onClick={() => setDashboardView('classic')}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: dashboardView === 'classic' ? 700 : 500,
              backgroundColor: dashboardView === 'classic' ? '#15803D' : 'transparent',
              color: dashboardView === 'classic' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            ☷ Operations View
          </button>
        </div>
      </div>

      {dashboardView === 'modern' ? (
        /* ═══════════════════════════════════════════════════════════════
           MODERN MINIMALIST GRID — AUTHENTIC MUNICIPAL DATA
        ═══════════════════════════════════════════════════════════════ */
        <div className="admin-modern-dashboard">
          <style>{`
            .admin-modern-grid {
              display: grid;
              grid-template-columns: 1.55fr 1fr;
              gap: 1.25rem;
              margin-bottom: 1.5rem;
            }
            .admin-ops-subgrid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1.25rem;
              margin-bottom: 1.5rem;
            }
            @media (max-width: 1080px) {
              .admin-modern-grid, .admin-ops-subgrid {
                grid-template-columns: 1fr;
                gap: 1.25rem;
              }
            }
          `}</style>

          {/* ════ MAIN TWO-COLUMN MODERN GRID (Matches reference layout) ════ */}
          <div className="admin-modern-grid">
            
            {/* ── LEFT COLUMN (WIDER, ~60-65%) ─────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* 1. Statutory Compliance & Renewal Radar (Real RA 7160 data) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.4rem 1.5rem',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      backgroundColor: '#DCFCE7', color: '#15803D',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Scale size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                        Statutory Renewal & Compliance Radar
                      </h3>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Republic Act 7160 (Local Government Code) · Statutory Schedule
                      </div>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: statutoryBg,
                    color: statutoryColor,
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.04em'
                  }}>
                    {statutoryPeriod}
                  </div>
                </div>

                {/* Real Multi-Segment Municipal Compliance Distribution Bar */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginBottom: '0.4rem' }}>
                    <span>Municipal Portfolio Compliance Flow</span>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>{fmt(statutoryTotal)} Tracked Permits</span>
                  </div>
                  <div style={{
                    height: '10px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ width: `${activePct}%`, backgroundColor: '#15803D', transition: 'width 0.8s ease' }} title={`Active Compliant: ${activePct}%`} />
                    <div style={{ width: `${expiringPct}%`, backgroundColor: '#D97706', transition: 'width 0.8s ease' }} title={`Expiring Soon (Dec): ${expiringPct}%`} />
                    <div style={{ width: `${renewalPct}%`, backgroundColor: '#2563EB', transition: 'width 0.8s ease' }} title={`Renewal Window (Jan): ${renewalPct}%`} />
                    <div style={{ width: `${delinquentPct}%`, backgroundColor: '#DC2626', transition: 'width 0.8s ease' }} title={`Delinquent (Post Jan 20): ${delinquentPct}%`} />
                  </div>
                </div>

                {/* 4 Authentic Statutory Metric Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  
                  {/* Active Compliant */}
                  <div style={{ backgroundColor: '#F0FDF4', borderRadius: '10px', padding: '0.75rem', border: '1px solid #DCFCE7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11.5px', fontWeight: 700, color: '#166534', marginBottom: '0.2rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
                      Active Compliant
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#166534', lineHeight: 1.2 }}>
                      {loading ? '…' : fmt(stats?.active_count)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#15803D', marginTop: '0.2rem' }}>Good standing</div>
                  </div>

                  {/* Expiring Soon */}
                  <div style={{ backgroundColor: '#FEF3C7', borderRadius: '10px', padding: '0.75rem', border: '1px solid #FDE68A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11.5px', fontWeight: 700, color: '#92400E', marginBottom: '0.2rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} />
                      Expiring Dec
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#92400E', lineHeight: 1.2 }}>
                      {loading ? '…' : fmt(stats?.expiring_soon_count)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#B45309', marginTop: '0.2rem' }}>Pre-renewal watch</div>
                  </div>

                  {/* Jan Renewal Window */}
                  <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '0.75rem', border: '1px solid #BFDBFE' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11.5px', fontWeight: 700, color: '#1E40AF', marginBottom: '0.2rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                      Jan 1–20 Window
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E40AF', lineHeight: 1.2 }}>
                      {loading ? '…' : fmt(stats?.renewal_window_count)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#1D4ED8', marginTop: '0.2rem' }}>Standard renewal</div>
                  </div>

                  {/* Delinquent */}
                  <div style={{ backgroundColor: '#FEE2E2', borderRadius: '10px', padding: '0.75rem', border: '1px solid #FECACA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11.5px', fontWeight: 700, color: '#991B1B', marginBottom: '0.2rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                      Delinquent
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#991B1B', lineHeight: 1.2 }}>
                      {loading ? '…' : fmt(stats?.delinquent_count)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#DC2626', marginTop: '0.2rem' }}>RA 7160 Surcharges</div>
                  </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Link to="/admin/analytics" style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#15803D',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    View Full Statutory Analytics & Reports <ChevronRight size={13} />
                  </Link>
                </div>
              </div>

              {/* 2. Table Card (Matches clean table with solid emerald header bar in screenshot) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #15803D 0%, #166534 100%)',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ClipboardCheck size={16} /> Recent Pre-Assessment Submissions (Form BPLO-01)
                  </div>
                  <Link to="/admin/applications" style={{ color: '#DCFCE7', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    View All ({stats?.recent_applications?.length || 0}) <ChevronRight size={13} />
                  </Link>
                </div>

                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0, fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '0.7rem 1.15rem', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Business Name</th>
                        <th style={{ padding: '0.7rem 0.85rem', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</th>
                        <th style={{ padding: '0.7rem 0.85rem', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>App Ref #</th>
                        <th style={{ padding: '0.7rem 0.85rem', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date Submitted</th>
                        <th style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                        <th style={{ padding: '0.7rem 1.15rem', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!stats?.recent_applications || stats.recent_applications.length === 0) ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>
                            No recent pre-assessment submissions recorded.
                          </td>
                        </tr>
                      ) : (
                        stats.recent_applications.slice(0, 5).map((app, idx) => {
                          const statusConfig = {
                            APPROVED: { label: 'Prep Verified', color: '#166534', bg: '#DCFCE7' },
                            SUBMITTED: { label: 'Submitted', color: '#1E40AF', bg: '#DBEAFE' },
                            UNDER_REVIEW: { label: 'Under Review', color: '#92400E', bg: '#FEF3C7' },
                            NEEDS_CORRECTION: { label: 'Correction Req.', color: '#9A3412', bg: '#FFEDD5' },
                            REJECTED: { label: 'Corrections', color: '#991B1B', bg: '#FEE2E2' },
                            DRAFT: { label: 'Draft', color: '#475569', bg: '#F1F5F9' },
                            COMPLETED: { label: 'Completed', color: '#14532D', bg: '#F0FDF4' },
                          }[app.status] || { label: app.status, color: '#64748B', bg: '#F1F5F9' };

                          return (
                            <tr key={app.id || idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{ padding: '0.8rem 1.15rem', fontWeight: 700, color: '#0F172A' }}>
                                {app.business_name || 'Unnamed Business'}
                              </td>
                              <td style={{ padding: '0.8rem 0.85rem', color: '#475569', fontSize: '12px' }}>
                                {app.business_type || 'Commercial'}
                              </td>
                              <td style={{ padding: '0.8rem 0.85rem', color: '#64748B', fontSize: '12px', fontFamily: 'monospace' }}>
                                {app.application_number || 'Pending'}
                              </td>
                              <td style={{ padding: '0.8rem 0.85rem', color: '#64748B', fontSize: '12px' }}>
                                {app.created_at ? new Date(app.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </td>
                              <td style={{ padding: '0.8rem 1rem' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: statusConfig.bg,
                                  color: statusConfig.color
                                }}>
                                  {statusConfig.label}
                                </span>
                              </td>
                              <td style={{ padding: '0.8rem 1.15rem', textAlign: 'right' }}>
                                <Link to="/admin/applications" style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  color: '#15803D',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  textDecoration: 'none'
                                }}>
                                  Review <ChevronRight size={12} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Bottom Two Statutory Warning Cards (Matches 2 summary cards below table in screenshot) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* Delinquent MSMEs Warning */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '1px solid #FECACA',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#991B1B' }}>
                      DELINQUENT MSMES (RA 7160)
                    </span>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={14} />
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#DC2626', lineHeight: 1.1 }}>
                    {loading ? '…' : fmt(stats?.delinquent_count)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '0.4rem' }}>
                    Past Jan 20 · Mandatory 25% statutory surcharge applied
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <Link to="/admin/analytics" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: '#FEE2E2',
                      color: '#991B1B',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}>
                      View Delinquency Register <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>

                {/* Expiring Soon Pre-Renewal */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '1px solid #FED7AA',
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9A3412' }}>
                      EXPIRING SOON (DECEMBER)
                    </span>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#FFEDD5', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={14} />
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#EA580C', lineHeight: 1.1 }}>
                    {loading ? '…' : fmt(stats?.expiring_soon_count)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '0.4rem' }}>
                    Expires Dec 31 · Pre-renewal watch & advisory dispatch
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <Link to="/admin/analytics" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: '#FFEDD5',
                      color: '#9A3412',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}>
                      Pre-Renewal Watchlist <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>

              </div>

            </div>

            {/* ── RIGHT COLUMN (NARROWER, ~35-40%) ─────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* 1. 2x2 Vibrant Metric Cards (Matches 4 colored cards in top right of screenshot) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                
                {/* Top Left: Municipal Emerald (MSME Registry) */}
                <div style={{
                  background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                  borderRadius: '16px',
                  padding: '1.2rem',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 20px -5px rgba(21, 128, 61, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '115px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      MSME Registry
                    </span>
                    <Building2 size={16} color="rgba(255,255,255,0.85)" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: '0.35rem 0' }}>
                    {loading ? '…' : fmt(stats?.total_businesses)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#BBF7D0', fontWeight: 600 }}>
                    Business profiles on record
                  </div>
                </div>

                {/* Top Right: Warm Amber (Pending Review) */}
                <div style={{
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  borderRadius: '16px',
                  padding: '1.2rem',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 20px -5px rgba(217, 119, 6, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '115px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Pending Review
                    </span>
                    <ClipboardCheck size={16} color="rgba(255,255,255,0.85)" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: '0.35rem 0' }}>
                    {loading ? '…' : fmt(stats?.pending_pre_assessments)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#FEF3C7', fontWeight: 600 }}>
                    Submitted & awaiting review
                  </div>
                </div>

                {/* Bottom Left: Forest Green (Prep Verified) */}
                <div style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  borderRadius: '16px',
                  padding: '1.2rem',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 20px -5px rgba(5, 150, 105, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '115px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Prep Verified
                    </span>
                    <CheckCircle size={16} color="rgba(255,255,255,0.85)" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: '0.35rem 0' }}>
                    {loading ? '…' : fmt(stats?.verified_pre_assessments)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#A7F3D0', fontWeight: 600 }}>
                    BPLO-01 Pre-assessment approved
                  </div>
                </div>

                {/* Bottom Right: Municipal Navy (Today's Walk-in Queue) */}
                <div style={{
                  background: 'linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%)',
                  borderRadius: '16px',
                  padding: '1.2rem',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 20px -5px rgba(30, 64, 175, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '115px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Today's Walk-ins
                    </span>
                    <Ticket size={16} color="rgba(255,255,255,0.85)" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: '0.35rem 0' }}>
                    {loading ? '…' : fmt(stats?.todays_walkin_count)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#BFDBFE', fontWeight: 600 }}>
                    <span style={{ color: '#86EFAC', fontWeight: 700 }}>{fmt(stats?.todays_attended_count)}</span> sighted at Window 1
                  </div>
                </div>

              </div>

              {/* 2. Donut Municipal Readiness Radar (Matches bottom right card in reference screenshot) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={16} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                      MSME Readiness Overview
                    </h3>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '1.25rem' }}>
                    Statutory Clearance Preparedness Rate
                  </div>

                  {/* Circular Donut Ring with Percentage Center */}
                  <DonutProgress
                    percent={stats?.avg_readiness_pct != null ? stats.avg_readiness_pct : 0}
                    size={150}
                    strokeWidth={14}
                    color="#15803D"
                  />

                  {/* Real Status Legend */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '1.25rem', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700 }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#15803D' }} />
                      Verified Ready ({fmt(stats?.verified_pre_assessments)})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#DC2626', fontWeight: 600 }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                      Missing Clearances ({fmt(stats?.missing_requirements)})
                    </div>
                  </div>
                </div>

                {/* Bottom Real Breakdown stats strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  paddingTop: '1rem',
                  marginTop: '1.25rem',
                  borderTop: '1px solid #F1F5F9'
                }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem 0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Reqs Tracked</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>
                      {fmt(stats?.total_requirements)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem 0.75rem', borderRadius: '8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Assessed MSMEs</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803D', marginTop: '0.15rem' }}>
                      {fmt(stats?.assessed_businesses)}
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* ════ ROW 2: OPERATIONS & BOTTLENECK INTELLIGENCE ════ */}
          <div className="admin-ops-subgrid">

            {/* Left: Common Missing Clearances (Authentic top_missing_requirements) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.35rem 1.5rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={17} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      Common Missing Clearances
                    </h3>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      Top statutory prerequisites delaying MSME readiness
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                  Top Bottlenecks
                </span>
              </div>

              {(!stats?.top_missing_requirements || stats.top_missing_requirements.length === 0) ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  <CheckCircle size={22} color="#15803D" style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                  All MSME prerequisite clearances are currently satisfied.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {stats.top_missing_requirements.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.85rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #F1F5F9'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{
                          width: '22px', height: '22px', borderRadius: '6px',
                          backgroundColor: '#FEE2E2', color: '#DC2626',
                          fontSize: '11px', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                          {item.permit_name}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#DC2626',
                        backgroundColor: '#FEE2E2',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '5px'
                      }}>
                        {item.missing_count} MSMEs lacking
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Walk-in Counter Control (Window 1) & Quick Navigation */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.35rem 1.5rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarCheck size={17} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      Walk-in Roster & Window 1 Control
                    </h3>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      Counter scheduling & fast-track administrative actions
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#1E40AF' }}>{loading ? '…' : fmt(stats?.todays_walkin_count)}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.15rem' }}>Scheduled Today</div>
                  </div>
                  <div style={{ backgroundColor: '#F0FDF4', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', border: '1px solid #DCFCE7' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803D' }}>{loading ? '…' : fmt(stats?.todays_attended_count)}</div>
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '0.15rem' }}>Sighted ✓</div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '1rem', padding: '0.5rem 0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#1E40AF' }}>{loading ? '…' : fmt(stats?.week_walkins_scheduled)}</span> walk-in appointments this week (7-day window)
                </div>
              </div>

              {/* Quick Navigation Action Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                <Link to="/admin/applications" style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem', borderRadius: '8px',
                  backgroundColor: '#F0FDF4', color: '#15803D',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 700
                }}>
                  <ClipboardCheck size={14} /> Form BPLO-01
                </Link>
                <Link to="/admin/walkins" style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem', borderRadius: '8px',
                  backgroundColor: '#EFF6FF', color: '#1E40AF',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 700
                }}>
                  <Calendar size={14} /> Walk-in Roster
                </Link>
                <Link to="/requirements" style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem', borderRadius: '8px',
                  backgroundColor: '#F5F3FF', color: '#7C3AED',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 700
                }}>
                  <Scale size={14} /> Requirements
                </Link>
                <Link to="/admin/analytics" style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem', borderRadius: '8px',
                  backgroundColor: '#F0F9FF', color: '#0284C7',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 700
                }}>
                  <BarChart2 size={14} /> Reports
                </Link>
              </div>

            </div>

          </div>

          {/* ════ ROW 3: MUNICIPAL REQUIREMENTS MASTERLIST BANNER ════ */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Scale size={22} />
              </div>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                  Municipal Requirements Masterlist — <span style={{ color: '#7C3AED' }}>{loading ? '…' : fmt(stats?.configured_requirements)} Clearances Configured</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Statutory prerequisites under RA 11032 (Ease of Doing Business) · Maintain clearance ordinances.
                </div>
              </div>
            </div>
            <Link to="/requirements" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#7C3AED',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '0.6rem 1.1rem',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none'
            }}>
              <Scale size={15} /> Manage Clearances
            </Link>
          </div>

        </div>      ) : (
        /* ═══════════════════════════════════════════════════════════════
           CLASSIC OPERATIONS VIEW
        ═══════════════════════════════════════════════════════════════ */
        <div>

          {/* ── ROW 1: KPI STAT CARDS ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Registered MSMEs */}
        <div style={{ backgroundColor: 'white', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', borderTop: '3px solid var(--government-navy)', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>MSMEs Registered</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(23,32,51,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} color="var(--government-navy)" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--government-navy)', lineHeight: 1 }}>{loading ? '…' : fmt(stats?.total_businesses)}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.35rem' }}>Business profiles in PermitEase</div>
        </div>

        {/* Pending Review */}
        <div style={{ backgroundColor: 'white', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', borderTop: '3px solid #D97706', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Pending Review</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardCheck size={16} color="#D97706" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#D97706', lineHeight: 1 }}>{loading ? '…' : fmt(stats?.pending_pre_assessments)}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.35rem' }}>Submitted & under review</div>
        </div>

        {/* Preparation Verified */}
        <div style={{ backgroundColor: 'white', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', borderTop: '3px solid var(--primary-green)', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Prep Verified</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={16} color="var(--primary-green)" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary-green)', lineHeight: 1 }}>{loading ? '…' : fmt(stats?.verified_pre_assessments)}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.35rem' }}>Pre-assessments approved</div>
        </div>

        {/* Today's Walk-ins */}
        <div style={{ backgroundColor: 'white', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', borderTop: '3px solid #1E40AF', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Today's Walk-ins</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={16} color="#1E40AF" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1E40AF', lineHeight: 1 }}>{loading ? '…' : fmt(stats?.todays_walkin_count)}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.35rem' }}>
            <span style={{ color: 'var(--primary-green)', fontWeight: '600' }}>{fmt(stats?.todays_attended_count)}</span> sighted at Window 1
          </div>
        </div>

        {/* Delinquent (RA 7160) */}
        <div style={{ backgroundColor: 'white', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', borderTop: '3px solid #DC2626', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Delinquent</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} color="#DC2626" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#DC2626', lineHeight: 1 }}>{loading ? '…' : fmt(stats?.delinquent_count)}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.35rem' }}>Past Jan 20 · RA 7160 Surcharge</div>
        </div>

        {/* Expiring Soon */}
        <div style={{ backgroundColor: 'white', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', borderTop: '3px solid #EA580C', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Expiring Soon</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#EA580C" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#EA580C', lineHeight: 1 }}>{loading ? '…' : fmt(stats?.expiring_soon_count)}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.35rem' }}>Expires Dec 31 · Pre-renewal watch</div>
        </div>

      </div>

      {/* ── ROW 2: OPERATIONS PANELS ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Walk-in Counter Control */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={17} color="#1D4ED8" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--government-navy)' }}>Walk-in Roster</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Window 1 · BPLO Counter Control</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1E40AF' }}>{loading ? '…' : fmt(stats?.todays_walkin_count)}</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.15rem' }}>Scheduled Today</div>
            </div>
            <div style={{ backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary-green)' }}>{loading ? '…' : fmt(stats?.todays_attended_count)}</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.15rem' }}>Sighted ✓</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '1rem', padding: '0.5rem 0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
            <span style={{ fontWeight: '600', color: '#1E40AF' }}>{loading ? '…' : fmt(stats?.week_walkins_scheduled)}</span> appointments this week (7-day window)
          </div>

          <Link to="/admin/walkins" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            backgroundColor: '#1E40AF', color: 'white', borderRadius: '6px', padding: '0.55rem',
            fontSize: '13px', fontWeight: '600', textDecoration: 'none'
          }}>
            <Calendar size={14} /> Manage Walk-in Appointments
          </Link>
        </div>

        {/* Renewal Radar (RA 7160) */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={17} color="#EA580C" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--government-navy)' }}>Renewal Calendar</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Statutory Schedule · RA 7160</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'Active & Compliant', value: stats?.active_count, color: '#166534', bg: '#F0FDF4', dot: '#22C55E' },
              { label: 'Expiring Soon (Dec)', value: stats?.expiring_soon_count, color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
              { label: 'Jan Renewal Window', value: stats?.renewal_window_count, color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
              { label: 'Delinquent (Post Jan 20)', value: stats?.delinquent_count, color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: item.bg, borderRadius: '6px', padding: '0.5rem 0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '12px', color: item.color, fontWeight: '600' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.dot, flexShrink: 0 }} />
                  {item.label}
                </div>
                <span style={{ fontSize: '15px', fontWeight: '800', color: item.color }}>{loading ? '…' : fmt(item.value)}</span>
              </div>
            ))}
          </div>

          <Link to="/admin/analytics" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            backgroundColor: '#0284C7', color: 'white', borderRadius: '6px', padding: '0.55rem',
            fontSize: '13px', fontWeight: '600', textDecoration: 'none'
          }}>
            <BarChart2 size={14} /> View Analytics & Reports
          </Link>
        </div>

        {/* Quick Admin Actions */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={17} color="var(--primary-green)" />
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--government-navy)' }}>Quick Access</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { to: '/admin/applications', icon: ClipboardCheck, label: 'Form BPLO-01 Pre-Assessments', color: 'var(--primary-green)', bg: '#F0FDF4' },
              { to: '/admin/walkins', icon: Calendar, label: 'Walk-in Schedule & Roster', color: '#1E40AF', bg: '#EFF6FF' },
              { to: '/requirements', icon: Scale, label: 'Municipal Requirements Config', color: '#7C3AED', bg: '#F5F3FF' },
              { to: '/admin/analytics', icon: BarChart2, label: 'Analytics & Reports', color: '#0284C7', bg: '#F0F9FF' },
            ].map((action, i) => (
              <Link key={i} to={action.to} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.55rem 0.75rem', borderRadius: '7px',
                backgroundColor: action.bg, color: action.color,
                textDecoration: 'none', fontSize: '13px', fontWeight: '600',
                transition: 'opacity 0.15s'
              }}>
                <action.icon size={14} strokeWidth={2} />
                {action.label}
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* ── ROW 3: RECENT SUBMISSIONS + MISSING REQUIREMENTS ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Recent Pre-Assessment Submissions */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--government-navy)' }}>Recent Pre-Assessment Submissions</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Latest applications submitted by MSMEs</div>
            </div>
            <Link to="/admin/applications" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-green)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View All <ChevronRight size={13} />
            </Link>
          </div>

          {!stats?.recent_applications?.length ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>No applications submitted yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  {['Business', 'Ref #', 'Date', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent_applications.map((a, i) => {
                  const STATUS_MAP = {
                    APPROVED: { label: 'Prep Verified', color: '#166534', bg: '#DCFCE7' },
                    SUBMITTED: { label: 'Submitted', color: '#1E40AF', bg: '#DBEAFE' },
                    UNDER_REVIEW: { label: 'Under Review', color: '#92400E', bg: '#FEF3C7' },
                    NEEDS_CORRECTION: { label: 'Correction Req.', color: '#9A3412', bg: '#FFEDD5' },
                    REJECTED: { label: 'Corrections', color: '#991B1B', bg: '#FEE2E2' },
                    DRAFT: { label: 'Draft', color: '#475569', bg: '#F1F5F9' },
                    COMPLETED: { label: 'Completed', color: '#14532D', bg: '#F0FDF4' },
                  };
                  const s = STATUS_MAP[a.status] || { label: a.status, color: '#64748B', bg: '#F1F5F9' };
                  return (
                    <tr key={a.id} style={{ borderBottom: i < stats.recent_applications.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--government-navy)', fontSize: '13px' }}>{a.business_name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '12px', fontFamily: 'monospace' }}>{a.application_number || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '12px' }}>{new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: s.color, backgroundColor: s.bg, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column: Readiness stats + Top Missing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* MSME Readiness Summary */}
          <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--government-navy)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} color="var(--primary-green)" /> MSME Readiness Overview
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '0.3rem' }}>
                <span>Avg. Readiness</span>
                <span style={{ color: compColor }}>{stats?.avg_readiness_pct != null ? `${stats.avg_readiness_pct}%` : 'N/A'}</span>
              </div>
              <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats?.avg_readiness_pct ?? 0}%`, backgroundColor: compColor, borderRadius: '20px', transition: 'width 0.8s ease' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '7px', padding: '0.6rem', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-green)' }}>{fmt(stats?.total_requirements)}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Total Reqs</div>
              </div>
              <div style={{ backgroundColor: '#FEE2E2', borderRadius: '7px', padding: '0.6rem', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#DC2626' }}>{fmt(stats?.missing_requirements)}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Missing</div>
              </div>
            </div>
          </div>

          {/* Top Missing Requirements */}
          <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--government-navy)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={16} color="#DC2626" /> Common Missing Clearances
            </div>
            {!stats?.top_missing_requirements?.length ? (
              <div style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={18} color="var(--primary-green)" style={{ display: 'block', margin: '0 auto 0.4rem' }} />
                No missing requirements on record.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {stats.top_missing_requirements.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.6rem', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '12.5px', fontWeight: '500', color: 'var(--government-navy)' }}>{item.permit_name}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>{item.missing_count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── ROW 4: REQUIREMENTS CONFIG SUMMARY ───────────────────── */}
      <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={20} color="#7C3AED" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--government-navy)' }}>
              Municipal Requirements Masterlist — <span style={{ color: '#7C3AED' }}>{loading ? '…' : fmt(stats?.configured_requirements)} Clearances Configured</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Statutory prerequisites under RA 11032 (Citizen's Charter) · Add, edit or retire clearances when ordinances change.
            </div>
          </div>
        </div>
        <Link to="/requirements" style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          backgroundColor: '#7C3AED', color: 'white', borderRadius: '7px',
          padding: '0.55rem 1rem', fontSize: '13px', fontWeight: '600', textDecoration: 'none'
        }}>
          <Scale size={14} /> Manage Requirements
        </Link>
      </div>
        </div>
      )}

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
