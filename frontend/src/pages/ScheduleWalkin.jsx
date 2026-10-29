import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { LanguageContext } from '../context/LanguageContext';
import {
  Calendar, Clock, Ticket, CheckCircle2, AlertCircle, Building2,
  FileText, ShieldCheck, Printer, Download, MapPin, ArrowRight,
  Info, Sparkles, Send, Check, Bell, X
} from 'lucide-react';
import UnifiedApplicationFormView from '../components/UnifiedApplicationFormView';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

export default function ScheduleWalkin() {
  const { user, token } = useContext(AuthContext);
  const { businesses: contextBusinesses, loadingBusinesses: contextLoadingBiz } = useContext(BusinessContext);
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';

  // Helper to reliably retrieve current auth token
  const getAuthToken = () => {
    return token || user?.token || JSON.parse(localStorage.getItem('user') || '{}')?.token || '';
  };

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [loadingBiz, setLoadingBiz] = useState(true);

  // Active appointment / application state
  const [activeApp, setActiveApp] = useState(null);
  const [loadingApp, setLoadingApp] = useState(false);

  // Form inputs
  const [walkinDate, setWalkinDate] = useState('');
  const [walkinSlot, setWalkinSlot] = useState('Morning (8:00 AM - 11:00 AM)');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewingForm, setPreviewingForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Calculate minimum selectable date (next business day, skipping weekend)
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2); // Saturday -> Monday
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sunday -> Monday
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const minDateStr = getMinDate();

  // 1. Sync businesses from context or fetch directly with fresh token
  useEffect(() => {
    if (contextBusinesses && contextBusinesses.length > 0) {
      setBusinesses(contextBusinesses);
      setSelectedBizId(prev => prev || String(contextBusinesses[0].id));
      setLoadingBiz(false);
      return;
    }

    const activeToken = getAuthToken();
    if (!activeToken) {
      setLoadingBiz(contextLoadingBiz);
      return;
    }

    axios.get(`${API}/businesses`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setBusinesses(list);
        if (list.length > 0) {
          setSelectedBizId(prev => prev || String(list[0].id));
        }
        setLoadingBiz(false);
      })
      .catch(() => setLoadingBiz(false));
  }, [contextBusinesses, contextLoadingBiz, token, user]);

  // 2. Fetch active application for selected business
  const fetchActiveApp = useCallback(() => {
    if (!selectedBizId) return;
    const activeToken = getAuthToken();
    if (!activeToken) return;

    setLoadingApp(true);
    axios.get(`${API}/applications`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find(a => String(a.business_id) === String(selectedBizId) && a.status !== 'CANCELLED');
        setActiveApp(match || null);
        if (match?.walkin_date) {
          const dateOnly = typeof match.walkin_date === 'string' ? match.walkin_date.split('T')[0] : '';
          setWalkinDate(dateOnly);
          if (match.walkin_time_slot) setWalkinSlot(match.walkin_time_slot);
        }
        setLoadingApp(false);
      })
      .catch(() => setLoadingApp(false));
  }, [selectedBizId, token, user]);

  useEffect(() => {
    fetchActiveApp();
  }, [fetchActiveApp]);

  const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId)) || businesses[0];

  // 3. Handle submit preferred visit date
  const handleSubmitDate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedBizId) {
      setErrorMsg(isTl ? 'Pumili muna ng profile ng negosyo.' : 'Please select a business profile first.');
      return;
    }

    if (!walkinDate) {
      setErrorMsg(isTl ? 'Pumili ng petsa ng pagbisita.' : 'Please select your preferred visit date.');
      return;
    }

    // Accurate local day-of-week validation
    const [y, m, d] = walkinDate.split('-').map(Number);
    const selectedDate = new Date(y, m - 1, d);
    const day = selectedDate.getDay();
    if (day === 0 || day === 6) {
      setErrorMsg(isTl 
        ? 'Lunes hanggang Biyernes lamang ang opisina ng Munisipyo (sarado tuwing Sabado at Linggo).' 
        : 'Roxas Municipal Hall is open Monday to Friday only (closed on weekends).');
      return;
    }

    const activeToken = getAuthToken();
    if (!activeToken) {
      setErrorMsg(isTl ? 'Mangyaring mag-log in muli.' : 'Session expired. Please log in again.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post(`${API}/applications/schedule-walkin-by-business`, {
        business_id: Number(selectedBizId) || selectedBizId,
        walkin_date: walkinDate,
        walkin_time_slot: walkinSlot
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      // Optimistically update activeApp so user immediately sees their ticket
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

      // Notify header bell icon to update count
      window.dispatchEvent(new Event('notificationUpdate'));

      setSuccessMsg(isTl 
        ? `Naisumite ang petsa para sa ${selectedBiz?.business_name || 'iyong negosyo'}! Pakisuri ang checklist sa ibaba.`
        : `Preferred visit date submitted for ${selectedBiz?.business_name || 'your business'}! Please check your preparation checklist below.`);
      
      fetchActiveApp();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit visit date. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadRoutingSlip = async () => {
    if (!activeApp?.id) return;
    const activeToken = getAuthToken();
    try {
      const res = await fetch(`${API}/applications/${activeApp.id}/preparation-summary`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) {
        alert('Failed to download routing slip.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (selectedBiz?.business_name || 'Business').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `PermitEase_RoutingSlip_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download routing slip.');
    }
  };

  const statusCfg = {
    PENDING: {
      label: isTl ? 'Naghihintay ng Kumpirmasyon ng BPLO' : 'Awaiting BPLO Confirmation',
      desc: isTl ? 'Sinusuri ng BPLO ang kapasidad ng pila para sa piniling araw.' : 'BPLO officers are verifying queue capacity and availability for your requested slot.',
      bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', dot: '#D97706'
    },
    SCHEDULED: {
      label: isTl ? 'Nai-schedule na (Awaiting BPLO Review)' : 'Scheduled — Pending BPLO Review',
      desc: isTl ? 'Nakatakda ang iyong slot sa Window 1.' : 'Your appointment slot is logged. Please bring your complete physical folder.',
      bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', dot: '#3B82F6'
    },
    CONFIRMED: {
      label: isTl ? 'Kumpirmado ng BPLO — Naka-reserba ang Slot' : 'Confirmed by BPLO — Slot Secured',
      desc: isTl ? 'Opisyal nang kumpirmado ng BPLO ang iyong walk-in slot. Pumunta sa Roxas Municipal Hall sa takdang oras.' : 'BPLO has officially checked availability and confirmed your slot at Window 1.',
      bg: '#DCFCE7', color: '#166534', border: '#BBF7D0', dot: '#16A34A'
    },
    ATTENDED: {
      label: isTl ? 'Nakarating na / Nasuri ang Dokumento' : 'Arrival Recorded — Documents Sighted',
      desc: isTl ? 'Nasuri na ng BPLO Officer ang iyong physical packet sa Window 1.' : 'Window 1 counter officer has verified your folder and forwarded you to Treasury Cashier.',
      bg: '#F0FDF4', color: '#14532D', border: '#86EFAC', dot: '#22C55E'
    }
  };

  const currentStatus = activeApp?.walkin_status ? (statusCfg[activeApp.walkin_status] || statusCfg.PENDING) : null;

  return (
    <div className="page-container schedule-walkin-page" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── MINIMALIST HEADER ────────────────────────────────────────────── */}
      <header className="no-print" style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
          Schedule Walk-in Appointment
        </h1>
        <p style={{ color: '#64748B', fontSize: '14.5px', margin: '0 0 1.25rem' }}>
          {isTl 
            ? 'Piliin ang iyong nais na petsa ng pagbisita para sa Window 1 sa Munisipyo ng Roxas.' 
            : 'Submit your preferred visit date for Window 1 fast-track counter at Roxas Municipal Hall.'}
        </p>

        {/* Minimalist Profile Selector + Barangay/Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {loadingBiz ? (
            <span style={{ fontSize: '13px', color: '#64748B' }}>Loading profiles...</span>
          ) : businesses.length === 0 ? (
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              No business registered. <Link to="/onboarding" style={{ color: '#15803D', fontWeight: 600 }}>Create one now &rarr;</Link>
            </span>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedBizId}
                onChange={(e) => {
                  setSelectedBizId(e.target.value);
                  setPreviewingForm(false);
                }}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  padding: '0.45rem 2.25rem 0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.business_name} ({b.business_type || b.industry_category || 'Retail'})
                  </option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B', fontSize: '11px' }}>
                ▼
              </span>
            </div>
          )}

          {selectedBiz && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #E2E8F0',
              fontSize: '12.5px',
              fontWeight: 600
            }}>
              <span>Barangay: <strong style={{ color: '#0F172A' }}>{selectedBiz.barangay || 'Poblacion'}</strong></span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span style={{ color: '#15803D' }}>{selectedBiz.business_status || 'New Application'}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── ALERTS ───────────────────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', color: '#991B1B', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', color: '#166534', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── TWO-COLUMN WORKFLOW LAYOUT ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>

        {/* ── LEFT COLUMN: COMBINED APPOINTMENT BOOKING & CHECKLIST CARD ──── */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          
          {/* STEP 1: SUBMIT PREFERRED VISIT DATE */}
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '0.35rem' }}>
            Step 1: Appointment Scheduling
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.4rem' }}>
            {isTl ? 'Pumili ng Petsa ng Pagbisita' : 'Submit Preferred Visit Date'}
          </h2>

          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
            {isTl 
              ? 'Lunes hanggang Biyernes lamang ang serbisyo ng BPLO. Piliin ang batch time slot upang maiwasan ang pagsisiksikan sa Window 1.'
              : 'Window 1 at Roxas Municipal Hall operates in morning and afternoon batches to maintain fast 2-minute counter processing.'}
          </p>

          <form onSubmit={handleSubmitDate}>
            
            {/* Preferred Date Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Preferred Visit Date (Petsa) *
              </label>
              <input
                type="date"
                min={minDateStr}
                value={walkinDate}
                onChange={(e) => setWalkinDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11.5px', color: '#94A3B8', display: 'block', marginTop: '4px' }}>
                Open Monday to Friday • 8:00 AM – 5:00 PM (Excludes weekends & holidays)
              </span>
            </div>

            {/* Time Slot Batch Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                Batch Window (Oras) *
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[
                  {
                    slot: 'Morning (8:00 AM - 11:00 AM)',
                    title: '🌅 Morning Batch (8:00 AM – 11:00 AM)',
                    sub: 'Recommended for same-day Treasury assessment & inspection scheduling'
                  },
                  {
                    slot: 'Afternoon (1:00 PM - 4:00 PM)',
                    title: '🌇 Afternoon Batch (1:00 PM – 4:00 PM)',
                    sub: 'Ideal for rapid document verification and physical routing slip sign-off'
                  }
                ].map(item => (
                  <label
                    key={item.slot}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: walkinSlot === item.slot ? '2px solid var(--primary-green, #15803D)' : '1px solid #E2E8F0',
                      backgroundColor: walkinSlot === item.slot ? '#F0FDF4' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="walkinSlot"
                      value={item.slot}
                      checked={walkinSlot === item.slot}
                      onChange={(e) => setWalkinSlot(e.target.value)}
                      style={{ marginTop: '3px', accentColor: '#15803D' }}
                    />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {item.sub}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.8rem 1.25rem',
                fontWeight: 700,
                fontSize: '14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-green, #15803D)',
                color: '#FFFFFF',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!submitting) e.currentTarget.style.backgroundColor = '#166534';
              }}
              onMouseLeave={(e) => {
                if (!submitting) e.currentTarget.style.backgroundColor = '#15803D';
              }}
            >
              <Send size={16} />
              {submitting ? 'Submitting to BPLO...' : (activeApp?.walkin_date ? 'Update Preferred Visit Date' : 'Submit Preferred Visit Date')}
            </button>

          </form>

          {/* Sighting Notice */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <MapPin size={16} color="var(--primary-green, #15803D)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>
              <strong>Location:</strong> Window 1 (BPLO Fast-Track Counter), Ground Floor, Roxas Municipal Hall, Oriental Mindoro.
            </div>
          </div>

          {/* ── SECTION DIVIDER ── */}
          <div style={{ margin: '1.75rem 0 1.5rem', borderTop: '1px solid #F1F5F9' }} />

          {/* ── STEP 2 - PREPARATION CHECKLIST ("WHAT TO BRING") ── */}
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '0.35rem' }}>
            Step 2: Municipal Checklist
          </div>

          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.4rem' }}>
            {isTl ? 'Checklist ng mga Dadalhin sa Munisipyo' : 'Preparation Checklist (What to Bring)'}
          </h3>

          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem' }}>
            {isTl 
              ? 'Siguraduhing kumpleto ang mga sumusunod bago pumunta sa Window 1 upang masuri agad sa loob ng 2 minuto:'
              : 'Bring these physical documents in a folder to ensure 2-minute fast-track verification at Window 1:'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              {
                title: '1. Signed Form BPLO-01 (2 printed copies)',
                sub: 'Pre-filled from PermitEase with owner signature over printed name.',
                tag: 'Mandatory',
                actionText: 'Print Form',
                actionLink: () => setPreviewingForm(true)
              },
              {
                title: '2. Barangay Business Clearance',
                sub: 'Original clearance issued by the Barangay Captain where your store/office is located.',
                tag: 'Mandatory'
              },
              {
                title: '3. Business Name Certificate (DTI / SEC / CDA)',
                sub: 'DTI Certificate of Registration (Sole Prop) or SEC/CDA registration.',
                tag: 'Mandatory'
              },
              {
                title: '4. Two (2) Valid Government-Issued IDs',
                sub: 'Driver’s License, Passport, PhilID/National ID, UMID, or Voter’s ID.',
                tag: 'Mandatory'
              },
              {
                title: '5. Contract of Lease / Title of Land',
                sub: selectedBiz?.premises_type === 'Rented' ? 'Notarized Contract of Lease with lessor details.' : 'Proof of ownership (TCT or Tax Declaration) if owned.',
                tag: 'Mandatory'
              },
              {
                title: '6. Community Tax Certificate (Cedula)',
                sub: 'Current taxable year Cedula from Roxas Municipal Treasury or Barangay.',
                tag: 'Mandatory'
              }
            ].map((item, idx) => (
              <div key={idx} style={{
                padding: '0.75rem 0.9rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-green, #15803D)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      {item.sub}
                    </div>
                  </div>
                </div>

                {item.actionText && (
                  <button
                    onClick={item.actionLink}
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      color: '#166534',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#DCFCE7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F0FDF4';
                    }}
                  >
                    {item.actionText}
                  </button>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* ── RIGHT COLUMN: ACTIVE WALK-IN APPOINTMENT CARD ──── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '1.5rem' }}>

          {/* ACTIVE WALK-IN APPOINTMENT CARD */}
          {activeApp?.walkin_date ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: `1px solid ${currentStatus ? currentStatus.border : '#BBF7D0'}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              overflow: 'hidden'
            }}>
              
              {/* Ribbon */}
              <div style={{
                backgroundColor: currentStatus ? currentStatus.bg : '#F0FDF4',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${currentStatus ? currentStatus.border : '#BBF7D0'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} color={currentStatus ? currentStatus.color : '#166534'} />
                  <span style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', color: currentStatus ? currentStatus.color : '#166534', letterSpacing: '0.04em' }}>
                    Window 1 Walk-in Appointment
                  </span>
                </div>

                <span style={{
                  backgroundColor: currentStatus ? currentStatus.color : '#166534',
                  color: '#FFFFFF',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  {currentStatus ? currentStatus.label : 'Active'}
                </span>
              </div>

              {/* Card Body: Names prominently displayed instead of Ticket # */}
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Registered Business</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0F172A', letterSpacing: '0.01em', marginTop: '2px' }}>
                      {selectedBiz?.business_name || activeApp.business_name || 'Your Business'}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                      Applicant: <span style={{ color: '#0F172A' }}>{user?.full_name || selectedBiz?.owner_name || 'Business Owner'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Scheduled Date</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                      {new Date(activeApp.walkin_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--primary-green, #15803D)', fontWeight: 600 }}>
                      {activeApp.walkin_time_slot}
                    </div>
                  </div>
                </div>

                {/* Status Notice */}
                <div style={{
                  padding: '0.75rem 0.9rem',
                  backgroundColor: currentStatus ? currentStatus.bg : '#F8FAFC',
                  borderRadius: '8px',
                  border: `1px solid ${currentStatus ? currentStatus.border : '#E2E8F0'}`,
                  marginBottom: '1.25rem',
                  fontSize: '12.5px',
                  color: currentStatus ? currentStatus.color : '#334155',
                  lineHeight: 1.4
                }}>
                  <strong>BPLO Status:</strong> {currentStatus ? currentStatus.desc : 'Your visit is scheduled.'}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleDownloadRoutingSlip}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontWeight: 600,
                      fontSize: '13px',
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94A3B8'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                  >
                    <Download size={14} /> Download Routing Slip (PDF)
                  </button>

                  <button
                    onClick={() => setPreviewingForm(prev => !prev)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--primary-green, #15803D)',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#166534'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#15803D'}
                  >
                    <Printer size={14} /> {previewingForm ? 'Hide Form BPLO-01' : 'Print Pre-Filled Form'}
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px dashed #CBD5E1',
              padding: '2.5rem 1.5rem',
              textAlign: 'center'
            }}>
              <Calendar size={32} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.35rem' }}>
                No Walk-in Scheduled Yet
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Pick your preferred date on the left and submit to book your Window 1 appointment.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* ── FORM BPLO-01 LIVE PREVIEW MODAL / ACCORDION ───────────────────── */}
      {previewingForm && activeApp && (
        <div className="animate-fade-in" style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--government-navy, #0F172A)', margin: 0 }}>
              Live Form BPLO-01 Preview
            </h2>
            <button
              onClick={() => setPreviewingForm(false)}
              className="btn btn-outline btn-sm"
              style={{ fontWeight: 600 }}
            >
              Close Form Preview
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

      {/* ── SUCCESS CONFIRMATION MODAL ────────────────────────────────────── */}
      {showSuccessModal && modalData && (
        <div 
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
        >
          <div 
            className="animate-fade-in"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowSuccessModal(false)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: '0.25rem'
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>

            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16A34A', marginBottom: '0.25rem' }}>
              {isTl ? 'Matagumpay na Naisumite' : 'Submission Successful'}
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
              {isTl ? 'Nai-schedule ang Walk-in Request!' : 'Walk-in Visit Date Submitted!'}
            </h2>

            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              {isTl 
                ? 'Naisumite na sa BPLO ng Roxas Municipal Hall ang iyong piniling petsa. Isang kumpirmasyon ang naipadala sa iyong Notifications.'
                : 'Your preferred date has been submitted to Roxas BPLO. A confirmation has been sent to your Notifications.'}
            </p>

            {/* Appointment Card Box */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '2px dashed #CBD5E1',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  Window 1 Appointment Details
                </span>
                <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Awaiting BPLO Review
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', letterSpacing: '0.01em', marginBottom: '0.35rem' }}>
                {modalData.bizName}
              </div>
              <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>👤 <strong>Applicant:</strong> {modalData.ownerName}</div>
                <div>📅 <strong>Preferred Date:</strong> {new Date(modalData.date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                <div>⏰ <strong>Time Slot:</strong> {modalData.slot}</div>
                <div>📍 <strong>Location:</strong> Window 1 (Fast-Track Counter), Ground Floor, Roxas Municipal Hall</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                onClick={handleDownloadRoutingSlip}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '8px'
                }}
              >
                <Download size={16} />
                Download Routing Slip & Checklist (PDF)
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link
                  to="/notifications"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <Bell size={14} /> View Notifications
                </Link>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    color: '#64748B',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: '#F1F5F9'
                  }}
                >
                  Continue to Checklist
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
