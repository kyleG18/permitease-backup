import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Plus,
  Upload,
  Globe,
  ShieldCheck,
  Search,
  ExternalLink,
  AlertCircle,
  Trash2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CATEGORIES = ['Food & Beverage', 'Retail', 'Services', 'Manufacturing', 'Agriculture', 'Others'];

const AdminRegulatoryUpdates = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('updates');

  // Regulatory Updates state
  const [updates, setUpdates] = useState([]);
  const [sources, setSources] = useState([]);
  const [updateFilter, setUpdateFilter] = useState('ALL');
  const [checking, setChecking] = useState(false);
  const [checkReport, setCheckReport] = useState(null);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    source_name: 'Municipality of Roxas BPLO',
    source_category: 'LOCAL_ORDINANCE',
    source_url: '',
    title: '',
    summary: '',
    ai_impact_notes: '',
    detected_version: new Date().toISOString().slice(0, 10),
    auto_approve: true
  });

  // PSIC Codes state
  const [psicCodes, setPsicCodes] = useState([]);
  const [psicFilter, setPsicFilter] = useState('ALL');
  const [psicSearch, setPsicSearch] = useState('');
  const [showAddPsic, setShowAddPsic] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvVersion, setCsvVersion] = useState('PSA PSIC Update');
  const [csvAutoApprove, setCsvAutoApprove] = useState(false);
  const [newPsic, setNewPsic] = useState({
    code: '',
    title: '',
    section: '',
    division: '',
    industry_category: 'Retail',
    mapped_requirement_keywords: '',
    source_version: 'BPLO Manual Entry'
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const authHeaders = { headers: { Authorization: `Bearer ${user?.token}` } };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [updRes, psicRes] = await Promise.all([
        axios.get(`${API}/regulatory/updates`, authHeaders),
        axios.get(`${API}/regulatory/psic`, authHeaders)
      ]);
      setUpdates(updRes.data?.updates || []);
      setSources(updRes.data?.sources || []);
      setPsicCodes(Array.isArray(psicRes.data) ? psicRes.data : []);
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to load regulatory data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchAll();
  }, [user?.token]);

  const handleCheckSources = async () => {
    setChecking(true);
    setNotice(null);
    setCheckReport(null);
    try {
      const { data } = await axios.post(`${API}/regulatory/updates/check`, {}, authHeaders);
      setCheckReport(data);
      setNotice({
        type: 'success',
        text: `Checked ${data.total_sources} official agencies. ${data.new_updates_detected} new update(s) queued for BPLO review.`
      });
      await fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Regulatory check failed.' });
    } finally {
      setChecking(false);
    }
  };

  const handleApproveUpdate = async (id) => {
    try {
      await axios.put(`${API}/regulatory/updates/${id}/approve`, {}, authHeaders);
      setNotice({ type: 'success', text: 'Update approved — AI Assistant & Assessments now include this rule.' });
      fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: 'Failed to approve update.' });
    }
  };

  const handleDismissUpdate = async (id) => {
    try {
      await axios.put(`${API}/regulatory/updates/${id}/dismiss`, {}, authHeaders);
      fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: 'Failed to dismiss update.' });
    }
  };

  const handleCreateUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/regulatory/updates`, newUpdate, authHeaders);
      setShowAddUpdate(false);
      setNewUpdate({
        source_name: 'Municipality of Roxas BPLO',
        source_category: 'LOCAL_ORDINANCE',
        source_url: '',
        title: '',
        summary: '',
        ai_impact_notes: '',
        detected_version: new Date().toISOString().slice(0, 10),
        auto_approve: true
      });
      setNotice({ type: 'success', text: 'Regulatory bulletin logged.' });
      fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to save bulletin.' });
    }
  };

  const handleCreatePsic = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/regulatory/psic`, newPsic, authHeaders);
      setShowAddPsic(false);
      setNewPsic({
        code: '',
        title: '',
        section: '',
        division: '',
        industry_category: 'Retail',
        mapped_requirement_keywords: '',
        source_version: 'BPLO Manual Entry'
      });
      setNotice({ type: 'success', text: 'PSIC code saved and activated.' });
      fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to save PSIC code.' });
    }
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${API}/regulatory/psic/import-csv`,
        { csvText, sourceVersion: csvVersion, autoApprove: csvAutoApprove },
        authHeaders
      );
      setShowCsvModal(false);
      setCsvText('');
      setNotice({
        type: 'success',
        text: `Imported PSIC CSV: ${data.inserted} added, ${data.updated} updated (${data.status}).`
      });
      fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'CSV import failed.' });
    }
  };

  const handleApprovePsic = async (id) => {
    try {
      await axios.put(`${API}/regulatory/psic/${id}/approve`, {}, authHeaders);
      fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: 'Failed to approve PSIC code.' });
    }
  };

  const handleRejectPsic = async (id) => {
    try {
      await axios.put(`${API}/regulatory/psic/${id}/reject`, {}, authHeaders);
      fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: 'Failed to reject PSIC code.' });
    }
  };

  const handleDeletePsic = async (id) => {
    if (!window.confirm('Delete this PSIC code permanently?')) return;
    try {
      await axios.delete(`${API}/regulatory/psic/${id}`, authHeaders);
      fetchAll();
    } catch (err) {
      setNotice({ type: 'error', text: 'Only System Admin can delete PSIC codes.' });
    }
  };

  const pendingUpdatesCount = updates.filter(u => u.status === 'PENDING_REVIEW').length;
  const approvedUpdatesCount = updates.filter(u => u.status === 'APPROVED').length;
  const activePsicCount = psicCodes.filter(p => p.status === 'ACTIVE').length;
  const pendingPsicCount = psicCodes.filter(p => p.status === 'PENDING_APPROVAL').length;

  const filteredUpdates = updates.filter(u => updateFilter === 'ALL' || u.status === updateFilter);
  const filteredPsic = psicCodes.filter(p => {
    if (psicFilter !== 'ALL' && p.status !== psicFilter) return false;
    if (psicSearch.trim()) {
      const q = psicSearch.toLowerCase();
      return (
        String(p.code || '').toLowerCase().includes(q) ||
        String(p.title || '').toLowerCase().includes(q) ||
        String(p.industry_category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            AI Regulatory &amp; PSIC Monitor
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Weekly automated checks + BPLO human-in-the-loop approval for PSA PSIC codes, ARTA, DILG, BIR, BFP, and local ordinances.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCheckSources}
            disabled={checking}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={checking ? 'spin' : ''} />
            {checking ? 'Checking Official Agencies...' : 'Check Official Sources Now'}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className="card"
          style={{
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            borderLeft: `4px solid ${notice.type === 'error' ? '#DC2626' : '#059669'}`,
            backgroundColor: notice.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            color: notice.type === 'error' ? '#991B1B' : '#065F46',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={18} />
          <span>{notice.text}</span>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>PENDING REGULATORY REVIEWS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: pendingUpdatesCount > 0 ? '#D97706' : '#059669' }}>{pendingUpdatesCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>APPROVED AI-ACTIVE RULES</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#059669' }}>{approvedUpdatesCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>ACTIVE PSA PSIC CODES</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#059669' }}>{activePsicCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>PENDING PSIC APPROVALS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: pendingPsicCount > 0 ? '#D97706' : 'var(--text-primary)' }}>{pendingPsicCount}</div>
        </div>
      </div>

      {/* Live Check Source Results */}
      {checkReport && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Latest Live Agency Check</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {checkReport.results.map((r, i) => (
              <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{r.source_name}</div>
                <div style={{ color: r.reachable ? '#059669' : '#DC2626', fontWeight: 600 }}>
                  {r.reachable ? `Reachable (${r.detected_version})` : `Unreachable (${r.error || 'timeout'})`}
                </div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                  {r.changed ? 'New change detected → queued for review' : 'No new changes since last snapshot'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'updates' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('updates')}
        >
          <Globe size={16} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
          Regulatory Updates ({updates.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'psic' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('psic')}
        >
          <ShieldCheck size={16} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
          PSA PSIC Codes ({psicCodes.length})
        </button>
      </div>

      {/* TAB 1: REGULATORY UPDATES */}
      {activeTab === 'updates' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['ALL', 'PENDING_REVIEW', 'APPROVED', 'DISMISSED'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm ${updateFilter === st ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setUpdateFilter(st)}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddUpdate(true)}>
              <Plus size={15} style={{ marginRight: '0.3rem', verticalAlign: 'text-bottom' }} />
              Log Local Ordinance / Bulletin
            </button>
          </div>

          {sources.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              <strong>Monitored Agencies (Weekly Cron: Mon 9:00 AM PHT):</strong>{' '}
              {sources.map(s => s.source_name).join(' • ')}
            </div>
          )}

          {loading ? (
            <p className="text-muted">Loading regulatory updates...</p>
          ) : filteredUpdates.length === 0 ? (
            <p className="text-muted">No regulatory updates in this view. Click &ldquo;Check Official Sources Now&rdquo; to scan PSA, ARTA, DILG, BIR, and BFP.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredUpdates.map(u => (
                <div key={u.id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                          {u.source_category}
                        </span>
                        <span className="badge" style={{
                          background: u.status === 'APPROVED' ? '#DCFCE7' : u.status === 'PENDING_REVIEW' ? '#FEF3C7' : '#F3F4F6',
                          color: u.status === 'APPROVED' ? '#166534' : u.status === 'PENDING_REVIEW' ? '#92400E' : '#4B5563',
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px'
                        }}>
                          {u.status}
                        </span>
                        {u.detected_version && <span className="text-muted" style={{ fontSize: '0.78rem' }}>{u.detected_version}</span>}
                      </div>
                      <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{u.title}</h4>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                        {u.source_name}
                        {u.source_url && (
                          <>
                            {' · '}
                            <a href={u.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-green)' }}>
                              Source <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {u.status === 'PENDING_REVIEW' && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleApproveUpdate(u.id)}>
                          <CheckCircle2 size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} />
                          Approve for AI
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDismissUpdate(u.id)}>
                          <XCircle size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} />
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>

                  {u.summary && <p style={{ margin: '0.6rem 0 0.35rem', fontSize: '0.88rem' }}>{u.summary}</p>}
                  {u.ai_impact_notes && (
                    <div style={{ fontSize: '0.82rem', background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '6px', marginTop: '0.4rem' }}>
                      <strong>AI BPLO Impact Note:</strong> {u.ai_impact_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PSA PSIC CODES */}
      {activeTab === 'psic' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search PSIC code or title..."
                  value={psicSearch}
                  onChange={e => setPsicSearch(e.target.value)}
                  style={{ paddingLeft: '2rem', minWidth: '220px' }}
                />
              </div>
              {['ALL', 'ACTIVE', 'PENDING_APPROVAL', 'REJECTED'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm ${psicFilter === st ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPsicFilter(st)}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCsvModal(true)}>
                <Upload size={15} style={{ marginRight: '0.3rem', verticalAlign: 'text-bottom' }} />
                Import PSA CSV
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddPsic(true)}>
                <Plus size={15} style={{ marginRight: '0.3rem', verticalAlign: 'text-bottom' }} />
                Add PSIC Code
              </button>
            </div>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem' }}>Code</th>
                  <th style={{ padding: '0.65rem' }}>Official PSA Description</th>
                  <th style={{ padding: '0.65rem' }}>Mapped Category</th>
                  <th style={{ padding: '0.65rem' }}>Version</th>
                  <th style={{ padding: '0.65rem' }}>Status</th>
                  <th style={{ padding: '0.65rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPsic.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.code}</td>
                    <td style={{ padding: '0.65rem' }}>
                      <div>{p.title}</div>
                      {p.section && <div className="text-muted" style={{ fontSize: '0.76rem' }}>{p.section}</div>}
                    </td>
                    <td style={{ padding: '0.65rem', whiteSpace: 'nowrap' }}>{p.industry_category}</td>
                    <td style={{ padding: '0.65rem', fontSize: '0.78rem' }}>{p.source_version}</td>
                    <td style={{ padding: '0.65rem' }}>
                      <span style={{
                        background: p.status === 'ACTIVE' ? '#DCFCE7' : p.status === 'PENDING_APPROVAL' ? '#FEF3C7' : '#FEE2E2',
                        color: p.status === 'ACTIVE' ? '#166534' : p.status === 'PENDING_APPROVAL' ? '#92400E' : '#991B1B',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {p.status !== 'ACTIVE' && (
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleApprovePsic(p.id)}>
                            Approve
                          </button>
                        )}
                        {p.status === 'PENDING_APPROVAL' && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => handleRejectPsic(p.id)}>
                            Reject
                          </button>
                        )}
                        {user?.role === 'system_admin' && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDeletePsic(p.id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: LOG LOCAL ORDINANCE / BULLETIN */}
      {showAddUpdate && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Log Local Ordinance / Regulatory Bulletin</h3>
            <form onSubmit={handleCreateUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="form-input" placeholder="Source Name (e.g. Sangguniang Bayan Roxas)" value={newUpdate.source_name} onChange={e => setNewUpdate({ ...newUpdate, source_name: e.target.value })} required />
              <select className="form-input" value={newUpdate.source_category} onChange={e => setNewUpdate({ ...newUpdate, source_category: e.target.value })}>
                <option value="LOCAL_ORDINANCE">LOCAL_ORDINANCE</option>
                <option value="PSIC">PSIC</option>
                <option value="ARTA_DILG">ARTA_DILG</option>
                <option value="BIR">BIR</option>
                <option value="BFP_DOH">BFP_DOH</option>
              </select>
              <input className="form-input" placeholder="Title / Ordinance No." value={newUpdate.title} onChange={e => setNewUpdate({ ...newUpdate, title: e.target.value })} required />
              <textarea className="form-input" rows={3} placeholder="Summary of changes..." value={newUpdate.summary} onChange={e => setNewUpdate({ ...newUpdate, summary: e.target.value })} required />
              <textarea className="form-input" rows={2} placeholder="Impact on PermitEase rules/fees..." value={newUpdate.ai_impact_notes} onChange={e => setNewUpdate({ ...newUpdate, ai_impact_notes: e.target.value })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem' }}>
                <input type="checkbox" checked={newUpdate.auto_approve} onChange={e => setNewUpdate({ ...newUpdate, auto_approve: e.target.checked })} />
                Approve immediately for AI Assistant &amp; Assessment context
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddUpdate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Bulletin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PSIC CODE */}
      {showAddPsic && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Add / Update PSA PSIC Code</h3>
            <form onSubmit={handleCreatePsic} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="form-input" placeholder="PSIC Code (e.g. 47111)" value={newPsic.code} onChange={e => setNewPsic({ ...newPsic, code: e.target.value })} required />
              <input className="form-input" placeholder="Official PSA Title / Description" value={newPsic.title} onChange={e => setNewPsic({ ...newPsic, title: e.target.value })} required />
              <input className="form-input" placeholder="Section (optional, e.g. G - Wholesale and Retail)" value={newPsic.section} onChange={e => setNewPsic({ ...newPsic, section: e.target.value })} />
              <select className="form-input" value={newPsic.industry_category} onChange={e => setNewPsic({ ...newPsic, industry_category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="form-input" placeholder="Keywords (comma-separated, e.g. sari-sari,grocery)" value={newPsic.mapped_requirement_keywords} onChange={e => setNewPsic({ ...newPsic, mapped_requirement_keywords: e.target.value })} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddPsic(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save PSIC Code</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT PSA CSV */}
      {showCsvModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Import PSA PSIC Codes (CSV)</h3>
            <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '-0.5rem' }}>
              Format: <code>code,title,section,division,industry_category,keywords</code>
            </p>
            <form onSubmit={handleImportCsv} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="form-input" placeholder="Source Version (e.g. PSA PSIC 2025)" value={csvVersion} onChange={e => setCsvVersion(e.target.value)} />
              <textarea
                className="form-input"
                rows={6}
                placeholder={'code,title,section,division,industry_category,keywords\n47911,"Retail sale via internet / online selling",G - Retail,47,Retail,"online,ecommerce,tiktok,shopee"'}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                required
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem' }}>
                <input type="checkbox" checked={csvAutoApprove} onChange={e => setCsvAutoApprove(e.target.checked)} />
                Approve imported codes immediately (otherwise queued as PENDING_APPROVAL)
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCsvModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Import CSV</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRegulatoryUpdates;
