import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { Printer, Download, FileText, Info, Edit3, ArrowLeft } from 'lucide-react';

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

  const isRenewal   = (app.application_type || app.business_status || '').toUpperCase().includes('RENEW');
  const isAdditional = (app.application_type || '').toUpperCase().includes('ADD');
  const isNew       = !isRenewal && !isAdditional;

  const taxYear       = app.tax_year || new Date(app.created_at || Date.now()).getFullYear();
  const applicationDate = app.application_date || (app.created_at
    ? new Date(app.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }));

  // Ownership
  const ownership    = (app.ownership_type || '').toLowerCase();
  const isSoleProp   = ownership.includes('sole') || ownership.includes('single') || !ownership;
  const isCorp       = ownership.includes('corp') && !ownership.includes('one person');
  const isPartnership = ownership.includes('partner');
  const isCoop       = ownership.includes('coop');
  const isOPC        = ownership.includes('one person') || ownership.includes('opc');

  // Gender
  const isMale   = (app.owner_gender || 'Male').toLowerCase() === 'male';
  const isFemale = (app.owner_gender || '').toLowerCase() === 'female';

  // Nationality
  const isFilipino = (app.corp_nationality || 'Filipino').toLowerCase() === 'filipino';

  // Payment
  const paymentMode = (app.payment_mode || 'Annually').toLowerCase();
  const isAnnual    = paymentMode.includes('annual');
  const isBiAnnual  = paymentMode.includes('bi');
  const isQuarterly = paymentMode.includes('quarter');

  // Premises
  const isOwned = app.is_owned !== false && !(app.premises_type || '').toLowerCase().includes('rent');

  // Name parts
  const surname    = app.owner_surname   || (app.owner_name ? app.owner_name.trim().split(' ').slice(-1)[0]  : '');
  const givenName  = app.owner_given_name || (app.owner_name ? app.owner_name.trim().split(' ').slice(0,-1).join(' ') : '');
  const middleName = app.owner_middle_name || '';
  const suffix     = app.owner_suffix || '';
  const signatoryTitle = app.signatory_title || (isSoleProp ? 'OWNER / PROPRIETOR' : isCorp ? 'PRESIDENT / CEO' : 'AUTHORIZED REPRESENTATIVE');

  const chk = (cond) => cond ? '[X]' : '[   ]';

  // shared cell styles
  const cellPad  = { padding: '3px 5px' };
  const hdrCell  = { ...cellPad, fontWeight: '700', fontSize: '10px' };
  const borderR  = { borderRight: '1px solid #000' };
  const borderB  = { borderBottom: '1px solid #000' };
  const borderT  = { borderTop: '1px solid #000' };

  return (
    <div className="unified-form-wrapper" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* ── TOP ACTION BAR (no-print) ─────────────────────────────────── */}
      {printable && (
        <div className="no-print unified-form-top-bar" style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: '1rem',
          backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1',
          borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '15px', color: '#0F172A' }}>
              <FileText size={18} color="#15803D" />
              {isTl ? 'Opisyal na Form BPLO-01 (Pre-filled)' : 'Official Form BPLO-01 (Pre-filled)'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {isTl
                ? 'Nakasunod sa format ng BPLO Municipality of Roxas, Oriental Mindoro'
                : 'Conforms to Municipality of Roxas BPLO Unified Application Form layout'}
            </div>
          </div>

          <div className="unified-form-actions" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {onBack && (
              <button type="button" onClick={onBack} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                backgroundColor: 'white', color: '#0F172A', border: '1px solid #CBD5E1',
                padding: '0.55rem 1rem', borderRadius: '6px', fontWeight: '600',
                fontSize: '13px', cursor: 'pointer'
              }}>
                <ArrowLeft size={15} />{isTl ? 'Bumalik' : 'Back'}
              </button>
            )}
            {onEditInfo && (
              <button type="button" onClick={onEditInfo} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                backgroundColor: '#FFFFFF', color: '#15803D',
                border: '1.5px solid #15803D', padding: '0.55rem 1.15rem',
                borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer'
              }}>
                <Edit3 size={15} />{isTl ? 'I-edit ang Form Info' : 'Edit Form Details'}
              </button>
            )}
            <button type="button" onClick={() => window.print()} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              backgroundColor: '#15803D', color: 'white', border: 'none',
              padding: '0.55rem 1.25rem', borderRadius: '6px', fontWeight: '700',
              fontSize: '13px', cursor: 'pointer'
            }}>
              <Printer size={15} />{isTl ? 'I-print ang Form' : 'Print Completed Form'}
            </button>
            <a
              href="/forms/Roxas_Business_Permit_Application_Form.pdf"
              download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                backgroundColor: 'white', color: '#475569', border: '1px solid #CBD5E1',
                padding: '0.55rem 1rem', borderRadius: '6px', fontWeight: '600',
                fontSize: '13px', textDecoration: 'none'
              }}
            >
              <Download size={14} />{isTl ? 'Blangkong PDF' : 'Blank PDF'}
            </a>
          </div>
        </div>
      )}

      {/* ── GUIDANCE ALERT (no-print) ─────────────────────────────────── */}
      {showInstructions && (
        <div className="no-print" style={{
          backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px',
          padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '12.5px',
          color: '#166534', display: 'flex', gap: '0.65rem', alignItems: 'flex-start'
        }}>
          <Info size={16} color="#15803D" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>{isTl ? 'Paalala sa Pag-print:' : 'Printing & Submission Instructions:'}</strong>{' '}
            {isTl
              ? 'I-print ang form na ito sa dalawang (2) kopya sa Legal (8.5" x 13") size paper. Pirmahan sa ibaba bago dalhin sa Roxas Municipal Hall BPLO counter kasama ang mga orihinal na clearance.'
              : 'Print two (2) copies of this form on Legal (8.5" × 13") or Letter size paper. Sign the bottom applicant line before submitting to Roxas Municipal Hall BPLO counter with your original clearances.'}
          </div>
        </div>
      )}

      {/* ── MOBILE HORIZONTAL SCROLL HINT (no-print) ──────────────────── */}
      <div className="mobile-form-scroll-hint no-print" style={{
        display: 'none',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '6px',
        padding: '0.55rem 0.75rem',
        marginBottom: '0.85rem',
        fontSize: '12px',
        color: '#1E40AF',
        fontWeight: 600
      }}>
        <span style={{ fontSize: '14px' }}>↔️</span>
        <span>{isTl ? 'Mag-swipe pakanan at pakaliwa upang makita ang buong Form BPLO-01' : 'Swipe left & right on the document to view and inspect all columns'}</span>
      </div>

      {/* ============================================================= */}
      {/* OFFICIAL DOCUMENT                                              */}
      {/* ============================================================= */}
      <div className="unified-form-scroll-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div
          id="unified-application-form-doc"
          style={{
            backgroundColor: 'white',
            border: '1px solid #000',
            padding: '14px 16px',
            color: '#000',
            maxWidth: '900px',
            margin: '0 auto',
            fontSize: '10.5px',
            lineHeight: 1.3,
            fontFamily: 'Arial, Helvetica, sans-serif'
          }}
        >

          {/* ── 1. HEADER ─────────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
            <tbody>
              <tr>
                {/* Left logo: Bagong Pilipinas */}
                <td style={{ width: '90px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <img
                    src="/images/bagong-pilipinas.png"
                    alt="Bagong Pilipinas"
                    style={{ width: '78px', height: '78px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                  />
                </td>

                {/* Center: Republic text + Title */}
                <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '400' }}>Republic of the Philippines</div>
                  <div style={{ fontSize: '11px', fontWeight: '400' }}>Province of Oriental Mindoro</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '2px' }}>
                    Municipality of Roxas
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '5px', borderTop: '0' }}>
                    UNIFIED APPLICATION FORM FOR BUSINESS PERMIT
                  </div>
                </td>

                {/* Right: Municipal Seal */}
                <td style={{ width: '90px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <img
                    src="/images/roxas-seal.png"
                    alt="Seal of Municipality of Roxas 1948"
                    style={{ width: '72px', height: '72px', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── 2. APPLICATION TYPE / PAYMENT / TAX YEAR ──────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '0', fontSize: '10px' }}>
            <tbody>
              <tr>
                {/* Col 1: App Type */}
                <td style={{ width: '30%', ...borderR, ...cellPad, verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{chk(isNew)}</span>
                    <strong>NEW</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{chk(isRenewal)}</span>
                    <strong>RENEWAL</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{chk(isAdditional)}</span>
                    <strong>ADDITIONAL</strong>
                  </div>
                </td>

                {/* Col 2: Payment */}
                <td style={{ width: '37%', ...borderR, ...cellPad, verticalAlign: 'top' }}>
                  <div style={{ fontWeight: '700', marginBottom: '2px' }}>Payment:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{chk(isAnnual)}</span> Annually
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{chk(isBiAnnual)}</span> Bi-annually
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{chk(isQuarterly)}</span> Quarterly
                  </div>
                </td>

                {/* Col 3: Tax Year + Date */}
                <td style={{ width: '33%', ...cellPad, verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <strong>Tax Year: </strong>
                    <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px', minWidth: '40px', display: 'inline-block' }}>{taxYear}</span>
                  </div>
                  <div>
                    <strong>Date of Application: </strong>
                    <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px', minWidth: '80px', display: 'inline-block' }}>{applicationDate}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── 3. I. APPLICATION SECTION ─────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', marginBottom: '0', fontSize: '10px' }}>
            <tbody>

              {/* Section header */}
              <tr>
                <td colSpan="2" style={{ ...hdrCell, ...borderB, fontSize: '10.5px' }}>
                  I. &nbsp; APPLICATION SECTION
                </td>
              </tr>

              {/* Sub-section A header */}
              <tr>
                <td colSpan="2" style={{ ...hdrCell, ...borderB }}>
                  A. &nbsp; BUSINESS INFORMATION AND REGISTRATION
                </td>
              </tr>

              {/* Ownership checkboxes — full row */}
              <tr>
                <td colSpan="2" style={{ ...cellPad, ...borderB }}>
                  <span style={{ fontWeight: '700' }}>Please choose one:&nbsp;&nbsp;</span>
                  <span style={{ fontFamily: 'monospace' }}>{chk(isSoleProp)}</span> Sole Proprietorship &nbsp;
                  (<span style={{ fontFamily: 'monospace' }}>{chk(isMale)}</span> Male &nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(isFemale)}</span> Female) &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(isOPC)}</span> One Person Corporation &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(isPartnership)}</span> Partnership &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(isCorp)}</span> Corporation &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(isCoop)}</span> Cooperative
                </td>
              </tr>

              {/* DTI / TIN */}
              <tr>
                <td style={{ width: '55%', ...cellPad, ...borderB, ...borderR }}>
                  <strong>DTI/SEC/CDA Registration Number: </strong>
                  {app.dti_sec_cda_number || app.dti_sec_number || 'N/A (To be presented)'}
                </td>
                <td style={{ ...cellPad, ...borderB }}>
                  <strong>Tax Identification Number (TIN): </strong>
                  {app.tin || 'N/A (Subject to MTO/BIR verification)'}
                </td>
              </tr>

              {/* Business Name */}
              <tr>
                <td colSpan="2" style={{ ...cellPad, ...borderB }}>
                  <strong>Business Name: </strong>
                  <strong style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>{app.business_name || ''}</strong>
                </td>
              </tr>

              {/* Trade Name */}
              <tr>
                <td colSpan="2" style={{ ...cellPad, ...borderB }}>
                  <strong>Trade Name/Franchise (if applicable): </strong>
                  {app.trade_name || app.business_name || ''}
                </td>
              </tr>

              {/* Main Office Address — row 1 */}
              <tr>
                <td colSpan="2" style={{ ...cellPad, ...borderB }}>
                  <div style={{ fontWeight: '700', marginBottom: '3px' }}>Main Office Address:</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingRight: '10px', whiteSpace: 'nowrap' }}>
                          House/Bldg. No.: <strong>{app.house_bldg_no || '—'}</strong>
                        </td>
                        <td style={{ paddingRight: '10px', whiteSpace: 'nowrap' }}>
                          Name of Building: <strong>{app.building_name || '—'}</strong>
                        </td>
                        <td style={{ paddingRight: '10px', whiteSpace: 'nowrap' }}>
                          Lot No.: <strong>{app.lot_no || '—'}</strong>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          Street: <strong>{app.street || app.address || '—'}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ paddingRight: '10px', paddingTop: '2px', whiteSpace: 'nowrap' }}>
                          Barangay: <strong>{app.barangay || '—'}</strong>
                        </td>
                        <td style={{ paddingRight: '10px', paddingTop: '2px', whiteSpace: 'nowrap' }}>
                          Subdivision: <strong>{app.subdivision || '—'}</strong>
                        </td>
                        <td style={{ paddingRight: '10px', paddingTop: '2px', whiteSpace: 'nowrap' }}>
                          City/Municipality: <strong>Roxas</strong>
                        </td>
                        <td style={{ paddingTop: '2px', whiteSpace: 'nowrap' }}>
                          Province: <strong>Oriental Mindoro</strong> &nbsp; Zip Code: <strong>5212</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Contact */}
              <tr>
                <td colSpan="2" style={{ padding: 0, ...borderB }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ ...cellPad, ...borderR, width: '28%' }}>
                          <strong>Telephone No.: </strong>{app.telephone_no || '—'}
                        </td>
                        <td style={{ ...cellPad, ...borderR, width: '35%' }}>
                          <strong>Mobile No.: </strong>{app.contact_number || app.owner_contact || '—'}
                        </td>
                        <td style={{ ...cellPad }}>
                          <strong>Email Address: </strong>{app.email || app.owner_email || '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Owner name table */}
              <tr>
                <td colSpan="2" style={{ padding: 0, ...borderB }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F5F5F5' }}>
                        <th style={{ ...cellPad, ...borderR, width: '27%', fontWeight: '700', textAlign: 'left' }}>
                          (For Sole Proprietorship)<br />Name of Owner:
                        </th>
                        <th style={{ ...cellPad, ...borderR, width: '20%', fontWeight: '400', textAlign: 'left' }}>
                          <span style={{ fontSize: '9px', color: '#555' }}>Surname</span>
                        </th>
                        <th style={{ ...cellPad, ...borderR, width: '25%', fontWeight: '400', textAlign: 'left' }}>
                          <span style={{ fontSize: '9px', color: '#555' }}>Given Name</span>
                        </th>
                        <th style={{ ...cellPad, ...borderR, width: '18%', fontWeight: '400', textAlign: 'left' }}>
                          <span style={{ fontSize: '9px', color: '#555' }}>Middle Name</span>
                        </th>
                        <th style={{ ...cellPad, fontWeight: '400', textAlign: 'left' }}>
                          <span style={{ fontSize: '9px', color: '#555' }}>Suffix</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ ...cellPad, ...borderR }}></td>
                        <td style={{ ...cellPad, ...borderR }}><strong>{surname || '—'}</strong></td>
                        <td style={{ ...cellPad, ...borderR }}><strong>{givenName || '—'}</strong></td>
                        <td style={{ ...cellPad, ...borderR }}><strong>{middleName || '—'}</strong></td>
                        <td style={{ ...cellPad }}><strong>{suffix || '—'}</strong></td>
                      </tr>
                      <tr style={{ ...borderT }}>
                        <td style={{ ...cellPad, ...borderR, fontWeight: '700' }}>
                          (For Corp/Coop/Partnership)<br />Name of President/Officer in Charge:
                        </td>
                        <td style={{ ...cellPad, ...borderR }}>
                          <strong>{!isSoleProp ? (app.officer_surname || surname || '—') : '—'}</strong>
                        </td>
                        <td style={{ ...cellPad, ...borderR }}>
                          <strong>{!isSoleProp ? (app.officer_given_name || givenName || '—') : '—'}</strong>
                        </td>
                        <td style={{ ...cellPad, ...borderR }}>
                          <strong>{!isSoleProp ? (app.officer_middle_name || '—') : '—'}</strong>
                        </td>
                        <td style={{ ...cellPad }}>
                          <strong>{!isSoleProp ? (app.officer_suffix || '—') : '—'}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* For Corporation */}
              <tr>
                <td colSpan="2" style={{ ...cellPad }}>
                  <strong>For Corporation: </strong>&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(isCorp && isFilipino)}</span> Filipino &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(isCorp && !isFilipino)}</span> Foreign
                </td>
              </tr>

            </tbody>
          </table>

          {/* ── 4. B. BUSINESS OPERATION ──────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', marginBottom: '0', fontSize: '10px' }}>
            <tbody>

              <tr>
                <td colSpan="3" style={{ ...hdrCell, ...borderB }}>
                  B. &nbsp; BUSINESS OPERATION
                </td>
              </tr>

              {/* Floor area / Employees / Delivery */}
              <tr>
                <td style={{ width: '30%', ...cellPad, ...borderB, ...borderR, verticalAlign: 'top' }}>
                  <div>Business Area (sq.m): <strong>{app.floor_area || app.business_area || '—'}</strong></div>
                  <div style={{ marginTop: '2px' }}>Total Floor Area (sq.m): <strong>{app.floor_area ? `${app.floor_area} sq.m.` : '—'}</strong></div>
                </td>
                <td style={{ width: '40%', ...cellPad, ...borderB, ...borderR, verticalAlign: 'top' }}>
                  <div>Total No. of Employees in Establishment: <strong>{app.employees || 0}</strong></div>
                  <div style={{ marginTop: '2px' }}>
                    Male: <strong>{app.employees_male ?? Math.ceil((app.employees || 0) / 2)}</strong>&nbsp;&nbsp;
                    Female: <strong>{app.employees_female ?? Math.floor((app.employees || 0) / 2)}</strong>
                  </div>
                  <div style={{ marginTop: '2px' }}>
                    No. of Employees Residing within: <strong>{app.employees_residing_lgu ?? app.employees ?? 0}</strong>
                  </div>
                </td>
                <td style={{ width: '30%', ...cellPad, ...borderB, verticalAlign: 'top' }}>
                  <div><strong>No. of Delivery Vehicles (if applicable):</strong></div>
                  <div style={{ marginTop: '2px' }}>Van/Truck: <strong>{app.delivery_trucks || 0}</strong></div>
                  <div style={{ marginTop: '2px' }}>Motorcycle: <strong>{app.delivery_motorcycles || 0}</strong></div>
                </td>
              </tr>

              {/* Same as main address */}
              <tr>
                <td colSpan="3" style={{ ...cellPad, ...borderB }}>
                  <span style={{ fontFamily: 'monospace' }}>[X]</span> Same as Main Office Address
                </td>
              </tr>

              {/* Business location (if different) */}
              <tr>
                <td colSpan="3" style={{ padding: 0, ...borderB }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ ...cellPad, ...borderR, width: '30%' }}>
                          Street: <strong>{app.biz_street || app.street || app.address || '—'}</strong>
                        </td>
                        <td style={{ ...cellPad, ...borderR, width: '25%' }}>
                          Name of Building: <strong>{app.building_name || '—'}</strong>
                        </td>
                        <td style={{ ...cellPad, ...borderR, width: '15%' }}>
                          Lot No.: <strong>{app.lot_no || '—'}</strong>
                        </td>
                        <td style={{ ...cellPad, width: '30%' }}>
                          Block No.: <strong>{app.block_no || '—'}</strong>
                        </td>
                      </tr>
                      <tr style={{ ...borderT }}>
                        <td style={{ ...cellPad, ...borderR }}>
                          City/Municipality: <strong>{app.city || 'Roxas'}</strong>
                        </td>
                        <td style={{ ...cellPad, ...borderR }}>
                          Province: <strong>{app.province || 'Oriental Mindoro'}</strong>
                        </td>
                        <td colSpan="2" style={{ ...cellPad }}>
                          Zip Code: <strong>5212</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Owned / Tax Dec */}
              <tr>
                <td colSpan="3" style={{ ...cellPad, ...borderB }}>
                  <strong>Owned? </strong>&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(isOwned)}</span> Yes &nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(!isOwned)}</span> No &nbsp;&nbsp;&nbsp;
                  {isOwned ? (
                    <>
                      If Yes, Tax Declaration No.: <strong>{app.tax_dec_no || '—'}</strong>
                      &nbsp;&nbsp; Or Property Identification No.: <strong>{app.pin_no || '—'}</strong>
                    </>
                  ) : (
                    <>
                      Monthly Rental: <strong>{app.monthly_rental ? `₱${Number(app.monthly_rental).toLocaleString()}` : '—'}</strong>
                      &nbsp;&nbsp; Lessor: <strong>{app.lessor_name || '—'}</strong>
                    </>
                  )}
                </td>
              </tr>

              {/* Tax Incentives */}
              <tr>
                <td colSpan="3" style={{ ...cellPad, ...borderB }}>
                  <strong>Do you have tax incentives from any Government Entity? </strong>&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(app.has_tax_incentives)}</span> Yes (Please attach a copy of your certificate) &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{chk(!app.has_tax_incentives)}</span> No
                </td>
              </tr>

              {/* Business Activity */}
              <tr>
                <td colSpan="3" style={{ ...cellPad, ...borderB }}>
                  <strong>Business Activity (Please check one): </strong>&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>[X]</span> Main Office / Storefront &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>[   ]</span> Branch Office &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>[   ]</span> Admin Office Only &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>[   ]</span> Warehouse &nbsp;&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>[   ]</span> Others Ms. Specify: ___________
                </td>
              </tr>

              {/* Line of Business table — matching official column headers */}
              <tr>
                <td colSpan="3" style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F5F5F5' }}>
                        <th rowSpan="2" style={{ ...cellPad, ...borderR, ...borderB, width: '26%', textAlign: 'left', verticalAlign: 'bottom' }}>
                          Line of Business
                        </th>
                        <th rowSpan="2" style={{ ...cellPad, ...borderR, ...borderB, width: '8%', textAlign: 'center', verticalAlign: 'bottom', fontSize: '8px' }}>
                          Philippine Standard Industry Code (PSIC)
                        </th>
                        <th rowSpan="2" style={{ ...cellPad, ...borderR, ...borderB, width: '18%', textAlign: 'center', verticalAlign: 'bottom' }}>
                          Products/<br />Services
                        </th>
                        <th rowSpan="2" style={{ ...cellPad, ...borderR, ...borderB, width: '8%', textAlign: 'center', verticalAlign: 'bottom' }}>
                          No. of<br />Units
                        </th>
                        <th rowSpan="2" style={{ ...cellPad, ...borderR, ...borderB, width: '18%', textAlign: 'center', verticalAlign: 'bottom' }}>
                          For New Business<br />(Capitalization)
                        </th>
                        <th colSpan="2" style={{ ...cellPad, ...borderB, textAlign: 'center' }}>
                          For Renewal<br />Last Year's Gross sales/Receipts
                        </th>
                      </tr>
                      <tr style={{ backgroundColor: '#F5F5F5' }}>
                        <th style={{ ...cellPad, ...borderR, ...borderB, width: '11%', textAlign: 'center' }}>Essential</th>
                        <th style={{ ...cellPad, ...borderB, width: '11%', textAlign: 'center' }}>Non-essential</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ ...borderB }}>
                        <td style={{ ...cellPad, ...borderR, fontWeight: '600' }}>
                          {app.industry_category || app.business_type || '—'}
                        </td>
                        <td style={{ ...cellPad, ...borderR, textAlign: 'center' }}>
                          {app.psic_code || '5212'}
                        </td>
                        <td style={{ ...cellPad, ...borderR }}>
                          {app.primary_products || app.business_description || '—'}
                        </td>
                        <td style={{ ...cellPad, ...borderR, textAlign: 'center' }}>
                          {app.units_count || '1'}
                        </td>
                        <td style={{ ...cellPad, ...borderR, textAlign: 'right', fontWeight: '700' }}>
                          {isNew
                            ? (app.capitalization ? `₱${Number(app.capitalization).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—')
                            : '—'}
                        </td>
                        <td style={{ ...cellPad, ...borderR, textAlign: 'right', fontWeight: '700' }}>
                          {isRenewal
                            ? (app.gross_sales ? `₱${Number(app.gross_sales).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—')
                            : '—'}
                        </td>
                        <td style={{ ...cellPad, textAlign: 'right' }}>—</td>
                      </tr>
                      {/* 2 blank rows */}
                      {[0, 1].map(i => (
                        <tr key={i} style={{ height: '18px', ...borderB }}>
                          {[0,1,2,3,4,5,6].map(j => (
                            <td key={j} style={j < 6 ? borderR : {}}></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>

            </tbody>
          </table>

          {/* ── 5. DECLARATION + SIGNATURE ────────────────────────────── */}
          <div style={{ border: '1px solid #000', borderTop: 'none', padding: '8px 10px', fontSize: '9.5px', lineHeight: 1.4 }}>
            <p style={{ margin: '0 0 14px', textAlign: 'justify' }}>
              <strong>I DECLARE UNDER PENALTY OF PERJURY</strong> that all information in this application are true and correct based on my personal knowledge and authentic records submitted to the Business Permits and Licensing Office (BPLO). Any false or misleading information supplied, or production of fake/falsified documents shall be grounds for appropriate legal action against me and automatically revokes the permit. I hereby agree that all personal data (as defined under the Data Privacy Law of 2012 and its implementing Rules and Regulations) and account transaction information or records with Municipal Government may be processed, profiled or shared to requesting parties or for the purpose of any court, legal process, examination, inquiry and audit or investigation of any authority.
            </p>

            {/* Single-column signature block — matches official form */}
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', display: 'inline-block', minWidth: '320px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SIGNATURE OF APPLICANT/OWNER OVER PRINTED NAME
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', display: 'inline-block', minWidth: '260px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  DESIGNATION / POSITION / TITLE
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
