import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { LanguageContext } from '../context/LanguageContext';
import {
  Calendar, Clock, CheckCircle2, AlertCircle,
  Printer, Download, MapPin, Info, Send, Bell, X, ChevronRight
} from 'lucide-react';
import UnifiedApplicationFormView from '../components/UnifiedApplicationFormView';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

export default function ScheduleWalkin() {
  const { user, token } = useContext(AuthContext);
  const { businesses: contextBusinesses, loadingBusinesses: contextLoadingBiz } = useContext(BusinessContext);
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';

  const getAuthToken = () =>
    token || user?.token || JSON.parse(localStorage.getItem('user') || '{}')?.token || '';

  const [businesses, setBusinesses]       = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [loadingBiz, setLoadingBiz]       = useState(true);
  const [activeApp, setActiveApp]         = useState(null);
  const [loadingApp, setLoadingApp]       = useState(false);
  const [walkinDate, setWalkinDate]       = useState('');
  const [walkinSlot, setWalkinSlot]       = useState('Morning (8:00 AM - 11:00 AM)');
  const [submitting, setSubmitting]       = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');
  const [successMsg, setSuccessMsg]       = useState('');
  const [previewingForm, setPreviewingForm]     = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalData, setModalData]               = useState(null);

  // ── Calendar state ───────────────────────────────────────────────
  const todayObj = new Date();
  const [calYear,  setCalYear]  = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth()); // 0-indexed
  const [holidayMap, setHolidayMap] = useState({}); // keyed by 'YYYY-MM-DD'
  const [loadingCal, setLoadingCal] = useState(false);

  useEffect(() => {
    const t = token || user?.token || JSON.parse(localStorage.getItem('user') || '{}')?.token || '';
    if (!t) return;
    setLoadingCal(true);
    axios.get(`${API}/schedule/month?year=${calYear}&month=${calMonth + 1}`, {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(res => {
        const map = {};
        (Array.isArray(res.data) ? res.data : []).forEach(item => {
          map[item.date] = { type: item.day_type, label: item.label };
        });
        setHolidayMap(map);
      })
      .catch(() => setHolidayMap({})) // degrade gracefully
      .finally(() => setLoadingCal(false));
  }, [calYear, calMonth, token, user]);

  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const minDateStr = getMinDate();

  useEffect(() => {
    if (contextBusinesses && contextBusinesses.length > 0) {
      setBusinesses(contextBusinesses);
      setSelectedBizId(prev => prev || String(contextBusinesses[0].id));
      setLoadingBiz(false);
      return;
    }
    const t = getAuthToken();
    if (!t) { setLoadingBiz(contextLoadingBiz); return; }
    axios.get(`${API}/businesses`, { headers: { Authorization: `Bearer ${t}` } })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setBusinesses(list);
        if (list.length > 0) setSelectedBizId(prev => prev || String(list[0].id));
        setLoadingBiz(false);
      })
      .catch(() => setLoadingBiz(false));
  }, [contextBusinesses, contextLoadingBiz, token, user]);

  const fetchActiveApp = useCallback(() => {
    if (!selectedBizId) return;
    const t = getAuthToken();
    if (!t) return;
    setLoadingApp(true);
    axios.get(`${API}/applications`, { headers: { Authorization: `Bearer ${t}` } })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find(a => String(a.business_id) === String(selectedBizId) && a.status !== 'CANCELLED');
        setActiveApp(match || null);
        if (match?.walkin_date) {
          setWalkinDate(typeof match.walkin_date === 'string' ? match.walkin_date.split('T')[0] : '');
          if (match.walkin_time_slot) setWalkinSlot(match.walkin_time_slot);
        }
        setLoadingApp(false);
      })
      .catch(() => setLoadingApp(false));
  }, [selectedBizId, token, user]);

  useEffect(() => { fetchActiveApp(); }, [fetchActiveApp]);

  const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId)) || businesses[0];

  const handleSubmitDate = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!selectedBizId) { setErrorMsg('Please select a business profile first.'); return; }
    if (!walkinDate)    { setErrorMsg('Please select your preferred visit date.'); return; }
    const [y, m, d] = walkinDate.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0 || dow === 6) {
      setErrorMsg('Roxas Municipal Hall is open Monday to Friday only (closed on weekends).');
      return;
    }
    const t = getAuthToken();
    if (!t) { setErrorMsg('Session expired. Please log in again.'); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/applications/schedule-walkin-by-business`, {
        business_id: Number(selectedBizId) || selectedBizId,
        walkin_date: walkinDate,
        walkin_time_slot: walkinSlot
      }, { headers: { Authorization: `Bearer ${t}` } });

      if (res.data) {
        const newApp = {
          ...(activeApp || {}),
          id: res.data.application_id || activeApp?.id,
          queue_ticket_number: res.data.queue_ticket_number,
          walkin_date: res.data.walkin_date,
          walkin_time_slot: res.data.walkin_time_slot,
          walkin_status: res.data.walkin_status || 'PENDING'
        };
        setActiveApp(newApp);
        setModalData({
          date: res.data.walkin_date,
          slot: res.data.walkin_time_slot,
          bizName: selectedBiz?.business_name || 'Your Business',
          ownerName: user?.full_name || selectedBiz?.owner_name || 'Business Owner',
          appId: res.data.application_id || activeApp?.id
        });
        setShowSuccessModal(true);
      }
      window.dispatchEvent(new Event('notificationUpdate'));
      setSuccessMsg(`Preferred visit date submitted for ${selectedBiz?.business_name || 'your business'}!`);
      fetchActiveApp();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit visit date. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleDownloadRoutingSlip = async () => {
    if (!activeApp?.id) return;
    const t = getAuthToken();
    try {
      const res = await fetch(`${API}/applications/${activeApp.id}/preparation-summary`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (!res.ok) { alert('Failed to download routing slip.'); return; }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `PermitEase_RoutingSlip_${(selectedBiz?.business_name || 'Business').replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download routing slip.'); }
  };

  const statusCfg = {
    PENDING: {
      label: isTl ? 'Naghihintay ng Kumpirmasyon ng BPLO' : 'Awaiting BPLO Confirmation',
      desc:  isTl ? 'Sinusuri ng mga opisyal ng BPLO ang kapasidad ng pila para sa iyong hiniling na slot.' : 'BPLO officers are verifying queue capacity for your requested slot.',
      nextTip: isTl ? 'Karaniwang sinusuri ng BPLO ang mga kahilingan sa loob ng 1 araw ng trabaho. Subaybayan ang iyong mga Notipikasyon.' : 'BPLO typically reviews date requests within 1 business day. Watch your Notifications for updates.',
      bg: '#FEF3C7', color: '#92400E', border: '#FDE68A'
    },
    SCHEDULED: {
      label: isTl ? 'Nai-schedule — Kasalukuyang Sinusuri ng BPLO' : 'Scheduled — Pending BPLO Review',
      desc:  isTl ? 'Nai-record na ang iyong appointment slot. Mangyaring ihanda ang iyong kumpletong pisikal na folder.' : 'Your appointment slot is logged. Please prepare your complete physical folder.',
      nextTip: isTl ? 'Nai-record na ang iyong slot. Hintayin ang opisyal na kumpirmasyon ng BPLO habang kinukumpleto ang mga dokumento.' : 'Your slot is recorded. Await official BPLO confirmation. Continue gathering your documents.',
      bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE'
    },
    CONFIRMED: {
      label: isTl ? 'Kinumpirma ng BPLO — Nareserba ang Slot' : 'Confirmed by BPLO — Slot Secured',
      desc:  isTl ? 'Kinumpirma na ng BPLO ang iyong slot sa Window 1. Dalhin ang iyong folder ng dokumento sa itinakdang araw.' : 'BPLO has confirmed your Window 1 slot. Bring your complete document folder on the scheduled day.',
      nextTip: isTl ? "Handa na ang lahat! Dumating sa Window 1 bago ang iyong oras ng slot. Tumatagal lamang ng ~2 minuto ang proseso." : "You're all set! Arrive at Window 1 a few minutes before your time slot. Processing takes ~2 minutes.",
      bg: '#DCFCE7', color: '#166534', border: '#BBF7D0'
    },
    ATTENDED: {
      label: isTl ? 'Naitala ang Pagdating — Nasuri ang mga Dokumento' : 'Arrival Recorded — Documents Sighted',
      desc:  isTl ? 'Naberipika na ng opisyal sa Window 1 ang iyong folder at ipinasa ka na sa Ingat-Yaman (Treasury).' : 'Window 1 officer has verified your folder and forwarded you to the Treasury Cashier.',
      nextTip: isTl ? 'Pumunta sa Cashier ng Munisipyo upang magbayad ng mga bayarin sa permit. Dalhin ang iyong routing slip bilang patunay.' : 'Proceed to the Treasury Cashier to pay your permit fees. Keep your routing slip as reference.',
      bg: '#F0FDF4', color: '#14532D', border: '#86EFAC'
    }
  };

  const currentStatus = activeApp?.walkin_status
    ? (statusCfg[activeApp.walkin_status] || statusCfg.PENDING)
    : null;

  const whatNextTip = currentStatus?.nextTip || (
    activeApp?.walkin_date
      ? (isTl ? 'Ihanda ang iyong mga dokumento habang naghihintay ng kumpirmasyon ng BPLO.' : 'Prepare your documents while awaiting BPLO confirmation.')
      : (isTl ? 'Pumili ng nais na petsa ng pagbisita at isumite upang makapagpareserba ng slot sa Window 1.' : 'Pick your preferred visit date and submit to reserve a slot at Window 1.')
  );

  const bringItems = [
    {
      title: isTl ? 'Nilagdaang Form BPLO-01 (2 printed na kopya)' : 'Signed Form BPLO-01 (2 printed copies)',
      sub: isTl ? 'Pre-filled mula sa PermitEase. Lagdaan sa ibabaw ng nakalimbag na pangalan.' : 'Pre-filled from PermitEase. Sign over printed name.',
      action: true
    },
    {
      title: isTl ? 'Barangay Business Clearance' : 'Barangay Business Clearance',
      sub: isTl ? 'Orihinal na clearance mula sa Punong Barangay ng lokasyon ng iyong negosyo.' : 'Original clearance from the Barangay Captain of your business location.'
    },
    {
      title: isTl ? 'Sertipiko ng Rehistro ng Negosyo (DTI / SEC / CDA)' : 'Business Name Certificate (DTI / SEC / CDA)',
      sub: isTl ? 'DTI (Sole Prop), SEC Articles of Incorporation, o rehistro sa CDA.' : 'DTI (Sole Prop), SEC Articles of Incorporation, or CDA registration.'
    },
    {
      title: isTl ? 'Dalawang (2) Valid na ID mula sa Pamahalaan' : 'Two (2) Valid Government-Issued IDs',
      sub: isTl ? "Lisensya sa Pagmamaneho, Pasaporte, PhilID, UMID, o Voter's ID." : "Driver's License, Passport, PhilID, UMID, or Voter's ID."
    },
    {
      title: selectedBiz?.premises_type === 'Rented'
        ? (isTl ? 'Notaryadong Kontrata ng Upa (Contract of Lease)' : 'Notarized Contract of Lease')
        : (isTl ? 'Patunay ng Pagmamay-ari (TCT / Tax Declaration)' : 'Proof of Ownership (TCT / Tax Declaration)'),
      sub: selectedBiz?.premises_type === 'Rented'
        ? (isTl ? 'Notaryadong kontrata kasama ang mga detalye ng nagpapaupa.' : 'Notarized lease with lessor details and term.')
        : (isTl ? 'Transfer Certificate of Title o Tax Declaration ng ari-arian.' : 'Transfer Certificate of Title or Tax Declaration of your property.')
    },
    {
      title: isTl ? 'Sedula (Community Tax Certificate)' : 'Community Tax Certificate (Cedula)',
      sub: isTl ? 'Kasalukuyang taong Sedula mula sa Ingat-Yaman ng Roxas o iyong Barangay.' : 'Current-year Cedula from Roxas Municipal Treasury or your Barangay.'
    }
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // Inline WalkinCalendar component
  // ────────────────────────────────────────────────────────────────────────────
  const EN_MONTHS = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
  const TL_MONTHS = ['Enero','Pebrero','Marso','Abril','Mayo','Hunyo',
                     'Hulyo','Agosto','Setyembre','Oktubre','Nobyembre','Disyembre'];
  const EN_DAYS   = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  const TL_DAYS   = ['Lu','Ma','Mi','Hu','Bi','Sa','Li'];

  const monthName  = (isTl ? TL_MONTHS : EN_MONTHS)[calMonth];
  const dayHeaders = isTl ? TL_DAYS : EN_DAYS;

  // First day of viewed month (0=Sun … 6=Sat), converted to Mon-based offset
  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // shift so Mon=0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Today at midnight for comparison
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const fmtDate = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getDayClass = (day) => {
    const dateStr = fmtDate(calYear, calMonth, day);
    const cellDate = new Date(calYear, calMonth, day);
    const dow = cellDate.getDay(); // 0=Sun 6=Sat

    if (cellDate <= todayMidnight) return 'wc-past';
    if (dow === 0 || dow === 6)    return 'wc-weekend';

    const entry = holidayMap[dateStr];
    if (entry?.type === 'holiday')            return 'wc-holiday';
    if (entry?.type === 'special_nonworking') return 'wc-special';
    if (entry?.type === 'bplo_closed')        return 'wc-closed';
    return 'wc-available';
  };

  const isSelectable = (cls) => cls === 'wc-available';

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const WalkinCalendar = () => {
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // pad to full grid rows
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div style={{ userSelect: 'none' }}>
        {/* Month nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.85rem'
        }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: '1px solid #E2E8F0', background: '#F8FAFC',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '14px', color: '#475569',
              fontWeight: 700
            }}
          >‹</button>

          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
            {monthName} {calYear}
            {loadingCal && <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>loading…</span>}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: '1px solid #E2E8F0', background: '#F8FAFC',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '14px', color: '#475569',
              fontWeight: 700
            }}
          >›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
          {dayHeaders.map((d, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: '11px', fontWeight: 700,
              color: i >= 5 ? '#94A3B8' : '#64748B',
              paddingBottom: '4px'
            }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />;
            const dateStr = fmtDate(calYear, calMonth, day);
            const cls     = getDayClass(day);
            const sel     = isSelectable(cls);
            const chosen  = walkinDate === dateStr;
            const entry   = holidayMap[dateStr];
            const tooltip = entry?.label || (cls === 'wc-weekend' ? (isTl ? 'Sarado (Weekend)' : 'Closed (Weekend)')
                          : cls === 'wc-past' ? (isTl ? 'Nakalipas na petsa' : 'Past date') : '');

            // Style per class
            const styleMap = {
              'wc-available': { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', cursor: 'pointer' },
              'wc-holiday':   { bg: '#FEF9C3', color: '#92400E', border: '#FDE68A', cursor: 'not-allowed' },
              'wc-special':   { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', cursor: 'not-allowed' },
              'wc-closed':    { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA', cursor: 'not-allowed' },
              'wc-weekend':   { bg: '#F8FAFC', color: '#CBD5E1', border: '#E2E8F0', cursor: 'default' },
              'wc-past':      { bg: '#F8FAFC', color: '#CBD5E1', border: '#E2E8F0', cursor: 'default' },
            };
            const s = styleMap[cls] || styleMap['wc-past'];

            return (
              <div
                key={idx}
                title={tooltip}
                onClick={() => { if (sel) setWalkinDate(dateStr); }}
                style={{
                  height: '36px', borderRadius: '7px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: chosen ? 800 : 600,
                  cursor: s.cursor,
                  backgroundColor: chosen ? '#15803D' : s.bg,
                  color:           chosen ? '#FFFFFF'  : s.color,
                  border: chosen ? '2px solid #166534' : `1px solid ${s.border}`,
                  boxShadow: chosen ? '0 2px 6px rgba(21,128,61,0.3)' : 'none',
                  transition: 'all 0.12s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (sel && !chosen) {
                    e.currentTarget.style.backgroundColor = '#DCFCE7';
                    e.currentTarget.style.borderColor = '#86EFAC';
                  }
                }}
                onMouseLeave={e => {
                  if (sel && !chosen) {
                    e.currentTarget.style.backgroundColor = s.bg;
                    e.currentTarget.style.borderColor = s.border;
                  }
                }}
              >
                {day}
                {/* Dot indicator for holiday/closed */}
                {(cls === 'wc-holiday' || cls === 'wc-special' || cls === 'wc-closed') && (
                  <span style={{
                    position: 'absolute', bottom: '3px',
                    width: '4px', height: '4px', borderRadius: '50%',
                    backgroundColor: s.color
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.65rem',
          marginTop: '0.85rem', paddingTop: '0.75rem',
          borderTop: '1px solid #F1F5F9'
        }}>
          {[
            { cls: 'wc-available', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0',
              label: isTl ? 'Available' : 'Available' },
            { cls: 'wc-holiday',   bg: '#FEF9C3', color: '#92400E', border: '#FDE68A',
              label: isTl ? 'Pista Opisyal' : 'Holiday' },
            { cls: 'wc-special',   bg: '#FEF3C7', color: '#B45309', border: '#FDE68A',
              label: isTl ? 'Espesyal na Araw' : 'Special Day' },
            { cls: 'wc-closed',    bg: '#FEE2E2', color: '#991B1B', border: '#FECACA',
              label: isTl ? 'Sarado (BPLO)' : 'BPLO Closed' },
            { cls: 'wc-weekend',   bg: '#F8FAFC', color: '#CBD5E1', border: '#E2E8F0',
              label: isTl ? 'Weekend' : 'Weekend' },
          ].map(item => (
            <div key={item.cls} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '4px',
                backgroundColor: item.bg, border: `1px solid ${item.border}`
              }} />
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Selected date display */}
        {walkinDate && (
          <div style={{
            marginTop: '0.85rem', padding: '0.6rem 0.85rem',
            backgroundColor: '#F0FDF4', borderRadius: '8px',
            border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span style={{ fontSize: '16px' }}>📅</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
              {isTl ? 'Napiling Petsa: ' : 'Selected Date: '}
              {new Date(walkinDate + 'T00:00:00').toLocaleDateString(
                isTl ? 'fil-PH' : 'en-PH',
                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </span>
          </div>
        )}
      </div>
    );
  };
  // ── end WalkinCalendar ──────────────────────────────────────────────────────

  return (
    <div
      className="page-container schedule-walkin-page"
      style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'Inter, sans-serif' }}
    >

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="no-print" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.3rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
          {isTl ? 'Mag-iskedyul ng Pagbisita (Walk-In)' : 'Schedule Walk-In Appointment'}
        </h1>
        <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 1.25rem' }}>
          {isTl
            ? 'Mag-book ng slot sa Window 1 Fast-Track Counter sa Munisipyo ng Roxas.'
            : 'Book a slot at Window 1 Fast-Track Counter, Roxas Municipal Hall.'}
        </p>

        {/* Business selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {loadingBiz ? (
            <span style={{ fontSize: '13px', color: '#64748B' }}>{isTl ? 'Ikinakarga ang mga profile...' : 'Loading profiles...'}</span>
          ) : businesses.length === 0 ? (
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              {isTl ? 'Walang nakarehistrong negosyo.' : 'No business registered.'}{' '}
              <Link to="/onboarding" style={{ color: '#15803D', fontWeight: 600 }}>{isTl ? 'Gumawa ngayon →' : 'Create one now →'}</Link>
            </span>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedBizId}
                onChange={e => { setSelectedBizId(e.target.value); setPreviewingForm(false); }}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  padding: '0.45rem 2.25rem 0.45rem 0.85rem',
                  borderRadius: '8px', border: '1px solid #D1D5DB',
                  fontWeight: 600, color: '#0F172A', backgroundColor: '#FFFFFF',
                  fontSize: '13.5px', cursor: 'pointer', outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.business_name} ({b.business_type || b.industry_category || 'Retail'})
                  </option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B', fontSize: '11px' }}>▼</span>
            </div>
          )}
          {selectedBiz && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.35rem 0.75rem', borderRadius: '999px',
              backgroundColor: '#F8FAFC', color: '#475569',
              border: '1px solid #E2E8F0', fontSize: '12.5px', fontWeight: 600
            }}>
              <MapPin size={12} color="#64748B" />
              <span>Brgy. <strong style={{ color: '#0F172A' }}>{selectedBiz.barangay || 'Poblacion'}</strong></span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span style={{ color: '#15803D' }}>
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
      </header>

      {/* ── ALERTS ─────────────────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} /><span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#166534', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} /><span>{successMsg}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SINGLE CARD FLOW CONTAINER                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>

        {/* ── SECTION 0: ACTIVE APPOINTMENT SUMMARY (IF BOOKED) ─────────── */}
        {activeApp?.walkin_date ? (
          <div style={{ borderBottom: '1px solid #E2E8F0' }}>
            {/* Header ribbon */}
            <div style={{
              backgroundColor: currentStatus?.bg || '#F0FDF4',
              padding: '1rem 1.75rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
              borderBottom: `1px solid ${currentStatus?.border || '#BBF7D0'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} color={currentStatus?.color || '#166534'} />
                <span style={{
                  fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase',
                  color: currentStatus?.color || '#166534', letterSpacing: '0.05em'
                }}>
                  {isTl ? 'Kasalukuyang Appointment sa Window 1' : 'Current Window 1 Appointment'}
                </span>
              </div>
              <span style={{
                backgroundColor: currentStatus?.color || '#166534',
                color: '#FFFFFF', padding: '0.25rem 0.8rem',
                borderRadius: '999px', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.02em'
              }}>
                {currentStatus?.label || (isTl ? 'Aktibo' : 'Active')}
              </span>
            </div>

            {/* Appointment Details Body */}
            <div style={{ padding: '1.5rem 1.75rem', backgroundColor: '#FBFCFD' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>
                    {isTl ? 'Nakarehistrong Negosyo' : 'Registered Business'}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>
                    {selectedBiz?.business_name || activeApp.business_name || (isTl ? 'Iyong Negosyo' : 'Your Business')}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                    {user?.full_name || selectedBiz?.owner_name || (isTl ? 'May-ari ng Negosyo' : 'Business Owner')}
                  </div>
                </div>

                {/* Date & Batch display tiles */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{
                    backgroundColor: '#FFFFFF', borderRadius: '10px',
                    border: '1px solid #E2E8F0', padding: '0.75rem 1.15rem', minWidth: '140px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
                      {isTl ? 'Petsa ng Pagbisita' : 'Visit Date'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      {new Date(activeApp.walkin_date).toLocaleDateString(isTl ? 'fil-PH' : 'en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {new Date(activeApp.walkin_date).getFullYear()}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#FFFFFF', borderRadius: '10px',
                    border: '1px solid #E2E8F0', padding: '0.75rem 1.15rem', minWidth: '160px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
                      {isTl ? 'Oras ng Batch' : 'Batch Window'}
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--primary-green, #15803D)' }}>
                      {activeApp.walkin_time_slot?.includes('Morning') ? (isTl ? '🌅 Umaga' : '🌅 Morning') : (isTl ? '🌇 Hapon' : '🌇 Afternoon')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {activeApp.walkin_time_slot?.includes('Morning') ? '8:00 AM – 11:00 AM' : '1:00 PM – 4:00 PM'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status advisory box */}
              <div style={{
                padding: '0.85rem 1.1rem', borderRadius: '8px',
                backgroundColor: currentStatus?.bg || '#F8FAFC',
                border: `1px solid ${currentStatus?.border || '#E2E8F0'}`,
                fontSize: '13px', color: currentStatus?.color || '#334155',
                lineHeight: 1.5, marginBottom: '1.25rem'
              }}>
                <strong>BPLO:</strong> {currentStatus?.desc || (isTl ? 'Nai-schedule na ang iyong pagbisita.' : 'Your visit is scheduled.')}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleDownloadRoutingSlip}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.45rem', fontWeight: 700, fontSize: '13.5px', padding: '0.7rem 1.25rem',
                    borderRadius: '8px', border: 'none',
                    backgroundColor: 'var(--primary-green, #15803D)', color: '#FFFFFF',
                    cursor: 'pointer', transition: 'background-color 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#166534'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15803D'}
                >
                  <Download size={14} /> {isTl ? 'I-download ang Routing Slip (PDF)' : 'Download Routing Slip (PDF)'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewingForm(prev => !prev)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.45rem', fontWeight: 600, fontSize: '13px', padding: '0.7rem 1.25rem',
                    borderRadius: '8px', border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF', color: '#0F172A',
                    cursor: 'pointer', transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#94A3B8'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#CBD5E1'}
                >
                  <Printer size={14} /> {previewingForm ? (isTl ? 'Itago ang Form BPLO-01' : 'Hide Form BPLO-01') : (isTl ? 'I-print ang Pre-Filled Form BPLO-01' : 'Print Pre-Filled Form BPLO-01')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Subtle welcome banner if no appointment yet */
          <div style={{
            padding: '1rem 1.75rem',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', gap: '0.65rem'
          }}>
            <Info size={16} color="var(--primary-green, #15803D)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#475569' }}>
              {isTl
                ? 'Wala ka pang aktibong appointment sa Window 1. Piliin ang iyong nais na petsa at oras sa ibaba upang makapagpareserba.'
                : 'No active Window 1 appointment yet. Select your preferred date and batch below to reserve your slot.'}
            </span>
          </div>
        )}

        {/* ── STEP 1: APPOINTMENT DATE & BATCH WINDOW ──────────────────── */}
        <div style={{ padding: '1.75rem' }}>
          <div style={{
            display: 'inline-block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--primary-green, #15803D)',
            backgroundColor: '#F0FDF4', padding: '0.2rem 0.6rem', borderRadius: '4px',
            marginBottom: '0.5rem'
          }}>
            {isTl ? 'HAKBANG 1: ISKEDYUL' : 'STEP 1: SCHEDULE'}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem' }}>
            {activeApp?.walkin_date
              ? (isTl ? 'Baguhin ang Petsa o Oras ng Pagbisita' : 'Update Visit Date or Time Slot')
              : (isTl ? 'Pumili ng Petsa ng Pagbisita at Batch Window' : 'Select Your Preferred Visit Date & Time')}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.55, margin: '0 0 1.5rem' }}>
            {isTl
              ? 'Lunes–Biyernes lamang ang BPLO (sarado tuwing weekend at pista opisyal). Piliin ang available na araw sa kalendaryo at ang iyong gustong batch window.'
              : 'Window 1 operates Monday to Friday (excludes weekends and official holidays). Select an available green date on the calendar, then choose your batch.'}
          </p>

          <form onSubmit={handleSubmitDate}>
            {/* Calendar picker */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '0.65rem'
              }}>
                <Calendar size={13} />
                {isTl ? 'Pumili ng Petsa sa Kalendaryo *' : 'Select Date from Calendar *'}
              </label>
              <div style={{
                border: '1px solid #E2E8F0', borderRadius: '12px',
                padding: '1rem', backgroundColor: '#FAFAFA'
              }}>
                <WalkinCalendar />
              </div>
              <input type="hidden" value={walkinDate} required />
              {!walkinDate && (
                <span style={{ fontSize: '11.5px', color: '#94A3B8', display: 'block', marginTop: '6px' }}>
                  {isTl
                    ? 'Mag-click ng available (berdeng) araw sa kalendaryo upang pumili.'
                    : 'Click an available (green) day on the calendar to select it.'}
                </span>
              )}
            </div>

            {/* Time slot radio */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '0.65rem'
              }}>
                <Clock size={13} />
                {isTl ? 'Pumili ng Batch Window *' : 'Select Batch Window *'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {[
                  {
                    slot: 'Morning (8:00 AM - 11:00 AM)',
                    emoji: '🌅',
                    title: isTl ? 'Batch sa Umaga' : 'Morning Batch',
                    time: '8:00 AM – 11:00 AM',
                    sub: isTl ? 'Pinakamainam para sa parehong-araw na pagtasa sa Treasury' : 'Best for same-day Treasury assessment'
                  },
                  {
                    slot: 'Afternoon (1:00 PM - 4:00 PM)',
                    emoji: '🌇',
                    title: isTl ? 'Batch sa Hapon' : 'Afternoon Batch',
                    time: '1:00 PM – 4:00 PM',
                    sub: isTl ? 'Mainam para sa pagberipika ng dokumento at paglagda' : 'Ideal for document verification & sign-off'
                  }
                ].map(item => (
                  <label
                    key={item.slot}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '0.9rem 1rem', borderRadius: '10px', cursor: 'pointer',
                      border: walkinSlot === item.slot
                        ? '2px solid var(--primary-green, #15803D)'
                        : '1px solid #E2E8F0',
                      backgroundColor: walkinSlot === item.slot ? '#F0FDF4' : '#FAFAFA',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="walkinSlot"
                      value={item.slot}
                      checked={walkinSlot === item.slot}
                      onChange={e => setWalkinSlot(e.target.value)}
                      style={{ marginTop: '3px', accentColor: '#15803D', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                        {item.emoji} {item.title}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--primary-green, #15803D)', fontWeight: 700, marginTop: '2px' }}>
                        {item.time}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px', lineHeight: 1.4 }}>
                        {item.sub}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.9rem 1.25rem', fontWeight: 700, fontSize: '14.5px',
                borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--primary-green, #15803D)', color: '#FFFFFF',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.75 : 1, transition: 'all 0.15s ease',
                marginBottom: '1rem',
                boxShadow: '0 2px 4px rgba(21,128,61,0.2)'
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#166534'; }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#15803D'; }}
            >
              <Send size={15} />
              {submitting
                ? (isTl ? 'Isinusumite sa BPLO…' : 'Submitting to BPLO…')
                : activeApp?.walkin_date
                  ? (isTl ? 'I-update ang Petsa ng Pagbisita' : 'Update Preferred Visit Date')
                  : (isTl ? 'Isumite ang Petsa ng Pagbisita' : 'Submit Preferred Visit Date')}
            </button>

            {/* Location footnote */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '0.25rem 0' }}>
              <MapPin size={14} color="var(--primary-green, #15803D)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                <strong>{isTl ? 'Window 1 — BPLO Fast-Track Counter' : 'Window 1 — BPLO Fast-Track Counter'}</strong>, {isTl ? 'Ground Floor, Munisipyo ng Roxas, Oriental Mindoro' : 'Ground Floor, Roxas Municipal Hall, Oriental Mindoro'}
              </span>
            </div>
          </form>
        </div>

        {/* ── DIVIDER ─────────────────────────────────────────────────── */}
        <div style={{ height: '1px', backgroundColor: '#F1F5F9' }} />

        {/* ── STEP 2: WHAT TO BRING ───────────────────────────────────── */}
        <div style={{ padding: '1.75rem' }}>
          <div style={{
            display: 'inline-block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: '#475569',
            backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '4px',
            marginBottom: '0.5rem'
          }}>
            {isTl ? 'HAKBANG 2: MGA DADALHIN' : 'STEP 2: WHAT TO BRING'}
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem' }}>
            {isTl ? 'Mga Dadalhin sa Window 1' : 'What to Bring to Window 1'}
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
            {isTl
              ? 'Ihanda ang mga sumusunod na pisikal na dokumento sa isang folder bago pumunta para sa mabilis na 2-minutong pagberipika sa counter.'
              : 'Prepare these physical documents in a folder prior to your visit for fast 2-minute verification at the counter.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {bringItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '0.75rem', padding: '0.85rem 1rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                    backgroundColor: 'var(--primary-green, #15803D)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#FFFFFF' }}>{idx + 1}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                      {item.sub}
                    </div>
                  </div>
                </div>

                {item.action && (
                  <button
                    type="button"
                    onClick={() => setPreviewingForm(true)}
                    style={{
                      flexShrink: 0, background: '#F0FDF4', border: '1px solid #BBF7D0',
                      color: '#166534', padding: '0.35rem 0.75rem', borderRadius: '6px',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap', transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#DCFCE7'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F0FDF4'}
                  >
                    <Printer size={12} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                    {isTl ? 'I-print ang Form BPLO-01' : 'Print Form BPLO-01'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── DIVIDER ─────────────────────────────────────────────────── */}
        <div style={{ height: '1px', backgroundColor: '#F1F5F9' }} />

        {/* ── STEP 3: WHAT HAPPENS NEXT (PROCESS GUIDE) ────────────────── */}
        <div style={{ padding: '1.75rem', backgroundColor: '#FAFAFA' }}>
          <div style={{
            display: 'inline-block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: '#475569',
            backgroundColor: '#E2E8F0', padding: '0.2rem 0.6rem', borderRadius: '4px',
            marginBottom: '0.5rem'
          }}>
            {isTl ? 'HAKBANG 3: GABAY' : 'STEP 3: PROCESS'}
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem' }}>
            {isTl ? 'Ano ang Mangyayari sa Roxas Municipal Hall' : 'What Happens at Roxas Municipal Hall'}
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
            {isTl
              ? 'Mabilis at walang abala ang proseso sa pamamagitan ng fast-track counter.'
              : 'The fast-track process at Window 1 is streamlined to minimize your waiting time.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1rem' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary-green, #15803D)', textTransform: 'uppercase', marginBottom: '4px' }}>
                1. {isTl ? 'Check-in sa Window 1' : 'Window 1 Check-in'}
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                {isTl
                  ? 'Ipakita ang iyong routing slip at 2 kopya ng Form BPLO-01 para sa beripikasyon sa pila.'
                  : 'Present your routing slip and 2 printed copies of Form BPLO-01 to the Window 1 officer (~2 mins).'}
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1rem' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary-green, #15803D)', textTransform: 'uppercase', marginBottom: '4px' }}>
                2. {isTl ? 'Pagsusuri ng Dokumento' : 'Document Sighting'}
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                {isTl
                  ? 'Ipapasa ang iyong mga orihinal na clearance (Barangay, DTI/SEC, Cedula, Valid IDs).'
                  : 'Physical inspection and stamping of your original clearances and supporting attachments.'}
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1rem' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary-green, #15803D)', textTransform: 'uppercase', marginBottom: '4px' }}>
                3. {isTl ? 'Bayarin sa Treasury' : 'Treasury & Permit Release'}
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                {isTl
                  ? 'Magbayad ng permit fees sa Municipal Treasury Cashier at tanggapin ang opisyal na Business Permit.'
                  : 'Proceed to the Treasury Cashier to pay assessed fees and claim your signed Mayor\'s Permit.'}
              </div>
            </div>
          </div>

          {/* Current tip */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
            padding: '0.85rem 1rem', borderRadius: '8px',
            backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0'
          }}>
            <Info size={16} color="var(--primary-green, #15803D)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12.5px', color: '#166534', lineHeight: 1.5 }}>
              <strong>{isTl ? 'Paalala: ' : 'Note: '}</strong>{whatNextTip}
            </div>
          </div>
        </div>

      </div>
      {/* ── end SINGLE CARD FLOW CONTAINER ─────────────────────────────── */}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FORM BPLO-01 PREVIEW                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {previewingForm && activeApp && (
        <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--government-navy, #0F172A)', margin: 0 }}>
              {isTl ? 'Live na Silip ng Form BPLO-01' : 'Live Form BPLO-01 Preview'}
            </h2>
            <button
              onClick={() => setPreviewingForm(false)}
              className="btn btn-outline btn-sm"
              style={{ fontWeight: 600 }}
            >
              {isTl ? 'Isara ang Silip' : 'Close Preview'}
            </button>
          </div>
          <UnifiedApplicationFormView
            app={{
              ...selectedBiz,
              application_number: activeApp.application_number,
              queue_ticket_number: activeApp.queue_ticket_number,
              walkin_date: activeApp.walkin_date,
              walkin_time_slot: activeApp.walkin_time_slot,
              application_type: activeApp.application_type || 'NEW'
            }}
            printable={true}
            showInstructions={true}
            onBack={() => setPreviewingForm(false)}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SUCCESS MODAL                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showSuccessModal && modalData && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15,23,42,0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.25rem'
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: '#FFFFFF', borderRadius: '16px',
              maxWidth: '480px', width: '100%', padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #E2E8F0', textAlign: 'center', position: 'relative'
            }}
          >
            <button
              onClick={() => setShowSuccessModal(false)}
              aria-label="Close modal"
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '0.25rem' }}
            >
              <X size={20} />
            </button>

            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              backgroundColor: '#DCFCE7', color: '#16A34A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.1rem'
            }}>
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>

            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16A34A', marginBottom: '0.25rem' }}>
              {isTl ? 'Matagumpay na Naisumite' : 'Submission Successful'}
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
              {isTl ? 'Naisumite na ang Petsa ng Pagbisita!' : 'Walk-In Date Submitted!'}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
              {isTl
                ? 'Ang iyong nais na petsa ay naipadala na sa Roxas BPLO para sa pagsusuri. May kumpirmasyong idinagdag sa iyong mga Abiso.'
                : 'Your preferred visit date has been sent to Roxas BPLO for review. A confirmation has been added to your Notifications.'}
            </p>

            <div style={{
              backgroundColor: '#F8FAFC', border: '1.5px dashed #CBD5E1',
              borderRadius: '10px', padding: '1.1rem', marginBottom: '1.25rem', textAlign: 'left'
            }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {isTl ? 'Mga Detalye ng Appointment' : 'Appointment Details'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.5rem' }}>
                {modalData.bizName}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', color: '#334155' }}>
                <div>👤 <strong>{isTl ? 'Aplikante:' : 'Applicant:'}</strong> {modalData.ownerName}</div>
                <div>📅 <strong>{isTl ? 'Petsa:' : 'Date:'}</strong> {new Date(modalData.date).toLocaleDateString(isTl ? 'fil-PH' : 'en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                <div>⏰ <strong>{isTl ? 'Batch:' : 'Batch:'}</strong> {modalData.slot}</div>
                <div>📍 <strong>{isTl ? 'Lokasyon:' : 'Location:'}</strong> {isTl ? 'Window 1, Ground Floor, Munisipyo ng Roxas' : 'Window 1, Ground Floor, Roxas Municipal Hall'}</div>
              </div>
              <div style={{ marginTop: '0.65rem', padding: '0.45rem 0.65rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '11.5px', color: '#92400E', fontWeight: 600 }}>
                {isTl ? '⏳ Naghihintay ng Kumpirmasyon ng BPLO' : '⏳ Awaiting BPLO Confirmation'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <button
                onClick={handleDownloadRoutingSlip}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', fontWeight: 700, fontSize: '14px', borderRadius: '8px' }}
              >
                <Download size={15} /> {isTl ? 'I-download ang Routing Slip at Checklist (PDF)' : 'Download Routing Slip & Checklist (PDF)'}
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link
                  to="/notifications"
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.35rem', padding: '0.65rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', color: '#334155', fontSize: '12.5px',
                    fontWeight: 600, textDecoration: 'none', backgroundColor: '#FFFFFF'
                  }}
                >
                  <Bell size={14} /> {isTl ? 'Mga Abiso' : 'Notifications'}
                </Link>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', color: '#64748B', fontSize: '12.5px',
                    fontWeight: 600, cursor: 'pointer', backgroundColor: '#F1F5F9'
                  }}
                >
                  {isTl ? 'Isara' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
