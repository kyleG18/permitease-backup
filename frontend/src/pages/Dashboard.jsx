import { useContext, useEffect, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { LanguageContext } from '../context/LanguageContext';
import axios from 'axios';
import {
  FileText, CheckCircle, CheckCircle2, AlertTriangle, XCircle, Clock,
  Building2, ClipboardCheck, Receipt, BarChart2,
  ShieldCheck, AlertCircle, ChevronRight, BrainCircuit, Calendar,
  TrendingUp, Bell, ArrowRight, Info, Zap,
  Ticket, Scale, CalendarCheck, Activity, Users, ArrowUpRight,
  Download, ExternalLink, MapPin, Printer
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
// BUSINESS OWNER DASHBOARD (Streamlined & User-Friendly Action Center)
// ===========================================================================
const BusinessOwnerDashboard = ({ user, stats, loading }) => {
  const { businesses: contextBusinesses, loadingBusinesses } = useContext(BusinessContext);
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';
  const [selectedBizId, setSelectedBizId] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loadingBizData, setLoadingBizData] = useState(false);
  const headers = useMemo(() => ({ Authorization: `Bearer ${user.token}` }), [user.token]);

  // Combined business profiles list from stats or context
  const businessesList = useMemo(() => {
    if (stats?.businesses && stats.businesses.length > 0) return stats.businesses;
    if (contextBusinesses && contextBusinesses.length > 0) return contextBusinesses;
    return [];
  }, [stats?.businesses, contextBusinesses]);

  // Set default business
  useEffect(() => {
    if (businessesList.length > 0 && !selectedBizId) {
      setSelectedBizId(String(businessesList[0].id));
    }
  }, [businessesList, selectedBizId]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifs = () => {
      axios.get(`${API}/notifications`, { headers })
        .then(r => setNotifications(Array.isArray(r.data) ? r.data.slice(0, 4) : []))
        .catch(() => {});
    };
    fetchNotifs();
    window.addEventListener('notificationUpdate', fetchNotifs);
    return () => window.removeEventListener('notificationUpdate', fetchNotifs);
  }, [headers]);

  // Fetch readiness & estimate for selected business
  useEffect(() => {
    if (!selectedBizId) return;
    setLoadingBizData(true);
    Promise.allSettled([
      axios.get(`${API}/readiness/${selectedBizId}`, { headers }),
      axios.get(`${API}/tax/estimate/${selectedBizId}`, { headers })
    ]).then(([readRes, estRes]) => {
      if (readRes.status === 'fulfilled') setReadiness(readRes.value.data);
      if (estRes.status === 'fulfilled') setEstimate(estRes.value.data);
      setLoadingBizData(false);
    });
  }, [selectedBizId, headers]);

  // Zero-business onboarding view
  if (!loading && !loadingBusinesses && stats?.total_businesses === 0 && businessesList.length === 0) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', backgroundColor: '#FFFFFF' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Building2 size={28} />
          </div>
          <h2 style={{ color: 'var(--government-navy, #0F172A)', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>
            {isTl ? 'Maligayang Pagdating sa PermitEase' : 'Welcome to PermitEase'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '1.75rem', lineHeight: 1.55 }}>
            {isTl
              ? 'Handa na ang iyong account. Irehistro muna ang profile ng iyong negosyo upang matukoy ng PermitEase ang mga tiyak na permit na kailangan sa Munisipalidad ng Roxas.'
              : 'Your account is ready. Register your business profile first so PermitEase can determine your exact Municipality of Roxas, Oriental Mindoro permit requirements.'}
          </p>
          <Link to="/onboarding" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700, borderRadius: '8px' }}>
            {isTl ? 'Irehistro ang Aking Negosyo' : 'Register My Business'} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const selectedBiz = businessesList.find(b => String(b.id) === String(selectedBizId)) || businessesList[0] || {};

  // Readiness scores
  const readScore = readiness?.readiness_score ?? stats?.compliance_score ?? 0;

  // Extract actual requirement counts from the "Requirements Checklist" category detail
  // The API embeds counts in the detail string: "X of Y requirement(s) marked as prepared"
  let reqHave = 0, reqNeed = 0;
  const reqChecklist = readiness?.categories?.find(c => c.label === 'Requirements Checklist');
  if (reqChecklist) {
    const match = (reqChecklist.detail || '').match(/^(\d+)\s+of\s+(\d+)/);
    if (match) {
      reqHave = parseInt(match[1], 10);
      const reqTotal = parseInt(match[2], 10);
      reqNeed = reqTotal - reqHave;
    }
  } else {
    reqHave = stats?.ready_requirements ?? 0;
    reqNeed = stats?.missing_requirements ?? 0;
  }
  const totalReqs = reqHave + reqNeed || stats?.total_requirements || 0;

  // Requirement-specific percentage — used for the KPI card progress bar
  // This is separate from readScore (which includes profile + fee sections)
  const reqPct = totalReqs > 0 ? Math.round((reqHave / totalReqs) * 100) : 0;
  const reqColor = reqPct === 100 ? '#15803D' : reqPct >= 50 ? '#D97706' : reqPct > 0 ? '#D97706' : '#E5E7EB';

  const formatCurrency = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);

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

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? (isTl ? 'Magandang umaga' : 'Good morning')
    : hour < 18
      ? (isTl ? 'Magandang hapon' : 'Good afternoon')
      : (isTl ? 'Magandang gabi' : 'Good evening');
  const firstName = user?.full_name?.split(' ')[0] || (isTl ? 'May-ari ng Negosyo' : 'Business Owner');
  const currentDate = new Date().toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Walk-in status
  const activeWalkin = stats?.active_walkin;
  const isAttended = activeWalkin?.walkin_status === 'ATTENDED';
  const isScheduled = !!activeWalkin?.walkin_date;
  const hasAssessment = Boolean(stats?.assessment_completed || (readiness && totalReqs > 0));

  // Dynamic "Next Best Action" logic
  let nextAction = null;
  if (isScheduled && !isAttended) {
    nextAction = {
      tag: isTl ? 'NAKATAKDANG APPOINTMENT' : 'UPCOMING APPOINTMENT',
      tagColor: '#166534',
      tagBg: '#DCFCE7',
      tagBorder: '#BBF7D0',
      title: `Window 1 Walk-In — ${activeWalkin.business_name || selectedBiz.business_name || (isTl ? 'Iyong Negosyo' : 'Your Business')}`,
      desc: isTl
        ? `Ang iyong appointment ay nakatakda sa ${new Date(activeWalkin.walkin_date).toLocaleDateString('fil-PH', { weekday: 'long', month: 'long', day: 'numeric' })} (${activeWalkin.walkin_time_slot === 'Morning Batch' || activeWalkin.walkin_time_slot === 'Morning Window' ? 'Batch sa Umaga' : 'Batch sa Hapon'}). Magdala ng 2 kopya ng Form BPLO-01 at mga orihinal na clearance sa Window 1.`
        : `Your appointment is scheduled for ${new Date(activeWalkin.walkin_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })} (${activeWalkin.walkin_time_slot || 'Morning Window'}). Bring 2 printed copies of Form BPLO-01 and your physical clearances to Window 1.`,
      primaryBtnText: isTl ? 'Tingnan ang Appointment at Routing Slip' : 'View Appointment & Routing Slip',
      primaryBtnLink: '/schedule-walkin',
      primaryBtnIcon: CalendarCheck,
      secondaryBtnText: isTl ? 'I-print ang Form BPLO-01' : 'Print Form BPLO-01',
      secondaryBtnLink: `/applications${selectedBizId ? `?businessId=${selectedBizId}` : ''}`
    };
  } else if (isAttended) {
    nextAction = {
      tag: isTl ? 'NASURI NA ANG MGA DOKUMENTO' : 'DOCUMENTS VERIFIED',
      tagColor: '#166534',
      tagBg: '#DCFCE7',
      tagBorder: '#BBF7D0',
      title: isTl ? 'Beripikasyon sa Counter — Pumunta sa Ingat-Yaman (Treasury)' : 'Counter Verification Complete — Proceed to Treasury Cashier',
      desc: isTl ? 'Naberipika na ng BPLO Window 1 ang iyong pisikal na application folder at inindorso ka na sa Ingat-Yaman ng Munisipyo para sa pagbabayad at pagkuha ng permit.' : 'BPLO Window 1 has verified your physical application folder and endorsed you to Municipal Treasury for final payment and permit claiming.',
      primaryBtnText: isTl ? 'Tingnan ang Katayuan at Resibo' : 'View Status & Receipt',
      primaryBtnLink: '/schedule-walkin',
      primaryBtnIcon: CheckCircle2
    };
  } else if (!hasAssessment) {
    nextAction = {
      tag: isTl ? 'HAKBANG 1 — KINAKAILANGAN' : 'STEP 1 — REQUIRED',
      tagColor: '#166534',
      tagBg: '#F0FDF4',
      tagBorder: '#BBF7D0',
      title: isTl ? 'Tukuyin ang Iyong mga Kinakailangang Clearance' : 'Identify Your Required Municipal Clearances',
      desc: isTl ? 'Patakbuhin ang Pagsusuri ng AI upang matukoy ang mga tiyak na clearance at rekisito sa Munisipalidad ng Roxas para sa linya ng iyong negosyo.' : 'Run the AI Assessment to identify the specific clearances and prerequisites required for your business type under local ordinances.',
      primaryBtnText: isTl ? 'Simulan ang Pagsusuri ng AI' : 'Start AI Assessment',
      primaryBtnLink: `/assessment${selectedBizId ? `?businessId=${selectedBizId}` : ''}`,
      primaryBtnIcon: BrainCircuit
    };
  } else if (readScore === 100 || (totalReqs > 0 && reqNeed === 0)) {
    nextAction = {
      tag: isTl ? 'LAHAT NG CLEARANCE — HANDA NA' : 'ALL CLEARANCES READY',
      tagColor: '#166534',
      tagBg: '#DCFCE7',
      tagBorder: '#BBF7D0',
      title: isTl ? 'Handa Nang Mag-file — Ihanda ang Form BPLO-01' : 'Ready to File — Prepare Your Form BPLO-01',
      desc: isTl ? 'Naihanda na ang lahat ng rekisito. I-download ang pre-filled na Unified Business Permit Application Form, pagkatapos ay mag-iskedyul ng appointment sa Window 1.' : 'All prerequisites are in order. Download your pre-filled Unified Business Permit Application Form and schedule your Window 1 appointment.',
      primaryBtnText: isTl ? 'Tingnan at I-print ang Form BPLO-01' : 'View & Print Form BPLO-01',
      primaryBtnLink: `/applications${selectedBizId ? `?businessId=${selectedBizId}` : ''}`,
      primaryBtnIcon: ClipboardCheck,
      secondaryBtnText: isTl ? 'Mag-iskedyul ng Walk-In' : 'Schedule Walk-In',
      secondaryBtnLink: '/schedule-walkin'
    };
  } else {
    nextAction = {
      tag: isTl ? `IN PROGRESS — ${reqNeed} NATITIRA` : `IN PROGRESS — ${reqNeed} REMAINING`,
      tagColor: '#92400E',
      tagBg: '#FFFBEB',
      tagBorder: '#FDE68A',
      title: isTl ? `Ipunin ang ${reqNeed} Natitirang Clearance` : `Gather Your ${reqNeed} Remaining Clearances`,
      desc: isTl
        ? `${reqHave} sa ${totalReqs} clearance ang handa para sa ${selectedBiz.business_name || 'iyong negosyo'}. Suriin ang iyong checklist sa Assessment o kalkulahin ang iyong tinatayang bayarin.`
        : `${reqHave} of ${totalReqs} clearances are prepared for ${selectedBiz.business_name || 'your business'}. Review your checklist in Assessment or calculate your estimated municipal fees.`,
      primaryBtnText: isTl ? 'Suriin ang Checklist sa Assessment' : 'Review Assessment Checklist',
      primaryBtnLink: `/assessment${selectedBizId ? `?businessId=${selectedBizId}` : ''}`,
      primaryBtnIcon: ShieldCheck,
      secondaryBtnText: isTl ? 'Kalkulahin ang Bayarin' : 'Calculate Estimated Fees',
      secondaryBtnLink: `/fee-estimation${selectedBizId ? `?business_id=${selectedBizId}` : ''}`
    };
  }

  // Unified 4-Milestone Roadmap
  const milestones = [
    {
      step: 1,
      title: isTl ? 'Pagsusuri ng AI' : 'AI Assessment',
      label: hasAssessment
        ? (isTl ? 'Natukoy ang mga Clearance' : 'Clearances Identified')
        : (isTl ? 'Mga Paunang Rekisito' : 'Statutory Prerequisites'),
      status: hasAssessment ? 'COMPLETE' : 'CURRENT',
      statusColor: hasAssessment ? '#15803D' : '#0F172A',
      statusBg: hasAssessment ? '#DCFCE7' : '#F1F5F9',
      link: `/assessment${selectedBizId ? `?businessId=${selectedBizId}` : ''}`,
      icon: BrainCircuit
    },
    {
      step: 2,
      title: isTl ? 'Estimasyon ng Bayarin' : 'Fee Estimation',
      label: estimate
        ? (hasUnassessedFee || hasUnassessedTax ? (isTl ? 'Naka-configure ang Iskedyul' : 'Schedule Configured') : formatCurrency(taxTotal + feeTotal))
        : (isTl ? 'Bayarin at Buwis sa Munisipyo' : 'Municipal Fees & Tax'),
      status: estimate ? 'COMPLETE' : hasAssessment ? 'CURRENT' : 'UPCOMING',
      statusColor: estimate ? '#15803D' : hasAssessment ? '#0F172A' : '#94A3B8',
      statusBg: estimate ? '#DCFCE7' : hasAssessment ? '#F1F5F9' : '#FFFFFF',
      link: `/fee-estimation${selectedBizId ? `?business_id=${selectedBizId}` : ''}`,
      icon: Receipt
    },
    {
      step: 3,
      title: 'Form BPLO-01',
      label: readScore === 100
        ? (isTl ? 'Handa na Lahat ng Dokumento' : 'All Documents Ready')
        : (isTl ? `${reqHave} sa ${totalReqs} Handa Na` : `${reqHave} of ${totalReqs} Prepared`),
      status: readScore === 100 ? 'COMPLETE' : (hasAssessment && !!estimate) ? 'CURRENT' : 'UPCOMING',
      statusColor: readScore === 100 ? '#15803D' : (hasAssessment && !!estimate) ? '#0F172A' : '#94A3B8',
      statusBg: readScore === 100 ? '#DCFCE7' : (hasAssessment && !!estimate) ? '#F1F5F9' : '#FFFFFF',
      link: `/applications${selectedBizId ? `?businessId=${selectedBizId}` : ''}`,
      icon: ClipboardCheck
    },
    {
      step: 4,
      title: 'Window 1 Walk-In',
      label: isAttended
        ? (isTl ? 'Naberipika sa Counter' : 'Verified at Counter')
        : isScheduled
          ? (isTl ? `Nakatakda sa ${new Date(activeWalkin.walkin_date).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}` : `Booked for ${new Date(activeWalkin.walkin_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`)
          : (isTl ? 'Fast-Track Ground Floor' : 'Fast-Track Ground Floor'),
      status: isAttended ? 'COMPLETE' : isScheduled ? 'SCHEDULED' : readScore === 100 ? 'CURRENT' : 'UPCOMING',
      statusColor: isAttended ? '#15803D' : isScheduled ? '#1E40AF' : readScore === 100 ? '#0F172A' : '#94A3B8',
      statusBg: isAttended ? '#DCFCE7' : isScheduled ? '#EFF6FF' : readScore === 100 ? '#F1F5F9' : '#FFFFFF',
      link: '/schedule-walkin',
      icon: CalendarCheck
    }
  ];

  const milestonesDoneCount = milestones.filter(m => m.status === 'COMPLETE').length;
  const roadmapPct = Math.round((milestonesDoneCount / milestones.length) * 100);

  return (
    <div className="animate-fade-in db-msme" style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'Inter, sans-serif' }}>

      {/* ── 1. MUNICIPAL WORKSPACE HEADER & ACTIVE BUSINESS BAR ───────── */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        borderTop: '3px solid #15803D',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Top Row: Official Greeting & Date */}
        <div style={{
          padding: '1.15rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #F1F5F9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <img
              src="/images/roxas-seal.png"
              alt="Municipality of Roxas Official Seal"
              style={{ width: '42px', height: '42px', objectFit: 'contain', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>
                {isTl ? 'Munisipalidad ng Roxas, Oriental Mindoro · BPLO Portal' : 'Municipality of Roxas, Oriental Mindoro · BPLO Portal'}
              </div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {greeting}, {firstName}
              </h1>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '0.1rem' }}>
                {isTl
                  ? 'Gabay sa Paghahanda at Pagsusuri ng Kahandaan sa Business Permit'
                  : 'Guided Business Permit Preparation & Readiness Overview'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            color: '#334155',
            fontSize: '12.5px',
            fontWeight: 600
          }}>
            <Calendar size={14} color="#15803D" />
            <span>{currentDate}</span>
          </div>
        </div>

        {/* Bottom Row: Active Business Selector & Status */}
        <div style={{
          backgroundColor: '#F8FAFC',
          padding: '0.7rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Building2 size={14} color="#15803D" />
              {isTl ? 'Aktibong Negosyo:' : 'Active Business:'}
            </div>

            {businessesList.length > 1 ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select
                  value={selectedBizId}
                  onChange={(e) => setSelectedBizId(e.target.value)}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    padding: '0.35rem 2rem 0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontWeight: 700,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {businessesList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.business_name} ({b.business_type || b.industry_category || 'Retail'})
                    </option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B', fontSize: '10px' }}>▼</span>
              </div>
            ) : (
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                {selectedBiz.business_name || (isTl ? 'Aking Negosyo' : 'My Business')}
              </span>
            )}

            {selectedBiz && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '5px',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                border: '1px solid #E2E8F0',
                fontSize: '11.5px',
                fontWeight: 600
              }}>
                <span>{selectedBiz.business_type || selectedBiz.industry_category || 'Retail'}</span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span style={{ color: '#15803D', fontWeight: 700 }}>
                  {selectedBiz.business_status
                    ? (isTl && selectedBiz.business_status === 'New Application'
                        ? 'Bagong Aplikasyon'
                        : (isTl && selectedBiz.business_status.includes('Renew')
                            ? 'Pagpapanibago'
                            : selectedBiz.business_status))
                    : (isTl ? 'Bagong Aplikasyon' : 'New Application')}
                </span>
              </div>
            )}
          </div>

          <Link
            to="/profile"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#15803D',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {isTl ? 'Pamahalaan ang mga Profile' : 'Manage Business Profiles'} <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── 3. SMART "NEXT BEST ACTION" ACTION CARD ───────────────────────── */}
      {nextAction && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          borderLeft: `4px solid ${nextAction.tagColor}`,
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
        }}>
          <div style={{ flex: '1 1 520px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.18rem 0.6rem',
              borderRadius: '4px',
              backgroundColor: nextAction.tagBg,
              border: `1px solid ${nextAction.tagBorder || nextAction.tagBg}`,
              color: nextAction.tagColor,
              fontSize: '10.5px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem'
            }}>
              {nextAction.tag}
            </div>

            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.3rem', letterSpacing: '-0.015em', lineHeight: 1.3 }}>
              {nextAction.title}
            </h2>

            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.6 }}>
              {nextAction.desc}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {nextAction.secondaryBtnText && (
              <Link
                to={nextAction.secondaryBtnLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '7px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FAFAFA',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; e.currentTarget.style.borderColor = '#9CA3AF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
              >
                {nextAction.secondaryBtnText}
              </Link>
            )}

            <Link
              to={nextAction.primaryBtnLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '7px',
                backgroundColor: '#15803D',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'opacity 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <nextAction.primaryBtnIcon size={15} />
              {nextAction.primaryBtnText}
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ── 4. 3-METRIC KPI GRID ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: '1rem'
      }}>

        {/* Card 1: Clearance Readiness */}
        <Link
          to={`/assessment${selectedBizId ? `?businessId=${selectedBizId}` : ''}`}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            padding: '1.2rem 1.35rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(21,128,61,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '0.5rem' }}>
                  {isTl ? 'Paghahanda ng Clearance' : 'Clearance Readiness'}
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.025em', lineHeight: 1 }}>
                  {loadingBizData ? '—' : totalReqs > 0 ? `${reqHave} / ${totalReqs}` : '—'}
                </div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDF4', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={18} />
              </div>
            </div>

            {/* Progress bar — based purely on requirements completion, not overall readiness score */}
            <div style={{ height: '5px', backgroundColor: '#F3F4F6', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${reqPct}%`, backgroundColor: reqColor, borderRadius: '999px', transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '0.4rem' }}>
              {loadingBizData ? '' : reqPct === 100
                ? (isTl ? 'Kumpleto ang lahat ng clearance' : 'All clearances complete')
                : totalReqs > 0
                  ? (isTl ? `${reqPct}% kumpleto · ${reqNeed} natitira` : `${reqPct}% complete · ${reqNeed} remaining`)
                  : (isTl ? 'Patakbuhin ang Assessment upang magsimula' : 'Run Assessment to get started')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
              {isTl ? 'Tingnan ang checklist' : 'View checklist'}
            </span>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              Assessment <ArrowRight size={11} />
            </span>
          </div>
        </Link>

        {/* Card 2: Estimated Municipal Cost */}
        <Link
          to={`/fee-estimation${selectedBizId ? `?business_id=${selectedBizId}` : ''}`}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            padding: '1.2rem 1.35rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(21,128,61,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '0.5rem' }}>
                  {isTl ? 'Tinatayang Gastos' : 'Estimated Cost'}
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.025em', lineHeight: 1 }}>
                  {loadingBizData ? '—' : estimate ? (hasUnassessedFee || hasUnassessedTax ? (isTl ? 'Tatasahin Pa' : 'Pending') : formatCurrency(taxTotal + feeTotal)) : '—'}
                </div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FFFBEB', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Receipt size={18} />
              </div>
            </div>

            <div style={{ fontSize: '11.5px', color: '#6B7280', lineHeight: 1.5 }}>
              {estimate
                ? (isTl ? 'Lokal na Buwis at Regulatory Fees' : 'Local Business Tax & Regulatory Fees')
                : (isTl ? 'Patakbuhin ang Fee Estimator para makita ang iyong tinatayang bayarin' : 'Run the Fee Estimator to calculate your estimated fees')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
              {estimate ? (isTl ? 'Tinatayang kalkulasyon' : 'Estimated calculation') : (isTl ? 'Kalkulahin ang bayarin' : 'Calculate fees')}
            </span>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              Fee Estimator <ArrowRight size={11} />
            </span>
          </div>
        </Link>

        {/* Card 3: Filing Pathway */}
        <Link
          to="/schedule-walkin"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            padding: '1.2rem 1.35rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(21,128,61,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '0.5rem' }}>
                  {isTl ? 'Paraan ng Pag-file' : 'Filing Pathway'}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {isAttended
                    ? (isTl ? 'Nasuri sa Counter' : 'Docs Verified')
                    : isScheduled
                      ? (isTl ? 'Window 1 — Nareserba' : 'Window 1 — Booked')
                      : 'Window 1 Walk-In'}
                </div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CalendarCheck size={18} />
              </div>
            </div>

            <div style={{ fontSize: '11.5px', color: '#6B7280', lineHeight: 1.5 }}>
              {isScheduled
                ? `${new Date(activeWalkin.walkin_date).toLocaleDateString(isTl ? 'fil-PH' : 'en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} · ${activeWalkin.walkin_time_slot?.includes('Morning') ? (isTl ? 'Umaga' : 'Morning') : (isTl ? 'Hapon' : 'Afternoon')} Batch`
                : (isTl ? 'Ground Floor Fast-Track Counter — walk-in lang, walang linya' : 'Ground Floor Fast-Track Counter · No queuing required')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
              {isScheduled ? (isTl ? 'Nai-log na sa BPLO' : 'Slot logged at BPLO') : (isTl ? 'Pumili ng petsa ng pagbisita' : 'Select a visit date')}
            </span>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              {isTl ? 'Iskedyul' : 'Schedule'} <ArrowRight size={11} />
            </span>
          </div>
        </Link>

      </div>

      {/* ── 5. UNIFIED 4-STEP PERMIT ROADMAP ──────────────────────────────── */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E5E7EB',
        padding: '1.4rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.15rem', letterSpacing: '-0.01em' }}>
              {isTl ? 'Roadmap sa Paghahanda ng Permit' : 'Permit Preparation Roadmap'}
            </h2>
            <p style={{ fontSize: '12.5px', color: '#6B7280', margin: 0 }}>
              {isTl
                ? `Sumusunod ang ${selectedBiz.business_name || 'iyong negosyo'} sa 4 na yugto`
                : `${selectedBiz.business_name || 'Your business'} follows a 4-stage compliance process`}
            </p>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: milestonesDoneCount === 4 ? '#F0FDF4' : '#F9FAFB',
            border: `1px solid ${milestonesDoneCount === 4 ? '#BBF7D0' : '#E5E7EB'}`
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: milestonesDoneCount === 4 ? '#15803D' : '#374151' }}>
              {isTl
                ? `${milestonesDoneCount} sa 4 kumpleto — ${roadmapPct}%`
                : `${milestonesDoneCount} of 4 complete — ${roadmapPct}%`}
            </span>
          </div>
        </div>

        {/* Milestone cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem'
        }}>
          {milestones.map((m) => {
            const isDone = m.status === 'COMPLETE';
            const isCur = m.status === 'CURRENT' || m.status === 'SCHEDULED';
            const displayStatus = isTl
              ? (m.status === 'COMPLETE' ? 'Kumpleto' : m.status === 'SCHEDULED' ? 'Naka-schedule' : m.status === 'CURRENT' ? 'Kasalukuyan' : 'Susunod')
              : (m.status === 'COMPLETE' ? 'Complete' : m.status === 'SCHEDULED' ? 'Scheduled' : m.status === 'CURRENT' ? 'Current' : 'Upcoming');

            return (
              <Link
                key={m.step}
                to={m.link}
                style={{
                  backgroundColor: isDone ? '#F0FDF4' : isCur ? '#FAFAFA' : '#FFFFFF',
                  borderRadius: '8px',
                  border: `1px solid ${isDone ? '#BBF7D0' : isCur ? '#15803D' : '#E5E7EB'}`,
                  padding: '1rem 1.1rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  boxShadow: isCur ? '0 0 0 3px rgba(21,128,61,0.06)' : 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => { if (!isCur && !isDone) { e.currentTarget.style.borderColor = '#9CA3AF'; } }}
                onMouseLeave={(e) => { if (!isCur && !isDone) { e.currentTarget.style.borderColor = '#E5E7EB'; } }}
              >
                <div>
                  {/* Step number + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <div style={{
                      width: '24px', height: '24px',
                      borderRadius: '50%',
                      backgroundColor: isDone ? '#15803D' : isCur ? '#111827' : '#F3F4F6',
                      color: isDone || isCur ? '#FFFFFF' : '#9CA3AF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 800, flexShrink: 0
                    }}>
                      {isDone ? <CheckCircle2 size={14} color="#FFFFFF" /> : m.step}
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      padding: '0.12rem 0.45rem',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                      backgroundColor: m.statusBg,
                      color: m.statusColor
                    }}>
                      {displayStatus}
                    </span>
                  </div>

                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827', marginBottom: '0.2rem', lineHeight: 1.3 }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6B7280', lineHeight: 1.5 }}>
                    {m.label}
                  </div>
                </div>

                <div style={{
                  paddingTop: '0.6rem',
                  borderTop: `1px solid ${isDone ? '#BBF7D0' : '#F3F4F6'}`,
                  fontSize: '11.5px', fontWeight: 700,
                  color: '#15803D',
                  display: 'flex', alignItems: 'center', gap: '0.25rem'
                }}>
                  {isTl ? 'Buksan' : 'Open'} <ArrowRight size={11} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 6. TWO-COLUMN UTILITY DECK (BOTTOM) ───────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1rem'
      }}>

        {/* Column A: Recent Notifications */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E5E7EB',
          padding: '1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={15} color="#15803D" />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {isTl ? 'Mga Kamakailang Abiso' : 'Recent Notifications'}
              </h3>
            </div>
            {notifications.length > 0 && (
              <Link to="/notifications" style={{ fontSize: '12px', fontWeight: 600, color: '#15803D', textDecoration: 'none' }}>
                {isTl ? 'Tingnan Lahat' : 'View all'} →
              </Link>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <CheckCircle size={26} color="#15803D" style={{ margin: '0 auto 0.6rem' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                {isTl ? 'Walang bagong abiso' : 'All caught up'}
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#6B7280' }}>
                {isTl ? 'Walang nakabinbing alerto para sa iyong account.' : 'No pending alerts for your account.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {notifications.map(n => {
                const isRead = n.status === 'Read' || Boolean(n.is_read);
                return (
                <div key={n.id} style={{
                  padding: '0.7rem 0.9rem',
                  borderRadius: '7px',
                  backgroundColor: isRead ? '#FAFAFA' : '#F0FDF4',
                  border: `1px solid ${isRead ? '#F3F4F6' : '#BBF7D0'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem'
                }}>
                  <div style={{
                    width: '7px', height: '7px',
                    borderRadius: '50%',
                    backgroundColor: isRead ? '#D1D5DB' : '#15803D',
                    flexShrink: 0, marginTop: '5px'
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column B: Compliance & Resources */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E5E7EB',
          padding: '1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Info size={15} color="#15803D" />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {isTl ? 'Pagsunod at Mga Mapagkukunan' : 'Compliance & Resources'}
              </h3>
            </div>

            {/* Annual Renewal notice */}
            <div style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #DBEAFE',
              borderRadius: '7px',
              padding: '0.8rem 0.95rem',
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem'
            }}>
              <Calendar size={16} color="#1D4ED8" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', marginBottom: '2px' }}>
                  {isTl ? 'Taunang Pagpapanibago: Enero 1–20' : 'Annual Renewal Window: January 1–20'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#334155', lineHeight: 1.5 }}>
                  {isTl
                    ? 'Ayon sa RA 7160, ang mga permit sa negosyo sa Munisipalidad ng Roxas, Oriental Mindoro ay pinapanibago tuwing Enero sa Window 1.'
                    : 'Per RA 7160 (Local Government Code), business permits in Municipality of Roxas, Oriental Mindoro are renewed each January at Window 1.'}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <a
                href="/forms/Roxas_Business_Permit_Application_Form.pdf"
                download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '7px',
                  backgroundColor: '#FAFAFA',
                  border: '1px solid #E5E7EB',
                  color: '#111827',
                  textDecoration: 'none',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  transition: 'background-color 0.12s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={13} color="#6B7280" />
                  {isTl ? 'Blangkong Form BPLO-01 (PDF)' : 'Blank Form BPLO-01 (Official PDF)'}
                </span>
                <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 700 }}>{isTl ? 'I-download' : 'Download'}</span>
              </a>

              <Link
                to="/schedule-walkin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '7px',
                  backgroundColor: '#FAFAFA',
                  border: '1px solid #E5E7EB',
                  color: '#111827',
                  textDecoration: 'none',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  transition: 'background-color 0.12s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={13} color="#6B7280" />
                  {isTl ? 'Gabay sa Window 1 Fast-Track Counter' : 'Window 1 Fast-Track Counter Guide'}
                </span>
                <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 700 }}>
                  {isTl ? 'Tingnan' : 'View'}
                </span>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.7rem', borderTop: '1px solid #F3F4F6', fontSize: '11px', color: '#9CA3AF', textAlign: 'center' }}>
            {isTl
              ? 'PermitEase · Munisipalidad ng Roxas, Oriental Mindoro · RA 11032'
              : 'PermitEase · Municipality of Roxas, Oriental Mindoro · RA 11032'}
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

      {/* ── MUNICIPAL COMMAND CENTER HEADER ─────────────────────────────── */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        borderTop: '3px solid #15803D',
        padding: '1.2rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img
            src="/images/roxas-seal.png"
            alt="Roxas Official Seal"
            style={{ width: '44px', height: '44px', objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#15803D',
              marginBottom: '0.15rem'
            }}>
              Municipality of Roxas, Oriental Mindoro · {user?.role === 'system_admin' ? 'System Administration' : 'BPLO Operations Division'}
            </div>
            <h1 style={{
              margin: '0 0 0.15rem',
              fontSize: '21px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em'
            }}>
              {greeting}, {firstName}
            </h1>
            <p style={{
              margin: 0,
              fontSize: '12.5px',
              color: '#64748B'
            }}>
              {user?.role === 'system_admin'
                ? 'System Security, Role Access Control & Municipal Audit Monitoring'
                : 'Business Permit Pre-Assessment Verification & Municipal Readiness Oversight'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.45rem' }}>
          <div style={{
            fontSize: '12.5px',
            color: '#334155',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: '0.35rem 0.85rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontWeight: 600
          }}>
            <Calendar size={14} color="#15803D" /> {today}
          </div>
          <div style={{
            backgroundColor: statutoryBg,
            color: statutoryColor,
            borderRadius: '6px',
            padding: '0.25rem 0.7rem',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em'
          }}>
            RA 7160 — {statutoryPeriod}
          </div>
        </div>
      </div>

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

          {/* ════ MAIN TWO-COLUMN MUNICIPAL GRID ════ */}
          <div className="admin-modern-grid">
            
            {/* ── LEFT COLUMN (WIDER, ~60-65%) ─────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* 1. Statutory Compliance & Renewal Radar (Real RA 7160 data) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                padding: '1.35rem 1.5rem',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Scale size={18} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
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
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.04em'
                  }}>
                    {statutoryPeriod}
                  </div>
                </div>

                {/* Real Multi-Segment Municipal Compliance Distribution Bar */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginBottom: '0.4rem' }}>
                    <span>Municipal Portfolio Compliance Flow</span>
                    <span className="tabular-nums" style={{ color: '#0F172A', fontWeight: 700 }}>{fmt(statutoryTotal)} Tracked Permits</span>
                  </div>
                  <div style={{
                    height: '8px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    display: 'flex'
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
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '0.75rem', border: '1px solid #E2E8F0', borderLeft: '3px solid #15803D' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.2rem' }}>
                      Active Compliant
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: '#166534', lineHeight: 1.2 }}>
                      {loading ? '…' : fmt(stats?.active_count)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.2rem' }}>Good standing</div>
                  </div>

                  {/* Expiring Soon */}
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '0.75rem', border: '1px solid #E2E8F0', borderLeft: '3px solid #D97706' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.2rem' }}>
                      Expiring Dec
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: '#B45309', lineHeight: 1.2 }}>
                      {loading ? '…' : fmt(stats?.expiring_soon_count)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.2rem' }}>Pre-renewal watch</div>
                  </div>

                  {/* Jan Renewal Window */}
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '0.75rem', border: '1px solid #E2E8F0', borderLeft: '3px solid #2563EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.2rem' }}>
                      Jan 1–20 Window
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: '#1E40AF', lineHeight: 1.2 }}>
                      {loading ? '…' : fmt(stats?.renewal_window_count)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.2rem' }}>Standard renewal</div>
                  </div>

                  {/* Delinquent */}
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '0.75rem', border: '1px solid #E2E8F0', borderLeft: '3px solid #DC2626' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.2rem' }}>
                      Delinquent
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: '#991B1B', lineHeight: 1.2 }}>
                      {loading ? '…' : fmt(stats?.delinquent_count)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.2rem' }}>RA 7160 Surcharges</div>
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

              {/* 2. Recent Pre-Assessment Submissions Table Card */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}>
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ color: '#0F172A', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ClipboardCheck size={16} color="#15803D" /> Recent Pre-Assessment Submissions (Form BPLO-01)
                  </div>
                  <Link to="/admin/applications" style={{ color: '#15803D', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
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
                                  borderRadius: '5px',
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

              {/* 3. Bottom Two Statutory Warning Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* Delinquent MSMEs Warning */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1.15rem 1.25rem',
                  border: '1px solid #E2E8F0',
                  borderLeft: '4px solid #DC2626',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#991B1B' }}>
                      DELINQUENT MSMES (RA 7160)
                    </span>
                    <AlertTriangle size={15} color="#DC2626" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: '#991B1B', lineHeight: 1.1 }}>
                    {loading ? '…' : fmt(stats?.delinquent_count)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '0.35rem' }}>
                    Past Jan 20 · Mandatory 25% statutory surcharge applied
                  </div>
                  <div style={{ marginTop: '0.65rem' }}>
                    <Link to="/admin/analytics" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: '#991B1B',
                      fontSize: '11.5px',
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
                  borderRadius: '10px',
                  padding: '1.15rem 1.25rem',
                  border: '1px solid #E2E8F0',
                  borderLeft: '4px solid #D97706',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400E' }}>
                      EXPIRING SOON (DECEMBER)
                    </span>
                    <Clock size={15} color="#D97706" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: '#92400E', lineHeight: 1.1 }}>
                    {loading ? '…' : fmt(stats?.expiring_soon_count)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '0.35rem' }}>
                    Expires Dec 31 · Pre-renewal watch & advisory dispatch
                  </div>
                  <div style={{ marginTop: '0.65rem' }}>
                    <Link to="/admin/analytics" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: '#92400E',
                      fontSize: '11.5px',
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
              
              {/* 1. 2x2 Restrained Municipal KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                
                {/* Top Left: MSME Registry */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  border: '1px solid #E2E8F0',
                  borderTop: '3px solid #15803D',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      MSME Registry
                    </span>
                    <Building2 size={16} color="#15803D" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: '0.25rem 0' }}>
                    {loading ? '…' : fmt(stats?.total_businesses)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                    Business profiles on record
                  </div>
                </div>

                {/* Top Right: Pending Review */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  border: '1px solid #E2E8F0',
                  borderTop: '3px solid #D97706',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Pending Review
                    </span>
                    <ClipboardCheck size={16} color="#D97706" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: '#B45309', margin: '0.25rem 0' }}>
                    {loading ? '…' : fmt(stats?.pending_pre_assessments)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                    Submitted & awaiting review
                  </div>
                </div>

                {/* Bottom Left: Prep Verified */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  border: '1px solid #E2E8F0',
                  borderTop: '3px solid #166534',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Prep Verified
                    </span>
                    <CheckCircle size={16} color="#15803D" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: '#166534', margin: '0.25rem 0' }}>
                    {loading ? '…' : fmt(stats?.verified_pre_assessments)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                    BPLO-01 pre-assessment ready
                  </div>
                </div>

                {/* Bottom Right: Today's Walk-ins */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  border: '1px solid #E2E8F0',
                  borderTop: '3px solid #1E40AF',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Today's Walk-ins
                    </span>
                    <Ticket size={16} color="#1E40AF" />
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: '#1E40AF', margin: '0.25rem 0' }}>
                    {loading ? '…' : fmt(stats?.todays_walkin_count)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                    <span className="tabular-nums" style={{ color: '#15803D', fontWeight: 700 }}>{fmt(stats?.todays_attended_count)}</span> sighted at Window 1
                  </div>
                </div>

              </div>

              {/* 2. Donut Municipal Readiness Radar */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                padding: '1.35rem 1.5rem',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={16} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
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
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Reqs Tracked</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>
                      {fmt(stats?.total_requirements)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'right' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Assessed MSMEs</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 800, color: '#15803D', marginTop: '0.15rem' }}>
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
              borderRadius: '10px',
              padding: '1.35rem 1.5rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={17} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Common Missing Clearances
                    </h3>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      Top statutory prerequisites delaying MSME readiness
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#FEF2F2', color: '#991B1B', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
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
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{
                          width: '22px', height: '22px', borderRadius: '5px',
                          backgroundColor: '#FEE2E2', color: '#DC2626',
                          fontSize: '11px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                          {item.permit_name}
                        </span>
                      </div>
                      <span className="tabular-nums" style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#991B1B',
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
              borderRadius: '10px',
              padding: '1.35rem 1.5rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarCheck size={17} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Walk-in Roster & Window 1 Control
                    </h3>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      Counter scheduling & fast-track administrative actions
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                    <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: 800, color: '#1E40AF' }}>{loading ? '…' : fmt(stats?.todays_walkin_count)}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.15rem' }}>Scheduled Today</div>
                  </div>
                  <div style={{ backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', border: '1px solid #DCFCE7' }}>
                    <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: 800, color: '#15803D' }}>{loading ? '…' : fmt(stats?.todays_attended_count)}</div>
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '0.15rem' }}>Sighted ✓</div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '1rem', padding: '0.5rem 0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span className="tabular-nums" style={{ fontWeight: 700, color: '#1E40AF' }}>{loading ? '…' : fmt(stats?.week_walkins_scheduled)}</span> walk-in appointments this week (7-day window)
                </div>
              </div>

              {/* Quick Navigation Action Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                <Link to="/admin/applications" style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem', borderRadius: '6px',
                  backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 700
                }}>
                  <ClipboardCheck size={14} /> Form BPLO-01
                </Link>
                <Link to="/admin/walkins" style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem', borderRadius: '6px',
                  backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #DBEAFE',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 700
                }}>
                  <Calendar size={14} /> Walk-in Roster
                </Link>
                <Link to="/requirements" style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem', borderRadius: '6px',
                  backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 700
                }}>
                  <Scale size={14} color="#15803D" /> Requirements
                </Link>
                <Link to="/admin/analytics" style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem', borderRadius: '6px',
                  backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 700
                }}>
                  <BarChart2 size={14} color="#15803D" /> Reports
                </Link>
              </div>

            </div>

          </div>

          {/* ════ ROW 3: MUNICIPAL REQUIREMENTS MASTERLIST BANNER ════ */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.15rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Scale size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                  Municipal Requirements Masterlist — <span className="tabular-nums" style={{ color: '#15803D' }}>{loading ? '…' : fmt(stats?.configured_requirements)} Clearances Configured</span>
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
              backgroundColor: '#15803D',
              color: '#FFFFFF',
              borderRadius: '6px',
              padding: '0.55rem 1.05rem',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none'
            }}>
              <Scale size={15} /> Manage Clearances
            </Link>
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
