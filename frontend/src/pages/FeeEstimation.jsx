import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { useTranslation } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import {
  Building2,
  Calendar,
  ShieldCheck,
  Printer,
  ChevronRight,
  Info,
  AlertTriangle,
  Save,
  Check,
  BrainCircuit,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const php = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);

export default function FeeEstimation() {
  const { user, token } = useContext(AuthContext);
  const { businesses, refreshBusinesses } = useContext(BusinessContext);
  const { lang } = useTranslation();
  const isTl = lang === 'tl';

  // Active business selection
  const [selectedBizId, setSelectedBizId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Requirements from AI Assessment & System
  const [assessedChecklist, setAssessedChecklist] = useState([]);
  const [allSystemRequirements, setAllSystemRequirements] = useState([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);

  // Directly editable form parameters
  const [businessName, setBusinessName] = useState('');
  const [municipality, setMunicipality] = useState('Roxas, Oriental Mindoro');
  const [barangay, setBarangay] = useState('');
  const [businessType, setBusinessType] = useState('Retail');
  const [businessStatus, setBusinessStatus] = useState('New Application');
  const [businessScale, setBusinessScale] = useState('Micro-Enterprise');
  const [capitalization, setCapitalization] = useState('50000');
  const [grossSales, setGrossSales] = useState('0');
  const [operatingSetup, setOperatingSetup] = useState('physical');
  const [floorArea, setFloorArea] = useState('25');
  const [employees, setEmployees] = useState('2');

  const activeBiz = useMemo(() => {
    if (!businesses || businesses.length === 0) return null;
    return businesses.find(b => String(b.id) === String(selectedBizId)) || businesses[0];
  }, [businesses, selectedBizId]);

  // Load and pre-fill form fields whenever selected business changes
  useEffect(() => {
    if (activeBiz) {
      setSelectedBizId(String(activeBiz.id));
      setBusinessName(activeBiz.business_name || '');
      setBusinessType(activeBiz.business_type || 'Retail');
      setBusinessStatus(activeBiz.business_status || 'New Application');

      const munName = activeBiz.city || 'Roxas';
      const provName = activeBiz.province || 'Oriental Mindoro';
      setMunicipality(`${munName}, ${provName}`);
      setBarangay(activeBiz.barangay || '');

      const cap = parseFloat(activeBiz.capitalization) || 0;
      setCapitalization(String(cap > 0 ? cap : 50000));
      setBusinessScale(cap >= 3000000 ? 'SME' : 'Micro-Enterprise');

      const sales = parseFloat(activeBiz.gross_sales) || 0;
      setGrossSales(String(sales));

      const pt = (activeBiz.premises_type || '').toLowerCase();
      setOperatingSetup(pt.includes('home') || pt.includes('online') ? 'online' : 'physical');

      setFloorArea(String(activeBiz.floor_area || '25'));
      setEmployees(String(activeBiz.employees || '2'));

      setSaveSuccess(false);
      setError('');
    }
  }, [activeBiz?.id]);

  // Sync with URL query parameter ?business_id=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bId = params.get('business_id');
    if (bId) {
      setSelectedBizId(bId);
    }
  }, []);

  // Fetch compliance/assessment requirements and all system requirements
  useEffect(() => {
    const fetchRequirementsData = async () => {
      if (!token) return;
      setLoadingRequirements(true);
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // 1. Fetch all configured system requirements
        const reqsRes = await axios.get(`${API}/requirements`, config);
        setAllSystemRequirements(reqsRes.data || []);

        // 2. If an active business exists, fetch its specific assessed compliance checklist
        const targetBizId = selectedBizId || (activeBiz?.id ? String(activeBiz.id) : null);
        if (targetBizId) {
          try {
            const compRes = await axios.get(`${API}/compliance/business/${targetBizId}`, config);
            setAssessedChecklist(compRes.data?.checklist || []);
          } catch (e) {
            setAssessedChecklist([]);
          }
        } else {
          setAssessedChecklist([]);
        }
      } catch (err) {
        console.error('Error loading requirements data for fee estimation:', err);
      } finally {
        setLoadingRequirements(false);
      }
    };

    fetchRequirementsData();
  }, [selectedBizId, activeBiz?.id, token]);

  const handleCapChange = (val) => {
    setCapitalization(val);
    const num = parseFloat(val) || 0;
    setBusinessScale(num >= 3000000 ? 'SME' : 'Micro-Enterprise');
  };

  const handleScaleChange = (scale) => {
    setBusinessScale(scale);
    const num = parseFloat(capitalization) || 0;
    if (scale === 'SME' && num < 3000000) {
      setCapitalization('3500000');
    } else if (scale === 'Micro-Enterprise' && num >= 3000000) {
      setCapitalization('50000');
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // CALCULATION ENGINE LOGIC
  // ═════════════════════════════════════════════════════════════════════
  const calculation = useMemo(() => {
    const isPhysical = operatingSetup === 'physical';

    const barangayClearance = 500;
    const mayorsPermit = businessScale === 'SME' ? 6000 : 3000;
    const sanitaryFee = 500;
    const fsicFee = isPhysical ? 1000 : 300;
    const baseLBT = businessScale === 'SME' ? 5000 : 2500;

    const totalLguFees = barangayClearance + mayorsPermit + sanitaryFee + fsicFee + baseLBT;

    const items = [
      {
        num: 1,
        name: 'Barangay Business Clearance',
        nameTl: 'Barangay Business Clearance',
        condition: 'Prerequisite clearance benchmark (Subject to barangay ordinance)',
        conditionTl: 'Pamantayang clearance (Alinsunod sa ordinansa ng barangay)',
        category: 'Clearance',
        amount: barangayClearance
      },
      {
        num: 2,
        name: "Mayor's Permit & License Fee",
        nameTl: "Mayor's Permit at Lisensya",
        condition: `Indicative tiered benchmark for ${businessScale} (Subject to municipal schedule)`,
        conditionTl: `Tinatayang antas para sa ${businessScale} (Alinsunod sa iskedyul ng munisipyo)`,
        category: 'Permit',
        amount: mayorsPermit
      },
      {
        num: 3,
        name: 'Sanitary & Health Inspection',
        nameTl: 'Inspeksyon sa Kalinisan at Kalusugan (Sanitary)',
        condition: 'Municipal health inspection planning benchmark',
        conditionTl: 'Pamantayang pagpaplano para sa clearance sa kalusugan at sanitasyon',
        category: 'Inspection',
        amount: sanitaryFee
      },
      {
        num: 4,
        name: 'Fire Safety Inspection Certificate (FSIC)',
        nameTl: 'Sertipiko ng Inspeksyon sa Kaligtasan sa Sunog (FSIC)',
        condition: `Indicative planning rate for ${isPhysical ? 'Physical Premises' : 'Online / Home-Based'}`,
        conditionTl: `Tinatayang singil sa sunog para sa ${isPhysical ? 'Pisikal na Puwesto' : 'Online / Home-Based'}`,
        category: 'Inspection',
        amount: fsicFee
      },
      {
        num: 5,
        name: 'Local Business Tax (Base Regulatory Fee)',
        nameTl: 'Lokal na Buwis sa Negosyo (Base Regulatory LBT)',
        condition: `Indicative initial base LBT for ${businessScale} (New Application reference)`,
        conditionTl: `Tinatayang panimulang base LBT para sa ${businessScale} (Gabay sa Bagong Aplikasyon)`,
        category: 'Local Tax',
        amount: baseLBT
      }
    ];

    return { items, totalLguFees };
  }, [businessScale, operatingSetup]);

  const handleSaveToProfile = async () => {
    if (!activeBiz) return;
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      await axios.put(
        `${API}/businesses/${activeBiz.id}`,
        {
          ...activeBiz,
          business_name: businessName,
          business_type: businessType,
          business_status: businessStatus,
          capitalization: parseFloat(capitalization) || 0,
          gross_sales: parseFloat(grossSales) || 0,
          premises_type: operatingSetup === 'physical' ? 'Commercial Establishment' : 'Home-Based',
          floor_area: parseFloat(floorArea) || 0,
          employees: parseInt(employees, 10) || 1,
          barangay: barangay || activeBiz.barangay
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (refreshBusinesses) await refreshBusinesses();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving updated details to profile:', err);
      setError(isTl
        ? 'Hindi ma-save ang mga pagbabago sa profile, ngunit ang kalkulasyon ay sumasalamin sa kasalukuyang mga parameter.'
        : 'Unable to save changes to profile, but your fee calculation reflects the current parameters.');
    } finally {
      setSaving(false);
    }
  };

  const isRenewal = businessStatus === 'Renewal';
  const renewalTotal = calculation.items
    .filter(i => i.num !== 5)
    .reduce((sum, i) => sum + i.amount, 0);
  const displayTotal = isRenewal ? renewalTotal : calculation.totalLguFees;

  // ═════════════════════════════════════════════════════════════════════
  // REQUIREMENT PROCESSING & ACQUISITION EXPENSES ENGINE
  // ═════════════════════════════════════════════════════════════════════
  const requirementExpenses = useMemo(() => {
    // 1. If the business has an AI-assessed checklist, use those official tailored requirements!
    if (assessedChecklist && assessedChecklist.length > 0) {
      const items = assessedChecklist.map((r, idx) => ({
        id: r.requirement_id || r.id || idx,
        name: r.permit_name,
        nameTl: r.permit_name,
        description: r.description,
        issuingAgency: r.issuing_agency || 'Government Agency',
        ordinanceRef: r.ordinance_reference,
        amount: parseFloat(r.estimated_fee) || 0,
        status: r.status || 'Missing',
        isMandatory: r.is_mandatory !== 0
      }));

      const total = items.reduce((sum, item) => sum + item.amount, 0);
      const stillNeeded = items
        .filter(item => item.status !== 'Approved' && item.status !== 'Submitted' && item.status !== 'Have')
        .reduce((sum, item) => sum + item.amount, 0);

      return {
        items,
        total,
        stillNeeded,
        isSyncedWithAi: true
      };
    }

    // 2. Fallback: Filter allSystemRequirements dynamically based on current business parameters!
    const effectiveCategory = (activeBiz?.industry_category || businessType || '').toLowerCase();
    const effectiveStatus = (businessStatus || 'New Application').toLowerCase();

    const matched = allSystemRequirements.filter(rule => {
      const cf = (rule.condition_field || '').trim();
      const cv = (rule.condition_value || '').trim();

      if (cf === 'always' || !cf) return true;

      if (cf === 'industry_category') {
        const cvLower = cv.toLowerCase();
        return (
          cvLower === effectiveCategory ||
          effectiveCategory.includes(cvLower) ||
          cvLower.includes(effectiveCategory)
        );
      }

      if (cf === 'business_status') {
        return cv.toLowerCase() === effectiveStatus;
      }

      return false;
    });

    const items = matched.map((r, idx) => ({
      id: r.id || idx,
      name: r.permit_name,
      nameTl: r.permit_name,
      description: r.description,
      issuingAgency: r.issuing_agency || 'Municipal / Statutory Office',
      ordinanceRef: r.ordinance_reference,
      amount: parseFloat(r.estimated_fee) || 0,
      status: 'Missing',
      isMandatory: r.is_mandatory !== 0
    }));

    const total = items.reduce((sum, item) => sum + item.amount, 0);
    return {
      items,
      total,
      stillNeeded: total,
      isSyncedWithAi: false
    };
  }, [assessedChecklist, allSystemRequirements, activeBiz?.industry_category, businessType, businessStatus]);

  const grandTotal = displayTotal + requirementExpenses.total;
  const grandTotalStillNeeded = displayTotal + requirementExpenses.stillNeeded;

  return (
    <div className="animate-fade-in page-container" style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── HEADER SECTION ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--primary-green-light)', color: 'var(--primary-green-dark)', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          <ShieldCheck size={14} />
          {isTl ? 'Lokal na Pamahalaan ng Roxas • Serbisyong Pananalapi' : 'Municipality of Roxas • Local Revenue Service'}
        </div>
        <h1 style={{ color: 'var(--government-navy)', fontSize: '1.85rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
          {isTl ? 'Estimador ng Bayarin sa Lokal na Permit' : 'Local Permit & Clearance Fee Estimator'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem', marginBottom: 0 }}>
          {isTl
            ? 'Kalkulahin ang tinatayang mga bayarin sa permit ng munisipyo, regulatory clearances, at lokal na buwis na babayaran sa Munisipyo ng Roxas.'
            : 'Estimate mandatory municipal clearances, regulatory permits, and base business taxes paid directly to the Municipal Hall of Roxas, Oriental Mindoro.'}
        </p>
      </div>

      {/* ── JURISDICTION CLARITY BANNER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        padding: '0.9rem 1.15rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--info-light, #EAF1FB)',
        border: '1px solid #BFDBFE',
        color: '#1E3A8A',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        lineHeight: 1.55
      }}>
        <Info size={19} color="#1D5FAD" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>{isTl ? 'Paunawa sa Hurisdiksyon:' : 'Jurisdiction Distinction:'}</strong>{' '}
          {isTl
            ? 'Ang mga bayarin dito ay babayaran sa Ingat-Yaman ng Munisipyo ng Roxas. Ang pambansang income tax at business tax ay hiwalay na ini-file sa BIR.'
            : 'This estimator covers municipal compliance fees and local taxes payable to the Municipal Treasurer. National income and business revenue taxes are filed separately with the BIR.'}
        </div>
      </div>

      {/* ── NOTIFICATIONS & FEEDBACK ── */}
      {error && (
        <div style={{ padding: '0.9rem 1.25rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '600', border: '1px solid #FCA5A5' }}>
          {error}
        </div>
      )}

      {saveSuccess && (
        <div style={{ padding: '0.9rem 1.25rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '600', border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={18} />
          {isTl ? 'Matagumpay na na-update ang profile ng negosyo!' : 'Business profile details updated successfully!'}
        </div>
      )}

      {/* ── SINGLE UNIFIED LENGTH FLOW CONTAINER ── */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* STEP 1: BUSINESS IDENTITY & SETUP */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} style={{ color: 'var(--primary-green)' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--government-navy)', margin: 0 }}>
                {isTl ? '1. Pagkakakilanlan at Lokasyon ng Negosyo' : '1. Business Identity & Location'}
              </h2>
            </div>
            {businesses && businesses.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{isTl ? 'Negosyo:' : 'Business:'}</span>
                <select
                  value={selectedBizId}
                  onChange={(e) => setSelectedBizId(e.target.value)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--surface)',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: 'var(--text-dark)'
                  }}
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.business_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Trade Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Pangalan ng Negosyo *' : 'Business Trade Name *'}
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Mindoro Store"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              />
            </div>

            {/* Application Stage */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Uri ng Aplikasyon *' : 'Application Stage *'}
              </label>
              <select
                value={businessStatus}
                onChange={(e) => setBusinessStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              >
                <option value="New Application">{isTl ? 'Bagong Negosyo (New Application)' : 'New Business Application'}</option>
                <option value="Renewal">{isTl ? 'Taunang Pagpapanibago (Annual Renewal)' : 'Annual Renewal'}</option>
              </select>
            </div>

            {/* Jurisdiction */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Munisipyo *' : 'LGU Jurisdiction *'}
              </label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              />
            </div>

            {/* Barangay */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Barangay *' : 'Barangay *'}
              </label>
              <input
                type="text"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                placeholder="e.g., Bagumbayan"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              />
            </div>
          </div>
        </div>

        {/* STEP 2: OPERATIONAL & FINANCIAL BASIS */}
        <div>
          <div style={{ marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--government-navy)', margin: 0 }}>
              {isTl ? '2. Sukat, Kapital, at Pisikal na Operasyon' : '2. Scale, Capitalization & Operating Premises'}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Scale */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Klasipikasyon ng Sukat' : 'Business Scale'}
              </label>
              <select
                value={businessScale}
                onChange={(e) => handleScaleChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              >
                <option value="Micro-Enterprise">Micro-Enterprise (&lt; ₱3M)</option>
                <option value="SME">SME (Capital ≥ ₱3M)</option>
              </select>
            </div>

            {/* Capitalization */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Deklaradong Kapital (₱)' : 'Declared Capitalization (₱)'}
              </label>
              <input
                type="number"
                value={capitalization}
                onChange={(e) => handleCapChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              />
            </div>

            {/* Operating Setup */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Puwesto ng Negosyo' : 'Operating Premises'}
              </label>
              <select
                value={operatingSetup}
                onChange={(e) => setOperatingSetup(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              >
                <option value="physical">{isTl ? 'Pisikal na Puwesto / Tindahan' : 'Physical Commercial Establishment'}</option>
                <option value="online">{isTl ? 'Online / Home-Based' : '100% Online / Home-Based'}</option>
              </select>
            </div>

            {/* Floor Area */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Floor Area (sqm)' : 'Floor Area (sqm)'}
              </label>
              <input
                type="number"
                value={floorArea}
                onChange={(e) => setFloorArea(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleSaveToProfile}
              disabled={saving}
              className="btn btn-outline"
              style={{ minHeight: '42px', padding: '0 1.25rem' }}
            >
              <Save size={16} />
              {saving
                ? (isTl ? 'Nagse-save...' : 'Saving Changes...')
                : (isTl ? 'I-save ang mga Detalye sa Profile' : 'Save Details to Business Profile')}
            </button>
          </div>
        </div>

        {/* STEP 3: RENEWAL NOTICE (IF APPLICABLE) */}
        {isRenewal && (
          <div
            role="note"
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderLeft: '4px solid #D97706',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              fontSize: '0.875rem',
              color: '#78350F',
              lineHeight: 1.55
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', color: '#92400E', marginBottom: '0.3rem' }}>
              <AlertTriangle size={18} color="#D97706" />
              {isTl ? 'Paunawa para sa Taunang Renewal' : 'Annual Renewal Regulatory Notice'}
            </div>
            {isTl
              ? 'Ang mga regular na clearance at regulatory fees sa ibaba ay naaangkop sa renewal. Gayunpaman, ayon sa RA 7160 (Local Government Code), ang Lokal na Buwis sa Negosyo (LBT) sa renewal ay opisyal na kinukwenta ng LGU batay sa gross receipts ng nakaraang taon. Ang LBT ay hindi kasama sa numeric subtotal sa ibaba at opisyal na tatantiyahin ng BPLO.'
              : 'Mandatory municipal clearances and regulatory fees apply to renewals. However, under RA 7160 (Local Government Code), renewal Local Business Tax (LBT) is officially computed by the LGU using your prior year\'s gross receipts. LBT is excluded from the subtotal below and will be officially assessed by the BPLO.'}
          </div>
        )}

        {/* STEP 3: PREREQUISITE REQUIREMENT ACQUISITION EXPENSES */}
        <div style={{ paddingTop: '0.5rem', borderTop: '2px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={20} style={{ color: 'var(--primary-green)' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--government-navy)', margin: 0 }}>
                  {isTl ? '3. Gastusin sa Pagkuha ng mga Prerequisite Requirements' : '3. Prerequisite Requirement Acquisition Expenses'}
                </h2>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {isTl
                  ? `Mga dokumento at clearance na kinakailangan para sa ${businessType} batay sa regulasyon ng ${municipality}.`
                  : `Clearances and prerequisite documents required for ${businessType} under ${municipality} regulations.`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {requirementExpenses.isSyncedWithAi ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#DCFCE7', color: '#15803D', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '700' }}>
                  <BrainCircuit size={13} /> {isTl ? 'Naka-sync sa AI Assessment' : 'Synced with AI Assessment'}
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '700' }}>
                  <Sparkles size={13} /> {isTl ? 'Tantiya batay sa Kategorya' : 'Category Rule Benchmark'}
                </span>
              )}
            </div>
          </div>

          {/* AI Connection Callout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.85rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: requirementExpenses.isSyncedWithAi ? '#F0FDF4' : '#F8FAFC',
            border: `1px solid ${requirementExpenses.isSyncedWithAi ? '#BBF7D0' : '#E2E8F0'}`,
            marginBottom: '1.25rem',
            fontSize: '0.825rem',
            color: requirementExpenses.isSyncedWithAi ? '#166534' : '#475569'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BrainCircuit size={16} color={requirementExpenses.isSyncedWithAi ? '#15803D' : '#64748B'} />
              <span>
                {requirementExpenses.isSyncedWithAi
                  ? (isTl
                      ? `Naka-link sa pinakahuling rekomendasyon ng AI para sa "${businessName || 'iyong negosyo'}". Kasama ang mga gastusin sa diagnostic, pagrerehistro, at inspeksyon.`
                      : `Linked directly to AI Assessment recommendations for "${businessName || 'your business'}". Includes diagnostic, registration, and inspection fees.`)
                  : (isTl
                      ? `Ito ang pamantayang mga gastusin para sa ${businessType}. Maaari mong i-run ang AI Assessment para sa pinasadyang checklist.`
                      : `Standard prerequisite fees for ${businessType}. Run the AI Assessment to get tailored requirements.`)}
              </span>
            </div>
            <Link
              to={`/assessment?business_id=${selectedBizId || (activeBiz?.id ? String(activeBiz.id) : '')}`}
              style={{
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#15803D',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{isTl ? 'Buksan ang AI Assessment' : 'Open AI Assessment'}</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Prerequisite Line Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {requirementExpenses.items.map((req, rIdx) => {
              const isAcquired = req.status === 'Approved' || req.status === 'Submitted' || req.status === 'Have';

              return (
                <div
                  key={req.id || rIdx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '0.9rem 1.15rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isAcquired ? '#F0FDF4' : 'var(--background)',
                    border: `1px solid ${isAcquired ? '#BBF7D0' : 'var(--border-light)'}`,
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                        {rIdx + 1}. {req.name}
                      </span>
                      {req.issuingAgency && (
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-xs)', backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
                          {req.issuingAgency}
                        </span>
                      )}
                      {req.isMandatory ? (
                        <span style={{ fontSize: '0.6875rem', fontWeight: '600', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--border-light)', color: 'var(--government-navy)' }}>
                          Mandatory
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.6875rem', fontWeight: '600', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-xs)', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          Conditional
                        </span>
                      )}
                      {isAcquired && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: '700', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-xs)', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                          ✓ {isTl ? 'Nakuha Na' : 'Acquired'}
                        </span>
                      )}
                    </div>
                    {req.description && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                        {req.description}
                      </div>
                    )}
                    {req.ordinanceRef && (
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem', fontStyle: 'italic' }}>
                        Ref: {req.ordinanceRef}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{
                      fontSize: '1.05rem',
                      fontWeight: '700',
                      color: isAcquired ? '#15803D' : 'var(--text-dark)'
                    }}>
                      {req.amount > 0 ? php(req.amount) : (isTl ? 'Walang Bayad / Libre' : 'No Official Fee')}
                    </div>
                    {isAcquired && (
                      <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 600 }}>
                        {isTl ? 'Handa na sa file' : 'Ready on file'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prerequisite Subtotal Box */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.15rem 1.4rem',
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#334155' }}>
                {isTl ? 'Subtotal para sa Prerequisite Requirements' : 'Subtotal for Prerequisite Requirements'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem' }}>
                {isTl
                  ? `Kabuuang bayarin sa mga kinauukulang ahensya (DTI, Barangay, BFP, MHO, atbp.)`
                  : `Total estimated processing costs across prerequisite issuing agencies for ${businessType}.`}
              </div>
              {requirementExpenses.stillNeeded > 0 && requirementExpenses.stillNeeded < requirementExpenses.total && (
                <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600, marginTop: '0.2rem' }}>
                  ⏳ {php(requirementExpenses.stillNeeded)} {isTl ? 'ang nalalabi para sa mga kailangan mo pa.' : 'remaining for items you still need to acquire.'}
                </div>
              )}
            </div>

            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.02em' }}>
              {php(requirementExpenses.total)}
            </div>
          </div>
        </div>

        {/* STEP 4: ITEMIZED CLEARANCES & PERMIT BREAKDOWN */}
        <div style={{ paddingTop: '0.5rem', borderTop: '2px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} style={{ color: 'var(--primary-green)' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--government-navy)', margin: 0 }}>
                  {isTl ? '4. Bayarin sa Permit ng Munisipyo (Municipal Hall)' : '4. Municipal Hall Permit & License Fees'}
                </h2>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {municipality} • {businessScale} ({operatingSetup === 'physical' ? (isTl ? 'Pisikal na Puwesto' : 'Physical Store') : 'Online'})
              </div>
            </div>
            <span className="badge" style={{ backgroundColor: 'var(--primary-green-light)', color: 'var(--primary-green)' }}>
              {businessStatus}
            </span>
          </div>

          {/* Line Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {calculation.items.map((item) => {
              const isLbtItem = item.num === 5;
              const isRenewalLbt = isRenewal && isLbtItem;

              return (
                <div
                  key={item.num}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '0.9rem 1.15rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isRenewalLbt ? '#FFFDF5' : 'var(--background)',
                    border: `1px solid ${isRenewalLbt ? '#FDE68A' : 'var(--border-light)'}`,
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                        {item.num}. {isTl ? item.nameTl : item.name}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
                        {item.category}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {isTl ? item.conditionTl : item.condition}
                    </div>
                    {isRenewalLbt && (
                      <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: '600', marginTop: '0.25rem' }}>
                        ⚠ {isTl ? 'LBT sa renewal: itatakda sa gross receipts ng nakaraang taon (hindi kasama sa subtotal)' : 'Renewal LBT: assessed on prior-year gross receipts (excluded from subtotal)'}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{
                      fontSize: '1.05rem',
                      fontWeight: '700',
                      color: isRenewalLbt ? '#92400E' : 'var(--text-dark)',
                      textDecoration: isRenewalLbt ? 'line-through' : 'none',
                      opacity: isRenewalLbt ? 0.65 : 1
                    }}>
                      {isRenewalLbt
                        ? (isTl ? 'Susuriin' : 'To Be Assessed')
                        : php(item.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Municipal Permit Subtotal Box */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.15rem 1.4rem',
            backgroundColor: isRenewal ? '#FFFBEB' : '#F0FDF4',
            border: `1.5px solid ${isRenewal ? '#FCD34D' : '#BBF7D0'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.75rem',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: isRenewal ? '#92400E' : '#166534' }}>
                {isRenewal
                  ? (isTl ? 'Subtotal sa Paghahanda sa Munisipyo (Walang LBT)' : 'Municipal Planning Subtotal (LBT Excluded)')
                  : (isTl ? 'Subtotal sa Bayarin sa Munisipyo' : 'Municipal Hall Clearances Subtotal')}
              </div>
              <div style={{ fontSize: '0.78rem', color: isRenewal ? '#B45309' : '#15803D', marginTop: '0.2rem' }}>
                {isRenewal
                  ? (isTl ? 'Nakatakdang bayarin para sa renewal. Susuriin ang LBT sa BPLO.' : 'Fixed municipal clearances. LBT computed at BPLO.')
                  : (isTl ? 'Mayor\'s Permit, Sanitary inspection, at base regulatory fees sa Munisipyo.' : 'Mayor\'s Permit, sanitary inspection, and initial local business fees.')}
              </div>
            </div>

            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: isRenewal ? '#92400E' : '#15803D', letterSpacing: '-0.02em' }}>
              {php(displayTotal)}
            </div>
          </div>

          {/* ── STEP 5: COMPREHENSIVE COMBINED TOTAL HERO BOX ── */}
          <div style={{
            padding: '1.5rem 1.75rem',
            background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
            color: '#FFFFFF',
            borderRadius: '14px',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 16px rgba(21, 128, 61, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#BBF7D0', marginBottom: '0.35rem' }}>
                {isTl ? 'KABUUANG TINATAYANG PUHUNAN SA PAGSUNOD' : 'TOTAL ESTIMATED COMPLIANCE & LAUNCH INVESTMENT'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                {isTl
                  ? `Pinagsamang bayarin para sa lahat ng Prerequisite Requirements (${php(requirementExpenses.total)}) at mga Permit sa Munisipyo (${php(displayTotal)}).`
                  : `Combined total of all Prerequisite Requirements (${php(requirementExpenses.total)}) plus Municipal Hall Permits (${php(displayTotal)}).`}
              </div>
              {requirementExpenses.stillNeeded > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#FEF08A', fontWeight: 600, marginTop: '0.35rem' }}>
                  ⏳ {php(grandTotalStillNeeded)} {isTl ? 'ang kailangang ihanda para sa mga natitira pang kailangan.' : 'needed to complete remaining requirements.'}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {php(grandTotal)}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#BBF7D0', marginTop: '0.3rem', fontWeight: 600 }}>
                {isTl ? 'Buong Badyet para sa Negosyo' : 'Comprehensive Business Compliance Budget'}
              </div>
            </div>
          </div>

          {/* Renewal Schedule Advisory */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', fontSize: '0.8125rem', color: '#9A3412', marginBottom: '1.5rem' }}>
            <Calendar size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>{isTl ? 'Panahon ng Taunang Renewal:' : 'Official Renewal Period:'}</strong>{' '}
              {isTl
                ? 'Ang taunang pagpapanibago ng business permit ay isinasagawa mula Enero 1 hanggang Enero 20 sa Municipal Hall ng Roxas.'
                : 'Annual business permit renewal takes place from January 1 to January 20 at the Roxas Municipal Hall.'}
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline"
              style={{ flex: 1, minHeight: '44px' }}
            >
              <Printer size={16} />
              {isTl ? 'I-print ang Buod' : 'Print Summary'}
            </button>
            <Link
              to={`/assessment?business_id=${selectedBizId || (activeBiz?.id ? String(activeBiz.id) : '')}`}
              className="btn btn-outline"
              style={{ flex: 1, minHeight: '44px', color: '#15803D', borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }}
            >
              <BrainCircuit size={16} />
              {isTl ? 'Suriin sa AI Assessment' : 'Review AI Assessment'}
            </Link>
            <Link
              to="/applications"
              className="btn btn-primary"
              style={{ flex: 1.2, minHeight: '44px', backgroundColor: '#15803D', borderColor: '#15803D' }}
            >
              {isTl ? 'Maghanda ng Aplikasyon' : 'Prepare Application'}
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
