import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, Clock,
  Building2, ClipboardCheck, Receipt, BarChart2,
  ShieldCheck, AlertCircle, ChevronRight, BrainCircuit, Calendar,
  TrendingUp, Bell, ArrowRight, Info, Zap,
  Ticket, Scale, CalendarCheck
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
  const docsSubmitted = stats?.docs_submitted_count ?? 0;
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
      to: '/permits',
    },
    {
      icon: CheckCircle,
      label: 'BPLO Verified',
      value: loading ? '…' : (stats?.bplo_verified_count ?? 0),
      sub: (stats?.bplo_verified_count ?? 0) > 0 ? 'Confirmed by officer' : 'Awaiting BPLO review',
      accent: (stats?.bplo_verified_count ?? 0) > 0 ? 'var(--success)' : 'var(--text-secondary)',
      accentBg: (stats?.bplo_verified_count ?? 0) > 0 ? 'var(--success-light)' : 'var(--border-light)',
      to: '/permits',
    },
    {
      icon: FileText,
      label: 'Docs Submitted',
      value: loading ? '…' : docsSubmitted,
      sub: docsSubmitted > 0 ? 'Uploaded & submitted' : 'No uploads yet',
      accent: docsSubmitted > 0 ? 'var(--info)' : 'var(--text-secondary)',
      accentBg: docsSubmitted > 0 ? 'var(--info-light)' : 'var(--border-light)',
      to: '/permits',
    },
    {
      icon: AlertCircle,
      label: 'Missing Items',
      value: loading ? '…' : (stats?.missing_requirements ?? 0),
      sub: (stats?.missing_requirements ?? 0) === 0 ? 'All clear!' : 'Action needed',
      accent: (stats?.missing_requirements ?? 0) === 0 ? 'var(--success)' : 'var(--danger)',
      accentBg: (stats?.missing_requirements ?? 0) === 0 ? 'var(--success-light)' : 'var(--danger-light)',
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
              <Ticket size={20} color={stats.active_walkin.walkin_status === 'ATTENDED' ? '#166534' : '#1D4ED8'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--government-navy)' }}>
                  Fast-Track Walk-in: {stats.active_walkin.business_name}
                </span>
                {stats.active_walkin.queue_ticket_number && (
                  <span style={{
                    backgroundColor: '#1E3A8A', color: 'white', padding: '0.1rem 0.5rem',
                    borderRadius: '4px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace'
                  }}>
                    #{stats.active_walkin.queue_ticket_number}
                  </span>
                )}
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
            to={`/applications/${stats.active_walkin.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              backgroundColor: 'white', color: 'var(--government-navy)', border: '1px solid #CBD5E1',
              padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '12.5px', fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            View Ticket & Form <ArrowRight size={13} />
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
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] || 'Officer';

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

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--government-navy) 0%, #1B4D7E 100%)',
        borderRadius: '12px', padding: '1.5rem 2rem', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '1rem', color: 'white'
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
            Municipality of Roxas, Oriental Mindoro • BPLO Command Center
          </div>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '26px', fontWeight: '700', color: 'white' }}>
            {greeting}, {firstName}!
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>
            Business Permit & Licensing Oversight · PermitEase Administration
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> {today}
          </div>
          <div style={{
            backgroundColor: statutoryBg, color: statutoryColor,
            borderRadius: '20px', padding: '0.3rem 0.875rem',
            fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em'
          }}>
            RA 7160 — {statutoryPeriod}
          </div>
        </div>
      </div>

      {/* ── ROW 1: KPI STAT CARDS ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Registered MSMEs */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderTop: '3px solid var(--government-navy)' }}>
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
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderTop: '3px solid #D97706' }}>
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
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderTop: '3px solid var(--primary-green)' }}>
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
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderTop: '3px solid #1E40AF' }}>
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
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderTop: '3px solid #DC2626' }}>
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
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderTop: '3px solid #EA580C' }}>
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

          <Link to="/admin/applications" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            backgroundColor: '#1E40AF', color: 'white', borderRadius: '6px', padding: '0.55rem',
            fontSize: '13px', fontWeight: '600', textDecoration: 'none'
          }}>
            <Ticket size={14} /> Open Queue Control
          </Link>
        </div>

        {/* Renewal Radar (RA 7160) */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={17} color="#EA580C" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--government-navy)' }}>Renewal Radar</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Statutory Compliance · RA 7160</div>
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

          <Link to="/admin/renewals" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            backgroundColor: '#EA580C', color: 'white', borderRadius: '6px', padding: '0.55rem',
            fontSize: '13px', fontWeight: '600', textDecoration: 'none'
          }}>
            <AlertTriangle size={14} /> Open Renewal Monitoring
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
              { to: '/admin/applications', icon: ClipboardCheck, label: 'Review Pre-Assessments', color: 'var(--primary-green)', bg: '#F0FDF4' },
              { to: '/admin/applications', icon: Ticket, label: 'Walk-in Queue Control', color: '#1E40AF', bg: '#EFF6FF' },
              { to: '/admin/renewals', icon: AlertTriangle, label: 'Renewal & Delinquency Monitor', color: '#EA580C', bg: '#FFEDD5' },
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
