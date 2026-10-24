import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { Printer, Download, CheckSquare, Square, FileText, Info, Edit3, ArrowLeft } from 'lucide-react';

export default function UnifiedApplicationFormView({ 
  app, 
  printable = true, 
  showInstructions = true,
  onEditInfo,
  onBack
}) {
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';

  if (!app) return null;

  const isRenewal = (app.application_type || app.business_status || '').toUpperCase().includes('RENEW');
  const isAdditional = (app.application_type || '').toUpperCase().includes('ADD');
  const isNew = !isRenewal && !isAdditional;

  const appNumber = app.application_number || `BP-ROXAS-${new Date().getFullYear()}-${String(app.business_id || '001').padStart(4, '0')}`;
  const taxYear = app.tax_year || new Date(app.created_at || Date.now()).getFullYear();
  const applicationDate = app.application_date || (app.created_at ? new Date(app.created_at).toLocaleDateString(isTl ? 'fil-PH' : 'en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }));

  const handlePrint = () => {
    window.print();
  };

  // Ownership classification check
  const ownership = (app.ownership_type || '').toLowerCase();
  const isSoleProp = ownership.includes('sole') || ownership.includes('single') || !ownership;
  const isCorp = ownership.includes('corp') && !ownership.includes('one person');
  const isPartnership = ownership.includes('partner');
  const isCoop = ownership.includes('coop');
  const isOPC = ownership.includes('one person') || ownership.includes('opc');

  // Gender
  const isMale = (app.owner_gender || 'Male').toLowerCase() === 'male';
  const isFemale = (app.owner_gender || '').toLowerCase() === 'female';

  // Nationality for corp
  const isFilipino = (app.corp_nationality || 'Filipino').toLowerCase() === 'filipino';

  // Payment Mode
  const paymentMode = (app.payment_mode || 'Annually').toLowerCase();
  const isAnnual = paymentMode.includes('annual');
  const isBiAnnual = paymentMode.includes('bi');
  const isQuarterly = paymentMode.includes('quarter');

  // Premises classification check
  const isOwned = app.is_owned !== false && !(app.premises_type || '').toLowerCase().includes('rent');

  // Name breakdown
  const surname = app.owner_surname || (app.owner_name ? app.owner_name.trim().split(' ').slice(-1)[0] : '');
  const givenName = app.owner_given_name || (app.owner_name ? app.owner_name.trim().split(' ').slice(0, -1).join(' ') : (app.owner_name || ''));
  const middleName = app.owner_middle_name || '—';
  const suffix = app.owner_suffix || '—';
  const signatoryTitle = app.signatory_title || (isSoleProp ? 'OWNER / PROPRIETOR' : (isCorp ? 'PRESIDENT / CEO' : 'AUTHORIZED REPRESENTATIVE'));

  return (
    <div className="unified-form-wrapper" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      
      {/* ── TOP ACTION BAR (Hidden on Print) ───────────────────────────── */}
      {printable && (
        <div className="no-print" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: '#F8FAFC',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '15px', color: 'var(--government-navy, #0F172A)' }}>
              <FileText size={18} color="var(--primary-green, #15803D)" />
              {isTl ? 'Opisyal na Roxas Form BPLO-01 (Pre-filled)' : 'Official Roxas Form BPLO-01 (Pre-filled)'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {isTl 
                ? 'Nakasunod sa format ng BPLO Municipality of Roxas, Oriental Mindoro' 
                : 'Conforms to Municipality of Roxas BPLO Unified Application Form layout'}
            </div>
          </div>

          <div className="unified-form-actions" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'white',
                  color: 'var(--government-navy, #0F172A)',
                  border: '1px solid #CBD5E1',
                  padding: '0.55rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={15} />
                {isTl ? 'Bumalik' : 'Back'}
              </button>
            )}

            {onEditInfo && (
              <button
                type="button"
                onClick={onEditInfo}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--primary-green, #15803D)',
                  border: '1.5px solid var(--primary-green, #15803D)',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Edit3 size={15} />
                {isTl ? 'I-edit ang Form Info' : 'Edit Form Details'}
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--primary-green, #15803D)',
                color: 'white',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
              }}
            >
              <Printer size={15} />
              {isTl ? 'I-print ang Form' : 'Print Completed Form'}
            </button>

            <a
              href="/forms/Roxas_Business_Permit_Application_Form.pdf"
              download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'white',
                color: '#475569',
                border: '1px solid #CBD5E1',
                padding: '0.55rem 1rem',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '13px',
                textDecoration: 'none'
              }}
            >
              <Download size={14} />
              {isTl ? 'Blangkong PDF' : 'Blank PDF'}
            </a>
          </div>
        </div>
      )}

      {/* ── GUIDANCE ALERT (Hidden on Print) ──────────────────────────── */}
      {showInstructions && (
        <div className="no-print" style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          fontSize: '12.5px',
          color: '#166534',
          display: 'flex',
          gap: '0.65rem',
          alignItems: 'flex-start'
        }}>
          <Info size={16} color="#15803D" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>{isTl ? 'Paalala sa Pag-print:' : 'Printing & Submission Instructions:'}</strong>{' '}
            {isTl 
              ? 'I-print ang form na ito sa dalawang (2) kopya sa Folio / Legal o Letter size paper. Pirmahan sa ibaba bago dalhin sa Roxas City Hall BPLO counter kasama ang mga clearance na natasa sa AI Assessment.'
              : 'Print two (2) copies of this official form on Legal (8.5" x 13") or Letter size paper. Sign the bottom applicant line before submitting to Roxas City Hall BPLO BOSS counter together with clearances assessed by AI.'}
          </div>
        </div>
      )}

      {/* Mobile Swipe Hint */}
      <div className="mobile-form-scroll-hint no-print" style={{
        display: 'none',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '6px',
        padding: '0.5rem 0.75rem',
        marginBottom: '0.75rem',
        fontSize: '12px',
        color: '#1E40AF',
        fontWeight: '600'
      }}>
        <span>↔</span> {isTl ? 'I-swipe pakaliwa o pakanan para makita ang buong opisyal na form.' : 'Swipe left/right to view and pan the full official form.'}
      </div>

      {/* ============================================================ */}
      {/* OFFICIAL UNIFIED APPLICATION FORM DOCUMENT CONTAINER         */}
      {/* ============================================================ */}
      <div className="unified-form-scroll-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div 
          id="unified-application-form-doc"
          style={{
            backgroundColor: 'white',
            border: '2px solid #000000',
            padding: '1.25rem 1.5rem',
            color: '#000000',
            maxWidth: '920px',
            margin: '0 auto',
            fontSize: '11px',
            lineHeight: 1.25
          }}
        >
        
          {/* ── 1. HEADER (Bagong Pilipinas + Titles + Roxas Seal) ──────── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.6rem',
            paddingBottom: '0.4rem'
          }}>
            {/* Bagong Pilipinas Emblem */}
            <div style={{ width: '90px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                width: '74px',
                height: '74px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #CBD5E1',
                borderRadius: '50%',
                padding: '4px',
                backgroundColor: '#FAFAFA'
              }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#1E3A8A', lineHeight: 1 }}>🇵🇭</div>
                <div style={{ fontSize: '7.5px', fontWeight: '900', color: '#1E3A8A', letterSpacing: '0.04em', marginTop: '2px', textTransform: 'uppercase' }}>
                  BAGONG
                </div>
                <div style={{ fontSize: '7.5px', fontWeight: '900', color: '#DC2626', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  PILIPINAS
                </div>
              </div>
            </div>

            {/* Republic Titles */}
            <div style={{ textAlign: 'center', flex: 1, padding: '0 0.5rem' }}>
              <div style={{ fontSize: '11.5px', color: '#1E293B', fontWeight: '600' }}>
                Republic of the Philippines
              </div>
              <div style={{ fontSize: '11.5px', color: '#1E293B', fontWeight: '600' }}>
                Province of Oriental Mindoro
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000000' }}>
                Municipality of Roxas
              </div>
              <div style={{
                fontSize: '13.5px',
                fontWeight: '900',
                letterSpacing: '0.04em',
                color: '#000000',
                textTransform: 'uppercase',
                marginTop: '0.35rem'
              }}>
                UNIFIED APPLICATION FORM FOR BUSINESS PERMIT
              </div>
            </div>

            {/* Roxas Municipal Seal */}
            <div style={{ width: '90px', textAlign: 'center', flexShrink: 0 }}>
              <img 
                src="/images/roxas-seal.png" 
                alt="Seal of Roxas 1948" 
                style={{ width: '74px', height: '74px', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* ── 2. APPLICATION TYPE, PAYMENT, TAX YEAR TABLE ───────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', marginBottom: '0.5rem', fontSize: '10.5px' }}>
            <tbody>
              <tr>
                {/* Column 1: Application Type */}
                <td style={{ width: '32%', borderRight: '1.5px solid #000', padding: '4px 6px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '12px' }}>{isNew ? '[X]' : '[  ]'}</span>
                      <strong style={{ fontSize: '10px' }}>NEW</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '12px' }}>{isRenewal ? '[X]' : '[  ]'}</span>
                      <strong style={{ fontSize: '10px' }}>RENEWAL</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '12px' }}>{isAdditional ? '[X]' : '[  ]'}</span>
                      <strong style={{ fontSize: '10px' }}>ADDITIONAL</strong>
                    </div>
                  </div>
                </td>

                {/* Column 2: Payment Mode */}
                <td style={{ width: '35%', borderRight: '1.5px solid #000', padding: '4px 6px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: '700', fontSize: '10px', marginBottom: '2px' }}>Payment:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '12px' }}>{isAnnual ? '[X]' : '[  ]'}</span>
                      <span>Annually</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '12px' }}>{isBiAnnual ? '[X]' : '[  ]'}</span>
                      <span>Bi-annually</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '12px' }}>{isQuarterly ? '[X]' : '[  ]'}</span>
                      <span>Quarterly</span>
                    </div>
                  </div>
                </td>

                {/* Column 3: Tax Year & Date */}
                <td style={{ width: '33%', padding: '4px 6px', verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700' }}>Tax Year:</span>{' '}
                    <strong style={{ borderBottom: '1px solid #000', padding: '0 12px', fontSize: '11px' }}>{taxYear}</strong>
                  </div>
                  <div>
                    <span style={{ fontWeight: '700' }}>Date of Application:</span>{' '}
                    <strong style={{ borderBottom: '1px solid #000', padding: '0 6px', fontSize: '10.5px' }}>{applicationDate}</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── 3. I. APPLICATION SECTION ──────────────────────────────── */}
          <div style={{ border: '1.5px solid #000', marginBottom: '0.5rem' }}>
            
            {/* Section Header */}
            <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #000', padding: '3px 6px', fontWeight: '800', fontSize: '11px' }}>
              I. APPLICATION SECTION
            </div>
            <div style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #000', padding: '3px 6px', fontWeight: '800', fontSize: '10.5px' }}>
              A. BUSINESS INFORMATION AND REGISTRATION
            </div>

            {/* Organization checkboxes */}
            <div style={{ padding: '4px 6px', borderBottom: '1px solid #000', display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1rem', alignItems: 'center', fontSize: '10px' }}>
              <span style={{ fontWeight: '700' }}>Please choose one:</span>
              <span>{isSoleProp ? '[X]' : '[  ]'} Sole Proprietorship (<span>{isMale ? '[X]' : '[  ]'} Male</span> <span>{isFemale ? '[X]' : '[  ]'} Female</span>)</span>
              <span>{isOPC ? '[X]' : '[  ]'} One Person Corporation</span>
              <span>{isPartnership ? '[X]' : '[  ]'} Partnership</span>
              <span>{isCorp ? '[X]' : '[  ]'} Corporation</span>
              <span>{isCoop ? '[X]' : '[  ]'} Cooperative</span>
            </div>

            {/* DTI & TIN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', borderBottom: '1px solid #000' }}>
              <div style={{ padding: '4px 6px', borderRight: '1px solid #000' }}>
                <span style={{ fontWeight: '700' }}>DTI/SEC/CDA Registration Number:</span>{' '}
                <strong style={{ fontSize: '11px', color: '#000' }}>{app.dti_sec_cda_number || app.dti_sec_number || 'N/A (To be presented)'}</strong>
              </div>
              <div style={{ padding: '4px 6px' }}>
                <span style={{ fontWeight: '700' }}>Tax Identification Number (TIN):</span>{' '}
                <strong style={{ fontSize: '11px', color: '#000' }}>{app.tin || 'N/A (Subject to MTO/BIR verification)'}</strong>
              </div>
            </div>

            {/* Business Name */}
            <div style={{ padding: '4px 6px', borderBottom: '1px solid #000' }}>
              <span style={{ fontWeight: '700' }}>Business Name:</span>{' '}
              <strong style={{ fontSize: '12px', textTransform: 'uppercase' }}>{app.business_name || '—'}</strong>
            </div>

            {/* Trade Name */}
            <div style={{ padding: '4px 6px', borderBottom: '1px solid #000' }}>
              <span style={{ fontWeight: '700' }}>Trade Name/Franchise (If applicable):</span>{' '}
              <strong style={{ fontSize: '11px' }}>{app.trade_name || app.business_name || '—'}</strong>
            </div>

            {/* Main Office Address */}
            <div style={{ padding: '4px 6px', borderBottom: '1px solid #000', lineHeight: 1.4 }}>
              <div style={{ fontWeight: '700', marginBottom: '2px' }}>Main Office Address:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '3px' }}>
                <div>House/Bldg. No.: <strong>{app.house_bldg_no || '—'}</strong></div>
                <div>Name of Building: <strong>{app.building_name || '—'}</strong></div>
                <div>Lot No.: <strong>{app.lot_no || '—'}</strong> Block No.: <strong>{app.block_no || '—'}</strong></div>
                <div>Street: <strong>{app.street || app.address || '—'}</strong></div>
                <div>Barangay: <strong>{app.barangay || 'Poblacion'}</strong></div>
                <div>Subdivision: <strong>{app.subdivision || '—'}</strong></div>
                <div>City/Municipality: <strong>Roxas</strong></div>
                <div>Province: <strong>Oriental Mindoro</strong></div>
                <div>Zip Code: <strong>5212</strong></div>
              </div>
            </div>

            {/* Contact details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.5fr', borderBottom: '1px solid #000' }}>
              <div style={{ padding: '4px 6px', borderRight: '1px solid #000' }}>
                <span style={{ fontWeight: '700' }}>Telephone No.:</span> <strong>{app.telephone_no || '—'}</strong>
              </div>
              <div style={{ padding: '4px 6px', borderRight: '1px solid #000' }}>
                <span style={{ fontWeight: '700' }}>Mobile No.:</span> <strong>{app.contact_number || app.owner_contact || '—'}</strong>
              </div>
              <div style={{ padding: '4px 6px' }}>
                <span style={{ fontWeight: '700' }}>Email Address:</span> <strong>{app.email || app.owner_email || '—'}</strong>
              </div>
            </div>

            {/* Name of Owner table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '28%', padding: '4px 6px', borderRight: '1px solid #000', fontWeight: '700', verticalAlign: 'middle' }}>
                    (For Sole Proprietorship)<br />Name of Owner:
                  </td>
                  <td style={{ width: '18%', padding: '4px 6px', borderRight: '1px solid #000' }}>
                    <span style={{ fontSize: '9px', color: '#475569', display: 'block' }}>Surname</span>
                    <strong style={{ fontSize: '11px' }}>{surname || '—'}</strong>
                  </td>
                  <td style={{ width: '24%', padding: '4px 6px', borderRight: '1px solid #000' }}>
                    <span style={{ fontSize: '9px', color: '#475569', display: 'block' }}>Given Name</span>
                    <strong style={{ fontSize: '11px' }}>{givenName || '—'}</strong>
                  </td>
                  <td style={{ width: '18%', padding: '4px 6px', borderRight: '1px solid #000' }}>
                    <span style={{ fontSize: '9px', color: '#475569', display: 'block' }}>Middle Name</span>
                    <strong style={{ fontSize: '11px' }}>{middleName}</strong>
                  </td>
                  <td style={{ width: '12%', padding: '4px 6px' }}>
                    <span style={{ fontSize: '9px', color: '#475569', display: 'block' }}>Suffix</span>
                    <strong style={{ fontSize: '11px' }}>{suffix}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '28%', padding: '4px 6px', borderRight: '1px solid #000', fontWeight: '700', verticalAlign: 'middle', borderTop: '1px solid #000' }}>
                    (For Corp/Coop/Partnership)<br />President / Officer:
                  </td>
                  <td style={{ width: '18%', padding: '4px 6px', borderRight: '1px solid #000', borderTop: '1px solid #000' }}>
                    <strong style={{ fontSize: '11px' }}>{!isSoleProp ? (app.officer_surname || surname || '—') : '—'}</strong>
                  </td>
                  <td style={{ width: '24%', padding: '4px 6px', borderRight: '1px solid #000', borderTop: '1px solid #000' }}>
                    <strong style={{ fontSize: '11px' }}>{!isSoleProp ? (app.officer_given_name || givenName || '—') : '—'}</strong>
                  </td>
                  <td style={{ width: '18%', padding: '4px 6px', borderRight: '1px solid #000', borderTop: '1px solid #000' }}>
                    <strong style={{ fontSize: '11px' }}>{!isSoleProp ? (app.officer_middle_name || '—') : '—'}</strong>
                  </td>
                  <td style={{ width: '12%', padding: '4px 6px', borderTop: '1px solid #000' }}>
                    <strong style={{ fontSize: '11px' }}>{!isSoleProp ? (app.officer_suffix || '—') : '—'}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* For Corporation */}
            <div style={{ padding: '3px 6px', fontSize: '10px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: '700' }}>For Corporation:</span>
              <span>{isCorp && isFilipino ? '[X]' : '[  ]'} Filipino</span>
              <span>{isCorp && !isFilipino ? '[X]' : '[  ]'} Foreign</span>
            </div>

          </div>

          {/* ── 4. B. BUSINESS OPERATION ───────────────────────────────── */}
          <div style={{ border: '1.5px solid #000', marginBottom: '0.5rem' }}>
            
            <div style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #000', padding: '3px 6px', fontWeight: '800', fontSize: '10.5px' }}>
              B. BUSINESS OPERATION
            </div>

            {/* Floor area & employees */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.5fr', borderBottom: '1px solid #000' }}>
              <div style={{ padding: '4px 6px', borderRight: '1px solid #000' }}>
                <div>Business Area (sq.m): <strong>{app.floor_area || app.business_area || 'Declared upon inspection'}</strong></div>
                <div>Total Floor Area (sq.m): <strong>{app.floor_area ? `${app.floor_area} sq.m.` : 'Declared upon inspection'}</strong></div>
              </div>
              <div style={{ padding: '4px 6px', borderRight: '1px solid #000' }}>
                <div>Total Employees in Est.: <strong>{app.employees || 0}</strong></div>
                <div>Male: <strong>{app.employees_male || Math.ceil((app.employees || 0)/2)}</strong> Female: <strong>{app.employees_female || Math.floor((app.employees || 0)/2)}</strong></div>
                <div>Residing within Roxas: <strong>{app.employees_residing_lgu ?? app.employees ?? 0}</strong></div>
              </div>
              <div style={{ padding: '4px 6px' }}>
                <div style={{ fontWeight: '700' }}>Delivery Vehicles:</div>
                <div>Van/Truck: <strong>{app.delivery_trucks || 0}</strong></div>
                <div>Motorcycle: <strong>{app.delivery_motorcycles || 0}</strong></div>
              </div>
            </div>

            {/* Same as main address */}
            <div style={{ padding: '3px 6px', borderBottom: '1px solid #000', fontSize: '10px' }}>
              <span>[X] Same as Main Office Address</span>
            </div>

            {/* Property Ownership */}
            <div style={{ padding: '4px 6px', borderBottom: '1px solid #000', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: '700' }}>Owned?</span>{' '}
                <span>{isOwned ? '[X]' : '[  ]'} Yes</span>{' '}
                <span>{!isOwned ? '[X]' : '[  ]'} No</span>
              </div>
              {isOwned ? (
                <div>
                  <span style={{ fontWeight: '700' }}>Tax Declaration No.:</span> <strong>{app.tax_dec_no || 'On File / Assessor'}</strong>{' '}
                  <span style={{ fontWeight: '700', marginLeft: '8px' }}>PIN:</span> <strong>{app.pin_no || '035-ROXAS'}</strong>
                </div>
              ) : (
                <div>
                  <span style={{ fontWeight: '700' }}>Monthly Rental:</span> <strong>{app.monthly_rental ? `₱${Number(app.monthly_rental).toLocaleString()}` : 'Per Lease'}</strong>{' '}
                  <span style={{ fontWeight: '700', marginLeft: '8px' }}>Lessor:</span> <strong>{app.lessor_name || 'On Lease Contract'}</strong>
                </div>
              )}
            </div>

            {/* Tax Incentives */}
            <div style={{ padding: '3px 6px', borderBottom: '1px solid #000', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: '700' }}>Tax incentives from any Government Entity?</span>
              <span>{app.has_tax_incentives ? '[X]' : '[  ]'} Yes ({app.incentive_details || 'Certificate attached'})</span>
              <span>{!app.has_tax_incentives ? '[X]' : '[  ]'} No</span>
            </div>

            {/* Business Activity */}
            <div style={{ padding: '3px 6px', borderBottom: '1px solid #000', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', fontSize: '10px' }}>
              <span style={{ fontWeight: '700' }}>Business Activity:</span>
              <span>[X] Main Office / Storefront</span>
              <span>[  ] Branch Office</span>
              <span>[  ] Admin Office Only</span>
              <span>[  ] Warehouse</span>
              <span>[  ] Others</span>
            </div>

            {/* Line of Business Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #000', textAlign: 'left' }}>
                  <th style={{ padding: '3px 5px', borderRight: '1px solid #000', width: '28%' }}>Line of Business</th>
                  <th style={{ padding: '3px 5px', borderRight: '1px solid #000', width: '12%', textAlign: 'center' }}>PSIC</th>
                  <th style={{ padding: '3px 5px', borderRight: '1px solid #000', width: '25%' }}>Products / Services</th>
                  <th style={{ padding: '3px 5px', borderRight: '1px solid #000', width: '10%', textAlign: 'center' }}>Units</th>
                  <th style={{ padding: '3px 5px', borderRight: '1px solid #000', width: '15%', textAlign: 'right' }}>Capitalization (New)</th>
                  <th style={{ padding: '3px 5px', width: '10%', textAlign: 'right' }}>Gross Sales</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <td style={{ padding: '4px 5px', borderRight: '1px solid #000', fontWeight: '700' }}>
                    {app.industry_category || app.business_type || 'Commercial Enterprise'}
                  </td>
                  <td style={{ padding: '4px 5px', borderRight: '1px solid #000', textAlign: 'center' }}>
                    {app.psic_code || '5212'}
                  </td>
                  <td style={{ padding: '4px 5px', borderRight: '1px solid #000' }}>
                    {app.primary_products || app.business_description || 'Commercial Operations'}
                  </td>
                  <td style={{ padding: '4px 5px', borderRight: '1px solid #000', textAlign: 'center' }}>
                    {app.units_count || '1'}
                  </td>
                  <td style={{ padding: '4px 5px', borderRight: '1px solid #000', textAlign: 'right', fontWeight: '700' }}>
                    {isNew ? (app.capitalization ? `₱${Number(app.capitalization).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00') : '—'}
                  </td>
                  <td style={{ padding: '4px 5px', textAlign: 'right', fontWeight: '700' }}>
                    {isRenewal ? (app.gross_sales ? `₱${Number(app.gross_sales).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00') : '—'}
                  </td>
                </tr>
                {/* 2 empty spacer rows conforming to official form paper template */}
                <tr style={{ borderBottom: '1px solid #E2E8F0', height: '18px' }}>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td></td>
                </tr>
                <tr style={{ height: '18px' }}>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td></td>
                </tr>
              </tbody>
            </table>

          </div>

          {/* ── 5. STATUTORY DECLARATION & SIGNATURE ──────────────────── */}
          <div style={{ border: '1.5px solid #000', padding: '0.65rem 0.75rem', fontSize: '9.5px', lineHeight: 1.35, backgroundColor: '#FFFFFF' }}>
            <p style={{ margin: '0 0 0.5rem', textAlign: 'justify' }}>
              <strong>I DECLARE UNDER PENALTY OF PERJURY</strong> that all information in this application are true and correct based on my personal knowledge and authentic records submitted to the Business Permits and Licensing Office (BPLO). Any false or misleading information supplied, or production of fake/falsified documents shall be grounds for appropriate legal action against me and automatically revokes the permit. I hereby agree that all personal data (as defined under the Data Privacy Law of 2012 and its implementing Rules and Regulations) and account transaction information or records with Municipal Government may be processed, profiled or shared to requesting parties or for the purpose of any court, legal process, examination, inquiry and audit or investigation of any authority.
            </p>

            {/* Signature Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginTop: '1.25rem' }}>
              <div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>
                  <strong style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>
                    {app.owner_name || `${givenName} ${surname}`.trim() || 'APPLICANT / AUTHORIZED REPRESENTATIVE'}
                  </strong>
                  <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>
                    SIGNATURE OF APPLICANT/OWNER OVER PRINTED NAME
                  </span>
                </div>
              </div>

              <div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>
                  <strong style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>
                    {signatoryTitle}
                  </strong>
                  <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>
                    DESIGNATION / POSITION / TITLE
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
