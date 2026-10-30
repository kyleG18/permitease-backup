import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle, XCircle, AlertCircle, Clock, FileText, ChevronRight, Play, RotateCcw, Shield, Edit3, Printer, Eye } from 'lucide-react';
import FeeAssessmentCard from '../components/FeeAssessmentCard';
import UnifiedApplicationFormView from '../components/UnifiedApplicationFormView';
import FormBPLOEditModal from '../components/FormBPLOEditModal';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',                   color: '#64748B', bg: '#F1F5F9' },
  SUBMITTED:        { label: 'Submitted',               color: '#2563EB', bg: '#DBEAFE' },
  UNDER_REVIEW:     { label: 'Under Review',            color: '#D97706', bg: '#FEF3C7' },
  NEEDS_CORRECTION: { label: 'Needs Correction',        color: '#DC2626', bg: '#FEE2E2' },
  APPROVED:         { label: 'Verified',                color: '#16A34A', bg: '#DCFCE7' },
  REJECTED:         { label: 'Corrections Requested',   color: '#991B1B', bg: '#FEE2E2' },
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
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [modal, setModal] = useState(null); // 'review' | 'correction' | 'approve' | 'reject'

  // Form edit & preview state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFormPreviewOpen, setIsFormPreviewOpen] = useState(false);
  const [formBploData, setFormBploData] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const handleDownload = async (docId, docName) => {
    try {
      const res = await fetch(`${API}/documents/download/${docId}`, { headers });
      if (!res.ok) { alert('Failed to download document.'); return; }
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

  const load = () => {
    setLoading(true);
    fetch(`${API}/applications/${id}`, { headers })
      .then(r => r.json())
      .then(async data => {
        if (data.message && !data.id) {
          setError(data.message);
          setLoading(false);
        } else {
          setApp(data);
          if (data.island_group_id) {
            try {
              const locRes = await fetch(`${API}/locations/resolve?islandGroup=${data.island_group_id}&region=${data.region_id}&province=${data.province_id || ''}&city=${data.city_municipality_id}&barangay=${data.barangay_id}`);
              const locData = await locRes.json();
              setResolvedLocation(locData);
            } catch (e) {}
          }
          setLoading(false);
        }
      })
      .catch(() => { setError('Unable to load application.'); setLoading(false); });
  };

  useEffect(() => { load(); }, [id]);

  // Initialize editable form data from the loaded application
  useEffect(() => {
    if (!app) return;
    const savedKey = `bplo_form_data_admin_${app.id}`;
    let savedLocal = {};
    try {
      const stored = localStorage.getItem(savedKey);
      if (stored) savedLocal = JSON.parse(stored);
    } catch (e) {}

    const ownerParts = (app.owner_name || '').trim().split(' ');
    const merged = {
      business_id: app.business_id,
      application_number: app.application_number,
      application_type: app.application_type || 'NEW',
      payment_mode: app.payment_mode || 'Annually',
      tax_year: app.tax_year || new Date().getFullYear(),
      application_date: app.created_at
        ? new Date(app.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
      business_name: app.business_name || '',
      trade_name: app.trade_name || app.business_name || '',
      ownership_type: app.ownership_type || 'Sole Proprietorship',
      owner_gender: app.owner_gender || 'Male',
      corp_nationality: app.corp_nationality || 'Filipino',
      dti_sec_cda_number: app.dti_sec_cda_number || app.registration_number || '',
      tin: app.tin || '',
      owner_name: app.owner_name || '',
      owner_surname: ownerParts.length > 1 ? ownerParts.slice(-1)[0] : '',
      owner_given_name: ownerParts.length > 1 ? ownerParts.slice(0, -1).join(' ') : (ownerParts[0] || ''),
      owner_middle_name: '',
      owner_suffix: '',
      signatory_title: (app.ownership_type || '').toLowerCase().includes('corp') ? 'PRESIDENT / CEO' : 'OWNER / PROPRIETOR',
      house_bldg_no: '', building_name: '', lot_no: '', block_no: '',
      street: app.address || '',
      address: app.address || '',
      barangay: app.barangay || 'Poblacion',
      subdivision: '',
      city_municipality: 'Roxas',
      province: 'Oriental Mindoro',
      zip_code: '5212',
      contact_number: app.contact_number || '',
      telephone_no: '',
      email: app.email || '',
      business_area: app.floor_area || '',
      floor_area: app.floor_area || '',
      employees: app.employees || 0,
      employees_male: Math.ceil((app.employees || 0) / 2),
      employees_female: Math.floor((app.employees || 0) / 2),
      employees_residing_lgu: app.employees || 0,
      delivery_trucks: 0, delivery_motorcycles: 0,
      is_owned: !(app.premises_type || '').toLowerCase().includes('rent'),
      tax_dec_no: '', pin_no: '', monthly_rental: '', lessor_name: '',
      has_tax_incentives: false, incentive_details: '',
      business_activity: 'Main Office',
      industry_category: app.industry_category || app.business_type || '',
      business_type: app.business_type || app.industry_category || '',
      primary_products: app.primary_products || 'Commercial Operations',
      units_count: '1',
      capitalization: app.capitalization || '',
      gross_sales: app.gross_sales || '',
      ...savedLocal
    };
    setFormBploData(merged);
  }, [app]);

  const handleSaveFormData = (updatedData) => {
    setFormBploData(updatedData);
    if (app?.id) {
      localStorage.setItem(`bplo_form_data_admin_${app.id}`, JSON.stringify(updatedData));
    }
  };

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

  const submittedEvent = app.history?.find(h => h.new_status === 'SUBMITTED' || h.action.includes('Submitted'));
  const submittedDate = submittedEvent ? new Date(submittedEvent.created_at) : null;
  const decisionEvent = app.history?.find(h => ['APPROVED', 'REJECTED'].includes(h.new_status));

  const getStepperState = () => {
    if (app.status === 'DRAFT') return { step: 1 };
    if (app.status === 'SUBMITTED' || app.status === 'NEEDS_CORRECTION') return { step: 2 };
    if (app.status === 'UNDER_REVIEW') return { step: 3 };
    if (['APPROVED', 'REJECTED'].includes(app.status)) return { step: 4 };
    return { step: 1 };
  };

  const totalReqs = app.requirements?.length || 0;
  const readyReqs = app.requirements?.filter(r => ['Submitted', 'Approved'].includes(r.req_status)).length || 0;
  const readScore = totalReqs > 0 ? Math.round((readyReqs / totalReqs) * 100) : 0;
  const readColor = readScore === 100 ? '#16A34A' : '#F59E0B';
  const { step } = getStepperState();

  const formatDate = (date) => date ? date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
  const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="lgu-review-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Confirmation Modals */}
      {modal === 'review' && (
        <ConfirmModal title="Start Review" description={`Are you sure you want to start reviewing application ${app.application_number}?`} confirmText="Start Review" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={() => doAction('start-review')} />
      )}
      {modal === 'correction' && (
        <ConfirmModal title="Request Correction" description="Describe what the business owner needs to fix or provide." inputLabel="Correction Notes" inputRequired confirmText="Request Correction" confirmColor="#D97706" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={(note) => doAction('request-correction', { correction_notes: note })} />
      )}
      {modal === 'approve' && (
        <ConfirmModal title="Mark as Verified" description={`Mark preparation submission ${app.application_number} for ${app.business_name} as Verified. This confirms the business owner's preparation appears complete. This does NOT constitute official permit approval or issuance by the BPLO.`} confirmText="Mark as Verified" confirmColor="#16A34A" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={() => doAction('approve')} />
      )}
      {modal === 'reject' && (
        <ConfirmModal title="Request Preparation Corrections" description="Describe what the business owner needs to correct or re-submit before their preparation can be verified." inputLabel="Correction Notes" inputRequired confirmText="Request Corrections" confirmColor="#DC2626" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={(reason) => doAction('reject', { rejection_reason: reason })} />
      )}

      {/* Breadcrumb */}
      <div className="lgu-review-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link to="/admin/applications" style={{ color: 'var(--primary-green)', textDecoration: 'none' }}>Pre-Assessments</Link>
        <ChevronRight size={14} />
        <span>{app.application_number}</span>
      </div>

      {/* Header Summary Card */}
      <div className="lgu-review-header-card" style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', padding: '1.75rem 2rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Pre-Assessment Ref.</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#15803D', fontFamily: 'monospace', marginBottom: '0.35rem' }}>{app.application_number}</div>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem', color: '#0F172A', fontWeight: '800' }}>{app.business_name}</h1>
          <div style={{ fontSize: '0.9rem', color: '#64748B' }}>{app.application_type === 'NEW' ? 'New Business Permit Preparation' : 'Renewal Preparation'}</div>
        </div>
        <div className="lgu-review-meta-row" style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Preparation Status</div>
            <StatusBadge status={app.status} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Submitted</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A' }}>{formatDate(submittedDate)}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="lgu-review-actions" style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* ── FORM ACTIONS (Edit & Print) — always visible ── */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', color: '#334155', border: '1px solid #E2E8F0', padding: '0.65rem 1.15rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s ease' }}
        >
          <Edit3 size={15} /> Edit Form Info
        </button>
        <button
          onClick={() => setIsFormPreviewOpen(prev => !prev)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: isFormPreviewOpen ? '#15803D' : '#F0FDF4', color: isFormPreviewOpen ? '#FFFFFF' : '#15803D', border: isFormPreviewOpen ? '1.5px solid #15803D' : '1.5px solid #BBF7D0', padding: '0.65rem 1.15rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s ease' }}
        >
          {isFormPreviewOpen ? <Eye size={15} /> : <Printer size={15} />}
          {isFormPreviewOpen ? 'Hide Form' : 'View & Print Form BPLO-01'}
        </button>

        <div style={{ height: '32px', width: '1px', backgroundColor: '#E2E8F0', margin: '0 0.25rem' }} />

        {/* ── REVIEW WORKFLOW ACTIONS ── */}
        {canStartReview && (
          <button onClick={() => setModal('review')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#15803D', color: 'white', border: 'none', padding: '0.7rem 1.4rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(21,128,61,0.3)' }}>
            <Play size={16} /> Start Review
          </button>
        )}
        {canAct && (
          <>
            <button onClick={() => setModal('correction')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#D97706', color: 'white', border: 'none', padding: '0.7rem 1.4rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}>
              <RotateCcw size={16} /> Request Correction
            </button>
            <button onClick={() => setModal('approve')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#15803D', color: 'white', border: 'none', padding: '0.7rem 1.4rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(21,128,61,0.3)' }}>
              <CheckCircle size={16} /> Mark as Verified
            </button>
            <button onClick={() => setModal('reject')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#DC2626', color: 'white', border: 'none', padding: '0.7rem 1.4rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}>
              <XCircle size={16} /> Request Corrections
            </button>
          </>
        )}
        {app.status === 'APPROVED' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
            <CheckCircle size={16} /> Pre-Assessment Verified
          </div>
        )}
      </div>

      {/* ── PRINTABLE FORM PREVIEW (toggled) ─────────────────────────────── */}
      {isFormPreviewOpen && formBploData && (
        <div style={{ marginBottom: '1.5rem' }}>
          <UnifiedApplicationFormView
            app={formBploData}
            printable={true}
            showInstructions={false}
            onEditInfo={() => setIsEditModalOpen(true)}
          />
        </div>
      )}

      <div className="lgu-review-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div>
          {/* Permit Readiness Score */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--government-navy)' }}>
                <Shield size={18} /> Permit Readiness
              </h3>
              <span style={{ fontWeight: '700', fontSize: '1.25rem', color: readColor }}>{readScore}%</span>
            </div>

            {totalReqs > 0 && (
              <>
                <div style={{ backgroundColor: '#F1F5F9', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{ backgroundColor: readColor, height: '100%', width: `${readScore}%`, transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  <span>{readyReqs} Ready</span>
                  <span>{totalReqs - readyReqs} Still Needed</span>
                  <span>{totalReqs} Total</span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Required Clearances</h3>
            </div>
            {app.requirements.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No requirements linked to this business yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {app.requirements.map(req => {
                  const done = ['Submitted', 'Approved'].includes(req.req_status);
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: done ? '#F0FDF4' : '#FFF7ED', borderRadius: 'var(--radius-sm)', border: `1px solid ${done ? '#BBF7D0' : '#FED7AA'}` }}>
                      {done ? <CheckCircle size={18} color="#16A34A" /> : <AlertCircle size={18} color="#F59E0B" />}
                      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-dark)' }}>{req.permit_name}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: done ? '#16A34A' : '#D97706' }}>{done ? 'Ready' : 'Missing'}</span>
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
                    <button onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name); }} style={{ fontSize: '0.82rem', color: 'var(--primary-green)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View File</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Progress Tracker */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>Progress Tracker</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { num: 1, title: 'Application', isDone: step > 1, isActive: step === 1, sub: step > 1 ? 'Completed' : step === 1 ? 'Current' : '' },
                { num: 2, title: 'Submitted',   isDone: step > 2, isActive: step === 2, sub: step > 2 ? formatDate(submittedDate) : step === 2 ? 'In Progress' : 'Pending' },
                { num: 3, title: 'LGU Review',  isDone: step > 3, isActive: step === 3, sub: step > 3 ? 'Completed' : step === 3 ? 'Currently being reviewed' : 'Pending' },
                { num: 4, title: 'Decision',    isDone: step === 4 && ['APPROVED', 'REJECTED'].includes(app.status), isActive: step === 4, sub: step === 4 ? (app.status === 'APPROVED' ? 'Approved' : 'Rejected') : 'Pending' }
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
          <div style={{ marginBottom: '1.5rem' }}>
            <FeeAssessmentCard applicationId={app.id} isAdminView />
          </div>

          {/* Application Activity Timeline */}
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
                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.15rem', textTransform: 'uppercase' }}>By {h.actor_name}</div>
                            "{h.remarks}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {app.status === 'UNDER_REVIEW' && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary-green)', flexShrink: 0 }} />
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

      {/* BPLO Form Edit Modal */}
      <FormBPLOEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={formBploData}
        onSave={handleSaveFormData}
        isTl={false}
      />

    </div>
  );
}
