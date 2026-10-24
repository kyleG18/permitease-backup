import { useState, useEffect, useContext, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import {
  Shield, FileText, Upload, ClipboardCheck,
  Info, Building2, RefreshCw
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ── BPLO Status Badge ── */
const BploStatusBadge = ({ status }) => {
  const cfgMap = {
    'AI Suggested':  { bg: '#E2E8F0', color: '#475569', label: '🤖 AI Suggested' },
    'BPLO Verified': { bg: '#DCFCE7', color: '#166534', label: '✅ BPLO Verified' },
    'Not Required':  { bg: '#F1F5F9', color: '#94A3B8', label: '🚫 Not Required' },
    'Needs Review':  { bg: '#FEF3C7', color: '#92400E', label: '⚠️ Needs Review' },
  };
  const cfg = cfgMap[status] || { bg: '#E2E8F0', color: '#475569', label: status };
  return (
    <span style={{
      padding: '0.25rem 0.65rem', borderRadius: '999px',
      fontSize: '0.72rem', fontWeight: '700',
      backgroundColor: cfg.bg, color: cfg.color, whiteSpace: 'nowrap'
    }}>
      {cfg.label}
    </span>
  );
};

/* ── Document Status Badge ── */
const DocStatusBadge = ({ status }) => {
  const cfgMap = {
    'Missing':      { bg: '#FEE2E2', color: '#991B1B' },
    'Submitted':    { bg: '#DBEAFE', color: '#1E40AF' },
    'Approved':     { bg: '#DCFCE7', color: '#166534' },
    'Rejected':     { bg: '#FEE2E2', color: '#991B1B' },
    'Have':         { bg: '#CCFBF1', color: '#134E4A' },
    'Not Required': { bg: '#F1F5F9', color: '#94A3B8' },
    'Expired':      { bg: '#FEF3C7', color: '#92400E' },
  };
  const cfg = cfgMap[status] || { bg: '#E2E8F0', color: '#475569' };
  return (
    <span style={{
      padding: '0.25rem 0.65rem', borderRadius: '999px',
      fontSize: '0.72rem', fontWeight: '700',
      backgroundColor: cfg.bg, color: cfg.color, whiteSpace: 'nowrap'
    }}>
      {status}
    </span>
  );
};

/* ── Issued Permits Strip ── */
const PermitsStrip = ({ permits }) => {
  if (!permits.length) return null;
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        fontSize: '0.72rem', fontWeight: '700', color: '#94A3B8',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem'
      }}>
        Issued Permits
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
        {permits.map(p => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const exp = p.expiration_date ? new Date(p.expiration_date) : null;
          const isExpired = exp && today > exp;
          return (
            <div key={p.id} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.45rem 0.9rem', borderRadius: '999px',
              border: `1px solid ${isExpired ? '#FCA5A5' : '#BBF7D0'}`,
              backgroundColor: isExpired ? '#FFF1F2' : '#F0FDF4',
              fontSize: '0.8rem', fontWeight: '600',
              color: isExpired ? '#991B1B' : '#166534'
            }}>
              <Shield size={13} />
              <span>{p.permit_number || p.permit_name}</span>
              {isExpired && <span style={{ fontSize: '0.68rem', color: '#DC2626' }}>· Expired</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── BPLO Verify Panel (admin only) ── */
const BploVerifyPanel = ({ item, bizId, token, onSaved }) => {
  const [bploStatus, setBploStatus] = useState(item.bplo_status || 'AI Suggested');
  const [bploNotes, setBploNotes]   = useState(item.bplo_notes || '');
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await axios.put(
        `${API}/compliance/business/${bizId}/requirement/${item.requirement_id}/bplo-verify`,
        { bplo_status: bploStatus, bplo_notes: bploNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg('Saved!');
      onSaved();
      setTimeout(() => setMsg(''), 2500);
    } catch {
      setMsg('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #E2E8F0' }}>
      <div style={{
        fontSize: '0.7rem', fontWeight: '800', color: '#94A3B8',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem'
      }}>
        BPLO Verification Controls
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start' }}>
        <select
          value={bploStatus}
          onChange={e => setBploStatus(e.target.value)}
          style={{
            padding: '0.4rem 0.6rem', borderRadius: '6px',
            border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#1E293B', background: 'white'
          }}
        >
          <option value="AI Suggested">AI Suggested</option>
          <option value="BPLO Verified">BPLO Verified</option>
          <option value="Not Required">Not Required</option>
          <option value="Needs Review">Needs Review</option>
        </select>

        <textarea
          value={bploNotes}
          onChange={e => setBploNotes(e.target.value)}
          placeholder="Add notes for applicant (optional)..."
          rows={2}
          style={{
            flex: 1, minWidth: '180px', padding: '0.4rem 0.6rem',
            borderRadius: '6px', border: '1px solid #CBD5E1',
            fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit'
          }}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.45rem 1rem', borderRadius: '6px', border: 'none',
            backgroundColor: '#16A34A', color: 'white',
            fontSize: '0.82rem', fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {msg && (
          <span style={{
            fontSize: '0.8rem',
            color: msg === 'Saved!' ? '#16A34A' : '#DC2626',
            fontWeight: '700', alignSelf: 'center'
          }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
};

/* ── Upload Button (owner only, after BPLO Verified) ── */
const UploadButton = ({ item, bizId, token, onUploaded }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState('');
  const [hover, setHover]         = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setErr('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('business_id', bizId);
    fd.append('document_name', item.permit_name);
    fd.append('requirement_id', item.requirement_id);
    try {
      await axios.post(`${API}/documents/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      onUploaded();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.3rem' }}>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        onClick={() => fileRef.current.click()}
        disabled={uploading}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.45rem 1rem', borderRadius: '6px',
          border: '1.5px solid #16A34A',
          backgroundColor: hover ? '#16A34A' : 'white',
          color: hover ? 'white' : '#16A34A',
          fontSize: '0.82rem', fontWeight: '700',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.7 : 1,
          transition: 'background 0.15s, color 0.15s'
        }}
      >
        <Upload size={13} />
        {uploading ? 'Uploading…' : 'Upload Proof'}
      </button>
      {err && <span style={{ fontSize: '0.75rem', color: '#DC2626' }}>{err}</span>}
    </div>
  );
};

/* ── Requirement Card ── */
const RequirementCard = ({ item, bizId, token, isAdmin, onRefresh }) => {
  const isNotRequired = item.bplo_status === 'Not Required';
  const canUpload = !isAdmin
    && item.bplo_status === 'BPLO Verified'
    && !['Approved', 'Submitted'].includes(item.status);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      border: `1px solid ${isNotRequired ? '#E2E8F0' : '#F1F5F9'}`,
      padding: '1.2rem 1.4rem',
      opacity: isNotRequired ? 0.55 : 1,
    }}>
      {/* Header row */}
      <div className="permits-req-header" style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.4rem'
      }}>
        <div className="permits-req-info" style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <span style={{
              fontWeight: '700', fontSize: '0.95rem', color: '#1E293B',
              textDecoration: isNotRequired ? 'line-through' : 'none'
            }}>
              {item.permit_name}
            </span>
            {item.is_mandatory ? (
              <span style={{
                fontSize: '0.63rem', fontWeight: '800', color: '#DC2626',
                backgroundColor: '#FEE2E2', padding: '0.1rem 0.4rem', borderRadius: '4px'
              }}>REQUIRED</span>
            ) : (
              <span style={{
                fontSize: '0.63rem', fontWeight: '700', color: '#64748B',
                backgroundColor: '#F1F5F9', padding: '0.1rem 0.4rem', borderRadius: '4px'
              }}>OPTIONAL</span>
            )}
          </div>
          {item.description && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: '1.45' }}>
              {item.description}
            </p>
          )}
        </div>

        {/* Status badges */}
        <div className="permits-req-badges" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <BploStatusBadge status={item.bplo_status || 'AI Suggested'} />
          <DocStatusBadge status={item.status} />
        </div>
      </div>

      {/* BPLO notes */}
      {item.bplo_notes && (
        <div style={{
          marginTop: '0.5rem', padding: '0.4rem 0.7rem',
          backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B',
          borderRadius: '4px', fontSize: '0.82rem', color: '#78350F', fontStyle: 'italic'
        }}>
          📝 {item.bplo_notes}
        </div>
      )}

      {/* Uploaded document info */}
      {item.document_name && (
        <div style={{
          marginTop: '0.6rem', display: 'flex', alignItems: 'center',
          gap: '0.4rem', fontSize: '0.8rem', color: '#475569'
        }}>
          <FileText size={13} color="#16A34A" />
          <span>{item.document_name}</span>
          <span style={{ color: '#16A34A', fontWeight: '600' }}>· Submitted</span>
        </div>
      )}

      {/* Upload action (owner only, BPLO Verified + not yet submitted) */}
      {canUpload && (
        <div style={{ marginTop: '0.75rem' }}>
          <UploadButton item={item} bizId={bizId} token={token} onUploaded={onRefresh} />
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
            Optional — upload a photo or PDF of this document as proof
          </p>
        </div>
      )}

      {/* BPLO admin verify panel */}
      {isAdmin && (
        <BploVerifyPanel item={item} bizId={bizId} token={token} onSaved={onRefresh} />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function Permits() {
  const { token, user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [searchParams] = useSearchParams();

  const isAdmin = user?.role === 'lgu_admin' || user?.role === 'system_admin';

  const [businesses, setBusinesses]   = useState([]);
  const [selectedBiz, setSelectedBiz] = useState('');
  const [checklist, setChecklist]     = useState([]);
  const [permits, setPermits]         = useState([]);
  const [loadingBiz, setLoadingBiz]   = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [score, setScore]             = useState(null);
  const [error, setError]             = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  /* Load business list */
  useEffect(() => {
    const paramBizId = searchParams.get('businessId') || searchParams.get('bizId');
    setLoadingBiz(true);

    axios.get(`${API}/businesses`, { headers })
      .then(r => {
        const list = Array.isArray(r.data)
          ? r.data
          : (r.data.businesses || []);
        setBusinesses(list);

        if (paramBizId && list.some(b => String(b.id) === String(paramBizId))) {
          setSelectedBiz(String(paramBizId));
        } else if (list.length > 0) {
          setSelectedBiz(String(list[0].id));
        }
        setLoadingBiz(false);
      })
      .catch(err => {
        console.error('Failed to load businesses:', err);
        setLoadingBiz(false);
      });
  }, [token]);

  /* Load issued permits strip */
  useEffect(() => {
    axios.get(`${API}/permits`, { headers })
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setPermits(list.filter(p => p.status === 'Approved'));
      })
      .catch(() => {});
  }, []);

  /* Load compliance checklist */
  const loadChecklist = () => {
    if (!selectedBiz) return;
    setLoadingList(true); setError('');
    axios.get(`${API}/compliance/business/${selectedBiz}`, { headers })
      .then(r => {
        setChecklist(r.data.checklist || []);
        setScore(r.data.compliance_score ?? null);
        setLoadingList(false);
      })
      .catch(() => {
        setError('Failed to load requirements. Please try again.');
        setLoadingList(false);
      });
  };

  useEffect(() => { loadChecklist(); }, [selectedBiz]);

  /* Partition checklist */
  const activeReqs   = checklist.filter(i => i.bplo_status !== 'Not Required');
  const notRequired  = checklist.filter(i => i.bplo_status === 'Not Required');

  return (
    <div className="animate-fade-in page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, color: 'var(--primary-green)', fontSize: '1.6rem', fontWeight: '700' }}>
          Verify Requirements
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', fontSize: '0.9rem' }}>
          {isAdmin
            ? 'Review and verify AI-assessed requirements for each business. Correct any mistakes the AI may have made.'
            : 'Track your document requirements. Once BPLO verifies each item, you can optionally upload proof.'}
        </p>
      </div>

      {/* ── Issued Permits Strip ── */}
      <PermitsStrip permits={permits} />

      {/* ── Business Selector Card ── */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '1.25rem 1.5rem', marginBottom: '1.25rem'
      }}>
        <div className="permits-biz-selector-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Building2 size={18} color="#16A34A" />
          <label htmlFor="biz-select" style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1E293B' }}>
            {isAdmin ? 'Select Business to Review' : 'Your Business'}
          </label>

          {loadingBiz ? (
            <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Loading…</span>
          ) : (
            <select
              id="biz-select"
              value={selectedBiz}
              onChange={e => setSelectedBiz(e.target.value)}
              style={{
                flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem',
                borderRadius: '8px', border: '1px solid #CBD5E1',
                fontSize: '0.88rem', color: '#1E293B', background: 'white'
              }}
            >
              <option value="">— Select a business —</option>
              {businesses.map(b => (
                <option key={b.id} value={String(b.id)}>
                  {b.business_name}{b.business_type ? ` (${b.business_type})` : ''}
                </option>
              ))}
            </select>
          )}

          {selectedBiz && (
            <button
              onClick={loadChecklist}
              title="Refresh"
              style={{
                padding: '0.45rem', borderRadius: '6px',
                border: '1px solid #E2E8F0', background: 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
            >
              <RefreshCw size={14} color="#475569" />
            </button>
          )}
        </div>

        {/* Compliance score bar */}
        {score !== null && selectedBiz && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>Document Readiness</span>
              <span style={{
                fontSize: '0.8rem', fontWeight: '800',
                color: score >= 80 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626'
              }}>
                {score}%
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '999px', backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${score}%`, borderRadius: '999px',
                backgroundColor: score >= 80 ? '#16A34A' : score >= 50 ? '#F59E0B' : '#EF4444',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Requirements Content ── */}
      {!selectedBiz ? (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '3rem', textAlign: 'center'
        }}>
          <ClipboardCheck size={40} color="#CBD5E1" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
            Select a business above to view its requirements.
          </p>
        </div>

      ) : loadingList ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
          Loading requirements…
        </div>

      ) : error ? (
        <div style={{
          padding: '1.5rem', color: '#DC2626',
          backgroundColor: '#FFF1F2', borderRadius: '8px',
          border: '1px solid #FCA5A5'
        }}>
          {error}
        </div>

      ) : checklist.length === 0 ? (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '3rem', textAlign: 'center'
        }}>
          <Info size={36} color="#CBD5E1" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#94A3B8', marginBottom: '1.25rem' }}>
            No requirements found for this business yet.
            <br />Run the AI Assessment to generate your checklist.
          </p>
          <Link
            to="/assessment"
            style={{
              display: 'inline-block', padding: '0.6rem 1.3rem',
              borderRadius: '8px', backgroundColor: '#16A34A', color: 'white',
              textDecoration: 'none', fontWeight: '700', fontSize: '0.88rem'
            }}
          >
            Go to AI Assessment →
          </Link>
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

          {/* Summary pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
            {[
              { label: 'Total',         val: checklist.length,                                           color: '#475569', bg: '#F1F5F9' },
              { label: 'BPLO Verified', val: checklist.filter(i => i.bplo_status === 'BPLO Verified').length, color: '#166534', bg: '#DCFCE7' },
              { label: 'Needs Review',  val: checklist.filter(i => i.bplo_status === 'Needs Review').length,  color: '#92400E', bg: '#FEF3C7' },
              { label: 'Not Required',  val: notRequired.length,                                         color: '#94A3B8', bg: '#F8FAFC' },
              { label: 'Docs Uploaded', val: checklist.filter(i => ['Submitted','Approved'].includes(i.status)).length, color: '#1E40AF', bg: '#DBEAFE' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.3rem 0.65rem', borderRadius: '999px',
                backgroundColor: s.bg, fontSize: '0.76rem', fontWeight: '700', color: s.color
              }}>
                {s.val} {s.label}
              </div>
            ))}
          </div>

          {/* Active requirements */}
          {activeReqs.map(item => (
            <RequirementCard
              key={item.id}
              item={item}
              bizId={selectedBiz}
              token={token}
              isAdmin={isAdmin}
              onRefresh={loadChecklist}
            />
          ))}

          {/* Not Required section */}
          {notRequired.length > 0 && (
            <>
              <div style={{
                marginTop: '0.5rem', fontSize: '0.72rem', fontWeight: '800',
                color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em'
              }}>
                Not Required by BPLO ({notRequired.length})
              </div>
              {notRequired.map(item => (
                <RequirementCard
                  key={item.id}
                  item={item}
                  bizId={selectedBiz}
                  token={token}
                  isAdmin={isAdmin}
                  onRefresh={loadChecklist}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
