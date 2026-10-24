import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import {
  FileText, Download, Printer, ExternalLink, Building2, MapPin,
  Clock, ShieldCheck, Copy, Check, Info, ArrowRight, Eye, ChevronLeft,
  Edit3, AlertTriangle, CheckCircle2, Sparkles
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
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="no-print" style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-green-light)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} strokeWidth={2.2} />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', margin: 0, color: 'var(--government-navy)' }}>
              Prepare Application
            </h1>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            {isTl 
              ? 'Pumili ng paraan ng pag-apply ng business permit sa Munisipyo ng Roxas: Mag-print ng Form BPLO-01 o mag-file sa opisyal na eBPLS portal.' 
              : 'Choose how to file your business permit in the Municipality of Roxas: Print your official Form BPLO-01 or file on the official eBPLS portal.'}
          </p>
        </div>

        <Link
          to={`/assessment${selectedBizId ? `?businessId=${selectedBizId}` : ''}`}
          className="btn btn-outline btn-sm no-print"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, borderColor: '#CBD5E1', color: 'var(--government-navy)' }}
        >
          <ShieldCheck size={15} /> Check Requirements &amp; AI
        </Link>
      </header>

      {/* ── ACTIVE BUSINESS SELECTOR ─────────────────────────────────────── */}
      <div className="card no-print applications-header-row" style={{ marginBottom: '1.75rem', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <Building2 size={20} style={{ color: 'var(--primary-green)' }} />
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>
              Select Business Profile
            </label>
            {loadingBiz ? (
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Loading businesses...</span>
            ) : businesses.length === 0 ? (
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                No business registered. <Link to="/onboarding" style={{ color: 'var(--primary-green)', fontWeight: 600 }}>Create one now &rarr;</Link>
              </span>
            ) : (
              <select
                value={selectedBizId}
                onChange={(e) => {
                  setSelectedBizId(e.target.value);
                  setViewingForm(false);
                }}
                style={{
                  padding: '0.4rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  fontWeight: 600,
                  color: 'var(--government-navy)',
                  background: 'var(--surface)',
                  fontSize: '0.875rem',
                  maxWidth: '420px',
                  width: '100%'
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

        {selectedBiz && !viewingForm && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, borderColor: '#CBD5E1', color: 'var(--government-navy)' }}
            >
              <Edit3 size={14} /> Edit Form Info
            </button>
            <button
              onClick={() => setViewingForm(true)}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, borderColor: 'var(--primary-green)', color: 'var(--primary-green)' }}
            >
              <Eye size={14} /> Preview Form BPLO-01
            </button>
          </div>
        )}
      </div>

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

            {/* ── PATHWAY 1: IN-PERSON WALK-IN (ROXAS CITY HALL) ─────────── */}
            <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', borderTop: '4px solid var(--primary-green)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--primary-green-light)', color: 'var(--primary-green-dark)', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)' }}>
                  Pathway 1 • Walk-in Application
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Roxas City Hall BPLO
                </span>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--government-navy)', margin: '0 0 0.5rem', lineHeight: 1.25 }}>
                Print Official Form BPLO-01
              </h2>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                PermitEase formats the official <strong>Roxas Unified Business Permit Application Form</strong> using your registered details. You can edit remaining fields, print the completed form, or download a blank copy.
              </p>

              {/* ── SMART DOCUMENT READINESS GATE (From AI Assessment) ──────── */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '0.9rem 1rem',
                borderRadius: '8px',
                border: isAllReady ? '1px solid #BBF7D0' : '1px solid #FED7AA',
                backgroundColor: isAllReady ? '#F0FDF4' : '#FFF7ED'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  {isAllReady ? (
                    <CheckCircle2 size={18} color="#15803D" style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <AlertTriangle size={18} color="#C2410C" style={{ flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: isAllReady ? '#166534' : '#9A3412', marginBottom: '2px' }}>
                      {loadingCompliance ? 'Checking document readiness...' : isAllReady 
                        ? `Document Folder Complete (${readyReqs} of ${totalReqs} Ready)` 
                        : `Before You Walk In: ${missingReqs.length} of ${totalReqs} Documents Pending`}
                    </div>
                    
                    <p style={{ fontSize: '12px', color: isAllReady ? '#15803D' : '#7C2D12', margin: '0 0 0.45rem', lineHeight: 1.4 }}>
                      {isAllReady 
                        ? 'All required supporting clearances assessed by AI are marked as prepared. Your physical submission folder is ready.'
                        : 'Roxas BPLO counters require all supporting documents upon walk-in submission. Filing with missing clearances will delay your permit.'}
                    </p>

                    {!isAllReady && missingReqs.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                        {missingReqs.slice(0, 3).map(r => (
                          <span key={r.id || r.requirement_id} style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#FFEDD5',
                            color: '#9A3412',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid #FDBA74'
                          }}>
                            {r.permit_name}
                          </span>
                        ))}
                        {missingReqs.length > 3 && (
                          <span style={{ fontSize: '11px', color: '#9A3412', alignSelf: 'center' }}>
                            +{missingReqs.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <Link
                      to={`/assessment${selectedBizId ? `?businessId=${selectedBizId}` : ''}`}
                      onMouseEnter={() => setAssessmentBtnHover(true)}
                      onMouseLeave={() => setAssessmentBtnHover(false)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        padding: '0.55rem 1.1rem',
                        borderRadius: '8px',
                        marginTop: '0.4rem',
                        transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
                        transform: assessmentBtnHover ? 'translateY(-1px)' : 'translateY(0)',
                        boxShadow: assessmentBtnHover
                          ? (isAllReady ? '0 4px 12px rgba(21,128,61,0.3)' : '0 4px 12px rgba(194,65,12,0.3)')
                          : (isAllReady ? '0 2px 6px rgba(21,128,61,0.18)' : '0 2px 6px rgba(194,65,12,0.18)'),
                        ...(isAllReady ? {
                          background: assessmentBtnHover ? '#15803D' : '#16A34A',
                          color: '#FFFFFF',
                          border: '1.5px solid #15803D',
                        } : {
                          background: assessmentBtnHover ? '#C2410C' : '#EA580C',
                          color: '#FFFFFF',
                          border: '1.5px solid #C2410C',
                        })
                      }}
                    >
                      <ArrowRight size={15} />
                      {isAllReady ? 'Review Clearances in AI Assessment' : 'Complete Missing Documents in AI Assessment'}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.75rem' }}>
                <button
                  onClick={() => setViewingForm(true)}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', fontWeight: 700, fontSize: '0.9375rem', width: '100%' }}
                >
                  <Printer size={17} /> View &amp; Print Pre-Filled Form
                </button>

                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', borderColor: '#CBD5E1', color: 'var(--government-navy)', width: '100%' }}
                >
                  <Edit3 size={15} /> Edit Form Info / Fill Remaining Fields
                </button>

                <a
                  href="/forms/Roxas_Business_Permit_Application_Form.pdf"
                  download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.55rem 1.25rem', fontWeight: 600, fontSize: '0.8125rem', color: '#64748B', width: '100%' }}
                >
                  <Download size={14} /> Download Blank Form BPLO-01 (PDF)
                </a>
              </div>

              {/* Walk-in Guide Card */}
              <div style={{ marginTop: 'auto', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1.1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--government-navy)', marginBottom: '0.65rem', letterSpacing: '0.04em' }}>
                  Walk-in Submission Guide:
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <MapPin size={15} style={{ color: 'var(--primary-green)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Location:</strong> Roxas Municipal Hall, BPLO Counter, Roxas, Oriental Mindoro</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <Clock size={15} style={{ color: 'var(--primary-green)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Office Hours:</strong> Monday – Friday, 8:00 AM – 5:00 PM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <ShieldCheck size={15} style={{ color: 'var(--primary-green)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>What to bring:</strong> Signed Form BPLO-01 (2 copies), Barangay Clearance, DTI/SEC certificate, and 2 valid IDs</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── PATHWAY 2: OFFICIAL ONLINE FILING (DICT eBPLS PORTAL) ────── */}
            <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', borderTop: '4px solid #2563EB', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#EFF6FF', color: '#1D4ED8', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)' }}>
                  Pathway 2 • Online Filing
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Official DICT Portal
                </span>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--government-navy)', margin: '0 0 0.5rem', lineHeight: 1.25 }}>
                Official Roxas eBPLS Portal
              </h2>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
                If you prefer to submit and pay online, the Municipality of Roxas, Oriental Mindoro operates the official DICT <strong>Integrated Business Permits and Licensing System (eBPLS)</strong>.
              </p>

              {/* Direct Portal Link */}
              <div style={{ marginBottom: '1.5rem' }}>
                <a
                  href={ROXAS_EBPLS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    background: '#2563EB',
                    color: '#fff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                  }}
                >
                  <ExternalLink size={17} /> Go to Roxas eBPLS Portal
                </a>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center', marginTop: '0.35rem' }}>
                  Opens bpbc.ibpls.com/roxasorientalmindoro in a new tab
                </span>
              </div>

              {/* Quick Copy Helper Box */}
              <div style={{ marginTop: 'auto', background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', padding: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#1E3A8A', letterSpacing: '0.04em' }}>
                    Quick-Copy for eBPLS Form:
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#3B82F6' }}>1-click copy</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {[
                    { label: 'Business Name', val: formBploData?.business_name || selectedBiz?.business_name, key: 'name' },
                    { label: 'Line of Business', val: formBploData?.industry_category || selectedBiz?.business_type, key: 'type' },
                    { label: 'TIN', val: formBploData?.tin || selectedBiz?.tin || 'Not set', key: 'tin' },
                    { label: 'Registration #', val: formBploData?.dti_sec_cda_number || selectedBiz?.dti_sec_cda_number || 'Not set', key: 'reg' },
                    { label: 'Capitalization', val: formBploData?.capitalization ? `PHP ${Number(formBploData.capitalization).toLocaleString()}` : (selectedBiz?.capitalization ? `PHP ${Number(selectedBiz.capitalization).toLocaleString()}` : '0.00'), key: 'cap' }
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid #DBEAFE', fontSize: '0.78rem' }}>
                      <span style={{ color: '#475569', fontWeight: 500 }}>{item.label}: <strong style={{ color: '#0F172A' }}>{item.val}</strong></span>
                      <button
                        onClick={() => handleCopy(item.val, item.key)}
                        style={{
                          background: copiedKey === item.key ? '#DCFCE7' : '#EFF6FF',
                          border: 'none',
                          color: copiedKey === item.key ? '#166534' : '#2563EB',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        {copiedKey === item.key ? <Check size={12} /> : <Copy size={12} />}
                        {copiedKey === item.key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
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
