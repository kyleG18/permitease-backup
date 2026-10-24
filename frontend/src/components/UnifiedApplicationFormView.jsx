import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { Printer, Download, CheckSquare, Square, FileText, Info, ShieldCheck, Building2 } from 'lucide-react';

export default function UnifiedApplicationFormView({ app, printable = true, showInstructions = true }) {
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';

  if (!app) return null;

  const isRenewal = (app.application_type || app.business_status || '').toUpperCase().includes('RENEW');
  const appNumber = app.application_number || 'BP-ROXAS-PENDING';
  const taxYear = new Date(app.created_at || Date.now()).getFullYear();
  const applicationDate = app.created_at ? new Date(app.created_at).toLocaleDateString(isTl ? 'fil-PH' : 'en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date().toLocaleDateString();

  const handlePrint = () => {
    window.print();
  };

  // Ownership classification check
  const ownership = (app.ownership_type || '').toLowerCase();
  const isSoleProp = ownership.includes('sole') || ownership.includes('single') || !ownership;
  const isCorp = ownership.includes('corp');
  const isPartnership = ownership.includes('partner');
  const isCoop = ownership.includes('coop');
  const isOPC = ownership.includes('one person');

  // Premises classification check
  const premises = (app.premises_type || '').toLowerCase();
  const isOwned = premises.includes('own');
  const isRented = premises.includes('rent') || premises.includes('lease');

  return (
    <div className="unified-form-wrapper" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Top Action Bar (hidden on print) */}
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
          marginBottom: '1.5rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '15px', color: 'var(--government-navy, #0F172A)' }}>
              <FileText size={18} color="var(--primary-green, #15803D)" />
              {isTl ? 'Opisyal na Unified Application Form ng Roxas' : 'Official Roxas Unified Business Permit Form'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {isTl ? 'Format ayon sa BPLO Municipality of Roxas (Oriental Mindoro)' : 'Accredited BPLO layout conforming to Roxas Municipal Ordinance & Citizen’s Charter'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--primary-green, #15803D)',
                color: 'white',
                border: 'none',
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '13.5px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Printer size={16} />
              {isTl ? 'I-print ang Kumpletong Form' : 'Print Pre-filled Form'}
            </button>

            <a
              href="/forms/Roxas_Business_Permit_Application_Form.pdf"
              download="UNIFIED_APPLICATION_FORM_FOR_BUSINESS_PERMIT.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'white',
                color: 'var(--government-navy, #0F172A)',
                border: '1px solid #CBD5E1',
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '13.5px',
                textDecoration: 'none'
              }}
            >
              <Download size={16} />
              {isTl ? 'I-download ang Blangkong PDF' : 'Download Blank PDF'}
            </a>
          </div>
        </div>
      )}

      {/* Guidance Alert (hidden on print) */}
      {showInstructions && (
        <div className="no-print" style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '8px',
          padding: '0.9rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '13px',
          color: '#166534',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <Info size={18} color="#15803D" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>{isTl ? 'Paalala sa Pagsusumite sa BPLO:' : 'BPLO Physical Submission Guidance:'}</strong>{' '}
            {isTl 
              ? 'I-print ang form na ito sa dalawang (2) kopya bago magtungo sa Roxas Municipal Hall BOSS counter. Siguraduhing napirmahan ang Seksyon 3 at nakalakip ang mga kinakailangang clearances (Barangay, DTI/SEC, Cedula).'
              : 'Print two (2) copies of this completed form prior to visiting the Roxas Municipal Hall BOSS counter. Ensure Section 3 is hand-signed and all required clearances (Barangay Clearance, DTI/SEC Registration, Cedula) are attached.'}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* OFFICIAL UNIFIED APPLICATION FORM DOCUMENT CONTAINER         */}
      {/* ============================================================ */}
      <div className="unified-form-scroll-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div 
          id="unified-application-form-doc"
          style={{
            backgroundColor: 'white',
            border: '2px solid #0F172A',
            borderRadius: '4px',
            padding: '1.5rem',
            color: '#0F172A',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            lineHeight: 1.35
          }}
        >
        
        {/* DOCUMENT HEADER */}
        <div style={{
          borderBottom: '2px solid #0F172A',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {/* Left Seal */}
          <div style={{ width: '68px', textAlign: 'center', flexShrink: 0 }}>
            <img 
              src="/images/roxas-seal.png" 
              alt="Seal of Roxas" 
              style={{ width: '64px', height: '64px', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Center Titles */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>
              Republic of the Philippines • Province of Oriental Mindoro
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.04em', color: '#0F172A' }}>
              MUNICIPALITY OF ROXAS
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OFFICE OF THE MAYOR • BUSINESS PERMITS AND LICENSING OFFICE (BPLO)
            </div>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#0F172A',
              color: 'white',
              fontWeight: '800',
              fontSize: '14px',
              letterSpacing: '0.05em',
              padding: '0.25rem 1rem',
              borderRadius: '3px',
              marginTop: '0.4rem',
              textTransform: 'uppercase'
            }}>
              UNIFIED APPLICATION FORM FOR BUSINESS PERMIT
            </div>
          </div>

          {/* Right Government Meta / Tracking Code */}
          <div style={{ width: '130px', textAlign: 'right', flexShrink: 0, fontSize: '10px' }}>
            <div style={{ fontWeight: '700', color: '#475569' }}>FORM BPLO-01</div>
            <div style={{ color: '#64748B' }}>Series of {taxYear}</div>
            <div style={{ border: '1px dashed #94A3B8', padding: '4px', borderRadius: '4px', marginTop: '4px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
              <span style={{ fontSize: '9px', display: 'block', color: '#64748B' }}>REFERENCE NO.</span>
              <strong style={{ fontSize: '11px', fontFamily: 'monospace', color: '#0F172A' }}>{appNumber}</strong>
            </div>
          </div>
        </div>

        {/* METADATA BAR (Application Type, Payment Mode, Tax Year, Date) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          backgroundColor: '#F8FAFC',
          border: '1px solid #0F172A',
          padding: '0.75rem',
          marginBottom: '1rem',
          fontSize: '11.5px'
        }}>
          {/* Application Type */}
          <div>
            <div style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', fontSize: '10px', color: '#475569' }}>
              {isTl ? 'Uri ng Aplikasyon' : 'Application Type'}:
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {!isRenewal ? <CheckSquare size={14} color="#15803D" /> : <Square size={14} color="#94A3B8" />}
                <strong>NEW</strong> (Bagong Negosyo)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {isRenewal ? <CheckSquare size={14} color="#15803D" /> : <Square size={14} color="#94A3B8" />}
                <strong>RENEWAL</strong> (Pagpapanibago)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#94A3B8' }}>
                <Square size={14} color="#CBD5E1" /> ADDITIONAL
              </span>
            </div>
          </div>

          {/* Mode of Payment */}
          <div>
            <div style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', fontSize: '10px', color: '#475569' }}>
              {isTl ? 'Paraan ng Pagbabayad' : 'Mode of Payment'}:
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <CheckSquare size={14} color="#15803D" /> Annually (Taunan)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#64748B' }}>
                <Square size={14} color="#94A3B8" /> Bi-annually
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#64748B' }}>
                <Square size={14} color="#94A3B8" /> Quarterly
              </span>
            </div>
          </div>

          {/* Dates & Reference */}
          <div>
            <div style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', fontSize: '10px', color: '#475569' }}>
              {isTl ? 'Petsa ng Aplikasyon / Taon' : 'Date of Filing / Tax Year'}:
            </div>
            <div>
              <strong>{applicationDate}</strong> • Tax Year: <strong>{taxYear}</strong>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 1: BASIC INFORMATION & REGISTRATION                  */}
        {/* ============================================================ */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            backgroundColor: '#0F172A',
            color: 'white',
            fontWeight: '700',
            fontSize: '11px',
            letterSpacing: '0.05em',
            padding: '4px 8px',
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>SECTION 1: BASIC INFORMATION & REGISTRATION</span>
            <span style={{ fontSize: '10px', fontWeight: '400', opacity: 0.85 }}>Seksyon 1: Pangunahing Impormasyon</span>
          </div>

          <div style={{ border: '1px solid #0F172A', borderTop: 'none', padding: '0.75rem', fontSize: '12px' }}>
            
            {/* Row 1: Type of Organization */}
            <div style={{ paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px dashed #E2E8F0' }}>
              <div style={{ fontWeight: '700', fontSize: '10.5px', textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
                Type of Organization / Uri ng Organisasyon:
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  {isSoleProp ? <CheckSquare size={13} color="#15803D" /> : <Square size={13} color="#94A3B8" />}
                  Sole Proprietorship
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  {isOPC ? <CheckSquare size={13} color="#15803D" /> : <Square size={13} color="#94A3B8" />}
                  One Person Corp.
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  {isPartnership ? <CheckSquare size={13} color="#15803D" /> : <Square size={13} color="#94A3B8" />}
                  Partnership
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  {isCorp ? <CheckSquare size={13} color="#15803D" /> : <Square size={13} color="#94A3B8" />}
                  Corporation (Filipino / Foreign)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  {isCoop ? <CheckSquare size={13} color="#15803D" /> : <Square size={13} color="#94A3B8" />}
                  Cooperative
                </span>
              </div>
            </div>

            {/* Row 2: Registration & Tax Numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px dashed #E2E8F0' }}>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  DTI / SEC / CDA Registration No.:
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  {app.dti_sec_number || 'To be presented during verification'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Date of Registration:
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  {app.date_established ? new Date(app.date_established).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Tax Identification Number (TIN):
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  {app.tin || 'Under registration / verified at MTO'}
                </span>
              </div>
            </div>

            {/* Row 3: Business Names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px dashed #E2E8F0' }}>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Business Name / Pangalan ng Negosyo:
                </span>
                <strong style={{ fontSize: '14px', color: '#0F172A' }}>
                  {app.business_name}
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Trade Name / Franchise (if applicable):
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  {app.trade_name || app.business_name}
                </span>
              </div>
            </div>

            {/* Row 4: Owner / Registrant Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px dashed #E2E8F0' }}>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Owner / President / Officer-In-Charge:
                </span>
                <strong style={{ color: '#0F172A' }}>
                  {app.owner_name || 'N/A'}
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Mobile / Contact Number:
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  {app.contact_number || app.owner_contact || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Email Address:
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  {app.owner_email || 'N/A'}
                </span>
              </div>
            </div>

            {/* Row 5: Main Office Address */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Main Office Address (Street / Building / House No.):
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  {app.address || 'Municipality of Roxas'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Barangay:
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  {app.barangay || 'Poblacion'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Municipality / Province / Zip:
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  Roxas, Oriental Mindoro 5212
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: OTHER INFORMATION / BUSINESS OPERATION            */}
        {/* ============================================================ */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            backgroundColor: '#0F172A',
            color: 'white',
            fontWeight: '700',
            fontSize: '11px',
            letterSpacing: '0.05em',
            padding: '4px 8px',
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>SECTION 2: OTHER INFORMATION & BUSINESS OPERATION</span>
            <span style={{ fontSize: '10px', fontWeight: '400', opacity: 0.85 }}>Seksyon 2: Impormasyon sa Pagpapatakbo</span>
          </div>

          <div style={{ border: '1px solid #0F172A', borderTop: 'none', padding: '0.75rem', fontSize: '12px' }}>
            
            {/* Operational Metrics (Area, Employees, Vehicles) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px dashed #E2E8F0' }}>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Total Floor Area (sq.m.):
                </span>
                <strong style={{ color: '#0F172A' }}>
                  {app.floor_area ? `${app.floor_area} sq.m.` : 'Declared upon inspection'}
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Total Number of Employees:
                </span>
                <strong style={{ color: '#0F172A' }}>
                  {app.employees || '0'} employee(s)
                </strong>
                <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>
                  (Within LGU: {app.employees || 0} • Male / Female breakdown on file)
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Delivery Vehicles:
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  Van/Truck: 0 • Motorcycle: 0
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Business Activity / Facility:
                </span>
                <span style={{ fontWeight: '600', color: '#0F172A' }}>
                  [✓] Main Office / Commercial Storefront
                </span>
              </div>
            </div>

            {/* Premises & Incentive Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px dashed #E2E8F0' }}>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Property Ownership / Katayuan ng Lugar:
                </span>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {isOwned ? <CheckSquare size={13} color="#15803D" /> : <Square size={13} color="#94A3B8" />}
                    Owned (May-ari)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {isRented ? <CheckSquare size={13} color="#15803D" /> : <Square size={13} color="#94A3B8" />}
                    Rented / Leased (Inuupahan)
                  </span>
                </div>
                <span style={{ display: 'block', fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                  {isOwned ? 'Tax Declaration / PIN verified with Municipal Assessor' : 'Contract of Lease / Lessor consent verified'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Tax Incentive from Government Entity:
                </span>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#64748B' }}>
                    <Square size={13} color="#94A3B8" /> Yes
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <CheckSquare size={13} color="#15803D" /> No (Wala)
                  </span>
                </div>
              </div>
            </div>

            {/* LINE OF BUSINESS & CAPITALIZATION / GROSS SALES TABLE */}
            <div>
              <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Line of Business & Financial Base / Linya ng Negosyo:
              </span>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #0F172A', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #0F172A', textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px', borderRight: '1px solid #0F172A', fontWeight: '700', width: '35%' }}>Line of Business / Industry</th>
                    <th style={{ padding: '4px 8px', borderRight: '1px solid #0F172A', fontWeight: '700', width: '30%' }}>Products / Services</th>
                    <th style={{ padding: '4px 8px', borderRight: '1px solid #0F172A', fontWeight: '700', textAlign: 'right', width: '18%' }}>
                      {!isRenewal ? 'Capitalization (New)' : 'Gross Sales (Renewal)'}
                    </th>
                    <th style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'center', width: '17%' }}>PSIC / Units</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #0F172A', fontWeight: '600' }}>
                      {app.industry_category || app.business_type}
                    </td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #0F172A' }}>
                      {app.primary_products || app.business_description || 'Commercial operations'}
                    </td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #0F172A', textAlign: 'right', fontWeight: '700', color: '#0F172A' }}>
                      {!isRenewal ? (
                        app.capitalization ? `₱${Number(app.capitalization).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00'
                      ) : (
                        app.gross_sales ? `₱${Number(app.gross_sales).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'Subject to BPLO/MTO'
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748B' }}>
                      1 Est. / 5212
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', fontStyle: 'italic' }}>
                * For renewals, Local Business Tax assessment is computed from prior-year audited gross sales receipts and sworn financial statements submitted to the Municipal Treasurer’s Office.
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: APPLICANT'S DECLARATION & STATUTORY NOTICES       */}
        {/* ============================================================ */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            backgroundColor: '#0F172A',
            color: 'white',
            fontWeight: '700',
            fontSize: '11px',
            letterSpacing: '0.05em',
            padding: '4px 8px',
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>SECTION 3: APPLICANT’S DECLARATION & STATUTORY COMPLIANCE</span>
            <span style={{ fontSize: '10px', fontWeight: '400', opacity: 0.85 }}>Seksyon 3: Pahayag ng Aplikante</span>
          </div>

          <div style={{ border: '1px solid #0F172A', borderTop: 'none', padding: '0.75rem', fontSize: '11px', backgroundColor: '#FAFAFA' }}>
            <p style={{ margin: '0 0 0.5rem', lineHeight: 1.45, textAlign: 'justify' }}>
              <strong>I DECLARE UNDER PENALTY OF PERJURY</strong> that all information and statements in this application, as well as the supporting documents submitted herewith, are true, correct, and complete to the best of my knowledge and belief. I agree to operate my business in full compliance with all applicable national laws, executive orders, and the Municipal Ordinances of Roxas, Oriental Mindoro. I acknowledge that any misrepresentation, falsification, or failure to comply with statutory requirements shall constitute valid ground for the revocation of the business permit and legal prosecution.
            </p>
            <p style={{ margin: '0 0 0.75rem', lineHeight: 1.45, color: '#334155', textAlign: 'justify' }}>
              <strong>DATA PRIVACY CONSENT (R.A. 10173):</strong> Pursuant to the Data Privacy Act of 2012, I hereby consent and authorize the Municipal Government of Roxas to collect, store, and process personal and business data declared in this form strictly for regulatory compliance, assessment, and municipal record-keeping purposes.
            </p>

            {/* Signature Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #CBD5E1' }}>
              <div>
                <div style={{ height: '32px' }}></div>
                <div style={{ borderTop: '1px solid #0F172A', paddingTop: '4px', textAlign: 'center' }}>
                  <strong style={{ fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>
                    {app.owner_name || 'APPLICANT / AUTHORIZED REPRESENTATIVE'}
                  </strong>
                  <span style={{ fontSize: '10px', color: '#64748B' }}>
                    Signature Over Printed Name / Lagda sa Ibabaw ng Pangalan
                  </span>
                </div>
              </div>

              <div>
                <div style={{ height: '32px', textAlign: 'center', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span style={{ fontWeight: '600', fontSize: '11px', color: '#15803D' }}>{applicationDate}</span>
                </div>
                <div style={{ borderTop: '1px solid #0F172A', paddingTop: '4px', textAlign: 'center' }}>
                  <strong style={{ fontSize: '12px', display: 'block' }}>
                    {isSoleProp ? 'OWNER / PROPRIETOR' : 'AUTHORIZED REPRESENTATIVE'}
                  </strong>
                  <span style={{ fontSize: '10px', color: '#64748B' }}>
                    Designation / Position & Date Signed
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: FOR LGU / BPLO OFFICIAL USE ONLY                  */}
        {/* ============================================================ */}
        <div style={{ border: '1px solid #94A3B8', backgroundColor: '#F8FAFC', padding: '0.6rem 0.75rem', fontSize: '10.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <strong style={{ textTransform: 'uppercase', color: '#475569', fontSize: '10px', letterSpacing: '0.04em' }}>
              FOR OFFICIAL USE ONLY • BUSINESS PERMIT AND LICENSING SECTION (BPLO / MTO)
            </strong>
            <span style={{ color: '#15803D', fontWeight: '600' }}>
              PermitEase Pre-Submission Verification Tracking
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div style={{ border: '1px solid #CBD5E1', padding: '4px', backgroundColor: 'white' }}>
              <span style={{ display: 'block', fontSize: '9px', color: '#64748B' }}>ZONING CLEARANCE</span>
              <strong style={{ color: '#0F172A' }}>MPDO Cleared</strong>
            </div>
            <div style={{ border: '1px solid #CBD5E1', padding: '4px', backgroundColor: 'white' }}>
              <span style={{ display: 'block', fontSize: '9px', color: '#64748B' }}>SANITARY CLEARANCE</span>
              <strong style={{ color: '#0F172A' }}>MHO Cleared</strong>
            </div>
            <div style={{ border: '1px solid #CBD5E1', padding: '4px', backgroundColor: 'white' }}>
              <span style={{ display: 'block', fontSize: '9px', color: '#64748B' }}>FIRE SAFETY (FSIC)</span>
              <strong style={{ color: '#0F172A' }}>BFP Assessment</strong>
            </div>
            <div style={{ border: '1px solid #CBD5E1', padding: '4px', backgroundColor: 'white' }}>
              <span style={{ display: 'block', fontSize: '9px', color: '#64748B' }}>BPLO FINAL STATUS</span>
              <strong style={{ color: '#15803D' }}>{app.status || 'DRAFT'}</strong>
            </div>
          </div>
        </div>

      </div>
      </div>

    </div>
  );
}
