import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, ArrowRight, UploadCloud, Edit, FileText, X, BrainCircuit } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

function formatPHP(amount) {
  return '₱' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const CategoryIcon = ({ status }) => {
  if (status === 'Complete') return <CheckCircle2 size={18} color="#16A34A" />;
  if (status === 'Incomplete') return <AlertCircle size={18} color="#D97706" />;
  return <XCircle size={18} color="#DC2626" />;
};

export default function PermitReadiness() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const initialBizId = queryParams.get('businessId') || '';
  const initialType = queryParams.get('type') || 'NEW';
  
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState(initialBizId);
  const [applicationType, setApplicationType] = useState(initialType);
  
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Document Upload Modal State
  const [uploadModal, setUploadModal] = useState({ isOpen: false, reqName: '', reqId: null });
  const [file, setFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const loadReadiness = () => {
    if (!selectedBizId || !applicationType) return;
    setLoading(true);
    setError('');
    fetch(`${API}/readiness/${selectedBizId}?application_type=${applicationType}`, { headers })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || 'Error fetching readiness');
        return data;
      })
      .then(data => setReadiness(data))
      .catch(err => {
        console.error(err);
        setError('Unable to calculate permit readiness.');
        setReadiness(null);
      })
      .finally(() => setLoading(false));
  };

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
      .catch(() => setError('Unable to load businesses.'));
  }, []);

  useEffect(() => {
    loadReadiness();
  }, [selectedBizId, applicationType]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setUploadError('Please select a file'); return; }
    setUploadingDoc(true);
    setUploadError('');
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('business_id', selectedBizId);
      uploadData.append('document_name', uploadModal.reqName);
      if (uploadModal.reqId) {
        uploadData.append('requirement_id', uploadModal.reqId);
      }
      
      const res = await fetch(`${API}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // FormData sets its own content-type boundary
        body: uploadData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      
      setUploadModal({ isOpen: false, reqName: '', reqId: null });
      setFile(null);
      loadReadiness(); // Refresh readiness after successful upload
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedBizId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: selectedBizId, application_type: applicationType })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to create application.');
        setSubmitting(false);
        return;
      }
      navigate(`/applications/${data.id}`);
    } catch {
      setError('Unable to continue to application.');
      setSubmitting(false);
    }
  };

  if (businesses.length === 0 && !loading && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '900px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <AlertCircle size={48} color="var(--warning)" style={{ marginBottom: '1rem', opacity: 0.7 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.75rem' }}>No Business Profile Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            You need to create a business profile before assessing readiness.
          </p>
          <button onClick={() => navigate('/onboarding')} style={{ backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
            Set Up My Business
          </button>
        </div>
      </div>
    );
  }

  const isReady = readiness?.overall_state === 'READY';
  const stateLabel = isReady ? 'READY TO APPLY' : 'NOT READY YET';
  const stateColor = isReady ? '#16A34A' : '#DC2626';

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Permit Readiness</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Check if your business is ready before starting a permit application.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Business</label>
          <select value={selectedBizId} onChange={e => setSelectedBizId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
            {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Application Type</label>
          <select value={applicationType} onChange={e => setApplicationType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
            <option value="NEW">New Business Permit</option>
            <option value="RENEWAL">Renewal</option>
          </select>
        </div>
      </div>

      {loading && !readiness ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
          Checking what you need...
        </div>
      ) : readiness ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Readiness Card */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '2rem', boxShadow: 'var(--shadow-card)', borderTop: `4px solid ${stateColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              {isReady ? <CheckCircle2 size={32} color={stateColor} /> : <AlertCircle size={32} color={stateColor} />}
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: stateColor }}>{stateLabel}</div>
            </div>
            <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{readiness.recommendation}</div>
          </div>

          {/* ACTION REQUIRED SECTION */}
          {readiness.action_required && readiness.action_required.length > 0 && (
            <div style={{ border: '2px solid #FDE68A', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#FEF3C7', padding: '1rem 1.5rem', borderBottom: '1px solid #FDE68A' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E' }}>
                  <AlertCircle size={20} /> ACTION REQUIRED
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#B45309' }}>
                  {readiness.action_required.length} item{readiness.action_required.length > 1 ? 's' : ''} need your attention.
                </p>
              </div>
              <div style={{ backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
                {readiness.action_required.map((act, i) => (
                  <div key={i} style={{ padding: '1.5rem', borderBottom: i < readiness.action_required.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                        {i + 1}. {act.text}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {act.type === 'fee' || act.type === 'profile' ? 'Required for fee calculation and profile completeness.' : 'Required document for your application.'}
                      </div>
                    </div>
                    {act.type === 'document' ? (
                      <button 
                        onClick={() => setUploadModal({ isOpen: true, reqName: act.document_name || act.text.replace(' is missing.', ''), reqId: act.requirement_id })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'white', backgroundColor: 'var(--primary-green)', border: 'none', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                        <UploadCloud size={16} /> Upload Document
                      </button>
                    ) : act.link ? (
                      <Link to={act.link} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'white', backgroundColor: 'var(--primary-green)', textDecoration: 'none', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                        <Edit size={16} /> {act.actionText}
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist Progress */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--primary-green)" /> Preparation Progress
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {readiness.categories.map(cat => (
                <div key={cat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CategoryIcon status={cat.status} />
                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-dark)' }}>{cat.label}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: cat.status === 'Complete' ? '#16A34A' : '#D97706', fontWeight: '500' }}>
                    {cat.status === 'Complete' ? '✓ Complete' : '⚠ Action needed'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Cost Summary */}
          {readiness.fee_assessment && (
            <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Estimated Fees</h3>
              
              {readiness.fee_assessment.is_incomplete ? (
                <div style={{ color: '#D97706', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '500' }}>
                  ⚠ More business information is needed to calculate your fees.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {readiness.fee_assessment.breakdown.map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--text-dark)' }}>
                      <span>{b.name}</span>
                      <span style={{ fontWeight: '500' }}>{formatPHP(b.amount)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-muted)' }}>ESTIMATED TOTAL</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-green)' }}>{formatPHP(readiness.fee_assessment.total_estimated_amount)}</span>
                  </div>
                </div>
              )}
              
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                {readiness.fee_assessment.disclaimer || 'This is an estimate. Final fees are subject to LGU assessment.'}
              </div>
            </div>
          )}

          {/* AI Assessment Promo Banner */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={18} color="var(--primary-green)" /> Planning a different business?
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Use our AI Assessor to explore permit requirements for any business idea.</p>
            </div>
            <Link to="/assessment" style={{ padding: '0.6rem 1.25rem', backgroundColor: 'var(--light-green)', color: 'var(--primary-green)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Try AI Assessor <ArrowRight size={16} />
            </Link>
          </div>

          {/* Application Summary & Submit */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-md)', padding: '2rem', border: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Ready to Start Your Application?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.95rem', color: 'var(--text-dark)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Business:</span> <strong>{readiness.business_name}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Application:</span> <strong>{applicationType === 'NEW' ? 'New Business Permit' : 'Renewal'}</strong></div>
            </div>
            
            {isReady ? (
              <button
                onClick={handleContinue}
                disabled={submitting}
                style={{ 
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                  backgroundColor: submitting ? '#9CA3AF' : 'var(--primary-green)', color: 'white', 
                  border: 'none', padding: '1.1rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', 
                  cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '1.05rem' 
                }}
              >
                {submitting ? 'Creating...' : <>Continue to Application <ArrowRight size={18} /></>}
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: '#B45309', backgroundColor: '#FEF3C7', padding: '1rem', borderRadius: 'var(--radius-sm)', fontWeight: '500', fontSize: '0.95rem' }}>
                Complete the items above before starting your application.
              </div>
            )}
          </div>

        </div>
      ) : null}

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
