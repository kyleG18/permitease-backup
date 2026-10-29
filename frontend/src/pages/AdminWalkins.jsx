import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  Calendar, Clock, Ticket, CheckCircle2, AlertCircle, Users,
  Check, Eye, Search, Filter, RefreshCw, Printer, ShieldCheck,
  Building2, MapPin, Phone, UserCheck, ChevronLeft, ChevronRight, Edit3
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--government-navy, #0F172A)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} strokeWidth={2.4} />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary-green, #15803D)' }}>
                BPLO MUNICIPAL DESK • WINDOW 1 QUEUE CONTROL
              </span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--government-navy, #0F172A)', margin: 0 }}>
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
              color: 'var(--government-navy, #0F172A)',
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
              background: selectedDate === todayStr ? 'var(--primary-green, #15803D)' : '#F1F5F9',
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
        <div className="card" style={{ padding: '1.1rem 1.25rem', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid var(--government-navy, #0F172A)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '4px' }}>
            Total Roster for Date
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--government-navy, #0F172A)' }}>
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
              🌅 Morning Batch
            </span>
            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 700 }}>8AM – 11AM</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
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
              🌇 Afternoon Batch
            </span>
            <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>1PM – 4PM</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1D4ED8', marginTop: '4px' }}>
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
            placeholder="Search ticket #, business name, or applicant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13.5px', width: '100%' }}
          />
        </div>

        {/* Batch Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { id: 'ALL', label: 'All Batches' },
            { id: 'MORNING', label: '🌅 Morning' },
            { id: 'AFTERNOON', label: '🌇 Afternoon' }
          ].map(b => (
            <button
              key={b.id}
              onClick={() => setFilterBatch(b.id)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: filterBatch === b.id ? '1px solid var(--government-navy, #0F172A)' : '1px solid #CBD5E1',
                backgroundColor: filterBatch === b.id ? 'var(--government-navy, #0F172A)' : '#FFFFFF',
                color: filterBatch === b.id ? '#FFFFFF' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
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
            { id: 'PENDING', label: '⏳ Pending' },
            { id: 'CONFIRMED', label: '✅ Confirmed' },
            { id: 'ATTENDED', label: '📍 Attended' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: filterStatus === s.id ? '1px solid var(--primary-green, #15803D)' : '1px solid #CBD5E1',
                backgroundColor: filterStatus === s.id ? 'var(--primary-green, #15803D)' : '#FFFFFF',
                color: filterStatus === s.id ? '#FFFFFF' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── ROSTER TABLE ─────────────────────────────────────────────────── */}
      <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            Loading walk-in roster for {selectedDate}...
          </div>
        ) : filteredRoster.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Calendar size={38} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--government-navy, #0F172A)', margin: '0 0 0.25rem' }}>
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
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Ticket #</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Batch Slot</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Business Name</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Applicant / Contact</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Walk-in Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((item) => {
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
                      {/* Ticket # */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '13px',
                          color: 'var(--government-navy, #0F172A)',
                          backgroundColor: '#F1F5F9',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          #{item.queue_ticket_number || 'PENDING'}
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
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--government-navy, #0F172A)',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer'
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
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--government-navy, #0F172A)',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer'
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
                  Queue Ticket #{previewApp.queue_ticket_number || 'PENDING'}
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

    </div>
  );
}
