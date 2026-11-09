import { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import AssessmentChecklistPrint from '../components/AssessmentChecklistPrint';
import {
  BrainCircuit, CheckCircle, CheckCircle2, FileText, ChevronDown, ChevronUp,
  History, Info, Building2, AlertCircle, Sparkles, Send, X,
  ArrowRight, HelpCircle, MapPin, ClipboardList, Loader2, Clock, Printer, Download,
  PenLine, StickyNote, ShieldCheck, BookOpen, ExternalLink, Library,
  Landmark, Building, Filter, Layers
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

function getRequirementStage(req, isTl = false) {
  const name = (req.permit_name || '').toLowerCase();
  const agency = (req.issuing_agency || '').toLowerCase();

  // STAGE 1: National Legal Registrations (DTI, SEC, CDA, BIR)
  if (
    agency.includes('dti') || agency.includes('sec') || agency.includes('cda') || agency.includes('bir') ||
    name.includes('dti') || name.includes('sec') || name.includes('cda') || name.includes('bir') ||
    name.includes('tax identification') || name.includes('certificate of registration') || name.includes('business name')
  ) {
    return {
      id: 'stage_1',
      order: 1,
      title: isTl ? 'Yugto 1 — Pambansang Legal na Rehistro' : 'Stage 1 — National Legal Registrations',
      badge: isTl ? 'Pambansang Ahensya' : 'National Agencies',
      description: isTl ? 'Pangunahing pagkakakilanlan at rehistro sa buwis bago kumuha ng mga lokal na clearance.' : 'Foundational identity and tax registrations to secure first before local clearances.',
      Icon: Landmark,
      color: 'var(--government-navy)',
      bg: '#F1F4F8',
      border: '#D1D9E0'
    };
  }

  // STAGE 2: Barangay & Community Clearances (Barangay, Cedula / Community Tax)
  if (
    agency.includes('barangay') || agency.includes('treasur') || agency.includes('mto') ||
    name.includes('barangay') || name.includes('cedula') || name.includes('community tax')
  ) {
    return {
      id: 'stage_2',
      order: 2,
      title: isTl ? 'Yugto 2 — Mga Clearance sa Barangay at Komunidad' : 'Stage 2 — Barangay & Community Clearances',
      badge: isTl ? 'Lokal na Komunidad' : 'Local Community',
      description: isTl ? 'Mga clearance mula sa iyong lokal na barangay hall at sedula / community tax.' : 'Jurisdictional clearances from your local barangay hall and community tax assessment.',
      Icon: Building,
      color: 'var(--government-navy)',
      bg: '#F1F4F8',
      border: '#D1D9E0'
    };
  }

  // STAGE 3: Municipal Inspections & Regulatory Clearances (BFP, Health/Sanitary, Zoning, Building)
  if (
    agency.includes('fire') || agency.includes('bfp') || agency.includes('health') || agency.includes('sanitary') || agency.includes('zoning') || agency.includes('engineer') || agency.includes('building') ||
    name.includes('fire') || name.includes('fsic') || name.includes('sanitary') || name.includes('health') || name.includes('zoning') || name.includes('locational') || name.includes('occupancy')
  ) {
    return {
      id: 'stage_3',
      order: 3,
      title: isTl ? 'Yugto 3 — Inspeksyon sa Munisipyo at Regulasyon' : 'Stage 3 — Municipal Inspections & Regulatory Clearances',
      badge: isTl ? 'Mga Tanggapan ng Munisipyo ng Roxas' : 'Roxas Municipal Offices',
      description: isTl ? 'Mga clearance para sa kaligtasan, kalinisan, at zoning na kinakailangan ng munisipyo.' : 'Safety, sanitation, and zoning clearances required by municipal inspection departments.',
      Icon: ShieldCheck,
      color: 'var(--government-navy)',
      bg: '#F1F4F8',
      border: '#D1D9E0'
    };
  }

  // STAGE 4: Industry-Specific & Special Clearances (MENRO, Special Permits, Tourism, Liquor, etc.)
  return {
    id: 'stage_4',
    order: 4,
    title: isTl ? 'Yugto 4 — Mga Espesyal na Clearance ayon sa Industriya' : 'Stage 4 — Industry-Specific & Special Clearances',
    badge: isTl ? 'Espesyal / Kondisyonal' : 'Special / Conditional',
    description: isTl ? 'Mga clearance sa kapaligiran, kalakalan, o espesyal na permit para sa iyong negosyo.' : 'Environmental, trade, or specialized clearances tailored to your specific business activities.',
    Icon: Sparkles,
    color: 'var(--government-navy)',
    bg: '#F1F4F8',
    border: '#D1D9E0'
  };
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
    return { Icon: Sparkles, color: 'var(--primary-green)', bg: 'var(--primary-green-light)', border: '#B7DEC5', labelColor: 'var(--primary-green-dark)' };
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

const ANALYSIS_STEPS = [
  'Reading business profile & declared activities in Municipality of Roxas...',
  'Cross-referencing Roxas Municipal Revenue Code & national statutes...',
  'Checking prerequisite clearances (DTI/SEC, BFP, Sanitary, Zoning)...',
  'Finalizing tailored permit checklist & estimated processing fees...'
];

const Assessment = () => {
  const { user, token } = useContext(AuthContext);
  const { lang, t } = useContext(LanguageContext);
  const isTl = lang === 'tl';
  const authToken = token || user?.token || '';
  const config = { headers: { Authorization: `Bearer ${authToken}` } };
  const ta = t.assessment || {};

  const analysisSteps = isTl ? [
    'Binabasa ang profile ng negosyo at mga idineklarang aktibidad sa Bayan ng Roxas...',
    'Isinasangguni sa Roxas Municipal Revenue Code at mga pambansang batas...',
    'Sinusuri ang mga paunang clearance (DTI/SEC, BFP, Sanitary, Zoning)...',
    'Kinukumpleto ang iniangkop na checklist ng permit at mga tinatayang bayarin...'
  ] : [
    'Reading business profile & declared activities in Municipality of Roxas...',
    'Cross-referencing Roxas Municipal Revenue Code & national statutes...',
    'Checking prerequisite clearances (DTI/SEC, BFP, Sanitary, Zoning)...',
    'Finalizing tailored permit checklist & estimated processing fees...'
  ];

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [loadingBiz, setLoadingBiz] = useState(true);

  const [assessments, setAssessments] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [knowledgeDocs, setKnowledgeDocs] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(null);

  // Cycle analysis message while loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setAnalysisStep(prev => (prev + 1) % analysisSteps.length);
    }, 1600);
    return () => clearInterval(interval);
  }, [loading, analysisSteps.length]);

  // Ask AI state per requirement: { [reqKey]: { isOpen: boolean, loading: boolean, answer: string, question: string, inputVal: string } }
  const [aiHelperState, setAiHelperState] = useState({});

  // 1. Initial Load: businesses, assessment history, and knowledge base
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [bizRes, histRes, kbRes] = await Promise.all([
          axios.get(`${API}/businesses`, config),
          axios.get(`${API}/assessments`, config),
          axios.get(`${API}/knowledge`).catch(() => ({ data: [] }))
        ]);
        const bizList = Array.isArray(bizRes.data) ? bizRes.data : [];
        setBusinesses(bizList);
        setAssessments(histRes.data || []);
        setKnowledgeDocs(Array.isArray(kbRes.data) ? kbRes.data : []);
        if (bizList.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const requestedBizId = params.get('businessId') || params.get('business_id');
          const matched = requestedBizId && bizList.find(b => String(b.id) === String(requestedBizId));
          setSelectedBizId(String(matched ? matched.id : bizList[0].id));
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
        const detail = err.response?.data?.detail;
        const msg = err.response?.data?.message;
        if (detail || msg) {
          setError(detail ? `Requirements load notice: ${detail}` : `Requirements load notice: ${msg}`);
        }
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
    setAnalysisStep(0);
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await axios.post(`${API}/assessments`, { business_id: selectedBizId }, config);
      setCurrentResult({
        ai_assessment: data.ai_assessment,
        official_assessment: data.official_assessment,
        knowledge_base_references: data.knowledge_base_references
      });

      // Refresh assessment history & checklist
      const histRes = await axios.get(`${API}/assessments`, config);
      setAssessments(histRes.data || []);

      const compRes = await axios.get(`${API}/compliance/business/${selectedBizId}`, config);
      setChecklist(compRes.data?.checklist || []);

      setLastUpdated(new Date());
      setSuccessMsg('AI Assessment completed! Requirements checklist has been refreshed.');
      setTimeout(() => setSuccessMsg(''), 7000);
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many requests. Please try again in a moment.');
      } else {
        const detail = err.response?.data?.detail;
        const msg = err.response?.data?.message;
        setError(detail ? `Assessment error: ${detail}` : (msg || 'Assessment failed. Please try again.'));
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
3. Use bullet points (* Item) for lists of requirements or steps. Keep explanations concise and easy to read.
4. CRITICAL: DO NOT introduce yourself or say "Hello!", "I am PermitEase AI Assistant", etc. Start directly with the first section heading.`;

    try {
      const res = await axios.post(`${API}/chat`, {
        question: fullPrompt,
        message: fullPrompt,
        language: lang || 'en',
        is_advisory: true
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
      const detail = err.response?.data?.detail;
      const msg = err.response?.data?.message;
      const errMsg = detail ? `AI Advisor error: ${detail}` : (msg || err.message || 'Unable to get AI answer right now. Please try again.');
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
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'need' | 'have'

  const totalReqs = checklist.length;
  const haveCount = checklist.filter(r => r.status === 'Approved' || r.status === 'Submitted').length;
  const needCount = totalReqs - haveCount;
  const score = totalReqs > 0 ? Math.round((haveCount / totalReqs) * 100) : 0;
  const scoreColor = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

  const totalRequirementExpenses = checklist.reduce((sum, r) => sum + (parseFloat(r.estimated_fee) || 0), 0);
  const stillNeededExpenses = checklist
    .filter(r => r.status !== 'Approved' && r.status !== 'Submitted')
    .reduce((sum, r) => sum + (parseFloat(r.estimated_fee) || 0), 0);

  const aiAdvisoryReqs = currentResult?.ai_assessment?.recommended_permits || [];

  // Group checklist by stage and status filter
  const groupedStages = useMemo(() => {
    if (!checklist || checklist.length === 0) return [];

    const filtered = checklist.filter(req => {
      const isHave = req.status === 'Approved' || req.status === 'Submitted';
      if (statusFilter === 'need') return !isHave;
      if (statusFilter === 'have') return isHave;
      return true;
    });

    const buckets = {};

    filtered.forEach(req => {
      const stage = getRequirementStage(req, isTl);
      if (!buckets[stage.id]) {
        buckets[stage.id] = {
          ...stage,
          items: []
        };
      }
      buckets[stage.id].items.push(req);
    });

    return Object.values(buckets).sort((a, b) => a.order - b.order);
  }, [checklist, statusFilter, isTl]);

  return (
    <div className="animate-fade-in page-container" style={{ maxWidth: '1200px' }}>
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="page-heading-row">
        <div className="page-heading-row__left">
          <div className="page-heading-icon page-heading-icon--ai">
            <BrainCircuit size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ color: 'var(--government-navy)', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
              {isTl ? 'Pagsusuri ng AI para sa Permit' : 'AI Permit Assessment'}
            </h1>
            <p className="text-muted" style={{ margin: '0.15rem 0 0', fontSize: '0.875rem' }}>
              {isTl
                ? 'Gabay ng AI sa pagtukoy ng lahat ng mga permit at statutory requirements para sa iyong negosyo sa Bayan ng Roxas.'
                : 'AI-guided identification of all municipal permits and statutory requirements for your specific business in the Municipality of Roxas.'}
            </p>
          </div>
        </div>

        <div className="page-heading-actions">
          {totalReqs > 0 && (
            <button
              onClick={() => window.print()}
              className="btn btn-sm no-print"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                backgroundColor: 'var(--primary-green)', color: '#fff',
                border: 'none', borderRadius: '8px',
                padding: '0.5rem 1rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,122,61,0.25)'
              }}
              title={isTl ? 'I-download ang opisyal na checklist ng mga kinakailangan' : 'Download official requirements checklist'}
              aria-label="Download Requirements Checklist"
            >
              <Download size={14} /> {isTl ? 'I-download ang Checklist' : 'Download Checklist'}
            </button>
          )}
          <Link
            to="/applications"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            {isTl ? 'Maghanda ng Aplikasyon' : 'Prepare Application'} <ArrowRight size={14} />
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
      <div className="card assessment-biz-selector-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div className="assessment-biz-selector-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="assessment-biz-select-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
            <Building2 size={20} style={{ color: 'var(--primary-green)' }} />
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                {isTl ? 'Aktibong Profile ng Negosyo' : 'Active Business Profile'}
              </label>
              {loadingBiz ? (
                <span className="text-muted">{isTl ? 'Ikinakarga ang mga negosyo...' : 'Loading businesses...'}</span>
              ) : businesses.length === 0 ? (
                <span className="text-muted">
                  {isTl ? 'Walang nakarehistrong negosyo.' : 'No business registered.'}{' '}
                  <Link to="/onboarding" style={{ color: 'var(--primary-green)', fontWeight: 600 }}>
                    {isTl ? 'Gumawa ngayon →' : 'Create one now &rarr;'}
                  </Link>
                </span>
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

          <div className="assessment-biz-action-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {lastUpdated && !loading && (
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-green)', background: 'var(--primary-green-light)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-full)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', border: '1px solid #B7DEC5' }}>
                <CheckCircle2 size={12} /> {isTl ? 'Na-update' : 'Updated'} {lastUpdated.toLocaleTimeString(isTl ? 'fil-PH' : 'en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            )}

            <button
              className="btn btn-primary"
              onClick={handleAssess}
              disabled={loading || !selectedBizId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: loading ? '0 0 0 4px rgba(22, 122, 61, 0.2)' : undefined,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isTl ? 'Sinusuri gamit ang AI...' : 'Analyzing with AI...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{currentResult || totalReqs > 0 ? (isTl ? 'Muling Suriin gamit ang AI' : 'Re-Run Assessment') : (isTl ? 'Simulan ang Pagsusuri ng AI' : 'Run AI Assessment')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── ACTIVE AI RUNNING BANNER ── */}
      {loading && (
        <div className="assessment-running-banner animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-green)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(22, 122, 61, 0.25)' }}>
              <BrainCircuit size={22} className="animate-pulse" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--primary-green-dark)', fontWeight: 800 }}>
                  {isTl
                    ? `Sinusuri ang mga Rekisito para sa ${selectedBiz?.business_name || 'Negosyo'}...`
                    : `Analyzing Requirements for ${selectedBiz?.business_name || 'Business'}...`}
                </strong>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary-green-dark)', background: '#FFFFFF', padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', border: '1px solid #B7DEC5', textTransform: 'uppercase' }}>
                  {isTl ? 'Aktibo ang AI Engine' : 'AI Engine Active'}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#4B5563' }}>
                {analysisSteps[analysisStep]}
              </p>
            </div>
          </div>

          <div className="assessment-running-track">
            <div className="assessment-running-bar" />
          </div>
        </div>
      )}

      {/* ── UPDATED RESULTS WRAPPER WITH FADE-IN ANIMATION ── */}
      <div key={lastUpdated ? lastUpdated.getTime() : 'initial'} className="animate-fade-in">


      {/* ── AI CLASSIFICATION BANNER ───────────────────────────────────────── */}
      {currentResult?.ai_assessment && (
        <div className="assessment-ai-panel">
          <div className="assessment-ai-panel__header">
            <BrainCircuit size={18} style={{ color: 'var(--ai-accent)' }} />
            <h3 className="assessment-ai-panel__title">
              {isTl ? 'Pagsusuri ng Klasipikasyon ng AI' : 'AI Classification Analysis'}
            </h3>
            {currentResult.ai_assessment.confidence && (
              <span className="assessment-ai-panel__confidence">
                {isTl
                  ? `${Math.round(currentResult.ai_assessment.confidence * 100)}% Kumpiyansa`
                  : `${Math.round(currentResult.ai_assessment.confidence * 100)}% Confidence`}
              </span>
            )}
          </div>

          <div className="assessment-ai-panel__meta-grid">
            <div className="assessment-ai-meta-item">
              <span className="assessment-ai-meta-item__label">
                {isTl ? 'Nakilalang Kategorya' : 'Classified Category'}
              </span>
              <strong className="assessment-ai-meta-item__value">{currentResult.ai_assessment.industry_category}</strong>
            </div>
            <div className="assessment-ai-meta-item">
              <span className="assessment-ai-meta-item__label">
                {isTl ? 'Uri ng Negosyo' : 'Business Type'}
              </span>
              <strong className="assessment-ai-meta-item__value">{currentResult.ai_assessment.business_type}</strong>
            </div>
          </div>

          {currentResult.ai_assessment.summary && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {currentResult.ai_assessment.summary}
            </p>
          )}

          {currentResult.ai_assessment.questions?.length > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--ai-accent-border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ai-accent-dark)' }}>
                {isTl ? 'Mga puntong lilinawin sa Roxas Municipal BPLO:' : 'Points to clarify with Roxas Municipal BPLO:'}
              </span>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {currentResult.ai_assessment.questions.map((q, idx) => (
                  <li key={idx} style={{ marginTop: '0.15rem' }}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}



      {/* ── REQUIRED PERMITS & CLEARANCES ROADMAP (STAGE CARDS) ────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--government-navy)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} style={{ color: 'var(--primary-green)' }} />
              {isTl ? 'Mga Kinakailangang Permit at Clearance' : 'Required Permits & Clearances'}
            </h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {isTl
                ? `Hakbang-hakbang na rekisito para sa ${selectedBiz?.business_type || 'iyong negosyo'} sa Bayan ng Roxas.`
                : `Step-by-step regulatory requirements tailored for ${selectedBiz?.business_type || 'your business'} in the Municipality of Roxas.`}
            </p>
          </div>
          
          {totalReqs > 0 && (
            <span style={{ fontSize: '0.75rem', background: 'var(--primary-green-light)', color: 'var(--primary-green-dark)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
              {isTl ? `${totalReqs} Rekisito ang Naka-configure` : `${totalReqs} Requirements Configured`}
            </span>
          )}
        </div>

        {!currentResult && totalReqs === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)' }}>
            <BrainCircuit size={40} style={{ color: 'var(--primary-green)', marginBottom: '0.75rem', opacity: 0.6 }} />
            <h3 style={{ margin: '0 0 0.4rem', color: 'var(--government-navy)' }}>
              {isTl ? 'Handa para sa Pagsusuri' : 'Ready for Assessment'}
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
              {isTl
                ? 'I-click ang "Simulan ang Pagsusuri ng AI" sa itaas. Susuriin ng PermitEase ang mga detalye ng iyong negosyo at magbibigay ng iniangkop na listahan ng mga rekisito sa munisipyo na may gabay ng AI.'
                : 'Click "Run AI Assessment" above. PermitEase will analyze your business details and provide a tailored list of municipal requirements with on-demand AI guidance.'}
            </p>
            <button
              className="btn btn-primary"
              onClick={handleAssess}
              disabled={loading || !selectedBizId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isTl ? 'Sinusuri gamit ang AI...' : 'Analyzing with AI...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{isTl ? 'Simulan ang Pagsusuri ng AI' : 'Run AI Assessment Now'}</span>
                </>
              )}
            </button>
          </div>
        ) : loadingChecklist ? (
          <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>
            {isTl ? 'Ikinakarga ang mga rekisito...' : 'Loading requirements...'}
          </p>
        ) : checklist.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {isTl
              ? 'Walang tiyak na rekisitong nahanap para sa negosyong ito. Mangyaring direktang beripikahin sa Roxas BPLO.'
              : 'No specific requirements found for this business. Please verify directly with Roxas BPLO.'}
          </div>
        ) : (
          <>
            {/* Filter Toolbar */}
            {totalReqs > 0 && (
          <div className="req-filter-bar">
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.25rem', marginRight: '0.25rem' }}>
              <Filter size={14} /> {isTl ? 'Salain:' : 'Filter:'}
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`req-filter-btn ${statusFilter === 'all' ? 'req-filter-btn--active' : ''}`}
            >
              <span>{isTl ? 'Lahat ng Rekisito' : 'All Requirements'}</span>
              <span className="req-filter-count">{totalReqs}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('need')}
              className={`req-filter-btn ${statusFilter === 'need' ? 'req-filter-btn--active' : ''}`}
            >
              <span>{isTl ? '⏳ Kailangan Pa' : '⏳ Still Needed'}</span>
              <span className="req-filter-count">{needCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('have')}
              className={`req-filter-btn ${statusFilter === 'have' ? 'req-filter-btn--active' : ''}`}
            >
              <span>{isTl ? '✓ Handa Na / Mayroon Na' : '✓ Ready / Acquired'}</span>
              <span className="req-filter-count">{haveCount}</span>
            </button>
          </div>
        )}

        {groupedStages.length === 0 ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)', margin: '1rem 0' }}>
            {statusFilter === 'need' ? (
              <>
                <CheckCircle2 size={36} style={{ color: 'var(--primary-green)', margin: '0 auto 0.5rem', opacity: 0.8 }} />
                <h4 style={{ margin: '0 0 0.25rem', color: 'var(--government-navy)' }}>
                  {isTl ? 'Handa na ang Lahat ng Rekisito!' : 'All Requirements Prepared!'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {isTl
                    ? 'Naitatak mo na ang lahat ng mga paunang rekisito bilang handa na. Pumunta sa Maghanda ng Aplikasyon para mag-file.'
                    : 'You have marked all prerequisite requirements as ready. Proceed to Prepare Application to file.'}
                </p>
              </>
            ) : statusFilter === 'have' ? (
              <>
                <Clock size={36} style={{ color: 'var(--accent-gold)', margin: '0 auto 0.5rem', opacity: 0.8 }} />
                <h4 style={{ margin: '0 0 0.25rem', color: 'var(--government-navy)' }}>
                  {isTl ? 'Wala Pang Handa na Rekisito' : 'No Ready Items Yet'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {isTl
                    ? 'Lumipat sa "Lahat" o "Kailangan Pa" at i-click ang "Handa Na" habang nakukuha mo ang iyong mga clearance.'
                    : 'Switch to "All" or "Still Needed" and click "Ready" as you acquire your clearances.'}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isTl ? 'Walang tumutugmang rekisito sa filter na ito.' : 'No requirements match this filter.'}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {groupedStages.map(stage => {
              const StageIcon = stage.Icon;
              const stageTotal = stage.items.length;
              const stageReady = stage.items.filter(r => r.status === 'Approved' || r.status === 'Submitted').length;

              return (
                <div key={stage.id} className="req-stage-section">
                  {/* Stage Header */}
                  <div className="req-stage-header" style={{ backgroundColor: stage.bg, borderColor: stage.border }}>
                    <div className="req-stage-title-wrap">
                      <div className="req-stage-icon-box" style={{ backgroundColor: '#ffffff', color: stage.color, border: `1px solid ${stage.border}` }}>
                        <StageIcon size={17} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 className="req-stage-title" style={{ color: stage.color }}>{stage.title}</h3>
                          <span className="req-stage-badge" style={{ backgroundColor: '#ffffff', color: stage.color, border: `1px solid ${stage.border}` }}>
                            {stage.badge}
                          </span>
                        </div>
                        <p className="req-stage-desc">{stage.description}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', backgroundColor: '#ffffff', color: stageReady === stageTotal ? 'var(--primary-green)' : 'var(--text-secondary)', border: `1px solid ${stage.border}` }}>
                        {isTl ? `${stageReady} sa ${stageTotal} Handa Na` : `${stageReady} of ${stageTotal} Ready`}
                      </span>
                    </div>
                  </div>

                  {/* Cards Grid */}
                  <div className="req-cards-grid" style={{ borderColor: stage.border }}>
                    {stage.items.map((req, idx) => {
                      const reqKey = `checklist_${req.requirement_id || idx}_${req.permit_name}`;
                      const helper = aiHelperState[reqKey] || {};
                      const isHave = req.status === 'Approved' || req.status === 'Submitted';
                      const hasSignature = requiresSignature(req.permit_name);

                      return (
                        <div
                          key={req.requirement_id || idx}
                          className={`req-card ${isHave ? 'req-card--ready' : ''} ${helper.isOpen ? 'req-card--ai-open' : ''}`}
                        >
                          {/* Card Top Row: Agency, Badges, Fee */}
                          <div className="req-card-top">
                            <div className="req-card-tags">
                              {req.issuing_agency && (
                                <span className="req-card-agency">{req.issuing_agency}</span>
                              )}
                              {req.is_mandatory ? (
                                <span className="req-card-type-mandatory">{isTl ? 'Kailangan' : 'Mandatory'}</span>
                              ) : (
                                <span className="req-card-type-conditional">{isTl ? 'Kondisyonal' : 'Conditional'}</span>
                              )}
                            </div>

                            {req.estimated_fee !== undefined && (
                              <span className="req-card-fee">
                                ₱{Number(req.estimated_fee || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>

                          {/* Card Title & Badges */}
                          <div>
                            <h4 className="req-card-title">{req.permit_name}</h4>

                            {hasSignature && (
                              <div className="req-card-signature">
                                <PenLine size={11} />
                                <span>{isTl ? 'Kailangan ng lagda sa kamay' : 'Handwritten signature required'}</span>
                              </div>
                            )}

                            {req.description && (
                              <p className="req-card-desc">{req.description}</p>
                            )}

                            {req.required_documents && (
                              <div className="req-card-docs">
                                <ClipboardList size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-muted)' }} />
                                <div><strong>{isTl ? 'Mga dadalhin:' : 'What to bring:'}</strong> {req.required_documents}</div>
                              </div>
                            )}
                          </div>

                          {/* Card Action Bar */}
                          <div className="req-card-footer">
                            <div className="req-status-segmented">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(req.requirement_id, 'Approved')}
                                className={`req-seg-btn req-seg-btn--have ${isHave ? 'active' : ''}`}
                                title={isTl ? 'Markahan bilang handa na' : 'Mark as ready / acquired'}
                              >
                                <CheckCircle2 size={13} /> {isTl ? 'Handa Na' : 'Ready'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(req.requirement_id, 'Missing')}
                                className={`req-seg-btn req-seg-btn--need ${!isHave ? 'active' : ''}`}
                                title={isTl ? 'Markahan bilang kailangan pa' : 'Mark as still needed'}
                              >
                                <Clock size={13} /> {isTl ? 'Kailangan Pa' : 'Still Need'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleAskAi(reqKey)}
                              className={`req-ask-ai-btn ${helper.isOpen ? 'req-ask-ai-btn--active' : ''}`}
                              title={isTl ? 'Humingi ng gabay sa AI para sa rekisitong ito' : 'Ask AI for guidance on this requirement'}
                            >
                              <Sparkles size={13} />
                              {helper.isOpen ? (isTl ? 'Isara ang AI' : 'Close AI') : (isTl ? 'Tanungin ang AI' : 'Ask AI')}
                            </button>
                          </div>

                          {/* Expandable Ask AI Helper Panel */}
                          {helper.isOpen && (
                            <div className="assessment-ai-helper" style={{ marginTop: '0.85rem' }}>
                              <div className="assessment-ai-helper__header">
                                <span className="assessment-ai-helper__label">
                                  <Sparkles size={13} /> {isTl ? 'Payo ng AI —' : 'AI Advisory —'} {req.permit_name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleAskAi(reqKey)}
                                  className="assessment-ai-helper__close"
                                  title={isTl ? 'Isara' : 'Close'}
                                  aria-label="Close AI Helper"
                                >
                                  <X size={15} />
                                </button>
                              </div>

                              {/* Quick chips */}
                              <div className="assessment-ai-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                <button
                                  type="button"
                                  onClick={() => askAiQuestion(reqKey, req.permit_name, isTl ? 'Bakit ko kailangan ang permit na ito para sa aking negosyo?' : 'Why do I need this permit requirement for my business?')}
                                  disabled={helper.loading}
                                  className="assessment-ai-chip"
                                >
                                  <HelpCircle size={12} /> {isTl ? 'Bakit ko ito kailangan?' : 'Why do I need this?'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => askAiQuestion(reqKey, req.permit_name, isTl ? 'Saan ako pupunta para makuha ito sa Roxas City, at anong tanggapan ang namamahala rito?' : 'Where do I physically go to get this permit in Roxas City, and which office handles it?')}
                                  disabled={helper.loading}
                                  className="assessment-ai-chip"
                                >
                                  <MapPin size={12} /> {isTl ? 'Saan ito kinukuha sa Roxas?' : 'Where do I get this in Roxas?'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => askAiQuestion(reqKey, req.permit_name, isTl ? 'Anong mga paunang rekisito, bayarin, o hakbang ang kailangan kong kumpletuhin muna?' : 'What prerequisites, fees, or preparation steps should I complete first?')}
                                  disabled={helper.loading}
                                  className="assessment-ai-chip"
                                >
                                  <ClipboardList size={12} /> {isTl ? 'Mga Rekisito at Hakbang' : 'Prerequisites & Steps'}
                                </button>
                              </div>

                              {/* Custom Question Input */}
                              <form
                                className="assessment-ai-form"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const val = (helper.inputVal || '').trim();
                                  if (val) askAiQuestion(reqKey, req.permit_name, val);
                                }}
                                style={{ display: 'flex', gap: '0.4rem', marginBottom: helper.answer || helper.loading || helper.error ? '0.75rem' : 0 }}
                              >
                                <input
                                  type="text"
                                  placeholder={isTl ? 'O mag-type ng tanong tungkol sa permit na ito...' : 'Or type a specific question about this permit...'}
                                  value={helper.inputVal || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setAiHelperState(prev => ({
                                      ...prev,
                                      [reqKey]: { ...(prev[reqKey] || {}), inputVal: val }
                                    }));
                                  }}
                                  disabled={helper.loading}
                                  className="assessment-ai-input"
                                  aria-label={`Ask a question about ${req.permit_name}`}
                                />
                                <button
                                  type="submit"
                                  disabled={helper.loading || !(helper.inputVal || '').trim()}
                                  className="assessment-ai-submit"
                                >
                                  <Send size={12} /> {isTl ? 'Itanong' : 'Ask'}
                                </button>
                              </form>

                              {/* Loading state */}
                              {helper.loading && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ai-accent)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
                                  <Loader2 size={16} className="animate-spin" />
                                  <span>{isTl ? 'Sumasangguni sa mga alituntunin ng permit sa Roxas City...' : 'Consulting Roxas City permit guidelines...'}</span>
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
                                <div className="assessment-ai-response">
                                  <div className="assessment-ai-response__header">
                                    <div className="assessment-ai-response__title">
                                      <Sparkles size={14} />
                                      <span>{isTl ? `Gabay ng AI para sa ${req.permit_name}` : `AI Guidance for ${req.permit_name}`}</span>
                                    </div>
                                    <span className="assessment-ai-response__question">
                                      Q: {helper.question}
                                    </span>
                                  </div>

                                  <FormattedAiResponse text={helper.answer} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    )}

      </div>

      {/* ── REQUIREMENTS CHECKLIST & AI ADVISOR / ESTIMATED EXPENSES (RIGHT ABOVE ASSESSMENT HISTORY) ── */}
      {totalReqs > 0 && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--government-navy)', fontWeight: 800 }}>
                {isTl ? 'Talaan ng mga Rekisito at AI Advisor' : 'Requirements Checklist & AI Advisor'}
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {isTl
                  ? <>Markahan ang mayroon ka na. I-click ang <strong>Tanungin ang AI</strong> sa kahit anong rekisito upang malaman kung bakit ito kailangan o saan ito kukunin sa Roxas.</>
                  : <>Mark what you have ready. Click <strong>Ask AI</strong> on any item to learn why it's needed or where to get it in Roxas City.</>}
              </p>
            </div>
            
            <span style={{ fontSize: '0.75rem', background: 'var(--primary-green-light)', color: 'var(--primary-green-dark)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
              {isTl ? `${totalReqs} Rekisito ang Naka-configure` : `${totalReqs} Requirements Configured`}
            </span>
          </div>

          {/* ── REQUIREMENT ACQUISITION & PROCESSING EXPENSES BANNER ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.15rem 1.4rem',
            marginBottom: '1rem',
            borderRadius: '12px',
            background: 'var(--primary-green-light)',
            border: '1.5px solid #A5D6B8',
            boxShadow: '0 2px 8px rgba(22, 101, 52, 0.05)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary-green-dark)', background: 'var(--primary-green-light)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                  {isTl ? 'TINATAYANG GASTOS SA MGA REKISITO' : 'ESTIMATED REQUIREMENT EXPENSES'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--primary-green)', fontWeight: 600 }}>
                  {isTl ? `Iniangkop para sa ${selectedBiz?.business_type || 'Napiling Negosyo'}` : `Tailored for ${selectedBiz?.business_type || 'Selected Business'}`}
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--government-navy)' }}>
                ₱{totalRequirementExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  {isTl ? `kabuuang gastos sa pagproseso para sa ${totalReqs} paunang rekisito` : `total processing expense for ${totalReqs} prerequisite requirements`}
                </span>
              </div>
              {stillNeededExpenses > 0 && stillNeededExpenses < totalRequirementExpenses && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600, marginTop: '0.2rem' }}>
                  ⏳ ₱{stillNeededExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })} {isTl ? `natitira para sa ${needCount} rekisito na kailangan mo pa.` : `remaining for ${needCount} item(s) you still need.`}
                </div>
              )}
            </div>

            <Link
              to={`/fee-estimation?business_id=${selectedBizId}`}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--primary-green)',
                borderColor: 'var(--primary-green)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.875rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(21,128,61,0.25)',
                textDecoration: 'none'
              }}
            >
              <span>{isTl ? 'Kalkulahin gamit ang Fee Estimator' : 'Calculate with Fee Estimator'}</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Next step prompt */}
          <div style={{ padding: '1rem 1.25rem', background: 'var(--primary-green-light)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <strong style={{ color: 'var(--primary-green-dark)', fontSize: '0.9rem', display: 'block' }}>
                {isTl ? 'Handa ka na bang i-file ang iyong aplikasyon?' : 'Ready to file your application?'}
              </strong>
              <span style={{ color: 'var(--primary-green-dark)', fontSize: '0.8125rem', opacity: 0.9 }}>
                {isTl 
                  ? 'Pumunta sa Maghanda ng Aplikasyon upang i-print ang iyong pre-filled Form BPLO-01 o mag-file sa pamamagitan ng Roxas eBPLS portal.' 
                  : 'Proceed to Prepare Application to print your pre-filled Form BPLO-01 or file via the Roxas eBPLS portal.'}
              </span>
            </div>
            <Link
              to="/applications"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              {isTl ? 'Pumunta sa Maghanda ng Aplikasyon' : 'Go to Prepare Application'} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
      </div>



      {/* ── ASSESSMENT HISTORY ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <History size={18} style={{ color: 'var(--primary-green)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--government-navy)', fontWeight: 700 }}>
            {isTl ? 'Kasaysayan ng Pagsusuri' : 'Assessment History'}
          </h3>
        </div>

        {loadingHistory ? (
          <p className="text-muted">{isTl ? 'Ikinakarga ang kasaysayan...' : 'Loading history...'}</p>
        ) : assessments.length === 0 ? (
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            {isTl ? 'Walang nakaraang pagsusuri sa rekord.' : 'No previous assessments on record.'}
          </p>
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{new Date(a.created_at).toLocaleDateString(isTl ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', background: 'var(--surface)', border: '1px solid var(--border-medium)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                        {reqs.length} {isTl ? 'mga rekisito' : 'requirements'}
                      </span>
                      {expandedHistory === a.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {expandedHistory === a.id && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', background: 'var(--surface)' }}>
                      {parsed?.ai_assessment?.summary && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          <strong>{isTl ? 'Buod:' : 'Summary:'}</strong> {parsed.ai_assessment.summary}
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

      {/* ── PROFESSIONAL PRINT CHECKLIST (hidden on screen, shown on print) ── */}
      <AssessmentChecklistPrint
        checklist={checklist}
        selectedBiz={selectedBiz}
        aiAssessment={currentResult?.ai_assessment}
        totalRequirementExpenses={totalRequirementExpenses}
        stillNeededExpenses={stillNeededExpenses}
        haveCount={haveCount}
        needCount={needCount}
        score={score}
      />

    </div>
  );
};

export default Assessment;
