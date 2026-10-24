import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  ShieldCheck, CheckCircle2, AlertCircle, FileText, Info, Download,
  BrainCircuit, X, PenLine, StickyNote, Printer, ClipboardList,
  ExternalLink, Building2, Globe
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

// ─── Documents that are known to require a handwritten signature at the BPLO ───
const SIGNATURE_KEYWORDS = [
  'application form', 'application', 'cedula', 'community tax',
  'declaration', 'affidavit', 'sworn', 'contract', 'authorization'
];

function requiresSignature(permitName = '') {
  const lower = permitName.toLowerCase();
  return SIGNATURE_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── Print stylesheet injected once ──────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  body > *:not(#print-target) { display: none !important; }
  #print-target {
    display: block !important;
    position: fixed; top: 0; left: 0; width: 100%; background: white; z-index: 9999;
    padding: 2rem; font-family: Inter, sans-serif; color: #0f172a;
  }
}
`;

export default function PermitReadiness() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialBizId = queryParams.get('businessId') || '';

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState(initialBizId);
  const [loading, setLoading] = useState(true);

  const [assessment, setAssessment] = useState(null);
  const [requirements, setRequirements] = useState([]);

  // Return-visit notes: { [requirementId]: string }
  const [returnNotes, setReturnNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('permitease_return_notes') || '{}'); }
    catch { return {}; }
  });
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  // ── Load businesses ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/businesses`, { headers })
      .then(r => r.json())
      .then(data => {
        const bizList = Array.isArray(data) ? data : [];
        setBusinesses(bizList);
        if (bizList.length > 0 && !selectedBizId) {
          setSelectedBizId(String(bizList[0].id));
        }
      })
      .catch(console.error);
  }, []);

  // ── Load assessment + compliance checklist ────────────────────────────────
  const loadAssessmentAndReqs = async () => {
    if (!selectedBizId) return;
    setLoading(true);
    try {
      const r1 = await fetch(`${API}/assessments`, { headers });
      const assessmentsData = await r1.json();
      const bizAssessments = Array.isArray(assessmentsData)
        ? assessmentsData.filter(a => String(a.business_id) === String(selectedBizId))
        : [];
      const latestAssessment = bizAssessments.length > 0 ? bizAssessments[0] : null;

      if (latestAssessment) {
        setAssessment(latestAssessment);

        let r2 = await fetch(`${API}/compliance/business/${selectedBizId}`, { headers });
        let complianceData = await r2.json();

        if (!complianceData.checklist || complianceData.checklist.length === 0) {
          await fetch(`${API}/compliance/evaluate/${selectedBizId}`, { method: 'POST', headers });
          r2 = await fetch(`${API}/compliance/business/${selectedBizId}`, { headers });
          complianceData = await r2.json();
        }

        setRequirements(complianceData.checklist || []);
      } else {
        setAssessment(null);
        setRequirements([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssessmentAndReqs(); }, [selectedBizId]);

  // ── Update a requirement's status ─────────────────────────────────────────
  const updateReqStatus = async (requirement_id, newStatus) => {
    try {
      const res = await fetch(
        `${API}/compliance/business/${selectedBizId}/requirement/${requirement_id}`,
        { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }
      );
      if (res.ok) {
        setRequirements(prev => prev.map(r =>
          r.requirement_id === requirement_id ? { ...r, status: newStatus } : r
        ));
      } else {
        alert('Failed to update status.');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while updating status.');
    }
  };

  // ── Return-visit notes helpers ────────────────────────────────────────────
  const openNote = (reqId) => {
    setActiveNoteId(reqId);
    setNoteDraft(returnNotes[reqId] || '');
  };
  const saveNote = (reqId) => {
    const updated = { ...returnNotes, [reqId]: noteDraft };
    setReturnNotes(updated);
    localStorage.setItem('permitease_return_notes', JSON.stringify(updated));
    setActiveNoteId(null);
  };
  const deleteNote = (reqId) => {
    const updated = { ...returnNotes };
    delete updated[reqId];
    setReturnNotes(updated);
    localStorage.setItem('permitease_return_notes', JSON.stringify(updated));
  };

  // ── Print "What to Bring" summary ─────────────────────────────────────────
  const handlePrint = () => { window.print(); };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const selectedBusiness = businesses.find(b => String(b.id) === String(selectedBizId));

  const stats = useMemo(() => {
    let have = 0, need = 0, unchecked = 0;
    requirements.forEach(r => {
      const s = r.status;
      if (s === 'Submitted' || s === 'Approved') have++;
      else if (s === 'Missing') need++;
      else unchecked++;
    });
    const total = requirements.length;
    const percentage = total > 0 ? Math.round((have / total) * 100) : 0;
    return { have, need, unchecked, total, percentage };
  }, [requirements]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (businesses.length === 0 && !loading) {
    return (
      <div style={{ padding: '2.5rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '3rem', textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <AlertCircle size={48} color="#D97706" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--government-navy)', fontSize: '20px', margin: '0 0 0.5rem' }}>No Business Profile Found</h3>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '0 auto 1.5rem', maxWidth: '400px' }}>
            You need to create a business profile before tracking permit readiness.
          </p>
          <button onClick={() => navigate('/onboarding')} style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.625rem 1.5rem', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}>
            Set Up My Business
          </button>
        </div>
      </div>
    );
  }

  // ── Readiness state label ─────────────────────────────────────────────────
  let readinessLabel, readinessBg, readinessBorder, readinessTitleColor, readinessBodyColor;
  if (stats.percentage === 100) {
    readinessLabel = 'ALL RECOMMENDED DOCUMENTS PREPARED';
    readinessBg = '#F0FDF4'; readinessBorder = '#16A34A';
    readinessTitleColor = '#166534'; readinessBodyColor = '#14532D';
  } else if (stats.percentage >= 50) {
    readinessLabel = 'PREPARATION IN PROGRESS';
    readinessBg = '#FFFBEB'; readinessBorder = '#D97706';
    readinessTitleColor = '#92400E'; readinessBodyColor = '#78350F';
  } else {
    readinessLabel = 'EARLY PREPARATION STAGE';
    readinessBg = '#FFF7ED'; readinessBorder = '#EA580C';
    readinessTitleColor = '#9A3412'; readinessBodyColor = '#9A3412';
  }

  return (
    <>
      {/* Inject print styles once */}
      <style>{PRINT_STYLES}</style>

      {/* ── PRINT TARGET (hidden on screen, visible when printing) ── */}
      <div id="print-target" style={{ display: 'none' }}>
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Municipality of Roxas · PermitEase</div>
          <h1 style={{ margin: '0.25rem 0 0', fontSize: '20px', fontWeight: '700' }}>What to Bring to the BPLO</h1>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '0.25rem' }}>{selectedBusiness?.business_name} · Printed {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        <p style={{ fontSize: '12px', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          This checklist is for your personal preparation only. PermitEase is a preparation guide — it does not guarantee official acceptance of any document. Actual verification, payment, and permit issuance are handled by the BPLO office.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Document / Requirement</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', width: '110px' }}>Status</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', width: '120px' }}>Signature Needed</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>BPLO Return Notes</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map(req => {
              const isHave = req.status === 'Submitted' || req.status === 'Approved';
              const needsSig = requiresSignature(req.permit_name);
              const note = returnNotes[req.requirement_id];
              return (
                <tr key={req.id}>
                  <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>
                    <strong>{req.permit_name}</strong>
                    {req.description ? <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{req.description}</div> : null}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', textAlign: 'center', color: isHave ? '#16A34A' : '#EA580C', fontWeight: '600' }}>
                    {isHave ? '✓ Have' : '— Need'}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', textAlign: 'center', color: needsSig ? '#0369A1' : '#94A3B8' }}>
                    {needsSig ? '✎ Yes' : '—'}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                    {note || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '1.5rem', fontSize: '11px', color: '#94A3B8', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          PermitEase · Municipality of Roxas, Oriental Mindoro · This document is for preparation purposes only. It is not an official government record.
        </div>
      </div>

      {/* ── MAIN PAGE ── */}
      <div className="readiness-container">

        {/* HEADER */}
        <header className="readiness-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 0.25rem', color: 'var(--government-navy)' }}>
              Permit Readiness
            </h1>
            <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
              Track what you need to prepare before visiting the BPLO office.
            </p>
          </div>
          {assessment && requirements.length > 0 && (
            <button
              onClick={handlePrint}
              className="btn btn-outline readiness-print-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: 'white', color: 'var(--government-navy)', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              <Printer size={16} />
              Print "What to Bring"
            </button>
          )}
        </header>

        {/* Business selector */}
        {businesses.length > 0 && (
          <div style={{ marginBottom: '2rem', maxWidth: '400px' }}>
            <select
              value={selectedBizId}
              onChange={e => setSelectedBizId(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', color: 'var(--government-navy)', backgroundColor: 'white' }}
            >
              {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>Loading readiness data...</div>
        ) : !assessment ? (
          /* ── EMPTY STATE (no AI assessment yet) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <ShieldCheck size={32} color="var(--primary-green)" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '650', color: 'var(--government-navy)', margin: '0 0 1rem' }}>Personalized requirements have not been generated yet.</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '0 auto 2rem', lineHeight: '1.6', maxWidth: '480px' }}>
                Complete the AI Permit Assessment first to identify requirements that may apply to your business. Requirements may vary depending on your business type, location, and other details.
              </p>
              <button
                onClick={() => navigate('/assessment')}
                style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <BrainCircuit size={18} /> Start AI Permit Assessment
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '2rem' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', margin: '0 0 1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>How It Works</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
                {[
                  ['1. Complete AI Assessment', 'Identify applicable requirements.'],
                  ['2. Review requirements', 'See what applies to your business.'],
                  ['3. Mark what you have', 'Track what is ready to bring.'],
                  ['4. Add BPLO notes', 'Record what was requested.'],
                  ['5. Print & visit BPLO', 'Bring the checklist in person.'],
                ].map(([title, sub]) => (
                  <div key={title}>
                    <div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '13px', marginBottom: '0.25rem' }}>{title}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── MAIN CONTENT STATE ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* AI Success Banner */}
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BrainCircuit size={20} color="#166534" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '0.1rem' }}>AI ASSESSMENT COMPLETED</div>
                  <div style={{ fontSize: '13px', color: '#14532D' }}>Your personalized requirement checklist was generated from your business information.</div>
                </div>
              </div>
              <Link to="/assessment" style={{ fontSize: '13px', fontWeight: '600', color: '#166534', backgroundColor: 'white', border: '1px solid #86EFAC', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none' }}>
                Review AI Assessment
              </Link>
            </div>

            {/* Business name + type */}
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--government-navy)' }}>{selectedBusiness?.business_name}</div>
              <div style={{ fontSize: '14px', color: '#64748B' }}>{selectedBusiness?.business_status === 'Renewal' ? 'Renewal Application' : 'New Business Permit Application'}</div>
            </div>

            {/* PREPARATION PROGRESS CARD */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={14} /> PREPARATION CHECKLIST PROGRESS
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                This score measures your self-tracked preparation progress only. It does not certify official compliance, verify document validity, or guarantee permit approval by the LGU.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--government-navy)' }}>
                  {stats.have} of {stats.total} documents prepared
                </div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: stats.percentage === 100 ? '#16A34A' : 'var(--primary-green)' }}>
                  {stats.percentage}%
                </div>
              </div>

              <div style={{ height: '10px', backgroundColor: '#E2E8F0', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ height: '100%', backgroundColor: stats.percentage === 100 ? '#16A34A' : 'var(--primary-green)', width: `${stats.percentage}%`, transition: 'width 0.4s ease' }} />
              </div>

              <div className="readiness-stat-chips" style={{ display: 'flex', gap: '1.25rem', fontSize: '13px', color: '#64748B', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />{stats.have} Ready to bring</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EA580C', display: 'inline-block' }} />{stats.need} Items still needed</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94A3B8', display: 'inline-block' }} />{stats.unchecked} Not checked yet</span>
              </div>

              {/* Status banner */}
              <div style={{ backgroundColor: readinessBg, borderLeft: `4px solid ${readinessBorder}`, padding: '0.875rem 1rem', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: readinessTitleColor, marginBottom: '0.2rem' }}>{readinessLabel}</div>
                <div style={{ fontSize: '13px', color: readinessBodyColor, lineHeight: 1.5 }}>
                  {stats.percentage === 100
                    ? 'You have checked off all recommended checklist items. This indicates readiness for submission — it does not constitute official approval, verification, or document validation by the LGU. You may now continue to your preferred official application pathway below.'
                    : stats.percentage >= 50
                    ? `${stats.need + stats.unchecked} item(s) still need preparation. You can continue to the official application pathway or print your checklist at any time.`
                    : `Mark each document as "I Have This" as you assemble it. You can proceed to the official application pathway whenever you are ready.`}
                </div>
              </div>
            </div>

            {/* PREPARATION CHECKLIST */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={14} /> PREPARATION CHECKLIST
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {requirements.map((req) => {
                  const isHave = req.status === 'Submitted' || req.status === 'Approved';
                  const isNeed = req.status === 'Missing';
                  const needsSig = requiresSignature(req.permit_name);
                  const note = returnNotes[req.requirement_id];
                  const isEditingNote = activeNoteId === req.requirement_id;

                  return (
                    <div key={req.id} style={{
                      backgroundColor: 'white',
                      border: `1px solid ${isHave ? '#86EFAC' : isNeed ? '#FDBA74' : '#E2E8F0'}`,
                      borderLeft: `4px solid ${isHave ? '#16A34A' : isNeed ? '#EA580C' : '#CBD5E1'}`,
                      borderRadius: '8px',
                      padding: '1.25rem',
                    }}>
                      {/* Row 1: Icon, name, status buttons */}
                      <div className="readiness-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                          {isHave
                            ? <CheckCircle2 size={20} color="#16A34A" style={{ marginTop: '1px', flexShrink: 0 }} />
                            : isNeed
                            ? <AlertCircle size={20} color="#EA580C" style={{ marginTop: '1px', flexShrink: 0 }} />
                            : <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #CBD5E1', marginTop: '1px', flexShrink: 0 }} />}
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.2rem' }}>{req.permit_name}</div>
                            <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                              {req.description || 'Required for business permit application.'}
                            </div>

                            {/* Signature indicator */}
                            {needsSig && (
                              <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '12px', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                                <PenLine size={12} />
                                Requires your signature before submission
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status action buttons */}
                        <div className="readiness-item-actions" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          {!isHave && (
                            <button
                              onClick={() => updateReqStatus(req.requirement_id, 'Submitted')}
                              style={{ padding: '0.45rem 0.9rem', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              I Have This
                            </button>
                          )}
                          {!isNeed && (
                            <button
                              onClick={() => updateReqStatus(req.requirement_id, 'Missing')}
                              style={{ padding: '0.45rem 0.9rem', backgroundColor: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              Still Need
                            </button>
                          )}
                          {(isHave || isNeed) && (
                            <button
                              onClick={() => updateReqStatus(req.requirement_id, 'Pending')}
                              aria-label="Reset status"
                              style={{ padding: '0.45rem 0.5rem', backgroundColor: 'transparent', color: '#94A3B8', border: 'none', cursor: 'pointer' }}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Return-visit note */}
                      <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px dashed #E2E8F0' }}>
                        {isEditingNote ? (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <StickyNote size={12} /> BPLO Return Note
                            </div>
                            <textarea
                              value={noteDraft}
                              onChange={e => setNoteDraft(e.target.value)}
                              placeholder="e.g. Officer asked for original copy and photocopy. Must also have notarized version."
                              rows={3}
                              style={{ width: '100%', padding: '0.6rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0f172a', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <button onClick={() => saveNote(req.requirement_id)} style={{ padding: '0.4rem 0.9rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                                Save Note
                              </button>
                              <button onClick={() => setActiveNoteId(null)} style={{ padding: '0.4rem 0.9rem', backgroundColor: 'white', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : note ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <StickyNote size={12} /> BPLO Return Note
                              </div>
                              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, fontStyle: 'italic' }}>"{note}"</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                              <button onClick={() => openNote(req.requirement_id)} style={{ padding: '0.3rem 0.65rem', fontSize: '12px', color: '#475569', backgroundColor: 'white', border: '1px solid #CBD5E1', borderRadius: '5px', cursor: 'pointer' }}>Edit</button>
                              <button onClick={() => deleteNote(req.requirement_id)} style={{ padding: '0.3rem 0.65rem', fontSize: '12px', color: '#DC2626', backgroundColor: 'white', border: '1px solid #FECACA', borderRadius: '5px', cursor: 'pointer' }}>Delete</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openNote(req.requirement_id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '12px', color: '#64748B', backgroundColor: 'transparent', border: '1px dashed #CBD5E1', borderRadius: '5px', padding: '0.3rem 0.75rem', cursor: 'pointer' }}
                          >
                            <StickyNote size={12} /> Add BPLO return note…
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── CONTINUATION TO OFFICIAL APPLICATION (TWO PATHWAYS) ── */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--government-navy)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} color="var(--primary-green)" />
                  Continue to Official Application
                </div>
                <span style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                  Available at any preparation stage
                </span>
              </div>

              <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                When you are ready to file your business permit, select your preferred official submission pathway recognized by the Municipality of Roxas:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                
                {/* Pathway 1: Online via DICT iBPLS */}
                <div style={{ border: '1px solid #BAE6FD', borderRadius: '10px', padding: '1.25rem', backgroundColor: '#F0F9FF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Globe size={18} color="#0284C7" />
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0369A1' }}>Pathway 1: Online via Official DICT iBPLS</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: '#0C4A6E', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                      The official electronic portal deployed for the Municipality of Roxas. File your application, upload digital documents, and pay via Landbank Link.BizPortal.
                    </p>
                    <div style={{ fontSize: '11.5px', color: '#075985', backgroundColor: '#E0F2FE', padding: '0.6rem 0.75rem', borderRadius: '6px', marginBottom: '1rem', lineHeight: 1.4, border: '1px solid #BAE6FD' }}>
                      <strong>Notice:</strong> PermitEase is an independent pre-submission companion and does not automatically transfer data, upload files, or submit applications to iBPLS. You will create an account or sign in directly on the official portal.
                    </div>
                  </div>
                  <a
                    href="https://bpbc.ibpls.com/roxasorientalmindoro/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', backgroundColor: '#0284C7', color: 'white', borderRadius: '6px', fontWeight: '600', fontSize: '13.5px', textDecoration: 'none', transition: 'background-color 0.15s' }}
                  >
                    Open Roxas iBPLS Portal <ExternalLink size={14} />
                  </a>
                </div>

                {/* Pathway 2: In-Person at Roxas BPLO */}
                <div style={{ border: '1px solid #BBF7D0', borderRadius: '10px', padding: '1.25rem', backgroundColor: '#F0FDF4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Building2 size={18} color="#166534" />
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#166534' }}>Pathway 2: In-Person at Roxas BPLO</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: '#14532D', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                      Bring your completed physical application form and required clearances directly to the Business Permit and Licensing Section / BOSS counter at the Roxas Municipal Hall.
                    </p>
                    <div style={{ fontSize: '11.5px', color: '#166534', backgroundColor: '#DCFCE7', padding: '0.6rem 0.75rem', borderRadius: '6px', marginBottom: '1rem', lineHeight: 1.4, border: '1px solid #BBF7D0' }}>
                      <strong>Tip:</strong> Print your checklist below. Ensure documents flagged with ✎ have handwritten ink signatures before submitting to the receiving officer.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handlePrint}
                      style={{ flex: 1, minWidth: '140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem 1rem', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13.5px', cursor: 'pointer' }}
                    >
                      <Printer size={15} /> Print Checklist
                    </button>
                    <a
                      href="/forms/Roxas_Business_Permit_Application_Form.pdf"
                      download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem 1rem', backgroundColor: 'white', color: '#166534', border: '1px solid #86EFAC', borderRadius: '6px', fontWeight: '600', fontSize: '13.5px', textDecoration: 'none' }}
                    >
                      <Download size={15} /> Unified Form (PDF)
                    </a>
                  </div>
                </div>

              </div>
            </div>

            {/* OFFICIAL REFERENCE & PROCESS NOTICE */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Info size={16} color="#0369A1" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                  <strong>Reference:</strong> Requirement rules and processing procedures are modeled after the published{' '}
                  <a
                    href="https://www.roxasormin.com/citizens-charter/securing-mayor-s-permit-business-permit"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary-green)', fontWeight: '600', textDecoration: 'underline' }}
                  >
                    Municipality of Roxas Citizen's Charter — Securing Mayor's Permit / Business Permit <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </a>.
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, borderTop: '1px solid #E2E8F0', paddingTop: '0.625rem' }}>
                <strong>Academic Scope & Legal Disclaimer:</strong> PermitEase is an independent academic pre-submission companion developed for educational research. It is not officially endorsed by, certified by, or affiliated with the Municipality of Roxas, Oriental Mindoro, or the Department of Information and Communications Technology (DICT). The readiness percentage measures self-tracked preparation progress only and does not verify document authenticity, certify legal compliance, or guarantee official acceptance. Official document assessment, payment collection, regulatory inspection, and permit issuance remain under the sole legal authority of the Municipality of Roxas BPLO and authorized government agencies.
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
