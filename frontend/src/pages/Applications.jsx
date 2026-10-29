import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import {
  FileText, Download, Printer, ExternalLink, Building2, MapPin,
  Clock, ShieldCheck, Copy, Check, Info, ArrowRight, Eye, ChevronLeft,
  Edit3, AlertTriangle, CheckCircle2, Sparkles, Plus
} from 'lucide-react';
import UnifiedApplicationFormView from '../components/UnifiedApplicationFormView';
import FormBPLOEditModal from '../components/FormBPLOEditModal';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;
const ROXAS_EBPLS_URL = 'https://bpbc.ibpls.com/roxasorientalmindoro/';

export default function Applications() {
  const { user, token } = useContext(AuthContext);
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';
  const headers = { Authorization: `Bearer ${token}` };

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [viewingForm, setViewingForm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [assessmentBtnHover, setAssessmentBtnHover] = useState(false);

  // Compliance readiness state
  const [complianceData, setComplianceData] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  // Editable Form BPLO-01 Data
  const [formBploData, setFormBploData] = useState(null);

  // 1. Load user businesses
  useEffect(() => {
    fetch(`${API}/businesses`, { headers })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setBusinesses(list);
        if (list.length > 0) setSelectedBizId(String(list[0].id));
        setLoadingBiz(false);
      })
      .catch(() => setLoadingBiz(false));
  }, []);

  const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId)) || businesses[0];

  // 2. Load compliance requirements for selected business
  useEffect(() => {
    if (!selectedBizId) return;
    setLoadingCompliance(true);
    fetch(`${API}/compliance/business/${selectedBizId}`, { headers })
      .then(r => r.json())
      .then(data => {
        setComplianceData(data);
        setLoadingCompliance(false);
      })
      .catch(() => {
        setComplianceData(null);
        setLoadingCompliance(false);
      });
  }, [selectedBizId]);

  // 3. Initialize & merge Form BPLO-01 data from business + saved edits
  useEffect(() => {
    if (!selectedBiz) return;

    // Check if user has previously saved edits in localStorage
    const savedKey = `bplo_form_data_${selectedBiz.id}`;
    let savedLocal = {};
    try {
      const stored = localStorage.getItem(savedKey);
      if (stored) savedLocal = JSON.parse(stored);
    } catch (e) {
      console.warn('Could not parse local form data:', e);
    }

    const defaultOwnerParts = (selectedBiz.owner_name || user?.name || '').trim().split(' ');
    const defaultSurname = defaultOwnerParts.length > 1 ? defaultOwnerParts.slice(-1)[0] : '';
    const defaultGiven = defaultOwnerParts.length > 1 ? defaultOwnerParts.slice(0, -1).join(' ') : (defaultOwnerParts[0] || '');

    const merged = {
      business_id: selectedBiz.id,
      application_number: `BP-ROXAS-${new Date().getFullYear()}-${String(selectedBiz.id).padStart(4, '0')}`,
      application_type: (selectedBiz.business_status || '').toLowerCase().includes('renew') ? 'RENEWAL' : 'NEW',
      payment_mode: 'Annually',
      tax_year: new Date().getFullYear(),
      application_date: new Date().toLocaleDateString(isTl ? 'fil-PH' : 'en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
      
      // Registration & Identification
      business_name: selectedBiz.business_name || '',
      trade_name: selectedBiz.trade_name || selectedBiz.business_name || '',
      ownership_type: selectedBiz.ownership_type || 'Sole Proprietorship',
      owner_gender: 'Male',
      corp_nationality: 'Filipino',
      dti_sec_cda_number: selectedBiz.dti_sec_cda_number || selectedBiz.registration_number || '',
      tin: selectedBiz.tin || '',

      // Owner / Signatory
      owner_name: selectedBiz.owner_name || user?.name || '',
      owner_surname: defaultSurname,
      owner_given_name: defaultGiven,
      owner_middle_name: '',
      owner_suffix: '',
      signatory_title: (selectedBiz.ownership_type || '').toLowerCase().includes('corp') ? 'PRESIDENT / CEO' : 'OWNER / PROPRIETOR',

      // Address & Location
      house_bldg_no: '',
      building_name: '',
      lot_no: '',
      block_no: '',
      street: selectedBiz.address || '',
      address: selectedBiz.address || '',
      barangay: selectedBiz.barangay || 'Poblacion',
      subdivision: '',
      city_municipality: selectedBiz.city_municipality || 'Roxas',
      province: selectedBiz.province || 'Oriental Mindoro',
      zip_code: '5212',
      contact_number: selectedBiz.contact_number || '',
      telephone_no: '',
      email: selectedBiz.email || user?.email || '',

      // Operations & Property
      business_area: selectedBiz.floor_area || '',
      floor_area: selectedBiz.floor_area || '',
      employees: selectedBiz.employees || 0,
      employees_male: Math.ceil((selectedBiz.employees || 0) / 2),
      employees_female: Math.floor((selectedBiz.employees || 0) / 2),
      employees_residing_lgu: selectedBiz.employees || 0,
      delivery_trucks: 0,
      delivery_motorcycles: 0,
      is_owned: !(selectedBiz.premises_type || '').toLowerCase().includes('rent'),
      tax_dec_no: '',
      pin_no: '',
      monthly_rental: '',
      lessor_name: '',
      has_tax_incentives: false,
      incentive_details: '',
      business_activity: 'Main Office',

      // Financial & Line of Business
      industry_category: selectedBiz.industry_category || selectedBiz.business_type || '',
      business_type: selectedBiz.business_type || selectedBiz.industry_category || '',
      primary_products: selectedBiz.primary_products || selectedBiz.business_description || 'Commercial Operations',
      units_count: '1',
      capitalization: selectedBiz.capitalization || '',
      gross_sales: selectedBiz.gross_sales || '',

      // Overwrite with any previously saved customizations
      ...savedLocal
    };

    setFormBploData(merged);
  }, [selectedBiz, selectedBizId, isTl]);

  // 4. Save form updates from modal
  const handleSaveFormData = (updatedData) => {
    setFormBploData(updatedData);

    // Persist in localStorage
    if (selectedBiz?.id) {
      localStorage.setItem(`bplo_form_data_${selectedBiz.id}`, JSON.stringify(updatedData));
      
      // Update core fields in backend if changed
      axios.put(`${API}/businesses/${selectedBiz.id}`, {
        business_name: updatedData.business_name,
        business_type: updatedData.business_type || updatedData.industry_category,
        industry_category: updatedData.industry_category,
        address: updatedData.street || updatedData.address,
        employees: Number(updatedData.employees) || 0,
        floor_area: Number(updatedData.floor_area) || 0,
        capitalization: Number(updatedData.capitalization) || 0,
        gross_sales: Number(updatedData.gross_sales) || 0,
        owner_name: updatedData.owner_name || `${updatedData.owner_given_name} ${updatedData.owner_surname}`.trim(),
        contact_number: updatedData.contact_number,
        email: updatedData.email,
        barangay: updatedData.barangay,
        ownership_type: updatedData.ownership_type
      }, { headers }).catch(err => {
        console.warn('Backend sync error (non-fatal):', err.message);
      });
    }
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Readiness calculations from compliance data
  const checklist = complianceData?.checklist || [];
  const totalReqs = checklist.length;
  const readyReqs = checklist.filter(r => ['Submitted', 'Verified', 'Have', 'Uploaded'].includes(r.status)).length;
  const missingReqs = checklist.filter(r => !['Submitted', 'Verified', 'Have', 'Uploaded'].includes(r.status));
  const isAllReady = totalReqs > 0 && missingReqs.length === 0;

  return (
    <div className="page-container applications-page" style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif', paddingBottom: '3rem' }}>
      
      {/* ── MINIMALIST HEADER ────────────────────────────────────────────── */}
      <header className="no-print" style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
          Prepare Application
        </h1>
        <p style={{ color: '#64748B', fontSize: '14.5px', margin: '0 0 1.25rem' }}>
          {isTl 
            ? 'Pumili ng paraan ng pag-file ng iyong business permit sa Roxas.' 
            : 'Choose how to file your business permit in Roxas.'}
        </p>

        {/* Minimalist Profile Selector + Readiness Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {loadingBiz ? (
            <span style={{ fontSize: '13px', color: '#64748B' }}>Loading profiles...</span>
          ) : businesses.length === 0 ? (
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              No business registered. <Link to="/onboarding" style={{ color: '#15803D', fontWeight: 600 }}>Create one now &rarr;</Link>
            </span>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedBizId}
                onChange={(e) => {
                  setSelectedBizId(e.target.value);
                  setViewingForm(false);
                }}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  padding: '0.45rem 2.25rem 0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.business_name} ({b.business_type || b.industry_category || 'Retail'})
                  </option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B', fontSize: '11px' }}>
                ▼
              </span>
            </div>
          )}

          {/* Readiness Pill */}
          <Link
            to={`/assessment${selectedBizId ? `?businessId=${selectedBizId}` : ''}`}
            title="View requirement checklist in Assessment"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: isAllReady ? '#DCFCE7' : '#FEF3C7',
              color: isAllReady ? '#166534' : '#92400E',
              border: `1px solid ${isAllReady ? '#BBF7D0' : '#FDE68A'}`,
              fontSize: '12.5px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {isAllReady ? <CheckCircle2 size={14} color="#166534" /> : <AlertTriangle size={14} color="#B45309" />}
            <span>{loadingCompliance ? 'Checking...' : `${readyReqs} of ${totalReqs} items ready`}</span>
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW: FULL PRE-FILLED FORM VIEW (If user toggled Preview)           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewingForm && formBploData ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Official Form Component */}
          <UnifiedApplicationFormView 
            app={formBploData} 
            printable={true} 
            showInstructions={true}
            onEditInfo={() => setIsEditModalOpen(true)}
            onBack={() => setViewingForm(false)}
          />

        </div>
      ) : (

        /* ═══════════════════════════════════════════════════════════════════ */
        /* VIEW: TWO FILING PATHWAYS (Walk-in vs Official eBPLS Portal)        */
        /* ═══════════════════════════════════════════════════════════════════ */
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <div className="applications-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>

            {/* ── PATHWAY 1: WALK-IN ────────────────────────────────────────── */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '0.4rem' }}>
                Pathway 1: Walk-In
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem' }}>
                Print Form BPLO-01
              </h2>

              <p style={{ fontSize: '13.5px', color: '#64748B', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                {isTl
                  ? 'I-format at i-print ang iyong Unified Business Permit Application.'
                  : 'Format and print your Unified Business Permit Application.'}
              </p>

              {/* Document Readiness Summary */}
              <div style={{
                backgroundColor: isAllReady ? '#F0FDF4' : '#FFFBEB',
                border: `1px solid ${isAllReady ? '#BBF7D0' : '#FDE68A'}`,
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  {isAllReady ? (
                    <CheckCircle2 size={16} color="#15803D" />
                  ) : (
                    <AlertTriangle size={16} color="#B45309" />
                  )}
                  {isAllReady ? (
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#15803D' }}>
                      All clearances ready for walk-in
                    </span>
                  ) : (
                    <>
                      {missingReqs.slice(0, 2).map((r, i) => (
                        <span key={i} style={{
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          border: '1px solid #FDE68A'
                        }}>
                          {r.permit_name}
                        </span>
                      ))}
                      {missingReqs.length > 2 && (
                        <span style={{ fontSize: '11.5px', color: '#92400E', fontWeight: 600 }}>
                          +{missingReqs.length - 2} more
                        </span>
                      )}
                    </>
                  )}
                </div>
                <Link
                  to={`/assessment${selectedBizId ? `?businessId=${selectedBizId}` : ''}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isAllReady ? '#15803D' : '#92400E',
                    textDecoration: 'none'
                  }}
                >
                  &rarr; {isAllReady ? 'Review items in Assessment' : 'Complete missing items in Assessment'}
                </Link>
              </div>

              {/* Main Action Button - Consistent Green Theme */}
              <button
                onClick={() => setViewingForm(true)}
                style={{
                  backgroundColor: 'var(--primary-green, #15803D)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.8rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: '0.65rem',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#166534'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#15803D'}
              >
                <Printer size={16} /> View &amp; Print Pre-Filled Form BPLO-01
              </button>

              {/* Secondary Buttons Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94A3B8'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                >
                  <Edit3 size={14} color="#64748B" /> Edit Fields
                </button>
                <a
                  href="/forms/Roxas_Business_Permit_Application_Form.pdf"
                  download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94A3B8'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                >
                  <Download size={14} color="#64748B" /> Blank PDF
                </a>
              </div>

              {/* Walk-in Guide (Clean Minimalist) */}
              <div style={{ marginTop: 'auto', paddingTop: '1.15rem', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: '0.6rem' }}>
                  WALK-IN GUIDE
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '13px', color: '#475569', lineHeight: 1.65 }}>
                  <li>Print 2 copies of Form BPLO-01.</li>
                  <li>Bring your physical clearances.</li>
                  <li>Present your business documents at Window 1.</li>
                </ol>
              </div>

            </div>

            {/* ── PATHWAY 2: ONLINE (eBPLS PORTAL) ─────────────────────────── */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '0.4rem' }}>
                Pathway 2: Online
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem' }}>
                Official eBPLS Portal
              </h2>

              <p style={{ fontSize: '13.5px', color: '#64748B', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                {isTl
                  ? 'Mag-file at magbayad online sa pambansang plataporma ng DICT.'
                  : 'File and pay online via the DICT national platform.'}
              </p>

              {/* Main Action Button - Consistent Green Theme */}
              <a
                href={ROXAS_EBPLS_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: 'var(--primary-green, #15803D)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '0.8rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#166534'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#15803D'}
              >
                Go to eBPLS Portal <ExternalLink size={15} />
              </a>

              {/* Clean Portal Link */}
              <a
                href={ROXAS_EBPLS_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: '#64748B',
                  textAlign: 'center',
                  display: 'block',
                  margin: '0.5rem 0 1.25rem',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#15803D'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
              >
                bpbc.ibpls.com/roxasorientalmindoro
              </a>

              {/* Prepare the following infos Box */}
              <div style={{
                marginTop: 'auto',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>
                    {isTl ? 'Ihanda ang mga sumusunod na info' : 'PREPARE THE FOLLOWING INFOS'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>
                    1-click copy
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { label: 'Business', val: formBploData?.business_name || selectedBiz?.business_name, key: 'name' },
                    { label: 'Line', val: formBploData?.industry_category || selectedBiz?.business_type, key: 'type' },
                    { label: 'Capital', val: formBploData?.capitalization ? `₱${Number(formBploData.capitalization).toLocaleString()}` : (selectedBiz?.capitalization ? `₱${Number(selectedBiz.capitalization).toLocaleString()}` : '₱0.00'), key: 'cap' },
                    { label: 'TIN', val: formBploData?.tin || selectedBiz?.tin, key: 'tin', canAdd: true },
                    { label: 'Reg #', val: formBploData?.dti_sec_cda_number || selectedBiz?.dti_sec_cda_number, key: 'reg', canAdd: true }
                  ].map(item => {
                    const hasVal = Boolean(item.val && String(item.val).trim() !== '' && String(item.val).toLowerCase() !== 'not set');
                    return (
                      <div
                        key={item.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                          <span style={{ color: '#64748B', width: '58px', flexShrink: 0, fontSize: '12.5px' }}>{item.label}</span>
                          <span style={{
                            fontWeight: hasVal ? 700 : 500,
                            color: hasVal ? '#0F172A' : '#94A3B8',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {hasVal ? item.val : 'Not set'}
                          </span>
                        </div>

                        {hasVal ? (
                          <button
                            onClick={() => handleCopy(item.val, item.key)}
                            style={{
                              background: copiedKey === item.key ? '#DCFCE7' : 'transparent',
                              border: copiedKey === item.key ? '1px solid #86EFAC' : 'none',
                              color: copiedKey === item.key ? '#166534' : '#64748B',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '12px',
                              fontWeight: 600,
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (copiedKey !== item.key) {
                                e.currentTarget.style.color = '#15803D';
                                e.currentTarget.style.background = '#F0FDF4';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (copiedKey !== item.key) {
                                e.currentTarget.style.color = '#64748B';
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            {copiedKey === item.key ? <Check size={12} color="#166534" /> : <Copy size={12} />}
                            {copiedKey === item.key ? 'Copied' : 'Copy'}
                          </button>
                        ) : item.canAdd ? (
                          <button
                            onClick={() => setIsEditModalOpen(true)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#15803D',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '12px',
                              fontWeight: 600,
                              flexShrink: 0
                            }}
                          >
                            <Plus size={12} /> Add
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* ── DISCLAIMER / INFORMATIVE BANNER ────────────────────────────── */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Info size={20} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
              <strong>Municipal Advisory:</strong> PermitEase formats and pre-fills the official Roxas Unified Business Permit Application Form (Form BPLO-01) according to municipal ordinances. Official legal filing, fee verification, and physical permit issuance are conducted by the Roxas BPLO either in-person at City Hall or through the official DICT eBPLS portal.
            </div>
          </div>

        </div>
      )}

      {/* ── EDIT FORM MODAL ────────────────────────────────────────────── */}
      <FormBPLOEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={formBploData}
        onSave={handleSaveFormData}
        isTl={isTl}
      />

    </div>
  );
}
