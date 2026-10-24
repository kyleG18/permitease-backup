import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  CheckCircle2, XCircle, AlertCircle, Clock, Upload, RefreshCw,
  TrendingUp, FileWarning, ChevronDown, ChevronUp
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const statusConfig = {
  Missing:       { color: '#EF4444', bg: '#FEE2E2', icon: <XCircle size={14}/> },
  Submitted:     { color: '#F59E0B', bg: '#FEF3C7', icon: <Clock size={14}/> },
  Approved:      { color: '#22C55E', bg: '#DCFCE7', icon: <CheckCircle2 size={14}/> },
  Rejected:      { color: '#DC2626', bg: '#FEE2E2', icon: <XCircle size={14}/> },
  Expired:       { color: '#6B7280', bg: '#F3F4F6', icon: <AlertCircle size={14}/> },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { color: '#6B7280', bg: '#F3F4F6', icon: null };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.65rem', borderRadius: '9999px',
      fontSize: '0.75rem', fontWeight: '600',
      color: cfg.color, backgroundColor: cfg.bg
    }}>
      {cfg.icon} {status}
    </span>
  );
};

const ScoreRing = ({ score }) => {
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
  const label = score >= 80 ? 'Compliant' : score >= 50 ? 'Partially Compliant' : 'Non-Compliant';
  const r = 54, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x="65" y="60" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score}%</text>
        <text x="65" y="80" textAnchor="middle" fontSize="10" fill="#6B7280">Compliance</text>
      </svg>
      <span style={{ fontWeight: '600', color, fontSize: '0.9rem' }}>{label}</span>
    </div>
  );
};

export default function Compliance() {
  const { token } = useContext(AuthContext);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [uploadModal, setUploadModal] = useState(null); // { req_id, req_name, business_id }
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/businesses`, { headers }).then(r => r.json()).then(data => {
      setBusinesses(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedBizId(String(data[0].id));
    });
  }, []);

  useEffect(() => {
    if (selectedBizId) loadCompliance();
  }, [selectedBizId]);

  const loadCompliance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/compliance/business/${selectedBizId}`, { headers });
      const data = await res.json();
      setCompliance(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await fetch(`${API}/compliance/evaluate/${selectedBizId}`, { method: 'POST', headers });
      await loadCompliance();
    } catch (e) { console.error(e); }
    setEvaluating(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadModal) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('business_id', uploadModal.business_id);
    formData.append('document_name', uploadModal.req_name);
    formData.append('requirement_id', uploadModal.req_id);

    try {
      const res = await fetch(`${API}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setUploadModal(null);
        setUploadFile(null);
        await loadCompliance();
      }
    } catch (e) { console.error(e); }
    setUploading(false);
  };

  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const missing = compliance?.checklist?.filter(c => c.status === 'Missing') || [];
  const mandatory = compliance?.checklist?.filter(c => c.is_mandatory) || [];

  return (
    <div className="compliance-page-container" style={{ padding: '2rem', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
          Compliance Checklist
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Track your business permit requirements and document submission status.
        </p>
      </div>

      {/* Business Selector */}
      <div className="compliance-selector-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedBizId}
          onChange={e => setSelectedBizId(e.target.value)}
          style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', minWidth: '240px', fontSize: '0.9rem' }}
        >
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>
        <button
          onClick={handleEvaluate}
          disabled={evaluating || !selectedBizId}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          <RefreshCw size={15} className={evaluating ? 'spinning' : ''} />
          {evaluating ? 'Evaluating...' : 'Re-Evaluate'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading compliance data...</div>
      ) : compliance ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>

          {/* Score + Summary Cards */}
          <div className="compliance-score-card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)', alignItems: 'center' }}>
            <ScoreRing score={compliance.compliance_score || 0} />
            <div className="compliance-stat-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#DCFCE7', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#16A34A' }}>
                  {compliance.checklist?.filter(c => c.status === 'Approved' || c.status === 'Submitted').length || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '500' }}>Submitted</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#FEE2E2', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#DC2626' }}>{missing.length}</div>
                <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: '500' }}>Missing</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#F3F4F6', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#374151' }}>{compliance.checklist?.length || 0}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500' }}>Total</div>
              </div>
            </div>
          </div>

          {/* Missing Requirements Alert */}
          {missing.length > 0 && (
            <div style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <FileWarning size={18} color="#CA8A04" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '600', color: '#78350F', fontSize: '0.875rem' }}>Action Required</div>
                <div style={{ color: '#92400E', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                  You have <strong>{missing.length}</strong> missing requirement(s). Upload the required documents to improve your compliance score.
                </div>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--primary-green)" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Requirements Checklist</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {compliance.checklist?.length || 0} total
              </span>
            </div>

            {compliance.checklist?.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No requirements found. Click "Re-Evaluate" to generate your checklist.
              </div>
            ) : (
              <div>
                {compliance.checklist?.map(item => (
                  <div key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div
                      style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                      onClick={() => toggleExpand(item.id)}
                    >
                      <StatusBadge status={item.status} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                          {item.permit_name}
                          {item.is_mandatory && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#DC2626', fontWeight: '600' }}>REQUIRED</span>}
                        </div>
                        {item.document_name && (
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            📄 {item.document_name}
                          </div>
                        )}
                      </div>
                      {item.status === 'Missing' && (
                        <button
                          onClick={e => { e.stopPropagation(); setUploadModal({ req_id: item.requirement_id, req_name: item.permit_name, business_id: selectedBizId }); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.775rem', fontWeight: '600', cursor: 'pointer' }}
                        >
                          <Upload size={13} /> Upload
                        </button>
                      )}
                      {expandedItems[item.id] ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </div>
                    {expandedItems[item.id] && (
                      <div style={{ padding: '0 1.5rem 1rem 1.5rem', backgroundColor: '#FAFAFA', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {item.description || 'No additional description.'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)' }}>
          Select a business and click Re-Evaluate to generate your compliance checklist.
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Upload Document</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              For: <strong>{uploadModal.req_name}</strong>
            </p>
            <form onSubmit={handleUpload}>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setUploadFile(e.target.files[0])}
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }} />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setUploadModal(null)}
                  style={{ padding: '0.6rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: 'white' }}>
                  Cancel
                </button>
                <button type="submit" disabled={uploading || !uploadFile}
                  style={{ padding: '0.6rem 1.25rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
                  {uploading ? 'Uploading...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
