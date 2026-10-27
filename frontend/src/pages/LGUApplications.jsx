import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ClipboardList, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Users, 
  Check, 
  ArrowRight,
  Filter
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const STATUS_CONFIG = {
  SUBMITTED:        { label: 'Submitted',              color: '#2563EB', bg: '#DBEAFE' },
  UNDER_REVIEW:     { label: 'Under Review',           color: '#D97706', bg: '#FEF3C7' },
  NEEDS_CORRECTION: { label: 'Needs Correction',       color: '#DC2626', bg: '#FEE2E2' },
  APPROVED:         { label: 'Verified',               color: '#16A34A', bg: '#DCFCE7' },
  REJECTED:         { label: 'Corrections Requested',  color: '#991B1B', bg: '#FEE2E2' },
  CANCELLED:        { label: 'Cancelled',              color: '#64748B', bg: '#F1F5F9' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600', color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
};

const FILTERS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED'];

export default function LGUApplications() {
  const { token, user } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState('QUEUE'); // 'QUEUE' or 'WALKIN'
  
  // Applications Queue State
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Walk-in Roster State
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [rosterData, setRosterData] = useState({ summary: {}, roster: [] });
  const [rosterLoading, setRosterLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const headers = { 
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const loadApplications = (status) => {
    setLoading(true);
    const url = status === 'ALL'
      ? `${API}/applications/admin/all`
      : `${API}/applications/admin/all?status=${status}`;
    fetch(url, { headers })
      .then(r => r.json())
      .then(data => { setApplications(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadWalkinRoster = (date) => {
    setRosterLoading(true);
    fetch(`${API}/applications/admin/walkin-roster?date=${date}`, { headers })
      .then(r => r.json())
      .then(data => {
        setRosterData(data);
        setRosterLoading(false);
      })
      .catch(() => setRosterLoading(false));
  };

  useEffect(() => { 
    if (viewMode === 'QUEUE') {
      loadApplications(filter);
    } else {
      loadWalkinRoster(selectedDate);
    }
  }, [filter, viewMode, selectedDate]);

  const handleMarkAttended = async (appId) => {
    try {
      const res = await fetch(`${API}/applications/admin/${appId}/mark-attended`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to mark attendance');

      setActionSuccess(data.message || 'Marked as attended at Window 1.');
      loadWalkinRoster(selectedDate);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredApps = applications.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.application_number?.toLowerCase().includes(s) ||
      a.business_name?.toLowerCase().includes(s) ||
      a.owner_name?.toLowerCase().includes(s)
    );
  });

  const filteredRoster = (rosterData.roster || []).filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.queue_ticket_number?.toLowerCase().includes(s) ||
      r.business_name?.toLowerCase().includes(s) ||
      r.owner_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="lgu-apps-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1240px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', margin: 0, color: 'var(--text-dark)', fontWeight: '700' }}>
            {viewMode === 'QUEUE' ? 'Pre-Assessment Submissions' : 'Daily Walk-in Roster & Queue Control'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            {viewMode === 'QUEUE' 
              ? 'Review business permit preparation submissions from MSME owners in Roxas City.' 
              : 'Manage daily City Hall walk-in queues and Window 1 physical document sighting.'}
          </p>
        </div>

        {/* View Mode Toggle Pills */}
        <div style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '0.25rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <button 
            onClick={() => setViewMode('QUEUE')}
            style={{ 
              padding: '0.45rem 1rem', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: viewMode === 'QUEUE' ? 'white' : 'transparent', 
              color: viewMode === 'QUEUE' ? 'var(--text-dark)' : 'var(--text-muted)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: viewMode === 'QUEUE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ClipboardList size={15} /> Application Queue
          </button>
          <button 
            onClick={() => setViewMode('WALKIN')}
            style={{ 
              padding: '0.45rem 1rem', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: viewMode === 'WALKIN' ? 'white' : 'transparent', 
              color: viewMode === 'WALKIN' ? 'var(--primary-green, #16A34A)' : 'var(--text-muted)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: viewMode === 'WALKIN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Calendar size={15} /> Walk-in Roster & Queue
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', border: '1px solid #BBF7D0', fontSize: '0.88rem' }}>
          <Check size={18} /> {actionSuccess}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 1: QUEUE VIEW (Standard pre-assessment applications)     */}
      {/* ============================================================ */}
      {viewMode === 'QUEUE' && (
        <>
          {/* Filters & Search Toolbar */}
          <div className="lgu-apps-toolbar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="lgu-apps-filter-chips" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)} 
                  style={{ 
                    padding: '0.4rem 1rem', 
                    borderRadius: '999px', 
                    border: `2px solid ${filter === f ? 'var(--primary-green)' : 'var(--border-color)'}`, 
                    backgroundColor: filter === f ? 'var(--light-green)' : 'white', 
                    color: filter === f ? 'var(--primary-green)' : 'var(--text-muted)', 
                    fontWeight: '600', 
                    fontSize: '0.8rem', 
                    cursor: 'pointer' 
                  }}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
            
            <div className="lgu-apps-search" style={{ position: 'relative', marginLeft: 'auto' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search pre-assessments..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.875rem', width: '250px' }} 
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading pre-assessments...</div>
          ) : filteredApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
              <ClipboardList size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No Pre-Assessment Submissions Found</h3>
              <p style={{ color: 'var(--text-muted)' }}>There are currently no preparation submissions matching your selected filter.</p>
            </div>
          ) : (
            <div className="table-scroll-wrap" style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border-light)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)' }}>
                    {['Application #', 'Business', 'Owner', 'Walk-in Schedule', 'Submitted', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map((app, i) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--primary-green)', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {app.application_number}
                        {app.queue_ticket_number && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>#{app.queue_ticket_number}</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600' }}>
                        {app.business_name}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>{app.business_type}</div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-dark)' }}>{app.owner_name}</td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                        {app.walkin_date ? (
                          <div>
                            <span style={{ fontWeight: '700', color: '#1E293B' }}>
                              {new Date(app.walkin_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{app.walkin_time_slot || 'General Batch'}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Not Scheduled</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '1rem' }}><StatusBadge status={app.status} /></td>
                      <td style={{ padding: '1rem' }}>
                        <Link to={`/admin/applications/${app.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 1rem', backgroundColor: 'var(--primary-green)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none' }}>
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* MODE 2: WALKIN ROSTER & QUEUE CONTROL (City Hall Window 1)    */}
      {/* ============================================================ */}
      {viewMode === 'WALKIN' && (
        <>
          {/* Capacity KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'white', borderLeft: '4px solid #0F172A' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Scheduled</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0F172A', marginTop: '0.2rem' }}>
                {rosterData.summary?.totalScheduled || 0}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Applicants for {selectedDate}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'white', borderLeft: '4px solid #2563EB' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Morning Window</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2563EB', marginTop: '0.2rem' }}>
                {rosterData.summary?.morningBatch || 0}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#2563EB' }}>8:00 AM – 11:00 AM Batch</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'white', borderLeft: '4px solid #D97706' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Afternoon Window</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#D97706', marginTop: '0.2rem' }}>
                {rosterData.summary?.afternoonBatch || 0}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#D97706' }}>1:00 PM – 4:00 PM Batch</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'white', borderLeft: '4px solid #16A34A' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Attended / Verified</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16A34A', marginTop: '0.2rem' }}>
                {rosterData.summary?.attendedCount || 0}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#16A34A' }}>Forwarded to Cashier</div>
            </div>

          </div>

          {/* Roster Controls: Date Picker + Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            
            {/* Date Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dark)' }}>Queue Date:</span>
              <input 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: '0.45rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem', fontWeight: '600', color: '#1E293B' }}
              />
              <button 
                onClick={() => setSelectedDate(todayStr)} 
                className="btn btn-outline" 
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
              >
                Today
              </button>
            </div>

            {/* Ticket Search */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search ticket # or business..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.25rem', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} 
              />
            </div>

          </div>

          {/* Roster Table */}
          {rosterLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading walk-in roster...</div>
          ) : filteredRoster.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
              <Calendar size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No Walk-in Appointments Scheduled</h3>
              <p style={{ color: 'var(--text-muted)' }}>There are no business owners scheduled for walk-in verification on {selectedDate}.</p>
            </div>
          ) : (
            <div className="table-scroll-wrap" style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflowX: 'auto', border: '1px solid var(--border-light)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ticket #</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Business & Line</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Owner & Contact</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Window Slot</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sighting Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Window 1 Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((r, i) => {
                    const isAttended = r.walkin_status === 'ATTENDED';
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isAttended ? '#F0FDF4' : i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                        
                        {/* Queue Ticket */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '0.92rem', color: '#0F172A', backgroundColor: '#F1F5F9', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                            #{r.queue_ticket_number || 'N/A'}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>App: {r.application_number}</div>
                        </td>

                        {/* Business */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#1E293B' }}>{r.business_name}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{r.business_type}</div>
                        </td>

                        {/* Owner */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{r.owner_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{r.owner_contact || r.owner_email || '—'}</div>
                        </td>

                        {/* Window Slot */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '600', color: (r.walkin_time_slot || '').includes('Morning') ? '#2563EB' : '#D97706', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={13} /> {r.walkin_time_slot || 'Standard Batch'}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {isAttended ? (
                            <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle size={12} /> SIGHTED & VERIFIED
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={12} /> SCHEDULED
                            </span>
                          )}
                          {isAttended && r.counter_officer_name && (
                            <div style={{ fontSize: '0.72rem', color: '#15803D', marginTop: '0.15rem' }}>by {r.counter_officer_name}</div>
                          )}
                        </td>

                        {/* Window 1 Action */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {!isAttended ? (
                              <button 
                                onClick={() => handleMarkAttended(r.id)}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', fontSize: '0.78rem', backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                              >
                                <Check size={14} /> Mark Sighted
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: '600' }}>✓ At Cashier</span>
                            )}
                            <Link 
                              to={`/admin/applications/${r.id}`}
                              className="btn btn-outline"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
                            >
                              App
                            </Link>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </>
      )}

    </div>
  );
}
