/**
 * AssessmentChecklistPrint.jsx
 * Professional government-style permit requirement checklist for print.
 * Mirrors the design language of UnifiedApplicationFormView.jsx.
 *
 * Usage:
 *   <AssessmentChecklistPrint
 *     checklist={checklist}
 *     selectedBiz={selectedBiz}
 *     aiAssessment={currentResult?.ai_assessment}
 *     totalRequirementExpenses={totalRequirementExpenses}
 *     stillNeededExpenses={stillNeededExpenses}
 *     haveCount={haveCount}
 *     needCount={needCount}
 *     score={score}
 *   />
 *
 * Rendered as `display:none` on screen; only becomes visible during window.print().
 * Injects its own @media print CSS that hides everything else on the page.
 */

const AssessmentChecklistPrint = ({
  checklist = [],
  selectedBiz = {},
  aiAssessment = {},
  totalRequirementExpenses = 0,
  stillNeededExpenses = 0,
  haveCount = 0,
  needCount = 0,
  score = 0,
}) => {
  const today = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const mandatoryReqs = checklist.filter((r) => r.is_mandatory);
  const conditionalReqs = checklist.filter((r) => !r.is_mandatory);
  const totalReqs = checklist.length;

  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

  // ── STYLES ──────────────────────────────────────────────────────────────────
  const S = {
    wrap: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#000000',
      maxWidth: '920px',
      margin: '0 auto',
      padding: '0',
    },
    doc: {
      border: '2px solid #000000',
      background: '#ffffff',
    },
    // ── HEADER ────────────────────────────────────────────────────────────────
    header: {
      background: 'linear-gradient(90deg, #15803D 0%, #166534 100%)',
      color: '#ffffff',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    },
    sealWrap: {
      flexShrink: 0,
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
    seal: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.12)',
      border: '2px solid rgba(255,255,255,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    sealImg: { width: '50px', height: '50px', objectFit: 'contain' },
    govText: { flex: 1, textAlign: 'center' },
    republic: { fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.85, margin: 0 },
    province: { fontSize: '9.5px', opacity: 0.9, margin: '1px 0 0' },
    municipality: { fontSize: '15px', fontWeight: 800, letterSpacing: '0.5px', margin: '1px 0' },
    bplo: { fontSize: '9px', letterSpacing: '1.5px', opacity: 0.85, margin: 0 },
    docTitle: {
      marginTop: '5px',
      fontSize: '13px',
      fontWeight: 900,
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      borderTop: '1px solid rgba(255,255,255,0.35)',
      paddingTop: '5px',
    },
    docSubTitle: { fontSize: '9px', opacity: 0.85, letterSpacing: '0.5px', marginTop: '1px' },

    // ── DIVIDER ───────────────────────────────────────────────────────────────
    divider: { borderTop: '1px solid #000000', margin: 0 },
    heavyDivider: { borderTop: '2px solid #000000', margin: 0 },

    // ── SECTION PANELS ────────────────────────────────────────────────────────
    sectionHeader: {
      background: '#F0FDF4',
      borderBottom: '1px solid #000000',
      padding: '5px 12px',
      fontWeight: 800,
      fontSize: '9.5px',
      textTransform: 'uppercase',
      letterSpacing: '1.2px',
      color: '#14532D',
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 0,
      borderBottom: '1px solid #000000',
    },
    infoCell: {
      padding: '7px 12px',
      borderRight: '1px solid #000000',
    },
    infoCellLast: {
      padding: '7px 12px',
    },
    infoLabel: { fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#475569', fontWeight: 700 },
    infoValue: { fontSize: '11px', fontWeight: 700, color: '#000000', marginTop: '1px' },

    // ── AI SUMMARY BAND ───────────────────────────────────────────────────────
    aiBand: {
      background: '#ECFDF5',
      borderBottom: '1px solid #000000',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      flexWrap: 'wrap',
    },
    aiBandItem: { flex: '1 1 auto', minWidth: '110px' },
    aiBandLabel: { fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#166534', fontWeight: 800 },
    aiBandValue: { fontSize: '11px', fontWeight: 800, color: '#14532D', marginTop: '1px' },
    aiBadge: {
      display: 'inline-block',
      background: '#15803D',
      color: '#fff',
      fontSize: '7.5px',
      fontWeight: 800,
      letterSpacing: '0.8px',
      padding: '2px 6px',
      borderRadius: '3px',
      textTransform: 'uppercase',
    },

    // ── TABLE ─────────────────────────────────────────────────────────────────
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '10px' },
    th: {
      padding: '6px 8px',
      background: '#15803D',
      color: '#ffffff',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      fontSize: '8.5px',
      border: '1px solid #000000',
      textAlign: 'left',
    },
    thCenter: {
      padding: '6px 8px',
      background: '#15803D',
      color: '#ffffff',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      fontSize: '8.5px',
      border: '1px solid #000000',
      textAlign: 'center',
    },
    td: { padding: '5px 8px', border: '1px solid #9CA3AF', verticalAlign: 'top' },
    tdCenter: { padding: '5px 8px', border: '1px solid #9CA3AF', verticalAlign: 'middle', textAlign: 'center' },
    tdRight: { padding: '5px 8px', border: '1px solid #9CA3AF', verticalAlign: 'middle', textAlign: 'right', fontWeight: 700 },
    rowEven: { background: '#F9FAFB' },
    rowOdd: { background: '#FFFFFF' },
    rowDone: { background: '#F0FDF4' },

    // ── SECTION GROUP HEADER ──────────────────────────────────────────────────
    groupHeaderRow: {
      background: '#D1FAE5',
      borderTop: '1px solid #000000',
    },
    groupHeaderCell: {
      padding: '4px 8px',
      fontWeight: 800,
      fontSize: '8.5px',
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      color: '#14532D',
      border: '1px solid #9CA3AF',
    },

    // ── TOTALS BAND ───────────────────────────────────────────────────────────
    totalsBand: {
      borderTop: '2px solid #000000',
      borderBottom: '1px solid #000000',
      padding: '10px 12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      background: '#ECFDF5',
      flexWrap: 'wrap',
    },
    totalsLeft: { flex: 1 },
    totalsRight: { textAlign: 'right' },
    totalLabel: { fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#166534', fontWeight: 800 },
    totalValue: { fontSize: '15px', fontWeight: 900, color: '#14532D', marginTop: '2px' },
    totalSub: { fontSize: '9px', color: '#475569', marginTop: '3px' },

    // ── SIGNATURE SECTION ─────────────────────────────────────────────────────
    sigSection: {
      borderTop: '1px solid #000000',
      padding: '10px 12px 14px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '0',
    },
    sigCell: { padding: '4px 12px', borderRight: '1px solid #9CA3AF' },
    sigCellLast: { padding: '4px 12px' },
    sigLabel: { fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: 700 },
    sigLine: { borderBottom: '1px solid #000000', marginTop: '22px', marginBottom: '3px' },
    sigSub: { fontSize: '8px', color: '#475569' },

    // ── FOOTER ────────────────────────────────────────────────────────────────
    footer: {
      background: '#14532D',
      color: 'rgba(255,255,255,0.85)',
      fontSize: '8px',
      padding: '6px 12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
    },

    // ── CHECKBOX SYMBOLS ──────────────────────────────────────────────────────
    cbDone: { fontSize: '14px', color: '#15803D', fontWeight: 900, lineHeight: 1 },
    cbPending: { fontSize: '14px', color: '#78716C', fontWeight: 900, lineHeight: 1 },

    // ── MANDATORY / CONDITIONAL BADGE ─────────────────────────────────────────
    badgeMandatory: {
      display: 'inline-block', fontSize: '7px', fontWeight: 800, letterSpacing: '0.4px',
      padding: '1px 4px', borderRadius: '2px', background: '#FEF2F2', color: '#991B1B',
      border: '0.5px solid #FECACA', textTransform: 'uppercase', marginLeft: '4px',
    },
    badgeConditional: {
      display: 'inline-block', fontSize: '7px', fontWeight: 800, letterSpacing: '0.4px',
      padding: '1px 4px', borderRadius: '2px', background: '#EFF6FF', color: '#1E40AF',
      border: '0.5px solid #BFDBFE', textTransform: 'uppercase', marginLeft: '4px',
    },
  };

  // ── ROW RENDERER ─────────────────────────────────────────────────────────────
  const renderRow = (req, idx, globalIdx) => {
    const isHave = req.status === 'Approved' || req.status === 'Submitted';
    const rowStyle = isHave ? S.rowDone : globalIdx % 2 === 0 ? S.rowEven : S.rowOdd;

    return (
      <tr key={req.requirement_id || idx} style={rowStyle}>
        {/* # */}
        <td style={{ ...S.tdCenter, width: '28px', fontWeight: 700, color: '#64748B' }}>
          {globalIdx}
        </td>

        {/* Requirement Name + description */}
        <td style={{ ...S.td, width: '30%' }}>
          <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
            {req.permit_name}
            {req.is_mandatory ? (
              <span style={S.badgeMandatory}>Mandatory</span>
            ) : (
              <span style={S.badgeConditional}>Conditional</span>
            )}
          </div>
          {req.description && (
            <div style={{ fontSize: '9px', color: '#475569', lineHeight: 1.4 }}>
              {req.description}
            </div>
          )}
        </td>

        {/* Issuing Agency */}
        <td style={{ ...S.td, width: '15%' }}>
          <span style={{ fontWeight: 600, color: '#1E40AF', fontSize: '10px' }}>
            {req.issuing_agency || '—'}
          </span>
        </td>

        {/* What to Bring */}
        <td style={{ ...S.td, width: '25%' }}>
          <span style={{ fontSize: '9px', color: '#374151', lineHeight: 1.4 }}>
            {req.required_documents || 'Standard documentary requirements'}
          </span>
        </td>

        {/* Estimated Fee */}
        <td style={{ ...S.tdRight, width: '10%' }}>
          {req.estimated_fee > 0 ? (
            <span style={{ color: '#15803D' }}>₱{fmt(req.estimated_fee)}</span>
          ) : (
            <span style={{ color: '#9CA3AF', fontSize: '9px' }}>—</span>
          )}
        </td>

        {/* Status Checkbox */}
        <td style={{ ...S.tdCenter, width: '8%' }}>
          {isHave ? (
            <span style={S.cbDone}>☑</span>
          ) : (
            <span style={S.cbPending}>☐</span>
          )}
          <div style={{ fontSize: '8px', color: isHave ? '#15803D' : '#92400e', fontWeight: 700, marginTop: '1px' }}>
            {isHave ? 'READY' : 'NEEDED'}
          </div>
        </td>
      </tr>
    );
  };

  let globalCounter = 0;

  return (
    <>
      {/* ── PRINT-ONLY MEDIA QUERY ─────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: Legal portrait;
            margin: 1cm 1.2cm;
          }
          body > * {
            display: none !important;
          }
          #checklist-print-root {
            display: block !important;
            visibility: visible !important;
            position: fixed;
            top: 0; left: 0;
            width: 100%;
          }
          #checklist-print-root * {
            visibility: visible !important;
          }
          #checklist-print-root table {
            page-break-inside: auto;
          }
          #checklist-print-root tr {
            page-break-inside: avoid;
          }
        }
        @media screen {
          #checklist-print-root {
            display: none;
          }
        }
      `}</style>

      {/* ── DOCUMENT ROOT ─────────────────────────────────────────────────── */}
      <div id="checklist-print-root" style={S.wrap}>
        <div style={S.doc}>

          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <div style={S.header}>
            {/* Seal Left */}
            <div style={S.sealWrap}>
              <div style={S.seal}>
                <img
                  src="/images/roxas-seal.png"
                  alt="Roxas Seal"
                  style={S.sealImg}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* Center Title Block */}
            <div style={{ ...S.govText, flex: 1 }}>
              <p style={S.republic}>Republic of the Philippines</p>
              <p style={S.province}>Province of Oriental Mindoro</p>
              <p style={S.municipality}>Municipality of Roxas</p>
              <p style={S.bplo}>Business Permits &amp; Licensing Office (BPLO)</p>
              <div style={S.docTitle}>Permit Requirement Compliance Checklist</div>
              <div style={S.docSubTitle}>
                AI-Generated · Assessment Date: {today}
              </div>
            </div>

            {/* Seal Right */}
            <div style={S.sealWrap}>
              <div style={S.seal}>
                <img
                  src="/images/roxas-seal.png"
                  alt="Roxas Seal"
                  style={S.sealImg}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </div>

          <hr style={S.heavyDivider} />

          {/* ══ BUSINESS INFORMATION ════════════════════════════════════════ */}
          <div style={S.sectionHeader}>I. Business Information</div>
          <div style={S.infoGrid}>
            <div style={S.infoCell}>
              <div style={S.infoLabel}>Business Name</div>
              <div style={S.infoValue}>{selectedBiz?.business_name || '—'}</div>
            </div>
            <div style={S.infoCellLast}>
              <div style={S.infoLabel}>Type of Business / Nature</div>
              <div style={S.infoValue}>{selectedBiz?.business_type || '—'}</div>
            </div>
          </div>
          <div style={{ ...S.infoGrid, borderBottom: '1px solid #000000' }}>
            <div style={S.infoCell}>
              <div style={S.infoLabel}>Owner / Representative</div>
              <div style={S.infoValue}>{selectedBiz?.owner_name || selectedBiz?.full_name || '—'}</div>
            </div>
            <div style={S.infoCellLast}>
              <div style={S.infoLabel}>Industry Category</div>
              <div style={S.infoValue}>{aiAssessment?.industry_category || selectedBiz?.industry_category || '—'}</div>
            </div>
          </div>
          <div style={{ ...S.infoGrid, borderBottom: '1px solid #000000' }}>
            <div style={S.infoCell}>
              <div style={S.infoLabel}>Location / Barangay</div>
              <div style={S.infoValue}>{selectedBiz?.barangay || '—'}, {selectedBiz?.municipality || 'Roxas'}</div>
            </div>
            <div style={S.infoCellLast}>
              <div style={S.infoLabel}>Application Type</div>
              <div style={S.infoValue}>{selectedBiz?.application_type || 'New Application'}</div>
            </div>
          </div>

          {/* ══ AI ASSESSMENT SUMMARY ════════════════════════════════════════ */}
          <div style={S.sectionHeader}>II. AI Assessment Summary</div>
          <div style={S.aiBand}>
            <div style={S.aiBandItem}>
              <div style={S.aiBandLabel}>AI Classified As</div>
              <div style={S.aiBandValue}>{aiAssessment?.industry_category || '—'}</div>
            </div>
            <div style={S.aiBandItem}>
              <div style={S.aiBandLabel}>Confidence Level</div>
              <div style={S.aiBandValue}>{aiAssessment?.confidence ? `${aiAssessment.confidence}%` : '—'}</div>
            </div>
            <div style={S.aiBandItem}>
              <div style={S.aiBandLabel}>Total Requirements</div>
              <div style={S.aiBandValue}>{checklist.length}</div>
            </div>
            <div style={S.aiBandItem}>
              <div style={S.aiBandLabel}>Ready / Compliant</div>
              <div style={{ ...S.aiBandValue, color: '#15803D' }}>{haveCount}</div>
            </div>
            <div style={S.aiBandItem}>
              <div style={S.aiBandLabel}>Still Needed</div>
              <div style={{ ...S.aiBandValue, color: '#B45309' }}>{needCount}</div>
            </div>
            <div style={S.aiBandItem}>
              <div style={S.aiBandLabel}>Readiness Score</div>
              <div style={{ ...S.aiBandValue, color: score >= 80 ? '#15803D' : score >= 50 ? '#B45309' : '#DC2626' }}>
                {score}%
              </div>
            </div>
            <div style={{ alignSelf: 'center' }}>
              <span style={S.aiBadge}>PermitEase AI</span>
            </div>
          </div>

          {/* ══ REQUIREMENTS TABLE ═══════════════════════════════════════════ */}
          <div style={S.sectionHeader}>III. Permit &amp; Requirement Checklist</div>

          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.thCenter, width: '28px' }}>#</th>
                <th style={{ ...S.th, width: '30%' }}>Permit / Requirement</th>
                <th style={{ ...S.th, width: '15%' }}>Issuing Agency</th>
                <th style={{ ...S.th, width: '25%' }}>Documents to Submit</th>
                <th style={{ ...S.thCenter, width: '10%' }}>Est. Fee</th>
                <th style={{ ...S.thCenter, width: '8%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Mandatory Group */}
              {mandatoryReqs.length > 0 && (
                <>
                  <tr style={S.groupHeaderRow}>
                    <td colSpan={6} style={S.groupHeaderCell}>
                      ★ Mandatory Requirements ({mandatoryReqs.length})
                    </td>
                  </tr>
                  {mandatoryReqs.map((req, idx) => {
                    globalCounter++;
                    return renderRow(req, idx, globalCounter);
                  })}
                </>
              )}

              {/* Conditional Group */}
              {conditionalReqs.length > 0 && (
                <>
                  <tr style={{ ...S.groupHeaderRow, background: '#FFF7ED' }}>
                    <td colSpan={6} style={{ ...S.groupHeaderCell, color: '#92400E', background: '#FFF7ED' }}>
                      ◇ Conditional / Industry-Specific Requirements ({conditionalReqs.length})
                    </td>
                  </tr>
                  {conditionalReqs.map((req, idx) => {
                    globalCounter++;
                    return renderRow(req, idx, globalCounter);
                  })}
                </>
              )}

              {/* Totals Row */}
              <tr style={{ background: '#F0FDF4', borderTop: '2px solid #000000' }}>
                <td colSpan={4} style={{ ...S.td, fontWeight: 800, fontSize: '10px', textAlign: 'right', color: '#14532D' }}>
                  TOTAL ESTIMATED REQUIREMENT ACQUISITION EXPENSES:
                </td>
                <td style={{ ...S.tdRight, fontWeight: 900, fontSize: '12px', color: '#15803D', border: '1px solid #000000' }}>
                  ₱{fmt(totalRequirementExpenses)}
                </td>
                <td style={{ ...S.tdCenter, fontWeight: 800, fontSize: '9px', color: '#15803D', border: '1px solid #000000' }}>
                  {haveCount}/{checklist.length}
                  <div style={{ fontSize: '7.5px', color: '#64748B', marginTop: '1px' }}>Completed</div>
                </td>
              </tr>

              {stillNeededExpenses > 0 && stillNeededExpenses < totalRequirementExpenses && (
                <tr style={{ background: '#FFFBEB' }}>
                  <td colSpan={4} style={{ ...S.td, fontWeight: 700, fontSize: '9.5px', textAlign: 'right', color: '#92400E' }}>
                    Still Needed ({needCount} item{needCount !== 1 ? 's' : ''}):
                  </td>
                  <td colSpan={2} style={{ ...S.td, fontWeight: 800, color: '#B45309', fontSize: '10.5px' }}>
                    ₱{fmt(stillNeededExpenses)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ══ TOTALS BAND ══════════════════════════════════════════════════ */}
          <div style={S.totalsBand}>
            <div style={S.totalsLeft}>
              <div style={S.totalLabel}>IV. Total Estimated Requirement Acquisition Cost</div>
              <div style={S.totalValue}>₱{fmt(totalRequirementExpenses)}</div>
              {stillNeededExpenses > 0 && (
                <div style={{ ...S.totalSub, color: '#B45309' }}>
                  ⚠ ₱{fmt(stillNeededExpenses)} still needed for {needCount} pending item{needCount !== 1 ? 's' : ''}
                </div>
              )}
              <div style={S.totalSub}>
                Note: Fees above are estimates only. Actual amounts may vary. Please confirm with the issuing agency.
              </div>
            </div>
            <div style={S.totalsRight}>
              <div style={S.totalLabel}>Readiness Score</div>
              <div style={{
                ...S.totalValue,
                fontSize: '22px',
                color: score >= 80 ? '#15803D' : score >= 50 ? '#B45309' : '#DC2626'
              }}>
                {score}%
              </div>
              <div style={{ ...S.totalSub, fontWeight: 700 }}>
                {haveCount} of {totalReqs} requirements completed
              </div>
            </div>
          </div>

          {/* ══ ADDITIONAL NOTES ═════════════════════════════════════════════ */}
          <div style={{ borderTop: '1px solid #000000', padding: '8px 12px', background: '#F8FAFC' }}>
            <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#14532D', marginBottom: '4px' }}>
              V. AI Reasoning / Notes
            </div>
            <div style={{ fontSize: '9px', color: '#374151', lineHeight: 1.6, minHeight: '32px' }}>
              {aiAssessment?.reasoning || 'Business requirements were identified based on the declared business type, industry category, and applicable local ordinances of the Municipality of Roxas, Oriental Mindoro.'}
            </div>
          </div>

          {/* ══ SIGNATURE SECTION ════════════════════════════════════════════ */}
          <div style={{ borderTop: '2px solid #000000' }}>
            <div style={{ ...S.sectionHeader, borderBottom: '1px solid #000000' }}>
              VI. Certification &amp; Signatures
            </div>
            <div style={{ padding: '6px 12px 4px', fontSize: '9px', color: '#374151', borderBottom: '1px solid #CBD5E1' }}>
              I hereby certify that the information provided is true and correct. I understand that the requirements listed above
              must be completed and submitted to the Business Permits &amp; Licensing Office of the Municipality of Roxas.
            </div>
            <div style={S.sigSection}>
              <div style={S.sigCell}>
                <div style={S.sigLabel}>Applicant / Owner Signature</div>
                <div style={S.sigLine} />
                <div style={S.sigSub}>Printed Name &amp; Signature over Printed Name</div>
                <div style={{ ...S.sigLabel, marginTop: '10px' }}>Date</div>
                <div style={{ borderBottom: '1px solid #000000', marginTop: '18px', marginBottom: '3px' }} />
              </div>
              <div style={S.sigCell}>
                <div style={S.sigLabel}>Verified By (BPLO Officer)</div>
                <div style={S.sigLine} />
                <div style={S.sigSub}>Name &amp; Designation</div>
                <div style={{ ...S.sigLabel, marginTop: '10px' }}>Date Verified</div>
                <div style={{ borderBottom: '1px solid #000000', marginTop: '18px', marginBottom: '3px' }} />
              </div>
              <div style={S.sigCellLast}>
                <div style={S.sigLabel}>Received By (Records Section)</div>
                <div style={S.sigLine} />
                <div style={S.sigSub}>Name &amp; Designation</div>
                <div style={{ ...S.sigLabel, marginTop: '10px' }}>Date Received</div>
                <div style={{ borderBottom: '1px solid #000000', marginTop: '18px', marginBottom: '3px' }} />
              </div>
            </div>
          </div>

          {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
          <div style={S.footer}>
            <span>
              PermitEase AI — Checklist generated on {today} · Municipality of Roxas, Oriental Mindoro
            </span>
            <span style={{ opacity: 0.7, fontSize: '7.5px' }}>
              THIS DOCUMENT IS COMPUTER-GENERATED AND IS VALID WITHOUT SIGNATURE FOR REFERENCE PURPOSES ONLY.
              PRESENT THIS CHECKLIST TO THE BPLO FOR OFFICIAL PROCESSING.
            </span>
          </div>

        </div>
      </div>
    </>
  );
};

export default AssessmentChecklistPrint;
