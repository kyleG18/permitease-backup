const fs = require('fs');
const path = './frontend/src/pages/LGUApplicationReview.jsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Status config labels
c = c.replace("  APPROVED:         { label: 'Approved',         color: '#16A34A', bg: '#DCFCE7' },",
               "  APPROVED:         { label: 'Verified',             color: '#16A34A', bg: '#DCFCE7' },");
c = c.replace("  REJECTED:         { label: 'Rejected',         color: '#991B1B', bg: '#FEE2E2' },",
               "  REJECTED:         { label: 'Corrections Requested', color: '#991B1B', bg: '#FEE2E2' },");

// 2. Approve modal
c = c.replace(
  `<ConfirmModal title="Approve Application" description={\`Confirm approval of application \${app.application_number} for \${app.business_name}.\`} confirmText="Approve" confirmColor="#16A34A" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={() => doAction('approve')} />`,
  `<ConfirmModal title="Mark as Verified" description={\`Mark preparation submission \${app.application_number} for \${app.business_name} as Verified. This confirms the business owner's preparation appears complete. This does NOT constitute official permit approval or issuance by the BPLO.\`} confirmText="Mark as Verified" confirmColor="#16A34A" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={() => doAction('approve')} />`
);

// 3. Reject modal
c = c.replace(
  `<ConfirmModal title="Reject Application" description="This action cannot be easily undone. Please provide a clear rejection reason for the business owner." inputLabel="Rejection Reason" inputRequired confirmText="Reject Application" confirmColor="#DC2626" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={(reason) => doAction('reject', { rejection_reason: reason })} />`,
  `<ConfirmModal title="Request Preparation Corrections" description="Describe what the business owner needs to correct or re-submit before their preparation can be verified." inputLabel="Correction Notes" inputRequired confirmText="Request Corrections" confirmColor="#DC2626" onCancel={() => setModal(null)} loading={actionLoading} onConfirm={(reason) => doAction('reject', { rejection_reason: reason })} />`
);

// 4. Breadcrumb
c = c.replace(
  `<Link to="/admin/applications" style={{ color: 'var(--primary-green)', textDecoration: 'none' }}>Applications</Link>`,
  `<Link to="/admin/applications" style={{ color: 'var(--primary-green)', textDecoration: 'none' }}>Pre-Assessments</Link>`
);

// 5. "Application" label in header
c = c.replace(
  `<div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Application</div>`,
  `<div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Pre-Assessment Ref.</div>`
);

// 6. Approve button label
c = c.replace(
  `<CheckCircle size={16} /> Approve`,
  `<CheckCircle size={16} /> Mark as Verified`
);

// 7. Reject button label
c = c.replace(
  `<XCircle size={16} /> Reject`,
  `<XCircle size={16} /> Request Corrections`
);

// 8. "View Issued Permit" link -> "View Verification Record"
c = c.replace(
  `<Shield size={16} /> View Issued Permit`,
  `<Shield size={16} /> View Verification Record`
);

// 9. "New Business Permit" -> "New Business Permit Application (Preparation)"
c = c.replace(
  `{app.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'}`,
  `{app.application_type === 'NEW' ? 'New Business Permit Preparation' : 'Renewal Preparation'}`
);

// 10. "Current Status" -> "Preparation Status"
c = c.replace(
  `<div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Current Status</div>`,
  `<div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Preparation Status</div>`
);

// 11. Add disclaimer banner right before the action buttons section (before {canStartReview &&)
const disclaimerBanner = `      {/* PermitEase Scope Disclaimer */}
      <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: '#78350F', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: '700', flexShrink: 0 }}>??</span>
        <span>Verification in PermitEase does not constitute official permit approval or issuance. Final assessment, payment, signatures, and permit processing are handled through the official BPLO process.</span>
      </div>\n`;
c = c.replace(
  `      {/* Action Buttons */}\n      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>`,
  disclaimerBanner + `      {/* Action Buttons */}\n      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>`
);

fs.writeFileSync(path, c);
console.log('Patched LGUApplicationReview.jsx');
