import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle, AlertCircle, Clock, XCircle, FileText, Building2, ChevronRight, Send, Edit, ArrowRight, UploadCloud, X, Printer, Download } from 'lucide-react';
import FeeAssessmentCard from '../components/FeeAssessmentCard';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',            color: '#64748B', bg: '#F1F5F9' },
  SUBMITTED:        { label: 'Submitted',        color: '#2563EB', bg: '#DBEAFE' },
  UNDER_REVIEW:     { label: 'Under Review',     color: '#D97706', bg: '#FEF3C7' },
  NEEDS_CORRECTION: { label: 'Needs Correction', color: '#DC2626', bg: '#FEE2E2' },
  APPROVED:         { label: 'Approved',         color: '#16A34A', bg: '#DCFCE7' },
  REJECTED:         { label: 'Rejected',         color: '#991B1B', bg: '#FEE2E2' },
  CANCELLED:        { label: 'Cancelled',        color: '#64748B', bg: '#F1F5F9' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{ padding: '0.35rem 0.9rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '700', color: cfg.color, backgroundColor: cfg.bg, display: 'inline-block' }}>
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
  const [appNotes, setAppNotes] = useState('');
  const [downloadingSummary, setDownloadingSummary] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadApp = () => {
    setLoading(true);
    fetch(`${API}/applications/${id}`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.message && !data.id) { setError(data.message); setLoading(false); return; }
        setApp(data);
        setLoading(false);
        // Load localStorage
        if (user && user.id) {
          try {
            const savedPrep = localStorage.getItem(`physicalPrep_${user.id}_${id}`);
            if (savedPrep) setPhysicalPrep(JSON.parse(savedPrep));
            const savedNotes = localStorage.getItem(`physicalNotes_${user.id}_${id}`);
            if (savedNotes) setAppNotes(savedNotes);
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

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setAppNotes(val);
    if (user && user.id) {
      localStorage.setItem(`physicalNotes_${user.id}_${id}`, val);
    }
  };

  const handleDownloadSummary = async () => {
    setDownloadingSummary(true);
    try {
      const res = await fetch(`${API}/applications/${id}/preparation-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate summary');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Preparation_Summary_${app.application_number || 'Draft'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Unable to download preparation summary.");
    } finally {
      setDownloadingSummary(false);
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
      loadApp(); // Refresh application data after upload
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

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading application status...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>Unable to load application status.</div>;
  if (!app) return null;

  const canSubmit = ['DRAFT', 'NEEDS_CORRECTION'].includes(app.status);

  // Success screen after submission
  if (successData) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', backgroundColor: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={40} color="#16A34A" />
          </div>
          <h2 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Application Submitted Successfully</h2>
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', padding: '1.5rem', margin: '1.5rem 0', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Application Number</span><div style={{ fontWeight: '700', color: 'var(--primary-green)', fontFamily: 'monospace', fontSize: '1rem' }}>{successData.application_number}</div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Status</span><div><StatusBadge status="SUBMITTED" /></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Business</span><div style={{ fontWeight: '600' }}>{successData.business_name}</div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Type</span><div style={{ fontWeight: '600' }}>{successData.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'}</div></div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Your application has been submitted for LGU review.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => { setSuccessData(null); loadApp(); }} style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>View Application</button>
            <button onClick={() => navigate('/applications')} style={{ backgroundColor: 'white', color: 'var(--primary-green)', border: '2px solid var(--primary-green)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>My Applications</button>
          </div>
        </div>
      </div>
    );
  }

  // Derived Dates from History
  const submittedEvent = app.history?.find(h => h.new_status === 'SUBMITTED' || h.action.includes('Submitted'));
  const submittedDate = submittedEvent ? new Date(submittedEvent.created_at) : null;
  const decisionEvent = app.history?.find(h => ['APPROVED', 'REJECTED'].includes(h.new_status));
  const decisionDate = decisionEvent ? new Date(decisionEvent.created_at) : null;

  // Stepper Logic
  const getStepperState = () => {
    if (app.status === 'DRAFT') return { step: 1 };
    if (app.status === 'SUBMITTED' || app.status === 'NEEDS_CORRECTION') return { step: 2 };
    if (app.status === 'UNDER_REVIEW') return { step: 3 };
    if (['APPROVED', 'REJECTED'].includes(app.status)) return { step: 4 };
    return { step: 1 };
  };
  const { step } = getStepperState();

  const getWhatHappensNext = () => {
    switch (app.status) {
      case 'DRAFT': return "Complete the required information and documents, then submit your application.";
      case 'SUBMITTED': return "Your application is waiting for review by an LGU Administrator.";
      case 'UNDER_REVIEW': return "The LGU Administrator is reviewing your application. No action is required from you at this time.";
      case 'NEEDS_CORRECTION': return "Review the LGU's correction notes, update the required information or documents, and resubmit your application.";
      case 'APPROVED': return "Your application has been approved. Follow the municipality's next steps for permit issuance.";
      case 'REJECTED': return "Review the rejection reason and contact the appropriate LGU office if clarification is needed.";
      default: return "";
    }
  };

  const getStatusDisplay = () => {
    switch (app.status) {
      case 'DRAFT': return { title: 'Draft Application', desc: 'This application has not yet been submitted.', actionTitle: 'Continue Application' };
      case 'SUBMITTED': return { title: 'Application Submitted', desc: 'Your application has been successfully submitted and is waiting for LGU review.', actionTitle: 'No action required.' };
      case 'UNDER_REVIEW': return { title: 'Under LGU Review', desc: 'Your application is currently being reviewed by the Municipality.', actionTitle: 'No action required.' };
      case 'NEEDS_CORRECTION': return { title: 'Correction Required', desc: 'The LGU has requested corrections to your application.', actionTitle: 'Fix Application', isAlert: true };
      case 'APPROVED': return { title: 'Application Approved', desc: 'Your business permit application has been approved by the Municipality.', actionTitle: 'No application action required at this stage.', isSuccess: true };
      case 'REJECTED': return { title: 'Application Rejected', desc: 'Your business permit application has been rejected.', actionTitle: 'No direct submission action available.', isDanger: true };
      default: return { title: app.status, desc: '' };
    }
  };

  const statusDisplay = getStatusDisplay();

  const formatDate = (date) => date ? date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
  const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link to="/applications" style={{ color: 'var(--primary-green)', textDecoration: 'none' }}>My Applications</Link>
        <ChevronRight size={14} />
        <span>{app.application_number || 'Draft Application'}</span>
      </div>

      {/* STEP 2 - Business Owner Application Status Header */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '2rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Permit Application</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-green)', fontFamily: 'monospace', marginBottom: '0.5rem' }}>{app.application_number || 'DRAFT'}</div>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem', color: 'var(--text-dark)' }}>{app.business_name}</h1>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{app.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'}</div>
          <a href="/forms/Roxas_Business_Permit_Application_Form.pdf" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', color: '#475569', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem', transition: 'background-color 0.2s' }}>
            <Printer size={16} /> Print Application Form
          </a>
        </div>
        <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Status</div>
            <StatusBadge status={app.status} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Submitted</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-dark)' }}>{formatDate(submittedDate)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN */}
        <div>
          {/* STEP 4 - Status-Specific Display */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '2rem', marginBottom: '2rem', borderTop: statusDisplay.isAlert ? '4px solid #DC2626' : statusDisplay.isSuccess ? '4px solid #16A34A' : statusDisplay.isDanger ? '4px solid #991B1B' : '4px solid var(--primary-green)' }}>
            
            {statusDisplay.isAlert && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', marginBottom: '1rem' }}><AlertCircle size={14} /> ACTION REQUIRED</div>}
            {statusDisplay.isSuccess && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#DCFCE7', color: '#16A34A', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', marginBottom: '1rem' }}><CheckCircle size={14} /> APPROVED</div>}

            <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', color: 'var(--text-dark)' }}>{statusDisplay.title}</h2>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>{statusDisplay.desc}</p>
            
            {app.status === 'NEEDS_CORRECTION' && app.correction_notes && (
              <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: '700', color: '#92400E', marginBottom: '0.5rem' }}>Correction Required</div>
                <div style={{ fontSize: '0.95rem', color: '#78350F' }}>"{app.correction_notes}"</div>
              </div>
            )}

            {app.status === 'REJECTED' && app.rejection_reason && (
              <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: '700', color: '#991B1B', marginBottom: '0.5rem' }}>Reason:</div>
                <div style={{ fontSize: '0.95rem', color: '#7F1D1D' }}>"{app.rejection_reason}"</div>
              </div>
            )}

            {['APPROVED', 'REJECTED'].includes(app.status) && decisionDate && (
              <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{app.status === 'APPROVED' ? 'Approved Date:' : 'Rejected Date:'} </span>
                <span style={{ fontWeight: '600' }}>{formatDate(decisionDate)}</span>
              </div>
            )}

            {/* STEP 5 - What Happens Next */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>What Happens Next?</div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{getWhatHappensNext()}</p>
            </div>
            
            {/* STEP 8 - Current Action Area */}
            <div style={{ marginTop: '2rem', backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-dark)' }}>{statusDisplay.actionTitle}</div>
              {canSubmit && (
                <button onClick={() => document.getElementById('review-submit-section').scrollIntoView({ behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
                  {app.status === 'NEEDS_CORRECTION' ? 'Fix Application' : 'Continue Application'} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Business Information (Existing) */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={18} color="var(--primary-green)" /> Business Information</h3>
              {canSubmit && <Link to="/profile" style={{ fontSize: '0.82rem', color: 'var(--primary-green)', textDecoration: 'none', fontWeight: '600' }}><Edit size={14} style={{ verticalAlign: 'middle' }} /> Edit Profile</Link>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Business Name', value: app.business_name },
                { label: 'Business Type', value: app.business_type },
                { label: 'Industry', value: app.industry_category },
                { label: 'Address', value: app.address },
                { label: 'Employees', value: app.employees },
                { label: 'Owner', value: app.owner_name },
                { label: 'Contact', value: app.owner_contact || app.owner_email },
                { label: 'Capitalization', value: app.capitalization ? `₱${Number(app.capitalization).toLocaleString()}` : null },
                { label: 'Gross Sales', value: app.gross_sales ? `₱${Number(app.gross_sales).toLocaleString()}` : null },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-dark)' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements (Existing) */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--primary-green)" /> Requirements</h3>
            {app.requirements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No requirements configured yet. 
                {canSubmit && <Link to="/assessment" style={{ color: 'var(--primary-green)', marginLeft: '0.25rem' }}>Run AI Assessment</Link>} to generate applicable requirements.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {app.requirements.map(req => {
                  const submitted = ['Submitted', 'Approved'].includes(req.req_status);
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      {submitted ? <CheckCircle size={18} color="#16A34A" /> : <AlertCircle size={18} color="#F59E0B" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-dark)' }}>{req.permit_name}</div>
                        {req.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.description}</div>}
                      </div>
                      {!submitted && canSubmit ? (
                        <button 
                          onClick={() => setUploadModal({ isOpen: true, reqName: req.permit_name, reqId: req.id })}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary-green)', backgroundColor: 'transparent', border: '1px solid var(--primary-green)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                          <UploadCloud size={14} /> Upload
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: submitted ? '#16A34A' : '#D97706' }}>
                          {submitted ? 'Submitted' : 'Missing'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Documents (Existing) */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--primary-green)" /> Documents</h3>
              {canSubmit && <Link to="/documents" style={{ fontSize: '0.82rem', color: 'var(--primary-green)', textDecoration: 'none', fontWeight: '600' }}>Manage Documents</Link>}
            </div>
            {app.documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No documents uploaded. <Link to="/documents" style={{ color: 'var(--primary-green)' }}>Upload documents</Link> to complete your application.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {app.documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} color="var(--primary-green)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{doc.document_name}</span>
                    </div>
                    <div style={{ display: 'flex', align: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(doc.upload_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <a href={`http://localhost:5000/uploads/${doc.file_path}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary-green)', textDecoration: 'none', fontWeight: '600' }}>View</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Physical Document Preparation (Task 12) */}
          {['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION'].includes(app.status) && (
            <div className="physical-prep-section" style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={18} color="var(--primary-green)" /> Physical Document Preparation
              </h3>
              <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Your digital application is prepared. Review the documents below and mark what you have physically prepared.
              </p>
              
              {app.status === 'NEEDS_CORRECTION' ? (
                <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', padding: '1rem', marginBottom: '1.5rem', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991B1B', fontWeight: '600', marginBottom: '0.25rem' }}>
                     <AlertCircle size={16} /> CORRECTION REQUIRED
                   </div>
                   <p style={{ margin: '0', fontSize: '0.85rem', color: '#7F1D1D' }}>
                     Resolve the LGU's requested corrections before completing physical preparation.
                   </p>
                </div>
              ) : null}

              {(() => {
                 const submittedReqs = app.requirements.filter(r => ['Submitted', 'Approved'].includes(r.req_status));
                 const printedCount = submittedReqs.filter(r => physicalPrep[r.id]?.printed).length;
                 const isReady = submittedReqs.length > 0 && printedCount === submittedReqs.length;
                 const showReady = isReady && app.status !== 'NEEDS_CORRECTION';
                 
                 return (
                   <>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                       <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dark)' }}>
                         Progress: {printedCount} of {submittedReqs.length} documents marked as Printed
                       </span>
                     </div>
                     <div style={{ height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                       <div style={{ height: '100%', backgroundColor: 'var(--primary-green)', width: submittedReqs.length ? `${(printedCount / submittedReqs.length) * 100}%` : '0%' }}></div>
                     </div>
                     
                     {showReady ? (
                       <div style={{ backgroundColor: '#DCFCE7', borderLeft: '4px solid #16A34A', padding: '1rem', marginBottom: '1.5rem', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: '600', marginBottom: '0.25rem' }}>
                           <CheckCircle size={16} /> READY FOR PHYSICAL SUBMISSION
                         </div>
                         <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#14532D' }}>
                           Your physical preparation checklist is complete. You can now bring your documents to the BPLO.
                         </p>
                         <div style={{ display: 'flex', gap: '0.75rem' }}>
                           <button onClick={handleDownloadSummary} disabled={downloadingSummary} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'white', color: '#166534', border: '1px solid #16A34A', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: '600', cursor: downloadingSummary ? 'wait' : 'pointer' }}>
                             <Download size={14} /> {downloadingSummary ? 'Generating...' : 'Download Preparation Summary'}
                           </button>
                           <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'transparent', color: '#166534', border: 'none', textDecoration: 'underline', padding: '0.5rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
                             <Printer size={14} /> Print Checklist
                           </button>
                         </div>
                       </div>
                     ) : (
                       app.status !== 'NEEDS_CORRECTION' && submittedReqs.length > 0 && (
                         <div style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #D97706', padding: '1rem', marginBottom: '1.5rem', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E', fontWeight: '600', marginBottom: '0.25rem' }}>
                             <AlertCircle size={16} /> PHYSICAL PREPARATION INCOMPLETE
                           </div>
                           <p style={{ margin: '0', fontSize: '0.85rem', color: '#78350F' }}>
                             {submittedReqs.length - printedCount} documents not yet marked as Printed. Review the checklist below.
                           </p>
                         </div>
                       )
                     )}

                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                       {app.requirements.map(req => {
                         const submitted = ['Submitted', 'Approved'].includes(req.req_status);
                         const prepState = physicalPrep[req.id] || { printed: false, signed: false, photocopied: false };
                         
                         return (
                           <div key={req.id} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                               <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-dark)' }}>{req.permit_name}</div>
                               <div style={{ fontSize: '0.8rem', fontWeight: '600', color: submitted ? '#16A34A' : '#D97706', backgroundColor: submitted ? '#DCFCE7' : '#FEF3C7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                 Digital: {submitted ? '✓ Submitted' : '⚠ Missing'}
                               </div>
                             </div>
                             
                             {submitted ? (
                               <>
                                 <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                                   Physical preparation instructions are not configured. Please verify the current BPLO instructions.
                                 </p>
                                 <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-dark)' }}>
                                     <input type="checkbox" checked={prepState.printed} onChange={() => handlePrepToggle(req.id, 'printed')} style={{ accentColor: 'var(--primary-green)' }} /> Printed
                                   </label>
                                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-dark)' }}>
                                     <input type="checkbox" checked={prepState.signed} onChange={() => handlePrepToggle(req.id, 'signed')} style={{ accentColor: 'var(--primary-green)' }} /> Signed
                                   </label>
                                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-dark)' }}>
                                     <input type="checkbox" checked={prepState.photocopied} onChange={() => handlePrepToggle(req.id, 'photocopied')} style={{ accentColor: 'var(--primary-green)' }} /> Photocopied
                                   </label>
                                 </div>
                               </>
                             ) : (
                               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                                 Physical preparation is not available until the digital document is uploaded.
                                 {app.status !== 'UNDER_REVIEW' && (
                                   <div style={{ marginTop: '0.5rem' }}>
                                     <button onClick={() => setUploadModal({ isOpen: true, reqName: req.permit_name, reqId: req.id })} style={{ background: 'none', border: 'none', color: 'var(--primary-green)', textDecoration: 'underline', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
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

                     <div style={{ marginTop: '1rem' }}>
                       <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Personal Notes (Optional)</label>
                       <textarea 
                         value={appNotes}
                         onChange={handleNotesChange}
                         placeholder="Add any reminders for your BPLO visit..."
                         style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical' }}
                       />
                     </div>
                   </>
                 );
              })()}
            </div>
          )}

          {/* Review & Submit (Existing) */}
          {canSubmit && (
            <div id="review-submit-section" style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Review & Submit</h3>
              {submitError && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>{submitError}</div>
              )}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: '3px', accentColor: 'var(--primary-green)', flexShrink: 0 }} />
                I confirm that the information and documents provided are accurate and complete.
              </label>
              <button
                onClick={handleSubmit}
                disabled={!confirmed || submitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: confirmed && !submitting ? 'var(--primary-green)' : '#9CA3AF', color: 'white', border: 'none', padding: '0.875rem 2rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: confirmed && !submitting ? 'pointer' : 'not-allowed', fontSize: '0.95rem' }}
              >
                <Send size={16} />
                {submitting ? 'Submitting...' : app.status === 'NEEDS_CORRECTION' ? 'Resubmit Application' : 'Submit Application'}
              </button>
            </div>
          )}
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

          {/* Fee Assessment Card */}
          <FeeAssessmentCard applicationId={app.id} />

          {/* STEP 6 & 7 - Application Activity Timeline */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginTop: '1.5rem' }}>
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

      {/* Upload Document Modal */}
      {uploadModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '500px', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Upload Document</h2>
              <button onClick={() => setUploadModal({ isOpen: false, reqName: '', reqId: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {uploadError && <div style={{ color: '#DC2626', backgroundColor: '#FEE2E2', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>{uploadError}</div>}
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Document Type</label>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-dark)' }}>{uploadModal.reqName}</div>
              </div>

              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer', background: '#FAFAFA', position: 'relative' }}>
                <FileText size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--text-dark)', marginBottom: '0.5rem', fontWeight: '500' }}>{file ? file.name : 'Click to select a file'}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, JPG, PNG supported</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setUploadModal({ isOpen: false, reqName: '', reqId: null })} style={{ flex: 1, padding: '0.875rem', backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={handleUpload} disabled={uploadingDoc} style={{ flex: 1, padding: '0.875rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: uploadingDoc ? 'not-allowed' : 'pointer' }}>
                  {uploadingDoc ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
