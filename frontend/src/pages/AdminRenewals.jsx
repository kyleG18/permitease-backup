import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  CalendarClock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Search, 
  Eye, 
  Send, 
  Bell, 
  ShieldAlert, 
  Clock, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const AdminRenewals = () => {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState({ summary: {}, permits: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Notice Action Modal State
  const [selectedPermitForNotice, setSelectedPermitForNotice] = useState(null);
  const [customNoticeText, setCustomNoticeText] = useState('');
  const [sendingNotice, setSendingNotice] = useState(false);
  const [sentNoticePermitIds, setSentNoticePermitIds] = useState(new Set());

  // Bulk Action State
  const [bulkSending, setBulkSending] = useState(false);

  const headers = { 
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchRenewals = async () => {
    try {
      const r = await fetch(`${API}/renewals/admin`, { headers });
      const json = await r.json();
      if (!r.ok) throw new Error(json.message || 'Error fetching renewals');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'business_owner') {
      navigate('/access-denied');
      return;
    }
    fetchRenewals();
  }, [user]);

  // Handle Individual Notice Dispatch
  const handleSendNotice = async (permit) => {
    try {
      setSendingNotice(true);
      setError('');
      const res = await fetch(`${API}/renewals/admin/send-notice/${permit.permit_id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ custom_message: customNoticeText })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to dispatch notice.');

      setSentNoticePermitIds(prev => new Set(prev).add(permit.permit_id));
      setSuccessMsg(`Official notice issued to ${permit.business_name} (${permit.owner_email || 'Owner'}).`);
      setSelectedPermitForNotice(null);
      setCustomNoticeText('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingNotice(false);
    }
  };

  // Handle Bulk Notice Dispatch
  const handleBulkNotice = async (targetStage) => {
    const stageNames = {
      EXPIRING_SOON: 'Expiring Soon (Nov-Dec)',
      RENEWAL_WINDOW: 'January Renewal Window (Jan 1-20)',
      DELINQUENT: 'Delinquent Businesses (Past Jan 20)'
    };

    if (!window.confirm(`Issue statutory notices to all businesses under "${stageNames[targetStage] || targetStage}"?`)) {
      return;
    }

    try {
      setBulkSending(true);
      setError('');
      const res = await fetch(`${API}/renewals/admin/send-bulk-notices`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ target_stage: targetStage })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to dispatch bulk notices.');

      setSuccessMsg(result.message || 'Bulk statutory notices dispatched successfully.');
      fetchRenewals();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkSending(false);
    }
  };

  const getStageBadge = (permit) => {
    const stage = permit.statutory_stage;
    if (stage === 'DELINQUENT') {
      return (
        <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.35rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <ShieldAlert size={12} /> DELINQUENT (25% + {Math.round(permit.monthly_interest_rate * 100)}% Int.)
        </span>
      );
    }
    if (stage === 'RENEWAL_WINDOW') {
      return (
        <span style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '0.35rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <Clock size={12} /> JAN RENEWAL WINDOW (0% PENALTY)
        </span>
      );
    }
    if (stage === 'EXPIRING_SOON') {
      return (
        <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A', padding: '0.35rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertTriangle size={12} /> EXPIRING SOON (DEC 31)
        </span>
      );
    }
    return (
      <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0', padding: '0.35rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
        <CheckCircle size={12} /> ACTIVE & COMPLIANT
      </span>
    );
  };

  const filteredPermits = data.permits.filter(p => {
    let matchFilter = true;
    if (activeFilter === 'ACTIVE') matchFilter = p.statutory_stage === 'ACTIVE';
    else if (activeFilter === 'EXPIRING_SOON') matchFilter = p.statutory_stage === 'EXPIRING_SOON';
    else if (activeFilter === 'RENEWAL_WINDOW') matchFilter = p.statutory_stage === 'RENEWAL_WINDOW';
    else if (activeFilter === 'DELINQUENT') matchFilter = p.statutory_stage === 'DELINQUENT';

    const q = search.toLowerCase();
    const matchSearch = (p.business_name || '').toLowerCase().includes(q) || 
                        (p.permit_number || '').toLowerCase().includes(q) ||
                        (p.owner_name || '').toLowerCase().includes(q) ||
                        (p.owner_email || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div className="admin-renewals-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header with Title and LGU Context */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.45rem', backgroundColor: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarClock size={20} color="#15803D" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.08em' }}>COMPLIANCE MONITORING</span>
          </div>
          <h1 style={{ color: '#0F172A', marginBottom: '0.25rem', fontSize: '1.65rem', fontWeight: '800' }}>
            Statutory Renewal & Delinquency Radar
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Proactive compliance monitoring under <strong>Republic Act No. 7160 (Local Government Code of 1991) Sections 167 & 168</strong>.
          </p>
        </div>
      </div>

      {/* Statutory Legal Banner */}
      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#334155' }}>
          <Info size={22} />
        </div>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1E293B', marginBottom: '0.2rem' }}>
            STATUTORY PHILIPPINE PERMIT CALENDAR RULES
          </div>
          <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.45' }}>
            • <strong>Dec 31:</strong> All business permits legally expire annually. • <strong>Jan 1 – Jan 20:</strong> Statutory renewal window without penalty. • <strong>Jan 21 Onward:</strong> Delinquent status automatically applies a <strong>25% surcharge + 2% monthly interest</strong>.
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.9rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', border: '1px solid #FECACA' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '0.9rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', border: '1px solid #BBF7D0' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {/* Summary Radar Cards */}
      <div className="admin-renewals-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Total Monitored */}
        <div className="card" onClick={() => setActiveFilter('ALL')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'ALL' ? '3px solid var(--primary-green)' : '3px solid transparent', padding: '1.25rem', backgroundColor: activeFilter === 'ALL' ? '#F0FDF4' : 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <FileText size={18} color="var(--primary-green)" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Monitored</h4>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)' }}>{data.summary.totalPermits || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Issued preparation records</div>
        </div>

        {/* Active & Compliant */}
        <div className="card" onClick={() => setActiveFilter('ACTIVE')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'ACTIVE' ? '3px solid #16A34A' : '3px solid transparent', padding: '1.25rem', backgroundColor: activeFilter === 'ACTIVE' ? '#F0FDF4' : 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <CheckCircle size={18} color="#16A34A" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active & Compliant</h4>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#16A34A' }}>{data.summary.activePermits || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>&gt; 60 days before Dec 31</div>
        </div>

        {/* Expiring Soon (Dec 31) */}
        <div className="card" onClick={() => setActiveFilter('EXPIRING_SOON')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'EXPIRING_SOON' ? '3px solid #D97706' : '3px solid transparent', padding: '1.25rem', backgroundColor: activeFilter === 'EXPIRING_SOON' ? '#FFFBEB' : 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <AlertTriangle size={18} color="#D97706" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expiring Soon</h4>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#D97706' }}>{data.summary.expiringSoon || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '0.2rem' }}>Within 60d of Dec 31 expiry</div>
        </div>

        {/* Jan Renewal Window */}
        <div className="card" onClick={() => setActiveFilter('RENEWAL_WINDOW')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'RENEWAL_WINDOW' ? '3px solid #2563EB' : '3px solid transparent', padding: '1.25rem', backgroundColor: activeFilter === 'RENEWAL_WINDOW' ? '#EFF6FF' : 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Clock size={18} color="#2563EB" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Jan Renewal Window</h4>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2563EB' }}>{data.summary.renewalWindow || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#1D4ED8', marginTop: '0.2rem' }}>Jan 1–20 grace period (0% fine)</div>
        </div>

        {/* Delinquent / Overdue */}
        <div className="card" onClick={() => setActiveFilter('DELINQUENT')} style={{ cursor: 'pointer', borderBottom: activeFilter === 'DELINQUENT' ? '3px solid #DC2626' : '3px solid transparent', padding: '1.25rem', backgroundColor: activeFilter === 'DELINQUENT' ? '#FEF2F2' : 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <ShieldAlert size={18} color="#DC2626" />
            <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Delinquent</h4>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#DC2626' }}>{data.summary.delinquentPermits || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#B91C1C', marginTop: '0.2rem' }}>Past Jan 20 • 25% surcharge active</div>
        </div>

      </div>

      {/* Toolbar: Search + Bulk Dispatch Buttons */}
      <div className="admin-renewals-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', width: '320px', minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search business, owner, or permit..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
          />
        </div>

        {/* Bulk Action Buttons depending on active filter */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeFilter === 'EXPIRING_SOON' && data.summary.expiringSoon > 0 && (
            <button 
              onClick={() => handleBulkNotice('EXPIRING_SOON')}
              disabled={bulkSending}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#D97706', borderColor: '#D97706', fontSize: '0.85rem' }}
            >
              <Send size={15} /> {bulkSending ? 'Broadcasting...' : `Send Reminder to All Expiring (${data.summary.expiringSoon})`}
            </button>
          )}

          {activeFilter === 'RENEWAL_WINDOW' && data.summary.renewalWindow > 0 && (
            <button 
              onClick={() => handleBulkNotice('RENEWAL_WINDOW')}
              disabled={bulkSending}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#2563EB', borderColor: '#2563EB', fontSize: '0.85rem' }}
            >
              <Send size={15} /> {bulkSending ? 'Broadcasting...' : `Broadcast Window Alert to All (${data.summary.renewalWindow})`}
            </button>
          )}

          {activeFilter === 'DELINQUENT' && data.summary.delinquentPermits > 0 && (
            <button 
              onClick={() => handleBulkNotice('DELINQUENT')}
              disabled={bulkSending}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#DC2626', borderColor: '#DC2626', fontSize: '0.85rem' }}
            >
              <ShieldAlert size={15} /> {bulkSending ? 'Issuing Notices...' : `Issue Delinquency Notices to All (${data.summary.delinquentPermits})`}
            </button>
          )}

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong>{filteredPermits.length}</strong> record(s) listed
          </div>
        </div>

      </div>

      {/* Renewals Table */}
      <div className="card admin-renewals-table-wrap table-scroll-wrap" style={{ padding: 0, overflowX: 'auto', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <table className="table" style={{ minWidth: '950px', marginBottom: 0 }}>
          <thead>
            <tr style={{ background: 'linear-gradient(90deg, #15803D 0%, #166534 100%)', color: '#FFFFFF' }}>
              <th style={{ padding: '0.9rem 1rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Business & Line</th>
              <th style={{ padding: '0.9rem 1rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Owner / Contact</th>
              <th style={{ padding: '0.9rem 1rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Permit Reference</th>
              <th style={{ padding: '0.9rem 1rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expiration & Countdown</th>
              <th style={{ padding: '0.9rem 1rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Statutory Status</th>
              <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>BPLO Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>Loading statutory radar records...</td></tr>
            ) : filteredPermits.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>No business records match this statutory filter.</td></tr>
            ) : (
              filteredPermits.map(p => {
                const isSent = sentNoticePermitIds.has(p.permit_id);
                return (
                  <tr key={p.permit_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    
                    {/* Business Name */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '0.92rem' }}>{p.business_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{p.business_type || 'General Business'}</div>
                    </td>

                    {/* Owner & Contact */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.88rem' }}>{p.owner_name}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{p.owner_email || 'No email registered'}</div>
                      {p.owner_contact && <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{p.owner_contact}</div>}
                    </td>

                    {/* Permit Number */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.85rem', color: '#0F172A' }}>
                        {p.permit_number || 'PE-PENDING'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Issued: {p.issue_date ? new Date(p.issue_date).toLocaleDateString('en-PH') : 'N/A'}</div>
                    </td>

                    {/* Expiration & Countdown */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                        {p.expiration_date ? new Date(p.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Dec 31'}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '600', marginTop: '0.15rem' }}>
                        {p.statutory_stage === 'DELINQUENT' ? (
                          <span style={{ color: '#DC2626' }}>{Math.abs(p.days_remaining)}d overdue • {p.months_late}mo fine</span>
                        ) : p.statutory_stage === 'RENEWAL_WINDOW' ? (
                          <span style={{ color: '#2563EB' }}>{p.days_until_deadline}d left before penalty</span>
                        ) : p.statutory_stage === 'EXPIRING_SOON' ? (
                          <span style={{ color: '#D97706' }}>{p.days_remaining}d until Dec 31</span>
                        ) : (
                          <span style={{ color: '#16A34A' }}>{p.days_remaining}d remaining</span>
                        )}
                      </div>
                    </td>

                    {/* Statutory Status Badge */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {getStageBadge(p)}
                      {p.estimated_penalty > 0 && (
                        <div style={{ fontSize: '0.73rem', color: '#DC2626', fontWeight: '600', marginTop: '0.2rem' }}>
                          Est. Surcharge & Int: ~₱{p.estimated_penalty.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        
                        {/* Notice Button */}
                        <button 
                          onClick={() => setSelectedPermitForNotice(p)}
                          disabled={isSent}
                          className="btn btn-outline"
                          title="Issue statutory LGU notice to owner"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.65rem', fontSize: '0.78rem', color: isSent ? '#16A34A' : '#1E293B', borderColor: isSent ? '#86EFAC' : '#CBD5E1', backgroundColor: isSent ? '#F0FDF4' : 'white' }}
                        >
                          {isSent ? <Check size={13} color="#16A34A" /> : <Send size={13} />}
                          {isSent ? 'Notice Sent' : 'Send Notice'}
                        </button>

                        {/* View App button if renewal in progress */}
                        {p.active_renewal_id && (
                          <button 
                            onClick={() => navigate(`/admin/applications/${p.active_renewal_id}`)} 
                            className="btn btn-outline" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
                          >
                            <Eye size={13} /> View App
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Individual Notice Modal */}
      {selectedPermitForNotice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.75rem', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                <Send size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-dark)' }}>Issue Official Statutory Notice</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedPermitForNotice.business_name} • {selectedPermitForNotice.owner_email}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#334155' }}>
              <div><strong>Permit:</strong> {selectedPermitForNotice.permit_number || 'N/A'}</div>
              <div><strong>Current Legal Status:</strong> {selectedPermitForNotice.statutory_stage.replace('_', ' ')}</div>
              <div><strong>Statutory Deadline:</strong> January 20 per RA 7160 Sec. 167</div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                Notice Message (Optional Override):
              </label>
              <textarea 
                rows={4}
                value={customNoticeText}
                onChange={e => setCustomNoticeText(e.target.value)}
                placeholder={`Leave empty to send standard official ${selectedPermitForNotice.statutory_stage.replace('_', ' ')} advisory under RA 7160...`}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                This notice will be recorded in the business owner's notifications and dispatched to their registered email.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setSelectedPermitForNotice(null); setCustomNoticeText(''); }}
                style={{ padding: '0.6rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSendNotice(selectedPermitForNotice)}
                disabled={sendingNotice}
                style={{ padding: '0.6rem 1.5rem', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-green, #16A34A)', color: 'white', cursor: sendingNotice ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Send size={14} />
                {sendingNotice ? 'Dispatching...' : 'Dispatch Notice'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminRenewals;
