import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle, AlertCircle, FileText, ChevronRight, Send, UploadCloud, X, Printer, Download, Info } from 'lucide-react';
import FeeAssessmentCard from '../components/FeeAssessmentCard';
import UnifiedApplicationFormView from '../components/UnifiedApplicationFormView';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',                    color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  PREPARED:         { label: 'Prepared',                 color: '#1E40AF', bg: '#DBEAFE', dot: '#3B82F6' },
  SUBMITTED:        { label: 'Submitted to BPLO',        color: '#1E3A8A', bg: '#EFF6FF', dot: '#2563EB' },
  UNDER_REVIEW:     { label: 'Under Review',             color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  NEEDS_CORRECTION: { label: 'For Compliance',           color: '#9A3412', bg: '#FFEDD5', dot: '#EA580C' },
  APPROVED:         { label: 'Preparation Verified',     color: '#166534', bg: '#DCFCE7', dot: '#22C55E' },
  REJECTED:         { label: 'Corrections Requested',    color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
  CANCELLED:        { label: 'Cancelled',                color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  COMPLETED:        { label: 'Completed',                color: '#14532D', bg: '#F0FDF4', dot: '#16A34A' }
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
      padding: '0.25rem 0.6rem', borderRadius: '4px', 
      fontSize: '0.75rem', fontWeight: '600', 
      color: cfg.color, backgroundColor: cfg.bg,
      border: `1px solid ${cfg.bg}` 
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.dot }}></span>
      {cfg.label}
    </span>
  );
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const handleDownload = async (docId, docName) => {
    try {
      const res = await fetch(`${API}/documents/download/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        alert('Failed to download document.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download document.');
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Document Upload Modal State
  const [uploadModal, setUploadModal] = useState({ isOpen: false, reqName: '', reqId: null });
  const [file, setFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Physical Preparation Checklist State
  const [physicalPrep, setPhysicalPrep] = useState({});

  const headers = { Authorization: `Bearer ${token}` };

  const loadApp = () => {
    setLoading(true);
    fetch(`${API}/applications/${id}`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.message && !data.id) { setError(data.message); setLoading(false); return; }
        setApp(data);
        setLoading(false);
        if (user && user.id) {
          try {
            const savedPrep = localStorage.getItem(`physicalPrep_${user.id}_${id}`);
            if (savedPrep) setPhysicalPrep(JSON.parse(savedPrep));
          } catch (e) {
            console.error("Failed parsing localStorage", e);
          }
        }
      })
      .catch(() => { setError('Unable to load application.'); setLoading(false); });
  };

  useEffect(() => { loadApp(); }, [id]);

  const handlePrepToggle = (reqId, field) => {
    const updated = { ...physicalPrep };
    if (!updated[reqId]) updated[reqId] = { printed: false, signed: false, photocopied: false };
    updated[reqId][field] = !updated[reqId][field];
    setPhysicalPrep(updated);
    if (user && user.id) {
      localStorage.setItem(`physicalPrep_${user.id}_${id}`, JSON.stringify(updated));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setUploadError('Please select a file'); return; }
    setUploadingDoc(true);
    setUploadError('');
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('business_id', app.business_id);
      uploadData.append('document_name', uploadModal.reqName);
      if (uploadModal.reqId) {
        uploadData.append('requirement_id', uploadModal.reqId);
      }
      
      const res = await fetch(`${API}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      
      setUploadModal({ isOpen: false, reqName: '', reqId: null });
      setFile(null);
      loadApp();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/applications/${id}/submit`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.message || 'Unable to submit.'); setSubmitting(false); return; }
      setSuccessData(data);
    } catch {
      setSubmitError('Unable to submit application. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>Loading application details...</div>;
  if (error) return <div style={{ padding: '4rem', textAlign: 'center', color: '#DC2626' }}>{error}</div>;
  if (!app) return null;

  const canSubmit = ['DRAFT', 'NEEDS_CORRECTION'].includes(app.status);

  // Success screen after submission
  if (successData) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={32} color="#166534" />
          </div>
          <h2 style={{ color: 'var(--government-navy)', margin: '0 0 0.5rem', fontSize: '24px' }}>Application Prepared Successfully</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 2rem' }}>Your application requirements have been recorded in PermitEase.</p>
          
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '1.5rem', margin: '0 0 2rem', textAlign: 'left', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
              <div><div style={{ color: '#64748B', fontSize: '12px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Application ID</div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontFamily: 'monospace' }}>{successData.application_number}</div></div>
              <div><div style={{ color: '#64748B', fontSize: '12px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Status</div><div><StatusBadge status="SUBMITTED" /></div></div>
              <div><div style={{ color: '#64748B', fontSize: '12px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Business</div><div style={{ fontWeight: '600', color: 'var(--government-navy)' }}>{successData.business_name}</div></div>
              <div><div style={{ color: '#64748B', fontSize: '12px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Type</div><div style={{ fontWeight: '600', color: 'var(--government-navy)' }}>{successData.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'}</div></div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => { setSuccessData(null); loadApp(); }} style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}>View Application</button>
            <button onClick={() => navigate('/applications')} style={{ backgroundColor: 'white', color: 'var(--government-navy)', border: '1px solid #CBD5E1', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}>My Applications</button>
          </div>
        </div>
      </div>
    );
  }

  const submittedEvent = app.history?.find(h => h.new_status === 'SUBMITTED' || h.action.includes('Submitted'));
  const submittedDate = submittedEvent ? new Date(submittedEvent.created_at) : null;

  const formatDate = (date) => date ? date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
  
  // Timeline Logic
  const timelineSteps = [
    { id: 'prep', label: 'Preparation', desc: 'Business information completed', isDone: true, isCurrent: app.status === 'DRAFT' },
    { id: 'ready', label: 'Ready for BPLO Submission', desc: 'Requirements prepared', isDone: app.status !== 'DRAFT', isCurrent: false },
    { id: 'submit', label: 'Submitted to BPLO', desc: 'Physical documents submitted', isDone: ['UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'COMPLETED', 'REJECTED'].includes(app.status), isCurrent: app.status === 'SUBMITTED' },
    { id: 'review', label: 'Under Review', desc: 'Awaiting BPLO pre-assessment review', isDone: ['APPROVED', 'COMPLETED', 'REJECTED'].includes(app.status), isCurrent: app.status === 'UNDER_REVIEW' },
  ];
  if (app.status === 'NEEDS_CORRECTION') {
    timelineSteps.push({ id: 'compliance', label: 'Corrections Requested', desc: 'BPLO requested preparation corrections', isDone: false, isCurrent: true, color: '#EA580C' });
  }
  if (['APPROVED', 'COMPLETED', 'REJECTED'].includes(app.status)) {
    timelineSteps.push({ 
      id: 'decision', 
      label: app.status === 'REJECTED' ? 'Corrections Requested' : 'Preparation Verified', 
      desc: app.status === 'REJECTED' ? 'Preparation corrections requested by BPLO' : 'Preparation verified by BPLO — proceed to official BPLO office', 
      isDone: true, 
      isCurrent: true,
      color: app.status === 'REJECTED' ? '#EF4444' : '#22C55E' 
    });
  } else {
    timelineSteps.push({ id: 'verified', label: 'Preparation Verified', desc: 'Proceed to official BPLO processing', isDone: false, isCurrent: false });
  }

  return (
    <div className="page-container app-detail-page" style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '13px', color: '#64748B' }}>
        <Link to="/applications" style={{ color: 'var(--primary-green)', textDecoration: 'none' }}>My Applications</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--government-navy)', fontWeight: '500' }}>{app.application_number || 'Draft Application'}</span>
      </div>

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Application {app.application_number ? `#${app.application_number}` : 'Draft'}
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 0.25rem', color: 'var(--government-navy)' }}>
            {app.business_name}
          </h1>
          <div style={{ color: '#64748B', fontSize: '15px', margin: 0 }}>
            {app.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'} • <StatusBadge status={app.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.625rem 1.1rem', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
          >
            <Printer size={16} /> Print Pre-filled Form
          </button>
          <a href="/forms/Roxas_Business_Permit_Application_Form.pdf" download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf" target="_blank" rel="noopener noreferrer" 
             style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', color: 'var(--government-navy)', border: '1px solid #CBD5E1', padding: '0.625rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '500', fontSize: '14px' }}>
            <Download size={16} /> Download Blank PDF
          </a>
        </div>
      </header>

      {/* OFFICIAL PROCESS NOTICE */}
      <div className="no-print" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <Info size={18} color="#0284C7" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0369A1', marginBottom: '0.25rem' }}>OFFICIAL PROCESS</div>
          <p style={{ fontSize: '13px', color: '#0C4A6E', margin: 0, lineHeight: 1.5 }}>
            PermitEase is used to help you prepare and track your application. Official document review, assessment, signatures, payment, and permit processing are handled by the appropriate Municipality of Roxas / BPLO office.
          </p>
        </div>
      </div>

      <div className="app-detail-grid">
        
        {/* LEFT COLUMN: MAIN CONTENT */}
        <div className="app-detail-main">
          
          {/* Unified Application Form View */}
          <section style={{ marginBottom: '2.5rem' }}>
            <UnifiedApplicationFormView app={app} printable={true} showInstructions={true} />
          </section>

          {/* Documents Section */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '650', color: 'var(--government-navy)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--primary-green)" /> Application Documents
            </h2>
            <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              {app.documents && app.documents.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <tr>
                      {['Document Name', 'Status', 'Date', 'Action'].map(h => (
                        <th key={h} style={{ padding: '0.875rem 1.25rem', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {app.documents.map((doc, i) => (
                      <tr key={doc.id} style={{ borderBottom: i < app.documents.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)' }}>
                          {doc.document_name}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#166534', backgroundColor: '#DCFCE7', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>Prepared</span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '13px', color: '#64748B' }}>
                          {new Date(doc.upload_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <button onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name); }} style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-green)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.25rem' }}>No documents recorded</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Documents prepared through PermitEase can be tracked here.</div>
                </div>
              )}
            </div>
          </section>

          {/* Physical Document Preparation */}
          {['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION'].includes(app.status) && (
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '650', color: 'var(--government-navy)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={20} color="var(--primary-green)" /> Physical Document Preparation
              </h2>
              <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
                <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: '#64748B' }}>
                  Your digital application is prepared. Review the documents below and mark what you have physically prepared.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {app.requirements.map(req => {
                    const submitted = ['Submitted', 'Approved'].includes(req.req_status);
                    const prepState = physicalPrep[req.id] || { printed: false, signed: false, photocopied: false };
                    
                    return (
                      <div key={req.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--government-navy)' }}>{req.permit_name}</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: submitted ? '#166534' : '#92400E', backgroundColor: submitted ? '#DCFCE7' : '#FEF3C7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            Digital: {submitted ? '✓ Prepared' : '⚠ Missing'}
                          </div>
                        </div>
                        
                        {submitted ? (
                          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer', color: 'var(--government-navy)' }}>
                              <input type="checkbox" checked={prepState.printed} onChange={() => handlePrepToggle(req.id, 'printed')} style={{ accentColor: 'var(--primary-green)' }} /> Printed
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer', color: 'var(--government-navy)' }}>
                              <input type="checkbox" checked={prepState.signed} onChange={() => handlePrepToggle(req.id, 'signed')} style={{ accentColor: 'var(--primary-green)' }} /> Signed
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer', color: 'var(--government-navy)' }}>
                              <input type="checkbox" checked={prepState.photocopied} onChange={() => handlePrepToggle(req.id, 'photocopied')} style={{ accentColor: 'var(--primary-green)' }} /> Photocopied
                            </label>
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: '#64748B', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                            Physical preparation is not available until the digital document is uploaded.
                            {app.status !== 'UNDER_REVIEW' && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <button onClick={() => setUploadModal({ isOpen: true, reqName: req.permit_name, reqId: req.id })} style={{ background: 'none', border: 'none', color: 'var(--primary-green)', textDecoration: 'underline', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                                  Upload Document
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Action Area */}
          {canSubmit && (
            <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
              {submitError && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '14px' }}>{submitError}</div>
              )}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '14px', color: 'var(--government-navy)' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: '3px', accentColor: 'var(--primary-green)', flexShrink: 0 }} />
                I confirm that the information and documents provided are accurate and complete.
              </label>
              <button
                onClick={handleSubmit}
                disabled={!confirmed || submitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: confirmed && !submitting ? 'var(--primary-green)' : '#9CA3AF', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: '500', cursor: confirmed && !submitting ? 'pointer' : 'not-allowed', fontSize: '14px' }}
              >
                <Send size={16} />
                {submitting ? 'Preparing...' : 'Prepare Application'}
              </button>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: STATUS & TIMELINE */}
        <div className="app-detail-sidebar">
          
          <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '650', color: 'var(--government-navy)', margin: '0 0 1rem' }}>Application Status</h3>
            <div style={{ marginBottom: '1.25rem' }}>
              <StatusBadge status={app.status} />
              {submittedDate && (
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '0.5rem' }}>
                  Submitted: {formatDate(submittedDate)}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {timelineSteps.map((s, i, arr) => {
                const color = s.color || 'var(--primary-green)';
                return (
                  <div key={s.id} style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                      <div style={{ 
                        width: '20px', height: '20px', borderRadius: '50%', 
                        backgroundColor: s.isDone ? color : s.isCurrent ? 'white' : '#F8FAFC', 
                        border: `2px solid ${s.isDone || s.isCurrent ? color : '#E2E8F0'}`, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 
                      }}>
                        {s.isDone ? <CheckCircle size={12} color="white" /> : s.isCurrent ? <div style={{ width: '6px', height: '6px', backgroundColor: color, borderRadius: '50%' }} /> : null}
                      </div>
                      {i < arr.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: s.isDone ? color : '#E2E8F0', margin: '4px 0' }} />}
                    </div>
                    <div style={{ paddingBottom: i < arr.length - 1 ? '1.5rem' : '0' }}>
                      <div style={{ fontSize: '14px', fontWeight: s.isCurrent || s.isDone ? '600' : '500', color: s.isCurrent || s.isDone ? 'var(--government-navy)' : '#94A3B8' }}>{s.label}</div>
                      <div style={{ fontSize: '12px', color: s.isCurrent ? color : '#94A3B8', marginTop: '0.15rem' }}>{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <FeeAssessmentCard applicationId={app.id} />

        </div>
      </div>

      {/* Upload Modal (Existing) */}
      {uploadModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '10px', width: '100%', maxWidth: '400px', padding: '1.5rem', position: 'relative' }}>
            <button onClick={() => setUploadModal({ isOpen: false, reqName: '', reqId: null })} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 1rem', fontSize: '18px', fontWeight: '600', color: 'var(--government-navy)' }}>Upload Document</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: '#64748B' }}>Requirement: <strong style={{ color: 'var(--government-navy)' }}>{uploadModal.reqName}</strong></p>
            {uploadError && <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '13px' }}>{uploadError}</div>}
            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: '1.5rem' }}>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ width: '100%', fontSize: '14px' }} accept=".pdf,.jpg,.jpeg,.png" required />
                <p style={{ margin: '0.5rem 0 0', fontSize: '12px', color: '#94A3B8' }}>Supported formats: PDF, JPG, PNG.</p>
              </div>
              <button type="submit" disabled={uploadingDoc || !file} style={{ width: '100%', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: '500', cursor: uploadingDoc || !file ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                {uploadingDoc ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
