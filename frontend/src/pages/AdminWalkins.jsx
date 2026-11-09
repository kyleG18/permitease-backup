import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  Calendar, Clock, Ticket, CheckCircle2, AlertCircle, Users,
  Check, Eye, Search, Filter, RefreshCw, Printer, ShieldCheck,
  Building2, MapPin, Phone, UserCheck, ChevronLeft, ChevronRight, Edit3,
  CalendarX, CalendarCheck, X, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react';
import UnifiedApplicationFormView from '../components/UnifiedApplicationFormView';
import FormBPLOEditModal from '../components/FormBPLOEditModal';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

export default function AdminWalkins() {
  const { user, token } = useContext(AuthContext);
  const headers = { Authorization: `Bearer ${token}` };

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [rosterData, setRosterData] = useState({ summary: {}, roster: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('ALL'); // 'ALL' | 'MORNING' | 'AFTERNOON'
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONFIRMED' | 'ATTENDED'
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  // Form preview / edit modal state
  const [previewApp, setPreviewApp] = useState(null);
  const [editApp, setEditApp] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ── CLOSURE STATE ─────────────────────────────────────────────────────────
  // Closure info for the selected date
  const [closureInfo, setClosureInfo] = useState(null); // null = open, object = closed
  const [closureLoading, setClosureLoading] = useState(false);

  // Monthly calendar modal
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calMonthYear, setCalMonthYear] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [monthSchedule, setMonthSchedule] = useState([]);
  const [calLoading, setCalLoading] = useState(false);

  // Closure declaration modal
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureForm, setClosureForm] = useState({ day_type: 'bplo_closed', label: '' });
  const [closureSubmitting, setClosureSubmitting] = useState(false);

  // ── FETCH CLOSURE FOR SELECTED DATE ──────────────────────────────────────
  const loadClosureInfo = useCallback(async (date = selectedDate) => {
    setClosureLoading(true);
    try {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const res = await axios.get(`${API}/schedule/month`, {
        params: { year: y, month: m },
        headers
      });
      const entries = res.data || [];
      const hit = entries.find(e => e.date === date);
      setClosureInfo(hit || null);
    } catch {
      setClosureInfo(null);
    } finally {
      setClosureLoading(false);
    }
  }, [selectedDate, token]);

  useEffect(() => {
    loadClosureInfo(selectedDate);
  }, [selectedDate]);

  // ── FETCH MONTHLY SCHEDULE ────────────────────────────────────────────────
  const loadMonthSchedule = useCallback(async () => {
    setCalLoading(true);
    try {
      const res = await axios.get(`${API}/schedule/month`, {
        params: { year: calMonthYear.year, month: calMonthYear.month },
        headers
      });
      setMonthSchedule(res.data || []);
    } catch {
      setMonthSchedule([]);
    } finally {
      setCalLoading(false);
    }
  }, [calMonthYear, token]);

  useEffect(() => {
    if (showCalendarModal) loadMonthSchedule();
  }, [showCalendarModal, calMonthYear]);

  // ── DECLARE CLOSURE ───────────────────────────────────────────────────────
  const handleDeclareClose = async () => {
    if (!closureForm.label.trim()) {
      setActionError('Please enter a reason / label for the closure.');
      setTimeout(() => setActionError(''), 4000);
      return;
    }
    setClosureSubmitting(true);
    try {
      await axios.post(`${API}/schedule`, {
        schedule_date: selectedDate,
        day_type: closureForm.day_type,
        label: closureForm.label.trim()
      }, { headers });
      setShowClosureModal(false);
      setClosureForm({ day_type: 'bplo_closed', label: '' });
      setActionMsg(`Office declared closed on ${selectedDate}. MSMEs can no longer book this date.`);
      setTimeout(() => setActionMsg(''), 5000);
      await loadClosureInfo(selectedDate);
      if (showCalendarModal) await loadMonthSchedule();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to declare office closure.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setClosureSubmitting(false);
    }
  };

  // ── REOPEN DATE ───────────────────────────────────────────────────────────
  const handleReopen = async (date = selectedDate) => {
    try {
      await axios.delete(`${API}/schedule/${date}`, { headers });
      setActionMsg(`Office reopened on ${date}. MSMEs can now book this date.`);
      setTimeout(() => setActionMsg(''), 5000);
      setClosureInfo(null);
      if (showCalendarModal) await loadMonthSchedule();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reopen office.');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  // ── CLOSURE LABEL HELPERS ─────────────────────────────────────────────────
  const CLOSURE_TYPE_LABELS = {
    bplo_closed: 'BPLO Office Closed',
    holiday: 'Official Public Holiday',
    special_nonworking: 'Special Non-Working Day'
  };

  const CLOSURE_PRESETS = [
    'Roxas Town Fiesta',
    'Municipal Non-Working Holiday',
    'System Maintenance & Staff Workshop',
    'BPLO Staff Seminar / Training',
    'Municipal Assembly / Special Event',
  ];

  const closureTypeColor = (type) => {
    if (type === 'holiday') return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
    if (type === 'special_nonworking') return { bg: '#FFF7ED', border: '#F97316', text: '#7C2D12' };
    return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' };
  };

  // ── MONTHLY CALENDAR GRID HELPERS ─────────────────────────────────────────
  const buildCalendarDays = (year, month) => {
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const pad2 = n => String(n).padStart(2, '0');
  const scheduleMap = Object.fromEntries(monthSchedule.map(e => [e.date, e]));

  // 1. Fetch walk-in roster for selected date
  const loadRoster = (date = selectedDate) => {
    setLoading(true);
    fetch(`${API}/applications/admin/walkin-roster?date=${date}`, { headers })
      .then(r => r.json())
      .then(data => {
        setRosterData(data || { summary: {}, roster: [] });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRoster(selectedDate);
  }, [selectedDate]);

  // 2. Quick date change helpers
  const handleDateShift = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const newStr = d.toISOString().split('T')[0];
    setSelectedDate(newStr);
  };

  // 3. Confirm Appointment (BPLO checks availability and confirms)
  const handleConfirm = async (appId) => {
    setActionMsg('');
    setActionError('');
    try {
      const res = await axios.post(`${API}/applications/admin/${appId}/confirm-walkin`, {}, { headers });
      setActionMsg(res.data.message || 'Appointment confirmed successfully.');
      loadRoster();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to confirm appointment.');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  // 4. Record Arrival / Mark Attended at Window 1
  const handleRecordArrival = async (appId) => {
    setActionMsg('');
    setActionError('');
    try {
      const res = await axios.post(`${API}/applications/admin/${appId}/mark-attended`, {}, { headers });
      setActionMsg(res.data.message || 'Arrival recorded! Physical folder verified at Window 1.');
      loadRoster();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to record arrival.');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  // 5. Save edited form fields from BPLO modal
  const handleSaveFormData = async (updatedData) => {
    if (!editApp?.id) return;
    try {
      await axios.put(`${API}/applications/admin/${editApp.id}/form-data`, updatedData, { headers });
      localStorage.setItem(`bplo_form_data_admin_${editApp.id}`, JSON.stringify(updatedData));
      setActionMsg('Application form details updated and reflected successfully!');
      loadRoster();
      if (previewApp?.id === editApp.id) {
        setPreviewApp({ ...previewApp, ...updatedData });
      }
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionError('Failed to save updated form fields.');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  const roster = rosterData.roster || [];
  const summary = rosterData.summary || {};

  const filteredRoster = roster.filter(item => {
    // Search
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (item.queue_ticket_number || '').toLowerCase().includes(q) ||
      (item.business_name || '').toLowerCase().includes(q) ||
      (item.owner_name || '').toLowerCase().includes(q) ||
      (item.owner_contact || '').toLowerCase().includes(q);

    // Batch Filter
    let matchBatch = true;
    if (filterBatch === 'MORNING') {
      matchBatch = (item.walkin_time_slot || '').toLowerCase().includes('morning') || (item.walkin_time_slot || '').includes('8:00');
    } else if (filterBatch === 'AFTERNOON') {
      matchBatch = (item.walkin_time_slot || '').toLowerCase().includes('afternoon') || (item.walkin_time_slot || '').includes('1:00');
    }

    // Status Filter
    let matchStatus = true;
    if (filterStatus === 'PENDING') {
      matchStatus = item.walkin_status === 'PENDING' || !item.walkin_status;
    } else if (filterStatus === 'CONFIRMED') {
      matchStatus = item.walkin_status === 'CONFIRMED' || item.walkin_status === 'SCHEDULED';
    } else if (filterStatus === 'ATTENDED') {
      matchStatus = item.walkin_status === 'ATTENDED';
    }

    return matchSearch && matchBatch && matchStatus;
  });

  return (
    <div className="page-container admin-walkins-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} strokeWidth={2.4} />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#15803D' }}>
                BPLO MUNICIPAL DESK • WINDOW 1 APPOINTMENT ROSTER
              </span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Walk-in Schedule
              </h1>
            </div>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Manage MSME preferred visit dates, verify capacity availability, confirm appointments, and record physical document arrivals at Window 1.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#FFFFFF', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <button
            onClick={() => handleDateShift(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#64748B' }}
            title="Previous Day"
          >
            <ChevronLeft size={18} />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              padding: '0.2rem 0.4rem',
              outline: 'none',
              background: 'transparent'
            }}
          />

          <button
            onClick={() => handleDateShift(1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#64748B' }}
            title="Next Day"
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={() => setSelectedDate(todayStr)}
            style={{
              background: selectedDate === todayStr ? '#15803D' : '#F1F5F9',
              color: selectedDate === todayStr ? '#FFFFFF' : '#475569',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              marginLeft: '0.35rem'
            }}
          >
            Today
          </button>
        </div>
      </header>

      {/* ── CLOSURE BANNER ─────────────────────────────────────────────────── */}
      {!closureLoading && closureInfo && (() => {
        const colors = closureTypeColor(closureInfo.day_type);
        return (
          <div style={{
            backgroundColor: colors.bg,
            border: `1.5px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <CalendarX size={22} color={colors.text} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  BPLO OFFICE CLOSED — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: '13px', color: colors.text, marginTop: '2px', fontWeight: 600 }}>
                  {CLOSURE_TYPE_LABELS[closureInfo.day_type] || closureInfo.day_type}
                  {closureInfo.label && ` — "${closureInfo.label}"`}
                </div>
                <div style={{ fontSize: '12px', color: colors.text, marginTop: '4px', opacity: 0.8 }}>
                  Walk-in booking is blocked for MSMEs on this date.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleReopen(selectedDate)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '7px',
                border: `1.5px solid ${colors.border}`,
                backgroundColor: '#FFFFFF', color: colors.text,
                fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0
              }}
              title="Remove closure and reopen this date for MSME bookings"
            >
              <RotateCcw size={14} /> Reopen Office / Clear Closure
            </button>
          </div>
        );
      })()}

      {/* ── CALENDAR & DECLARE CLOSE BUTTONS ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowCalendarModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.55rem 1.1rem', borderRadius: '8px',
            border: '1.5px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          <Calendar size={16} /> Monthly Calendar &amp; Closures
        </button>
        {!closureInfo && (
          <button
            onClick={() => {
              setClosureForm({ day_type: 'bplo_closed', label: '' });
              setShowClosureModal(true);
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.55rem 1.1rem', borderRadius: '8px',
              border: '1.5px solid #EF4444', backgroundColor: '#FFF5F5', color: '#991B1B',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer'
            }}
            title={`Declare ${selectedDate} as a closed day for BPLO`}
          >
            <CalendarX size={16} /> Declare Office Closed
          </button>
        )}
      </div>

      {/* ── NOTIFICATIONS / ALERTS ───────────────────────────────────────── */}
      {actionMsg && (
        <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#166534', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionError && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* ── METRICS & AVAILABILITY OVERVIEW ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        
        {/* Total Scheduled */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', borderLeft: '4px solid #15803D', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '4px' }}>
            Total Roster for Date
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803D' }}>
            {summary.totalScheduled || 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
            {new Date(selectedDate).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Morning Batch Availability */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
              Morning Batch
            </span>
            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 700 }}>8AM – 11AM</span>
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
            {summary.morningBatch || 0} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>/ 25 slots</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
            {(25 - (summary.morningBatch || 0)) > 0 ? `${25 - (summary.morningBatch || 0)} available` : 'Full capacity'}
          </div>
        </div>

        {/* Afternoon Batch Availability */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
              Afternoon Batch
            </span>
            <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>1PM – 4PM</span>
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1D4ED8', marginTop: '4px' }}>
            {summary.afternoonBatch || 0} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>/ 25 slots</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
            {(25 - (summary.afternoonBatch || 0)) > 0 ? `${25 - (summary.afternoonBatch || 0)} available` : 'Full capacity'}
          </div>
        </div>

        {/* Attended / Physical Sightings Recorded */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid var(--primary-green, #15803D)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '4px' }}>
            Arrivals Recorded
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-green, #15803D)' }}>
            {summary.attendedCount || 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
            Physical folders verified at Window 1
          </div>
        </div>

      </div>

      {/* ── FILTER & SEARCH BAR ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px', backgroundColor: '#F8FAFC', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search business name, owner, or applicant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13.5px', width: '100%' }}
          />
        </div>

        {/* Batch Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { id: 'ALL', label: 'All Batches' },
            { id: 'MORNING', label: 'Morning' },
            { id: 'AFTERNOON', label: 'Afternoon' }
          ].map(b => (
            <button
              key={b.id}
              onClick={() => setFilterBatch(b.id)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: filterBatch === b.id ? '1px solid #15803D' : '1px solid #E2E8F0',
                backgroundColor: filterBatch === b.id ? '#15803D' : '#FFFFFF',
                color: filterBatch === b.id ? '#FFFFFF' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'ATTENDED', label: 'Attended' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: filterStatus === s.id ? '1px solid #15803D' : '1px solid #E2E8F0',
                backgroundColor: filterStatus === s.id ? '#15803D' : '#FFFFFF',
                color: filterStatus === s.id ? '#FFFFFF' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── ROSTER TABLE ─────────────────────────────────────────────────── */}
      <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
        
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            Loading walk-in roster for {selectedDate}...
          </div>
        ) : filteredRoster.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Calendar size={38} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.25rem' }}>
              No Walk-ins Scheduled
            </h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
              No MSME applicants requested a walk-in visit for {selectedDate}.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1rem', width: '50px', fontWeight: 700 }}>#</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Batch Slot</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Business Name</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Applicant / Contact</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Walk-in Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((item, index) => {
                  const isAttended = item.walkin_status === 'ATTENDED';
                  const isConfirmed = item.walkin_status === 'CONFIRMED' || item.walkin_status === 'SCHEDULED';
                  const isPending = !item.walkin_status || item.walkin_status === 'PENDING';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: isAttended ? '#F0FDF4' : '#FFFFFF',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Row Index # */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#64748B',
                          backgroundColor: '#F1F5F9',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px'
                        }}>
                          {index + 1}
                        </span>
                      </td>

                      {/* Batch Slot */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--government-navy, #0F172A)' }}>
                          <Clock size={13} color="#64748B" />
                          <span>{item.walkin_time_slot || 'Morning Window'}</span>
                        </div>
                      </td>

                      {/* Business Name */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--government-navy, #0F172A)' }}>
                          {item.business_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {item.business_type}
                        </div>
                      </td>

                      {/* Applicant & Contact */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {item.owner_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Phone size={11} /> {item.owner_contact || 'No phone'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isAttended ? (
                          <div>
                            <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={12} /> Attended
                            </span>
                            {item.counter_officer_name && (
                              <div style={{ fontSize: '10.5px', color: '#166534', marginTop: '2px' }}>
                                Verified by {item.counter_officer_name}
                              </div>
                            )}
                          </div>
                        ) : isConfirmed ? (
                          <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                            ✅ Confirmed Slot
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                            ⏳ Awaiting Confirmation
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                          
                          {/* Confirm Button (if pending) */}
                          {isPending && (
                            <button
                              onClick={() => handleConfirm(item.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Check availability and confirm slot"
                            >
                              <Check size={13} /> Confirm Slot
                            </button>
                          )}

                          {/* Record Arrival Button (if not yet attended) */}
                          {!isAttended && (
                            <button
                              onClick={() => handleRecordArrival(item.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'var(--primary-green, #15803D)',
                                color: '#FFFFFF',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Mark document folder sighted at Window 1"
                            >
                              <UserCheck size={13} /> Record Arrival
                            </button>
                          )}

                          {/* Quick View / Print Form BPLO-01 */}
                          <button
                            onClick={() => setPreviewApp(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #BBF7D0',
                              backgroundColor: '#F0FDF4',
                              color: '#15803D',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Preview pre-filled Form BPLO-01"
                          >
                            <Printer size={13} /> Form
                          </button>

                          {/* Edit Form */}
                          <button
                            onClick={() => {
                              setEditApp(item);
                              setIsEditModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Edit Form BPLO-01 fields"
                          >
                            <Edit3 size={13} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ── PREVIEW FORM BPLO-01 MODAL / POPUP ────────────────────────────── */}
      {previewApp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--government-navy, #0F172A)' }}>
                  Form BPLO-01 • {previewApp.business_name}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Walk-in Applicant: <strong>{previewApp.owner_name || previewApp.applicant_name || 'Business Owner'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setEditApp(previewApp);
                    setIsEditModalOpen(true);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                >
                  <Edit3 size={14} /> Edit Fields
                </button>
                <button
                  onClick={() => setPreviewApp(null)}
                  className="btn btn-outline btn-sm"
                  style={{ fontWeight: 600 }}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
              <UnifiedApplicationFormView
                app={previewApp}
                printable={true}
                showInstructions={false}
                onEditInfo={() => {
                  setEditApp(previewApp);
                  setIsEditModalOpen(true);
                }}
                onBack={() => setPreviewApp(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── BPLO EDIT FORM MODAL ─────────────────────────────────────────── */}
      <FormBPLOEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={editApp}
        onSave={handleSaveFormData}
        isTl={false}
      />

      {/* ── CLOSURE DECLARATION MODAL ─────────────────────────────────────── */}
      {showClosureModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1100, padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '14px', width: '100%',
            maxWidth: '520px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)',
              padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CalendarX size={22} color="#FFFFFF" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF' }}>
                    Declare Office Closed
                  </div>
                  <div style={{ fontSize: '12px', color: '#FCA5A5', marginTop: '1px' }}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowClosureModal(false)}
                style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {/* Notice Banner */}
              <div style={{
                backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.6rem'
              }}>
                <AlertCircle size={17} color="#991B1B" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '12.5px', color: '#7F1D1D', lineHeight: 1.5 }}>
                  Declaring this date closed will <strong>block all MSME walk-in bookings</strong> for{' '}
                  <strong>{selectedDate}</strong>. Existing scheduled appointments should be manually notified.
                </div>
              </div>

              {/* Closure Type */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Closure Type
                </label>
                <select
                  value={closureForm.day_type}
                  onChange={e => setClosureForm(f => ({ ...f, day_type: e.target.value }))}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '7px',
                    border: '1.5px solid #CBD5E1', fontSize: '13.5px', fontWeight: 600,
                    color: '#0F172A', outline: 'none', backgroundColor: '#FAFAFA',
                    cursor: 'pointer'
                  }}
                >
                  <option value="bplo_closed">🔴 BPLO Office Closed / Municipal Administrative Non-Working</option>
                  <option value="holiday">🟡 Official Public Holiday</option>
                  <option value="special_nonworking">🟠 Special Non-Working Day</option>
                </select>
              </div>

              {/* Reason / Label */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reason / Label <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Roxas Town Fiesta, System Maintenance, Municipal Non-Working Holiday..."
                  value={closureForm.label}
                  onChange={e => setClosureForm(f => ({ ...f, label: e.target.value }))}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '7px',
                    border: '1.5px solid #CBD5E1', fontSize: '13.5px',
                    color: '#0F172A', outline: 'none', boxSizing: 'border-box'
                  }}
                />
                {/* Quick Preset Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {CLOSURE_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setClosureForm(f => ({ ...f, label: preset }))}
                      style={{
                        padding: '0.25rem 0.65rem', borderRadius: '99px',
                        border: closureForm.label === preset ? '1.5px solid #991B1B' : '1px solid #E2E8F0',
                        backgroundColor: closureForm.label === preset ? '#FEE2E2' : '#F8FAFC',
                        color: closureForm.label === preset ? '#991B1B' : '#475569',
                        fontSize: '11.5px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setShowClosureModal(false)}
                  style={{
                    padding: '0.6rem 1.25rem', borderRadius: '7px',
                    border: '1.5px solid #CBD5E1', backgroundColor: '#FFFFFF',
                    color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeclareClose}
                  disabled={closureSubmitting}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.6rem 1.25rem', borderRadius: '7px', border: 'none',
                    backgroundColor: closureSubmitting ? '#FCA5A5' : '#991B1B',
                    color: '#FFFFFF', fontSize: '13px', fontWeight: 800,
                    cursor: closureSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <CalendarX size={15} /> {closureSubmitting ? 'Declaring...' : 'Confirm Office Closure'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MONTHLY CALENDAR MODAL ────────────────────────────────────────── */}
      {showCalendarModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1100, padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '14px', width: '100%',
            maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
              padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Calendar size={22} color="#FFFFFF" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF' }}>
                    Monthly Calendar &amp; Office Closures
                  </div>
                  <div style={{ fontSize: '12px', color: '#BBF7D0', marginTop: '1px' }}>
                    Click any date to navigate · Closed dates show reason labels
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCalendarModal(false)}
                style={{ background: 'none', border: 'none', color: '#BBF7D0', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Month Navigation */}
            <div style={{
              padding: '0.85rem 1.5rem', borderBottom: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <button
                onClick={() => setCalMonthYear(prev => {
                  const d = new Date(prev.year, prev.month - 2, 1);
                  return { year: d.getFullYear(), month: d.getMonth() + 1 };
                })}
                style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: '#475569' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                {new Date(calMonthYear.year, calMonthYear.month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCalMonthYear(prev => {
                  const d = new Date(prev.year, prev.month, 1);
                  return { year: d.getFullYear(), month: d.getMonth() + 1 };
                })}
                style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: '#475569' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Legend */}
            <div style={{ padding: '0.65rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '1rem', flexWrap: 'wrap', flexShrink: 0 }}>
              {[
                { bg: '#DCFCE7', border: '#86EFAC', text: '#166534', label: 'Open / Working Day' },
                { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B', label: 'BPLO Closed' },
                { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', label: 'Public Holiday' },
                { bg: '#FFF7ED', border: '#FED7AA', text: '#7C2D12', label: 'Special Non-Working' },
              ].map(leg => (
                <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11.5px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: leg.bg, border: `1.5px solid ${leg.border}`, flexShrink: 0 }} />
                  <span style={{ color: '#475569', fontWeight: 600 }}>{leg.label}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div style={{ overflowY: 'auto', padding: '1rem 1.5rem 1.5rem', flex: 1 }}>
              {calLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '13px' }}>
                  Loading calendar...
                </div>
              ) : (
                <>
                  {/* Weekday headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', padding: '0.3rem 0' }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {buildCalendarDays(calMonthYear.year, calMonthYear.month).map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} />;
                      const dateStr = `${calMonthYear.year}-${pad2(calMonthYear.month)}-${pad2(day)}`;
                      const entry = scheduleMap[dateStr];
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === selectedDate;
                      const isWeekend = [0, 6].includes(new Date(dateStr).getDay());

                      let cellBg = '#FFFFFF', cellBorder = '#E2E8F0', cellTextColor = '#0F172A';
                      if (entry?.day_type === 'bplo_closed') { cellBg = '#FEE2E2'; cellBorder = '#FCA5A5'; cellTextColor = '#991B1B'; }
                      else if (entry?.day_type === 'holiday') { cellBg = '#FEF3C7'; cellBorder = '#FDE68A'; cellTextColor = '#92400E'; }
                      else if (entry?.day_type === 'special_nonworking') { cellBg = '#FFF7ED'; cellBorder = '#FED7AA'; cellTextColor = '#7C2D12'; }
                      else if (isWeekend) { cellBg = '#F8FAFC'; cellTextColor = '#94A3B8'; }

                      return (
                        <div
                          key={dateStr}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setShowCalendarModal(false);
                          }}
                          style={{
                            borderRadius: '8px',
                            border: isSelected ? '2.5px solid #15803D' : isToday ? '2px solid #60A5FA' : `1.5px solid ${cellBorder}`,
                            backgroundColor: isSelected ? '#DCFCE7' : cellBg,
                            padding: '0.4rem 0.3rem',
                            cursor: 'pointer',
                            minHeight: '54px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            transition: 'all 0.12s ease'
                          }}
                          title={entry ? `${CLOSURE_TYPE_LABELS[entry.day_type] || entry.day_type}: ${entry.label}` : dateStr}
                        >
                          <span style={{
                            fontSize: '13px', fontWeight: isToday || isSelected ? 900 : 700,
                            color: isSelected ? '#166534' : cellTextColor
                          }}>
                            {day}
                          </span>
                          {entry && (
                            <span style={{
                              fontSize: '9px', fontWeight: 700, color: cellTextColor,
                              backgroundColor: cellBg, border: `1px solid ${cellBorder}`,
                              borderRadius: '3px', padding: '1px 3px',
                              textAlign: 'center', lineHeight: 1.3,
                              maxWidth: '100%', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                              {entry.day_type === 'bplo_closed' ? '🔴 CLOSED' : entry.day_type === 'holiday' ? '🟡 HOLIDAY' : '🟠 NONWORK'}
                            </span>
                          )}
                          {entry?.label && (
                            <span style={{
                              fontSize: '8.5px', color: cellTextColor, opacity: 0.8,
                              textAlign: 'center', lineHeight: 1.2, maxWidth: '100%',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                              {entry.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0, backgroundColor: '#F8FAFC'
            }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Click any date to select it and close this calendar.
              </div>
              <button
                onClick={() => {
                  setCalMonthYear({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.45rem 0.9rem', borderRadius: '6px',
                  border: '1.5px solid #CBD5E1', backgroundColor: '#FFFFFF',
                  color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} /> Current Month
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
