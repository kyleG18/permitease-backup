import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BrainCircuit, CheckCircle, FileText, ChevronDown, ChevronUp, History, Info } from 'lucide-react';

const Assessment = () => {
  const { user } = useContext(AuthContext);
  const [description, setDescription] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(null);

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assessRes = await axios.get('http://localhost:5000/api/assessments', config);
        setAssessments(assessRes.data);
      } catch (err) { setError('Failed to load assessment history.'); }
      finally { setLoadingHistory(false); }
    };
    fetchData();
  }, []);

  const handleAssess = async () => {
    if (!description.trim()) { setError('Please enter a business description first.'); return; }
    if (description.length > 1000) { setError('Description is too long. Maximum 1000 characters allowed.'); return; }
    
    setLoading(true); 
    setError(''); 
    setCurrentResult(null);
    
    try {
      const { data } = await axios.post('http://localhost:5000/api/assessments', { business_description: description }, config);
      setCurrentResult({
        ai_assessment: data.ai_assessment,
        official_assessment: data.official_assessment
      });
      setDescription('');
      
      // Refresh assessment history
      const histRes = await axios.get('http://localhost:5000/api/assessments', config);
      setAssessments(histRes.data);
    } catch (err) { 
        if (err.response?.status === 429) {
            setError('Too many requests. Please try again later.');
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
        <p className="text-muted">Describe your business concept to receive an AI classification and see the official PermitEase requirements.</p>
      </div>

      {/* Assessment Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--light-green)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BrainCircuit size={26} style={{ color: 'var(--primary-green)' }} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Business Description</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>What kind of business are you planning to open?</p>
          </div>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'var(--status-expired-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <textarea 
              className="form-control" 
              style={{ minHeight: '120px', padding: '1rem', resize: 'vertical' }} 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Example: I want to open a small restaurant selling Filipino food and drinks. We will have 5 employees and a 50 sq.m. dining area."
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: description.length > 1000 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '0.25rem' }}>
              {description.length}/1000 characters
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: '0.875rem 2rem', alignSelf: 'flex-start' }} onClick={handleAssess} disabled={loading || !description.trim()}>
            {loading ? 'Analyzing your business...' : <><BrainCircuit size={18} /> Analyze Business</>}
          </button>
        </div>
      </div>

      {/* Current Assessment Result */}
      {currentResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem', animation: 'slideUp 0.4s ease-out' }}>
          
          {/* AI ADVISORY ASSESSMENT */}
          <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <BrainCircuit size={20} color="#6366f1" />
                <h2 style={{ color: '#6366f1', margin: 0 }}>AI ADVISORY ASSESSMENT</h2>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, minWidth: '200px', background: '#eef2ff', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: '0.8rem', color: '#4f46e5', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Likely Industry</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>{currentResult.ai_assessment.industry_category}</p>
                </div>
                <div style={{ flex: 1, minWidth: '200px', background: '#eef2ff', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: '0.8rem', color: '#4f46e5', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Likely Business Type</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>{currentResult.ai_assessment.business_type}</p>
                </div>
                <div style={{ minWidth: '150px', background: '#eef2ff', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: '0.8rem', color: '#4f46e5', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Confidence</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>{Math.round(currentResult.ai_assessment.confidence * 100)}%</p>
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>AI Summary</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', lineHeight: 1.5, margin: 0 }}>{currentResult.ai_assessment.summary}</p>
            </div>

            {currentResult.ai_assessment.questions && currentResult.ai_assessment.questions.length > 0 && (
                <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Things to consider:</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                        {currentResult.ai_assessment.questions.map((q, i) => (
                            <li key={i} style={{ marginBottom: '0.25rem' }}>{q}</li>
                        ))}
                    </ul>
                </div>
            )}
          </div>

          {/* OFFICIAL PERMITEASE ASSESSMENT */}
          <div className="card" style={{ borderLeft: '4px solid var(--primary-green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CheckCircle size={20} color="var(--primary-green)" />
                <h2 style={{ color: 'var(--primary-green)', margin: 0 }}>OFFICIAL PERMITEASE ASSESSMENT</h2>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <Info size={20} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                    <strong>Disclaimer:</strong> AI results are advisory. The requirements below are the official PermitEase requirements determined by the system's configured LGU rules for the <strong>{currentResult.ai_assessment.industry_category}</strong> category.
                </p>
            </div>

            {currentResult.official_assessment.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
                    <p style={{ margin: 0, color: '#64748b' }}>PermitEase does not currently have configured requirements matching this specific classification. Please verify your business classification with the LGU BPLO office.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {currentResult.official_assessment.map((req, i) => (
                        <div key={i} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1.25rem', background: 'white', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <FileText size={18} style={{ color: 'var(--primary-green)', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem' }}>{req.permit_name}</h4>
                                    {req.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{req.description}</p>}
                                </div>
                            </div>
                            {req.required_documents && (
                                <div style={{ marginTop: 'auto', background: '#f1f5f9', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                                    <strong>Documents:</strong> {req.required_documents}
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
        {loadingHistory ? <p className="text-muted">Loading...</p> :
          assessments.length === 0 ? <p className="text-muted text-center" style={{ padding: '2rem' }}>No assessments yet.</p> :
          assessments.map(a => {
            let parsed = null;
            try { parsed = JSON.parse(a.assessment_result); } catch {}
            
            // Handle both legacy format (just predicted items) and new format (ai_assessment + official_assessment)
            const isNewFormat = parsed && parsed.ai_assessment;
            const industry = isNewFormat ? parsed.ai_assessment.industry_category : (a.business_name ? 'Legacy' : 'Unknown');
            const type = isNewFormat ? parsed.ai_assessment.business_type : 'Unknown';
            const reqs = isNewFormat ? parsed.official_assessment : (parsed?.recommended_permits || []);

            return (
              <div key={a.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }} onClick={() => setExpandedHistory(expandedHistory === a.id ? null : a.id)}>
                  <div>
                    <p style={{ fontWeight: '600', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isNewFormat ? <BrainCircuit size={16} color="#6366f1" /> : <Building2 size={16} />}
                        {isNewFormat ? `${industry} - ${type}` : (a.business_name || 'Business Assessment')}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-approved">{reqs.length} requirements</span>
                    {expandedHistory === a.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
                {expandedHistory === a.id && parsed && (
                  <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)', background: '#f8fafc' }}>
                    {isNewFormat && (
                        <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem', color: '#4f46e5', fontWeight: 600 }}>AI SUMMARY</p>
                            <p style={{ fontSize: '0.85rem', margin: 0, color: '#334155' }}>{parsed.ai_assessment.summary}</p>
                        </div>
                    )}
                    <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem', color: 'var(--primary-green)', fontWeight: 600 }}>OFFICIAL REQUIREMENTS</p>
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
        }
      </div>
    </div>
  );
};

export default Assessment;
