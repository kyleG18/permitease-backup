import { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import {
  BrainCircuit, CheckCircle, CheckCircle2, FileText, ChevronDown, ChevronUp,
  History, Info, Building2, AlertCircle, Sparkles, Send, X,
  ArrowRight, HelpCircle, MapPin, ClipboardList, Loader2, Clock, Printer,
  PenLine, StickyNote, ShieldCheck
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const SIGNATURE_KEYWORDS = [
  'application form', 'application', 'cedula', 'community tax',
  'declaration', 'affidavit', 'sworn', 'contract', 'authorization'
];

function requiresSignature(permitName = '') {
  const lower = (permitName || '').toLowerCase();
  return SIGNATURE_KEYWORDS.some(kw => lower.includes(kw));
}

function parseInlineBold(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={pIdx} style={{ fontWeight: 700, color: '#0F172A' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function FormattedAiResponse({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection && currentSection.items.length > 0) {
        currentSection.items.push({ type: 'spacer' });
      }
      return;
    }

    // Check if line is a section header (e.g. **Where to Go** or ### Where to Go)
    const isHeader = /^(\*\*|###\s*)[^*#]+(\*\*|)$/.test(trimmed) && trimmed.length < 65;
    if (isHeader) {
      const title = trimmed.replace(/^(\*\*|###\s*)/, '').replace(/(\*\*|)$/, '').trim();
      currentSection = { title, items: [] };
      sections.push(currentSection);
    } else {
      if (!currentSection) {
        currentSection = { title: null, items: [] };
        sections.push(currentSection);
      }
      const isBullet = /^[\*\-\•]\s+/.test(trimmed);
      if (isBullet) {
        const bulletText = trimmed.replace(/^[\*\-\•]\s+/, '');
        currentSection.items.push({ type: 'bullet', text: bulletText });
      } else {
        currentSection.items.push({ type: 'paragraph', text: trimmed });
      }
    }
  });

  const getHeaderStyle = (title = '') => {
    const lower = title.toLowerCase();
    if (lower.includes('where') || lower.includes('saan') || lower.includes('location') || lower.includes('office') || lower.includes('go')) {
      return { Icon: MapPin, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', labelColor: '#1E40AF' };
    }
    if (lower.includes('why') || lower.includes('bakit') || lower.includes('required') || lower.includes('legal') || lower.includes('basis')) {
      return { Icon: ShieldCheck, color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', labelColor: '#166534' };
    }
    if (lower.includes('prerequisite') || lower.includes('step') || lower.includes('document') || lower.includes('need') || lower.includes('kinakailangan')) {
      return { Icon: ClipboardList, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', labelColor: '#5B21B6' };
    }
    if (lower.includes('status') || lower.includes('note') || lower.includes('record') || lower.includes('paalala')) {
      return { Icon: Info, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', labelColor: '#0369A1' };
    }
    return { Icon: Sparkles, color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE', labelColor: '#3730A3' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {sections.map((section, sIdx) => {
        const meta = section.title ? getHeaderStyle(section.title) : null;
        const Icon = meta?.Icon;
        const isStatusNote = section.title?.toLowerCase().includes('status');

        return (
          <div 
            key={sIdx}
            style={{
              backgroundColor: isStatusNote ? '#F0F9FF' : '#FFFFFF',
              border: isStatusNote ? '1.5px solid #BAE6FD' : '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              boxShadow: isStatusNote ? 'none' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            {section.title && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: meta.bg,
                color: meta.labelColor,
                border: `1px solid ${meta.border}`,
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.65rem'
              }}>
                <Icon size={14} color={meta.color} />
                <span>{section.title}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '13px', lineHeight: 1.5, color: '#334155' }}>
              {section.items.map((item, iIdx) => {
                if (item.type === 'spacer') {
                  return <div key={iIdx} style={{ height: '4px' }} />;
                }
                if (item.type === 'bullet') {
                  return (
                    <div key={iIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', paddingLeft: '0.25rem' }}>
                      <span style={{ color: meta ? meta.color : '#15803D', fontWeight: 'bold', fontSize: '14px', lineHeight: '18px', flexShrink: 0 }}>•</span>
                      <div style={{ flex: 1 }}>{parseInlineBold(item.text)}</div>
                    </div>
                  );
                }
                return (
                  <p key={iIdx} style={{ margin: 0 }}>
                    {parseInlineBold(item.text)}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const Assessment = () => {
  const { user, token } = useContext(AuthContext);
  const { lang, t } = useContext(LanguageContext);
  const authToken = token || user?.token || '';
  const config = { headers: { Authorization: `Bearer ${authToken}` } };
  const ta = t.assessment || {};

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [loadingBiz, setLoadingBiz] = useState(true);

  const [assessments, setAssessments] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(null);

  // Ask AI state per requirement: { [reqKey]: { isOpen: boolean, loading: boolean, answer: string, question: string, inputVal: string } }
  const [aiHelperState, setAiHelperState] = useState({});

  // 1. Initial Load: businesses and assessment history
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [bizRes, histRes] = await Promise.all([
          axios.get(`${API}/businesses`, config),
          axios.get(`${API}/assessments`, config),
        ]);
        const bizList = Array.isArray(bizRes.data) ? bizRes.data : [];
        setBusinesses(bizList);
        setAssessments(histRes.data || []);
        if (bizList.length > 0) {
          setSelectedBizId(String(bizList[0].id));
        }
      } catch (err) {
        setError('Failed to load initial data.');
      } finally {
        setLoadingBiz(false);
        setLoadingHistory(false);
      }
    };
    fetchAll();
  }, []);

  // 2. When selectedBizId changes, load compliance checklist & latest assessment from history
  useEffect(() => {
    if (!selectedBizId) return;

    const loadBizData = async () => {
      setLoadingChecklist(true);
      try {
        const compRes = await axios.get(`${API}/compliance/business/${selectedBizId}`, config);
        setChecklist(compRes.data?.checklist || []);

        const bizAssessments = assessments.filter(a => String(a.business_id) === String(selectedBizId));
        if (bizAssessments.length > 0) {
          try {
            const parsed = JSON.parse(bizAssessments[0].assessment_result);
            setCurrentResult(parsed);
          } catch {}
        } else {
          setCurrentResult(null);
        }
      } catch (err) {
        console.error('Failed to load compliance data', err);
      } finally {
        setLoadingChecklist(false);
      }
    };

    loadBizData();
  }, [selectedBizId, assessments]);

  const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId));

  // 3. Trigger AI Assessment
  const handleAssess = async () => {
    if (!selectedBizId) {
      setError('Please select a business to assess.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await axios.post(`${API}/assessments`, { business_id: selectedBizId }, config);
      setCurrentResult({
        ai_assessment: data.ai_assessment,
        official_assessment: data.official_assessment
      });

      // Refresh assessment history & checklist
      const histRes = await axios.get(`${API}/assessments`, config);
      setAssessments(histRes.data || []);

      const compRes = await axios.get(`${API}/compliance/business/${selectedBizId}`, config);
      setChecklist(compRes.data?.checklist || []);

      setSuccessMsg('AI Assessment completed! Review your required permits below. Mark what you already have and use "Ask AI" for guidance.');
      setTimeout(() => setSuccessMsg(''), 7000);
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

  // 4. Update requirement status (I Have This vs Still Need)
  const handleToggleStatus = async (requirementId, targetStatus) => {
    const oldItem = checklist.find(r => r.requirement_id === requirementId);
    if (!oldItem || oldItem.status === targetStatus) return;

    // Optimistically update
    setChecklist(prev => prev.map(r =>
      r.requirement_id === requirementId ? { ...r, status: targetStatus } : r
    ));

    try {
      await axios.put(
        `${API}/compliance/business/${selectedBizId}/requirement/${requirementId}`,
        { status: targetStatus },
        config
      );
    } catch (err) {
      setChecklist(prev => prev.map(r =>
        r.requirement_id === requirementId ? { ...r, status: oldItem.status } : r
      ));
      alert('Failed to update requirement status. Please try again.');
    }
  };

  // 5. Ask AI about a specific requirement
  const toggleAskAi = (reqKey) => {
    setAiHelperState(prev => {
      const current = prev[reqKey] || {};
      return {
        ...prev,
        [reqKey]: {
          ...current,
          isOpen: !current.isOpen,
          inputVal: current.inputVal || ''
        }
      };
    });
  };

  const askAiQuestion = async (reqKey, permitName, question) => {
    if (!question || !question.trim()) return;

    setAiHelperState(prev => ({
      ...prev,
      [reqKey]: {
        ...(prev[reqKey] || {}),
        loading: true,
        question: question,
        error: null,
        inputVal: ''
      }
    }));

    const bizName = selectedBiz?.business_name || 'My Business';
    const bizType = selectedBiz?.business_type || 'Commercial Enterprise';
    const fullPrompt = `You are the Roxas Municipality BPLO Permit Advisor.
Business: "${bizName}" (${bizType}) located in Roxas, Oriental Mindoro.
Permit Requirement: "${permitName}".
User Question: "${question}".

Instructions:
1. Answer clearly, accurately, and practically for the Municipality of Roxas, Oriental Mindoro.
2. Structure your answer with clean bold section headings:
   - **Where to Go**
   - **Why It Is Required**
   - **Prerequisites Needed**
   - **Current Status Note**
3. Use bullet points (* Item) for lists of requirements or steps. Keep explanations concise and easy to read.`;

    try {
      const res = await axios.post(`${API}/chat`, {
        question: fullPrompt,
        message: fullPrompt,
        language: lang || 'en'
      }, config);
      
      const replyText = res.data?.response || res.data?.reply || 'No detailed explanation available at this time.';

      setAiHelperState(prev => ({
        ...prev,
        [reqKey]: {
          ...(prev[reqKey] || {}),
          loading: false,
          answer: replyText,
          question: question
        }
      }));
    } catch (err) {
      console.error('Ask AI error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Unable to get AI answer right now. Please try again.';
      setAiHelperState(prev => ({
        ...prev,
        [reqKey]: {
          ...(prev[reqKey] || {}),
          loading: false,
          error: errMsg
        }
      }));
    }
  };

  // 6. Metrics & Derived Stats
  const totalReqs = checklist.length;
  const haveCount = checklist.filter(r => r.status === 'Approved' || r.status === 'Submitted').length;
  const needCount = totalReqs - haveCount;
  const score = totalReqs > 0 ? Math.round((haveCount / totalReqs) * 100) : 0;
  const scoreColor = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

  const aiAdvisoryReqs = currentResult?.ai_assessment?.recommended_permits || [];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-green-light)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BrainCircuit size={19} strokeWidth={2.2} />
            </div>
            <h1 style={{ color: 'var(--government-navy)', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>AI Assessment</h1>
          </div>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
            AI-driven identification of all municipal permits and statutory requirements for your specific business in Roxas City.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {totalReqs > 0 && (
            <button
              onClick={() => window.print()}
              className="btn btn-outline btn-sm no-print"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: '#CBD5E1', color: 'var(--government-navy)' }}
            >
              <Printer size={14} /> Print Checklist
            </button>
          )}
          <Link
            to="/applications"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            Prepare Application <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1.25rem', background: 'var(--danger-light)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', border: '1px solid #fca5a5' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {successMsg && (
        <div style={{ color: 'var(--success)', marginBottom: '1.25rem', background: 'var(--success-light)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', border: '1px solid #86efac' }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* ── BUSINESS SELECTOR & ACTION BAR ──────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
            <Building2 size={20} style={{ color: 'var(--primary-green)' }} />
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                Active Business Profile
              </label>
              {loadingBiz ? (
                <span className="text-muted">Loading businesses...</span>
              ) : businesses.length === 0 ? (
                <span className="text-muted">No business registered. <Link to="/onboarding" style={{ color: 'var(--primary-green)', fontWeight: 600 }}>Create one now &rarr;</Link></span>
              ) : (
                <select
                  value={selectedBizId}
                  onChange={(e) => setSelectedBizId(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    fontWeight: 600,
                    color: 'var(--government-navy)',
                    background: 'var(--surface)',
                    fontSize: '0.9375rem'
                  }}
                >
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.business_name} ({b.business_type} · {b.industry_category})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleAssess}
              disabled={loading || !selectedBizId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.875rem' }}
            >
              {loading ? (
                <>Analyzing with AI...</>
              ) : (
                <>
                  <Sparkles size={16} />
                  {currentResult || totalReqs > 0 ? 'Re-Run Assessment' : 'Run AI Assessment'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── READINESS SCORE PROGRESS CARD (If checklist exists) ───────────── */}
      {totalReqs > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '62px',
                height: '62px',
                borderRadius: '50%',
                background: score >= 80 ? 'var(--success-light)' : score >= 50 ? 'var(--warning-light)' : 'var(--danger-light)',
                color: scoreColor,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.2rem',
                border: `3px solid ${scoreColor}`
              }}>
                <span>{score}%</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '-3px' }}>ready</span>
              </div>

              <div>
                <h3 style={{ margin: '0 0 0.15rem', color: 'var(--government-navy)', fontSize: '1.05rem', fontWeight: 700 }}>
                  Permit Readiness Progress
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {score === 100
                    ? 'All requirements are marked ready! You can now proceed to Prepare Application.'
                    : `${haveCount} of ${totalReqs} requirements prepared. Mark items below as you obtain them.`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', background: 'var(--success-light)', color: 'var(--success)', fontWeight: 700, fontSize: '0.78rem' }}>
                ✓ {haveCount} Ready
              </span>
              <span style={{ padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', background: needCount > 0 ? 'var(--warning-light)' : 'var(--background)', color: needCount > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem' }}>
                ⏳ {needCount} Still Needed
              </span>
            </div>
          </div>

          <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginTop: '1rem' }}>
            <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}

      {/* ── AI CLASSIFICATION BANNER ───────────────────────────────────────── */}
      {currentResult?.ai_assessment && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', borderLeft: '4px solid #6366f1', background: '#fafbff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <BrainCircuit size={18} color="#6366f1" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#4338ca', fontWeight: 700 }}>AI Classification Analysis</h3>
            {currentResult.ai_assessment.confidence && (
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                {Math.round(currentResult.ai_assessment.confidence * 100)}% Confidence
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e0e7ff', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.6875rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Classified Category</span>
              <strong style={{ fontSize: '0.875rem', color: 'var(--government-navy)' }}>{currentResult.ai_assessment.industry_category}</strong>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e0e7ff', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.6875rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Business Type</span>
              <strong style={{ fontSize: '0.875rem', color: 'var(--government-navy)' }}>{currentResult.ai_assessment.business_type}</strong>
            </div>
          </div>

          {currentResult.ai_assessment.summary && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#334155', lineHeight: 1.5 }}>
              {currentResult.ai_assessment.summary}
            </p>
          )}

          {currentResult.ai_assessment.questions?.length > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e0e7ff' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca' }}>Points to clarify with Roxas City BPLO:</span>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.78rem', color: '#475569' }}>
                {currentResult.ai_assessment.questions.map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── REQUIREMENTS CHECKLIST WITH "ASK AI" & TOGGLES ─────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--government-navy)', fontWeight: 800 }}>
              Requirements Checklist &amp; AI Advisor
            </h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Mark what you have ready. Click <strong>Ask AI</strong> on any item to learn why it's needed or where to get it in Roxas City.
            </p>
          </div>
          
          {totalReqs > 0 && (
            <span style={{ fontSize: '0.75rem', background: 'var(--primary-green-light)', color: 'var(--primary-green-dark)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
              {totalReqs} Requirements Configured
            </span>
          )}
        </div>

        {!currentResult && totalReqs === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)' }}>
            <BrainCircuit size={40} style={{ color: 'var(--primary-green)', marginBottom: '0.75rem', opacity: 0.6 }} />
            <h3 style={{ margin: '0 0 0.4rem', color: 'var(--government-navy)' }}>Ready for Assessment</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
              Click <strong>"Run AI Assessment"</strong> above. PermitEase will analyze your business details and provide a tailored list of municipal requirements with on-demand AI guidance.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleAssess}
              disabled={loading || !selectedBizId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Sparkles size={16} /> Run AI Assessment Now
            </button>
          </div>
        ) : loadingChecklist ? (
          <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>Loading requirements...</p>
        ) : checklist.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No specific requirements found for this business. Please verify directly with Roxas BPLO.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {checklist.map((req, idx) => {
              const reqKey = `checklist_${req.requirement_id || idx}_${req.permit_name}`;
              const helper = aiHelperState[reqKey] || {};
              const isHave = req.status === 'Approved' || req.status === 'Submitted';
              const hasSignature = requiresSignature(req.permit_name);

              return (
                <div
                  key={req.requirement_id || idx}
                  style={{
                    border: `1px solid ${isHave ? '#bbf7d0' : helper.isOpen ? '#818cf8' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    background: isHave ? '#fcfdfc' : 'var(--surface)',
                    boxShadow: helper.isOpen ? '0 4px 14px rgba(23, 32, 51, 0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    
                    {/* Left: Info */}
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--government-navy)', fontWeight: 700 }}>
                          {req.permit_name}
                        </h4>

                        {req.is_mandatory ? (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--border-light)', color: 'var(--government-navy)' }}>
                            Mandatory
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: '#e0f2fe', color: '#0369a1' }}>
                            Conditional
                          </span>
                        )}

                        {hasSignature && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: '#fef3c7', color: '#92400e' }}>
                            <PenLine size={11} /> Handwritten signature required
                          </span>
                        )}
                      </div>

                      {req.description && (
                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          {req.description}
                        </p>
                      )}

                      {req.required_documents && (
                        <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--background)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)' }}>
                          <ClipboardList size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span><strong>What to bring:</strong> {req.required_documents}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Status Toggles & Ask AI Trigger Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', flexShrink: 0 }}>
                      
                      {/* I Have This toggle */}
                      <button
                        onClick={() => handleToggleStatus(req.requirement_id, 'Approved')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isHave ? '1px solid var(--primary-green)' : '1px solid var(--border-medium)',
                          background: isHave ? 'var(--primary-green)' : 'var(--surface)',
                          color: isHave ? '#fff' : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <CheckCircle2 size={14} /> I Have This
                      </button>

                      {/* Still Need toggle */}
                      <button
                        onClick={() => handleToggleStatus(req.requirement_id, 'Missing')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: !isHave ? '1px solid #d97706' : '1px solid var(--border-medium)',
                          background: !isHave ? '#fffbeb' : 'var(--surface)',
                          color: !isHave ? '#92400e' : 'var(--text-muted)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Clock size={14} /> Still Need
                      </button>

                      {/* Ask AI Trigger Button */}
                      <button
                        onClick={() => toggleAskAi(reqKey)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.8rem',
                          borderRadius: 'var(--radius-full)',
                          border: helper.isOpen ? '1px solid #6366f1' : '1px solid #e0e7ff',
                          background: helper.isOpen ? '#4f46e5' : '#eef2ff',
                          color: helper.isOpen ? '#fff' : '#4338ca',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Sparkles size={13} />
                        {helper.isOpen ? 'Close AI' : 'Ask AI'}
                      </button>
                    </div>

                  </div>

                  {/* ── EXPANDED ASK AI INLINE HELPER ───────────────────────── */}
                  {helper.isOpen && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e7ff', background: '#f8fafc', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Sparkles size={13} /> AI Advisory &mdash; {req.permit_name}
                        </span>
                        <button
                          onClick={() => toggleAskAi(reqKey)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          title="Close"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* Quick chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        <button
                          onClick={() => askAiQuestion(reqKey, req.permit_name, 'Why do I need this permit requirement for my business?')}
                          disabled={helper.loading}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.7rem',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid #c7d2fe',
                            background: '#fff',
                            color: '#3730a3',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <HelpCircle size={12} /> Why do I need this?
                        </button>

                        <button
                          onClick={() => askAiQuestion(reqKey, req.permit_name, 'Where do I physically go to get this permit in Roxas City, and which office handles it?')}
                          disabled={helper.loading}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.7rem',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid #c7d2fe',
                            background: '#fff',
                            color: '#3730a3',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <MapPin size={12} /> Where do I get this in Roxas?
                        </button>

                        <button
                          onClick={() => askAiQuestion(reqKey, req.permit_name, 'What prerequisites, fees, or preparation steps should I complete first?')}
                          disabled={helper.loading}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.7rem',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid #c7d2fe',
                            background: '#fff',
                            color: '#3730a3',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <ClipboardList size={12} /> Prerequisites &amp; Steps
                        </button>
                      </div>

                      {/* Custom Question Input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = (helper.inputVal || '').trim();
                          if (val) askAiQuestion(reqKey, req.permit_name, val);
                        }}
                        style={{ display: 'flex', gap: '0.4rem', marginBottom: helper.answer || helper.loading || helper.error ? '0.75rem' : 0 }}
                      >
                        <input
                          type="text"
                          placeholder="Or type a specific question about this permit..."
                          value={helper.inputVal || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAiHelperState(prev => ({
                              ...prev,
                              [reqKey]: { ...(prev[reqKey] || {}), inputVal: val }
                            }));
                          }}
                          disabled={helper.loading}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-medium)',
                            fontSize: '0.8125rem',
                            outline: 'none',
                            background: '#fff'
                          }}
                        />
                        <button
                          type="submit"
                          disabled={helper.loading || !(helper.inputVal || '').trim()}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            background: '#4f46e5',
                            color: '#fff',
                            border: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Send size={12} /> Ask
                        </button>
                      </form>

                      {/* Loading state */}
                      {helper.loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4338ca', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Consulting Roxas City permit guidelines...</span>
                        </div>
                      )}

                      {/* Error state */}
                      {helper.error && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.78rem', padding: '0.4rem 0' }}>
                          {helper.error}
                        </div>
                      )}

                      {/* AI Response Area */}
                      {helper.answer && !helper.loading && (
                        <div style={{ background: '#F8FAFC', border: '1px solid #C7D2FE', borderRadius: 'var(--radius-md)', padding: '0.9rem', marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', paddingBottom: '0.45rem', borderBottom: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#4F46E5' }}>
                              <Sparkles size={14} />
                              <span>AI Guidance for {req.permit_name}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#64748B', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Q: {helper.question}
                            </span>
                          </div>

                          {/* Formatted Structured Response */}
                          <FormattedAiResponse text={helper.answer} />
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* Next step prompt */}
        {totalReqs > 0 && (
          <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'var(--primary-green-light)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <strong style={{ color: 'var(--primary-green-dark)', fontSize: '0.9rem', display: 'block' }}>Ready to file your application?</strong>
              <span style={{ color: 'var(--primary-green-dark)', fontSize: '0.8125rem', opacity: 0.9 }}>
                Proceed to Prepare Application to print your pre-filled Form BPLO-01 or file via the Roxas eBPLS portal.
              </span>
            </div>
            <Link
              to="/applications"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              Go to Prepare Application <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* ── AI ADVISORY RECOMMENDATIONS ────────────────────────────────────── */}
      {aiAdvisoryReqs.length > 0 && (
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#0f766e', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <BrainCircuit size={17} color="#0d9488" />
            AI Advisory Recommendations
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#115e59', margin: '0 0 1rem' }}>
            Based on your declared business activities, the AI also suggests checking if these special permits apply:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {aiAdvisoryReqs.map((item, i) => (
              <div key={i} style={{ border: '1px solid #99f6e4', borderRadius: 'var(--radius-sm)', padding: '0.85rem', background: '#fff' }}>
                <strong style={{ fontSize: '0.875rem', color: '#0f172a', display: 'block', marginBottom: '0.2rem' }}>{item.permit_name}</strong>
                {item.reason && <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>{item.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ASSESSMENT HISTORY ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <History size={18} style={{ color: 'var(--primary-green)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--government-navy)', fontWeight: 700 }}>Assessment History</h3>
        </div>

        {loadingHistory ? (
          <p className="text-muted">Loading history...</p>
        ) : assessments.length === 0 ? (
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>No previous assessments on record.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {assessments.map(a => {
              let parsed = null;
              try { parsed = JSON.parse(a.assessment_result); } catch {}
              const isNewFormat = parsed && parsed.ai_assessment;
              const industry = isNewFormat ? parsed.ai_assessment.industry_category : 'General';
              const type = isNewFormat ? parsed.ai_assessment.business_type : 'Business';
              const reqs = isNewFormat ? (parsed.official_assessment || []) : (parsed?.recommended_permits || []);

              return (
                <div key={a.id} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
                  <div
                    onClick={() => setExpandedHistory(expandedHistory === a.id ? null : a.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', background: 'var(--background)' }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--government-navy)' }}>{a.business_name || `${industry} · ${type}`}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', background: 'var(--surface)', border: '1px solid var(--border-medium)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                        {reqs.length} requirements
                      </span>
                      {expandedHistory === a.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {expandedHistory === a.id && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', background: 'var(--surface)' }}>
                      {parsed?.ai_assessment?.summary && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          <strong>Summary:</strong> {parsed.ai_assessment.summary}
                        </p>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                        {reqs.map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                            <CheckCircle size={13} style={{ color: 'var(--primary-green)', flexShrink: 0 }} />
                            <span>{r.permit_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PRINT TARGET FOR CHECKLIST (Rendered on window.print) ────────── */}
      <div id="print-target" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #0f172a', paddingBottom: '1rem' }}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem' }}>Municipality of Roxas</h2>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#166534' }}>PermitEase — Preparation Checklist</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Business: <strong>{selectedBiz?.business_name}</strong> | Type: {selectedBiz?.business_type}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#475569' }}>Readiness Score: <strong>{score}%</strong> ({haveCount} of {totalReqs} prepared) | Date: {new Date().toLocaleDateString('en-PH')}</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem', width: '35%' }}>Permit / Requirement</th>
              <th style={{ padding: '0.5rem', width: '20%' }}>Status</th>
              <th style={{ padding: '0.5rem', width: '45%' }}>What to Bring</th>
            </tr>
          </thead>
          <tbody>
            {checklist.map((r, i) => {
              const isHave = r.status === 'Approved' || r.status === 'Submitted';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{r.permit_name}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: isHave ? '#166534' : '#b45309' }}>
                      {isHave ? '✓ READY' : '⏳ STILL NEEDED'}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', color: '#475569' }}>
                    {r.required_documents ? `Bring: ${r.required_documents}` : 'Standard requirements'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Assessment;
