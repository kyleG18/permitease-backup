import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BrainCircuit, CheckCircle, FileText, ChevronDown, ChevronUp, History, Info, Building2, AlertCircle } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const Assessment = () => {
  const { user } = useContext(AuthContext);
  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [loadingBiz, setLoadingBiz] = useState(true);

  const [assessments, setAssessments] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [bizRes, histRes] = await Promise.all([
          axios.get(`${API}/businesses`, config),
          axios.get(`${API}/assessments`, config),
        ]);
        const bizList = Array.isArray(bizRes.data) ? bizRes.data : [];
        setBusinesses(bizList);
        if (bizList.length > 0) setSelectedBizId(String(bizList[0].id));
        setAssessments(histRes.data);
      } catch (err) {
        setError('Failed to load data.');
      } finally {
        setLoadingBiz(false);
        setLoadingHistory(false);
      }
    };
    fetchAll();
  }, []);

  const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId));

  const handleAssess = async () => {
    if (!selectedBizId) { setError('Please select a business to assess.'); return; }
    setLoading(true);
    setError('');
    setCurrentResult(null);
    try {
      const { data } = await axios.post(`${API}/assessments`, { business_id: selectedBizId }, config);
      setCurrentResult({ ai_assessment: data.ai_assessment, official_assessment: data.official_assessment });
      const histRes = await axios.get(`${API}/assessments`, config);
      setAssessments(histRes.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many requests. Please try again in a moment.');
      } else {
        setError(err.response?.data?.message || 'Assessment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>AI Permit Assessment</h1>
        <p className="text-muted">Select your registered business and receive an AI-powered analysis of the permits and requirements that apply to it.</p>
      </div>

      {/* Business Selector Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--light-green)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BrainCircuit size={26} style={{ color: 'var(--primary-green)' }} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Assess My Business</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>Choose a business profile to analyze</p>
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'var(--status-expired-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loadingBiz ? (
          <p className="text-muted">Loading your businesses...</p>
        ) : businesses.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            <Building2 size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.5 }} />
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>You have no registered business profiles. Complete onboarding first.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {businesses.map(biz => {
                const isSelected = String(biz.id) === String(selectedBizId);
                return (
                  <label key={biz.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: `2px solid ${isSelected ? 'var(--primary-green)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: isSelected ? 'var(--light-green)' : 'white', transition: 'all 0.15s ease' }}>
                    <input type="radio" name="business" value={biz.id} checked={isSelected} onChange={() => setSelectedBizId(String(biz.id))} style={{ accentColor: 'var(--primary-green)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: isSelected ? 'var(--primary-green)' : '#E2E8F0', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={20} color={isSelected ? 'white' : 'var(--text-muted)'} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-dark)', fontSize: '0.95rem' }}>{biz.business_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{biz.business_type} · {biz.industry_category}</div>
                        {biz.employees && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{biz.employees} employees</div>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedBiz && (
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <Info size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                The AI will analyze <strong style={{ color: 'var(--text-dark)' }}>{selectedBiz.business_name}</strong> ({selectedBiz.business_type} · {selectedBiz.industry_category}) and recommend all applicable permits and requirements based on your LGU's configured rules.
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ padding: '0.875rem 2rem' }}
              onClick={handleAssess}
              disabled={loading || !selectedBizId}
            >
              {loading ? 'Analyzing business profile...' : <><BrainCircuit size={18} /> Run AI Assessment</>}
            </button>
          </>
        )}
      </div>

      {/* Current Assessment Result */}
      {currentResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>

          {/* AI Classification */}
          <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <BrainCircuit size={20} color="#6366f1" />
              <h2 style={{ color: '#6366f1', margin: 0 }}>AI Classification</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, minWidth: '180px', background: '#eef2ff', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.75rem', color: '#4f46e5', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Industry Classified As</p>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-dark)' }}>{currentResult.ai_assessment.industry_category}</p>
              </div>
              <div style={{ flex: 1, minWidth: '180px', background: '#eef2ff', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.75rem', color: '#4f46e5', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Business Type</p>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-dark)' }}>{currentResult.ai_assessment.business_type}</p>
              </div>
              <div style={{ minWidth: '140px', background: '#eef2ff', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.75rem', color: '#4f46e5', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Confidence</p>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-dark)' }}>{Math.round(currentResult.ai_assessment.confidence * 100)}%</p>
              </div>
            </div>
            <div style={{ marginBottom: currentResult.ai_assessment.questions?.length > 0 ? '1.5rem' : 0 }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>AI Summary</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', lineHeight: 1.6, margin: 0 }}>{currentResult.ai_assessment.summary}</p>
            </div>
            {currentResult.ai_assessment.questions?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Things to verify with the BPLO:</h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                  {currentResult.ai_assessment.questions.map((q, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Official Requirements */}
          <div className="card" style={{ borderLeft: '4px solid var(--primary-green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CheckCircle size={20} color="var(--primary-green)" />
              <h2 style={{ color: 'var(--primary-green)', margin: 0 }}>Required Permits & Documents</h2>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <Info size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                <strong>Disclaimer:</strong> AI results are advisory. These are the official PermitEase requirements configured by the LGU for businesses classified under <strong>{currentResult.ai_assessment.industry_category}</strong>.
              </p>
            </div>

            {currentResult.official_assessment.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
                <p style={{ margin: 0, color: '#64748b' }}>No configured requirements found for this classification. Please verify with the LGU BPLO office directly.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {currentResult.official_assessment.map((req, i) => (
                  <div key={i} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1.25rem', background: 'white', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <FileText size={18} style={{ color: 'var(--primary-green)', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem' }}>{req.permit_name}</h4>
                        {req.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{req.description}</p>}
                      </div>
                    </div>
                    {req.required_documents && (
                      <div style={{ marginTop: 'auto', background: '#f1f5f9', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                        <strong>Documents needed:</strong> {req.required_documents}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assessment History */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <History size={22} style={{ color: 'var(--primary-green)' }} />
          <h2 style={{ margin: 0 }}>Assessment History</h2>
        </div>
        {loadingHistory ? (
          <p className="text-muted">Loading...</p>
        ) : assessments.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '2rem' }}>No assessments yet.</p>
        ) : (
          assessments.map(a => {
            let parsed = null;
            try { parsed = JSON.parse(a.assessment_result); } catch {}
            const isNewFormat = parsed && parsed.ai_assessment;
            const industry = isNewFormat ? parsed.ai_assessment.industry_category : 'Legacy';
            const type = isNewFormat ? parsed.ai_assessment.business_type : 'Unknown';
            const reqs = isNewFormat ? parsed.official_assessment : (parsed?.recommended_permits || []);
            const bizName = a.business_name;

            return (
              <div key={a.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }} onClick={() => setExpandedHistory(expandedHistory === a.id ? null : a.id)}>
                  <div>
                    <p style={{ fontWeight: '600', margin: '0 0 0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <Building2 size={15} color="var(--primary-green)" />
                      {bizName || `${industry} · ${type}`}
                    </p>
                    {bizName && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.15rem' }}>{industry} · {type}</p>}
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{new Date(a.created_at).toLocaleString('en-PH')}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-approved">{reqs.length} requirement{reqs.length !== 1 ? 's' : ''}</span>
                    {expandedHistory === a.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
                {expandedHistory === a.id && parsed && (
                  <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)', background: '#f8fafc' }}>
                    {isNewFormat && (
                      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.8rem', margin: '0 0 0.4rem', color: '#4f46e5', fontWeight: 600 }}>AI SUMMARY</p>
                        <p style={{ fontSize: '0.85rem', margin: 0, color: '#334155' }}>{parsed.ai_assessment.summary}</p>
                      </div>
                    )}
                    <p style={{ fontSize: '0.8rem', margin: '0 0 0.5rem', color: 'var(--primary-green)', fontWeight: 600 }}>REQUIRED PERMITS & DOCUMENTS</p>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {reqs.map((p, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>
                          <CheckCircle size={16} style={{ color: 'var(--status-approved)', flexShrink: 0, marginTop: '2px' }} />
                          <span>{p.permit_name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Assessment;
