import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, CheckCircle2, AlertCircle, FileText, Info, Download, BrainCircuit, Check, X } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

export default function PermitReadiness() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const initialBizId = queryParams.get('businessId') || '';
  
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState(initialBizId);
  const [loading, setLoading] = useState(true);
  
  // Requirement state
  const [assessment, setAssessment] = useState(null);
  const [requirements, setRequirements] = useState([]);
   // { reqId: 'HAVE' | 'NEED' | 'UNCHECKED' }

  const headers = { Authorization: `Bearer ${token}` };

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

  
  const loadAssessmentAndReqs = async () => {
    if (!selectedBizId) return;
    setLoading(true);
    try {
      // 1. Get assessment existence
      const r1 = await fetch(`${API}/assessments`, { headers });
      const assessmentsData = await r1.json();
      const bizAssessments = Array.isArray(assessmentsData) ? assessmentsData.filter(a => String(a.business_id) === String(selectedBizId)) : [];
      const latestAssessment = bizAssessments.length > 0 ? bizAssessments[0] : null;
      
      if (latestAssessment) {
        setAssessment(latestAssessment);

        // 2. Fetch authoritative checklist from DB
        let r2 = await fetch(`${API}/compliance/business/${selectedBizId}`, { headers });
        let complianceData = await r2.json();

        // 3. Fallback: if empty, force evaluation
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

  useEffect(() => {
    loadAssessmentAndReqs();
  }, [selectedBizId]);

  const updateReqStatus = async (requirement_id, newStatus) => {
    try {
        const res = await fetch(`${API}/compliance/business/${selectedBizId}/requirement/${requirement_id}`, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            // Update local state to reflect DB immediately
            setRequirements(prev => prev.map(r => 
                r.requirement_id === requirement_id ? { ...r, status: newStatus } : r
            ));
        } else {
            alert('Failed to update requirement status.');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred while updating status.');
    }
  };

  const selectedBusiness = businesses.find(b => String(b.id) === String(selectedBizId));

  const stats = useMemo(() => {
    let have = 0;
    let need = 0;
    let unchecked = 0;
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

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 0.25rem', color: 'var(--government-navy)' }}>
          Permit Readiness
        </h1>
        <p style={{ color: '#64748B', fontSize: '15px', margin: 0 }}>
          Review the requirements for your business and track what you already have before visiting BPLO.
        </p>
      </header>

      {/* Selector */}
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
        /* ================= EMPTY STATE (AI Not Done) ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <ShieldCheck size={32} color="var(--primary-green)" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '650', color: 'var(--government-navy)', margin: '0 0 1rem' }}>Personalized requirements have not been generated yet.</h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 auto 2rem', lineHeight: '1.6', maxWidth: '480px' }}>
              Complete the AI Permit Assessment first to identify requirements that may apply to your business. Permit requirements may vary depending on your business type, location, and other business information.
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
              <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>1. Complete AI Assessment</div><div style={{ fontSize: '12px', color: '#64748B' }}>Identify applicable rules.</div></div>
              <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>2. Review requirements</div><div style={{ fontSize: '12px', color: '#64748B' }}>See what applies to you.</div></div>
              <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>3. Track what you have</div><div style={{ fontSize: '12px', color: '#64748B' }}>Manage your readiness.</div></div>
              <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>4. Download application</div><div style={{ fontSize: '12px', color: '#64748B' }}>Prepare the physical form.</div></div>
              <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>5. Visit BPLO</div><div style={{ fontSize: '12px', color: '#64748B' }}>Official processing.</div></div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= ASSESSMENT DONE STATE ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* AI Success Banner */}
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BrainCircuit size={20} color="#166534" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '0.25rem' }}>AI ASSESSMENT COMPLETED</div>
                <div style={{ fontSize: '13px', color: '#14532D' }}>Your personalized requirement checklist was generated from your business information.</div>
              </div>
            </div>
            <Link to="/assessment" style={{ fontSize: '13px', fontWeight: '600', color: '#166534', backgroundColor: 'white', border: '1px solid #86EFAC', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none' }}>
              Review AI Assessment
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--government-navy)' }}>{selectedBusiness?.business_name}</div>
              <div style={{ fontSize: '14px', color: '#64748B' }}>{selectedBusiness?.business_status === 'Renewal' ? 'Renewal' : 'New Business Permit'}</div>
            </div>
          </div>

          {/* OVERALL READINESS SCORE */}
          <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '2rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>OVERALL READINESS</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--government-navy)' }}>
                {stats.have} of {stats.total} requirements ready
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: stats.percentage === 100 ? '#16A34A' : 'var(--primary-green)' }}>
                {stats.percentage}%
              </div>
            </div>
            
            {/* Progress Bar */}
            <div style={{ height: '12px', backgroundColor: '#E2E8F0', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.25rem', display: 'flex' }}>
              <div style={{ height: '100%', backgroundColor: stats.percentage === 100 ? '#16A34A' : 'var(--primary-green)', width: `${stats.percentage}%`, transition: 'width 0.3s ease' }}></div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px', color: '#64748B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16A34A' }}></div>{stats.have} Have</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EA580C' }}></div>{stats.need} Still Need</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#94A3B8' }}></div>{stats.unchecked} Not Checked</div>
            </div>

            {/* Readness State Banner */}
            {stats.percentage === 100 ? (
              <div style={{ marginTop: '1.5rem', backgroundColor: '#F0FDF4', borderLeft: '4px solid #16A34A', padding: '1rem', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534', marginBottom: '0.25rem' }}>READY FOR PHYSICAL SUBMISSION</div>
                <div style={{ fontSize: '13px', color: '#14532D' }}>You've marked all recommended requirements as ready.</div>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem', backgroundColor: '#FFF7ED', borderLeft: '4px solid #EA580C', padding: '1rem', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#9A3412', marginBottom: '0.25rem' }}>NOT YET READY</div>
                <div style={{ fontSize: '13px', color: '#9A3412' }}>You still have {stats.need + stats.unchecked} requirements to prepare before visiting the BPLO office.</div>
              </div>
            )}
          </div>

          {/* REQUIREMENTS CHECKLIST */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>REQUIRED DOCUMENTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {requirements.map((req) => {
                const s = req.status;
                const isHave = s === 'Submitted' || s === 'Approved';
                const isNeed = s === 'Missing';
                
                return (
                  <div key={req.id} style={{ 
                    backgroundColor: 'white', 
                    border: `1px solid ${isHave ? '#86EFAC' : isNeed ? '#FDBA74' : '#E2E8F0'}`, 
                    borderRadius: '8px', padding: '1.25rem', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                  }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        {isHave ? <CheckCircle2 size={18} color="#16A34A" style={{ marginTop: '2px' }} /> : isNeed ? <AlertCircle size={18} color="#EA580C" style={{ marginTop: '2px' }} /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #CBD5E1', marginTop: '2px' }}></div>}
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.25rem' }}>{req.permit_name}</div>
                          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '0.5rem' }}>
                            {req.is_ai_recommended ? 'May apply based on your business profile.' : req.description || 'Required business document.'}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: isHave ? '#16A34A' : isNeed ? '#EA580C' : '#64748B' }}>
                            Status: {isHave ? 'Ready' : isNeed ? 'Still Needed' : 'Not Checked'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!isHave && (
                        <button onClick={() => updateReqStatus(req.requirement_id, 'Submitted')} style={{ padding: '0.5rem 1rem', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          I Have This
                        </button>
                      )}
                      {!isNeed && (
                        <button onClick={() => updateReqStatus(req.requirement_id, 'Missing')} style={{ padding: '0.5rem 1rem', backgroundColor: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          I Still Need This
                        </button>
                      )}
                      {(isHave || isNeed) && (
                        <button onClick={() => updateReqStatus(req.requirement_id, 'Missing')} aria-label="Reset status" style={{ padding: '0.5rem', backgroundColor: 'transparent', color: '#94A3B8', border: 'none', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PERMIT PREPARATION / DOWNLOAD SECTION */}
          <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '1.75rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>PERMIT PREPARATION</div>
            <p style={{ fontSize: '14px', color: 'var(--government-navy)', marginBottom: '0.4rem', fontWeight: '500', lineHeight: '1.5' }}>
              Once you have reviewed your requirements, download or print the application form and prepare your physical documents for your visit to BPLO.
            </p>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 1.25rem' }}>
              Bring the completed form and required physical documents to the BPLO office for official processing.
            </p>
            <a
              href="/forms/Roxas_Business_Permit_Application_Form.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--primary-green)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <Download size={17} strokeWidth={2} />
              Download / Print Application Form
            </a>
          </div>

          {/* OFFICIAL PROCESS NOTICE */}
          <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Info size={18} color="#0284C7" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0369A1', marginBottom: '0.25rem' }}>OFFICIAL BPLO PROCESS</div>
              <p style={{ fontSize: '13px', color: '#0C4A6E', margin: 0, lineHeight: 1.5 }}>
                PermitEase helps you prepare and check your requirements. Physical document submission, official assessment, signatures, payment, and permit processing are handled by the Municipality of Roxas / BPLO office.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
