import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle, XCircle, AlertCircle, Clock, Building2, FileText, ChevronRight, Play, RotateCcw, Shield } from 'lucide-react';
import FeeAssessmentCard from '../components/FeeAssessmentCard';

const API = 'http://localhost:5000/api';

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',            color: '#64748B', bg: '#F1F5F9' },
  SUBMITTED:        { label: 'Submitted',        color: '#2563EB', bg: '#DBEAFE' },
  UNDER_REVIEW:     { label: 'Under Review',     color: '#D97706', bg: '#FEF3C7' },
  NEEDS_CORRECTION: { label: 'Needs Correction', color: '#DC2626', bg: '#FEE2E2' },
  APPROVED:         { label: 'Approved',         color: '#16A34A', bg: '#DCFCE7' },
  REJECTED:         { label: 'Rejected',         color: '#991B1B', bg: '#FEE2E2' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{ padding: '0.35rem 0.9rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '700', color: cfg.color, backgroundColor: cfg.bg, display: 'inline-block' }}>
      {cfg.label}
    </span>
  );
};

// Reusable confirmation modal
const ConfirmModal = ({ title, description, inputLabel, inputRequired, onConfirm, onCancel, confirmText = 'Confirm', confirmColor = 'var(--primary-green)', loading }) => {
  const [note, setNote] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '2rem', width: '90%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-dark)', fontSize: '1.15rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: inputLabel ? '1.25rem' : '1.5rem' }}>{description}</p>
        {inputLabel && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>{inputLabel}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
              placeholder="Enter reason..." />
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '0.65rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>Cancel</button>
          <button onClick={() => onConfirm(note)} disabled={loading || (inputRequired && !note.trim())}
            style={{ padding: '0.65rem 1.5rem', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: (loading || (inputRequired && !note.trim())) ? '#9CA3AF' : confirmColor, color: 'white', cursor: (loading || (inputRequired && !note.trim())) ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function LGUApplicationReview() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState(null); // 'review' | 'correction' | 'approve' | 'reject'
  const headers = { Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch(`${API}/applications/${id}`, { headers })
      .then(r => r.json())
      .then(data => { if (data.message && !data.id) { setError(data.message); } else { setApp(data); } setLoading(false); })
      .catch(() => { setError('Unable to load application.'); setLoading(false); });
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (endpoint, body = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/applications/admin/${id}/${endpoint}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Action failed.'); setActionLoading(false); return; }
      setModal(null);
      load();
    } catch { alert('An error occurred. Please try again.'); }
    setActionLoading(false);
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading application status...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>Unable to load application status.</div>;
  if (!app) return null;

  const canStartReview = app.status === 'SUBMITTED';
  const canAct = app.status === 'UNDER_REVIEW';

  // Derived Dates from History
  const submittedEvent = app.history?.find(h => h.new_status === 'SUBMITTED' || h.action.includes('Submitted'));
  const submittedDate = submittedEvent ? new Date(submittedEvent.created_at) : null;
  const decisionEvent = app.history?.find(h => ['APPROVED', 'REJECTED'].includes(h.new_status));
  const decisionDate = decisionEvent ? new Date(decisionEvent.created_at) : null;

  const getStepperState = () => {
    if (app.status === 'DRAFT') return { step: 1 };
    if (app.status === 'SUBMITTED' || app.status === 'NEEDS_CORRECTION') return { step: 2 };
    if (app.status === 'UNDER_REVIEW') return { step: 3 };
    if (['APPROVED', 'REJECTED'].includes(app.status)) return { step: 4 };
    return { step: 1 };
  };
  const { step } = getStepperState();

  const formatDate = (date) => date ? date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
  const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Modals */}
      {modal === 'review' && (
        <ConfirmModal title="Start Review" description={`Are you sure you want to start reviewing application ${app.application_number}?`} confirmText="Start Review" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={() => doAction('start-review')} />
      )}
      {modal === 'correction' && (
        <ConfirmModal title="Request Correction" description="Describe what the business owner needs to fix or provide." inputLabel="Correction Notes" inputRequired confirmText="Request Correction" confirmColor="#D97706" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={(note) => doAction('request-correction', { correction_notes: note })} />
      )}
      {modal === 'approve' && (
        <ConfirmModal title="Approve Application" description={`Confirm approval of application ${app.application_number} for ${app.business_name}.`} confirmText="Approve" confirmColor="#16A34A" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={() => doAction('approve')} />
      )}
      {modal === 'reject' && (
        <ConfirmModal title="Reject Application" description="This action cannot be easily undone. Please provide a clear rejection reason for the business owner." inputLabel="Rejection Reason" inputRequired confirmText="Reject Application" confirmColor="#DC2626" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={(reason) => doAction('reject', { rejection_reason: reason })} />
      )}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link to="/admin/applications" style={{ color: 'var(--primary-green)', textDecoration: 'none' }}>Applications</Link>
        <ChevronRight size={14} />
        <span>{app.application_number}</span>
      </div>

      {/* STEP 10 - LGU Review Summary */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '2rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Application</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-green)', fontFamily: 'monospace', marginBottom: '0.5rem' }}>{app.application_number}</div>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem', color: 'var(--text-dark)' }}>{app.business_name}</h1>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{app.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'}</div>
        </div>
        <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Current Status</div>
            <StatusBadge status={app.status} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Submitted</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-dark)' }}>{formatDate(submittedDate)}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {canStartReview && (
          <button onClick={() => setModal('review')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#2563EB', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
            <Play size={16} /> Start Review
          </button>
        )}
        {canAct && (
          <>
            <button onClick={() => setModal('correction')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#D97706', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
              <RotateCcw size={16} /> Request Correction
            </button>
            <button onClick={() => setModal('approve')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#16A34A', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
              <CheckCircle size={16} /> Approve
            </button>
            <button onClick={() => setModal('reject')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#DC2626', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
              <XCircle size={16} /> Reject
            </button>
          </>
        )}
        {app.status === 'APPROVED' && (
          <Link to="/admin/permits" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', textDecoration: 'none', fontSize: '0.9rem' }}>
            <Shield size={16} /> View Issued Permit
          </Link>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN */}
        <div>
          {/* Business Info */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={18} color="var(--primary-green)" /> Business Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Business Name', value: app.business_name },
                { label: 'Business Type', value: app.business_type },
                { label: 'Industry', value: app.industry_category },
                { label: 'Address', value: app.address },
                { label: 'Owner', value: app.owner_name },
                { label: 'Email', value: app.owner_email },
                { label: 'Contact', value: app.owner_contact || '—' },
                { label: 'Employees', value: app.employees },
                { label: 'Capitalization', value: app.capitalization ? `₱${Number(app.capitalization).toLocaleString()}` : '—' },
                { label: 'Gross Sales', value: app.gross_sales ? `₱${Number(app.gross_sales).toLocaleString()}` : '—' },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.label}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--primary-green)" /> Requirements</h3>
            {app.requirements.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No requirements linked to this business yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {app.requirements.map(req => {
                  const done = ['Submitted', 'Approved'].includes(req.req_status);
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: done ? '#F0FDF4' : '#FFF7ED', borderRadius: 'var(--radius-sm)', border: `1px solid ${done ? '#BBF7D0' : '#FED7AA'}` }}>
                      {done ? <CheckCircle size={18} color="#16A34A" /> : <AlertCircle size={18} color="#F59E0B" />}
                      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500' }}>{req.permit_name}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: done ? '#16A34A' : '#D97706' }}>{done ? 'Submitted' : 'Missing'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Documents */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--primary-green)" /> Submitted Documents</h3>
            {app.documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No documents submitted.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {app.documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} color="var(--primary-green)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{doc.document_name}</span>
                    </div>
                    <a href={`http://localhost:5000/uploads/${doc.file_path}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: 'var(--primary-green)', textDecoration: 'none', fontWeight: '600' }}>View File</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* RIGHT COLUMN */}
        <div>
          {/* STEP 3 - Professional Application Stepper */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>Progress Tracker</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { num: 1, title: 'Application', isDone: step > 1, isActive: step === 1, sub: step > 1 ? 'Completed' : step === 1 ? 'Current' : '' },
                { num: 2, title: 'Submitted', isDone: step > 2, isActive: step === 2, sub: step > 2 ? formatDate(submittedDate) : step === 2 ? 'In Progress' : 'Pending' },
                { num: 3, title: 'LGU Review', isDone: step > 3, isActive: step === 3, sub: step > 3 ? 'Completed' : step === 3 ? 'Currently being reviewed' : 'Pending' },
                { num: 4, title: 'Decision', isDone: step === 4 && ['APPROVED', 'REJECTED'].includes(app.status), isActive: step === 4, sub: step === 4 ? (app.status === 'APPROVED' ? 'Approved' : 'Rejected') : 'Pending' }
              ].map((s, i, arr) => (
                <div key={s.title} style={{ display: 'flex', gap: '1rem', minHeight: '3.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: s.isDone ? 'var(--primary-green)' : s.isActive ? 'var(--light-green)' : '#F1F5F9', border: `2px solid ${s.isDone || s.isActive ? 'var(--primary-green)' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }}>
                      {s.isDone ? <CheckCircle size={14} color="white" /> : s.isActive ? <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--primary-green)', borderRadius: '50%' }} /> : <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: '700' }}>{s.num}</span>}
                    </div>
                    {i < arr.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: s.isDone ? 'var(--primary-green)' : '#E2E8F0', marginTop: '4px', marginBottom: '4px' }} />}
                  </div>
                  <div style={{ paddingBottom: '1.25rem', paddingTop: '1px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: s.isActive || s.isDone ? '700' : '500', color: s.isActive || s.isDone ? 'var(--text-dark)' : 'var(--text-muted)' }}>{s.title}</div>
                    <div style={{ fontSize: '0.8rem', color: s.isActive ? 'var(--primary-green)' : 'var(--text-muted)', fontWeight: s.isActive ? '600' : '400', marginTop: '0.15rem' }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Assessment Card — System Estimate */}
          <div style={{ marginBottom: '1.5rem' }}>
            <FeeAssessmentCard applicationId={app.id} isAdminView />
          </div>

          {/* STEP 6 & 7 - Application Activity Timeline */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} color="var(--primary-green)" /> Application Activity</h3>
            {!app.history || app.history.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Application activity will appear here as your application progresses.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {app.history.map((h, i, arr) => {
                  const isActionRequired = h.action.includes('Correction Requested');
                  return (
                    <div key={h.id} style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', border: `2px solid ${isActionRequired ? '#D97706' : 'var(--primary-green)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }}>
                          {isActionRequired ? <AlertCircle size={10} color="#D97706" /> : <CheckCircle size={10} color="var(--primary-green)" />}
                        </div>
                        {i < arr.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border-light)', marginTop: '4px', marginBottom: '4px' }} />}
                      </div>
                      <div style={{ paddingBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dark)' }}>{h.action}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{formatDateTime(h.created_at)}</div>
                        
                        {h.remarks && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569', backgroundColor: isActionRequired ? '#FEF3C7' : '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${isActionRequired ? '#D97706' : '#CBD5E1'}` }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.15rem', textTransform: 'uppercase' }}>
                              By {h.actor_name}
                            </div>
                            "{h.remarks}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Append current state visually if under review but history stops */}
                {app.status === 'UNDER_REVIEW' && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }} />
                    </div>
                    <div style={{ paddingBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary-green)' }}>Currently Under Review</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
