import React from 'react';
import { Shield, Users, Building2, Check, X as XIcon } from 'lucide-react';

const RoleManagement = () => {
  const permissionsMatrix = [
    { capability: 'Manage Business Profiles & Operational Details', msme: true, bplo: false, sysadmin: true },
    { capability: 'AI Permit Readiness Assessment & Checklist Tracking', msme: true, bplo: true, sysadmin: true },
    { capability: 'Tax (BIR) & Municipal Fee Estimation Calculators', msme: true, bplo: false, sysadmin: true },
    { capability: 'Prepare Unified Application Form (Form BPLO-01)', msme: true, bplo: false, sysadmin: true },
    { capability: 'Upload & Manage Clearance Attachments', msme: true, bplo: false, sysadmin: true },
    { capability: 'Request Window 1 Walk-in Appointments', msme: true, bplo: false, sysadmin: true },
    { capability: 'Review & Verify Pre-Assessment Submissions (BPLO-01)', msme: false, bplo: true, sysadmin: true },
    { capability: 'Manage Window 1 Walk-in Roster & Office Closures', msme: false, bplo: true, sysadmin: true },
    { capability: 'Configure Municipal Requirements Masterlist & Ordinances', msme: false, bplo: true, sysadmin: true },
    { capability: 'Manage AI Knowledge Base Reference Documents', msme: false, bplo: true, sysadmin: true },
    { capability: 'Access Municipal Compliance Reports & Analytics', msme: false, bplo: true, sysadmin: true },
    { capability: 'Manage User Accounts, Role Assignments & Account Status', msme: false, bplo: false, sysadmin: true },
    { capability: 'Inspect Immutable System Security & Activity Audit Logs', msme: false, bplo: false, sysadmin: true },
  ];

  const renderAccessCell = (allowed) => (
    allowed ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '5px', backgroundColor: '#DCFCE7', color: '#166534', fontSize: '11.5px', fontWeight: 700 }}>
        <Check size={13} strokeWidth={2.5} /> Authorized
      </span>
    ) : (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '5px', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '11.5px', fontWeight: 600 }}>
        <XIcon size={12} /> Restricted
      </span>
    )
  );

  return (
    <div className="animate-fade-in page-container" style={{ fontFamily: 'Inter, sans-serif', paddingBottom: '2rem' }}>
      <div className="municipal-page-header">
        <div>
          <div className="municipal-page-kicker">Municipality of Roxas · Security & Governance</div>
          <h1 className="municipal-page-title">Role Matrix & Access Control (RBAC)</h1>
          <p className="municipal-page-subtitle">Official Role-Based Access Control policy governing MSME applicants, BPLO personnel, and System Administrators.</p>
        </div>
      </div>

      <div className="role-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* System Admin */}
        <div className="card" style={{ borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)', borderTop: '3px solid #0F172A' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ padding: '0.65rem', backgroundColor: '#F1F5F9', color: '#0F172A', borderRadius: '8px' }}>
                <Shield size={20} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>System Administrator</h3>
                <span className="badge" style={{ background: '#0F172A', color: '#FFFFFF', marginTop: '0.2rem', fontWeight: 700 }}>system_admin</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.55 }}>
            Full administrative oversight of user accounts, role assignments, system configuration, and municipal security audit trails.
          </p>
        </div>

        {/* LGU Admin */}
        <div className="card" style={{ borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)', borderTop: '3px solid #15803D' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ padding: '0.65rem', backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: '8px' }}>
                <Users size={20} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>BPLO / LGU Personnel</h3>
                <span className="badge" style={{ background: '#DCFCE7', color: '#166534', marginTop: '0.2rem', fontWeight: 700 }}>lgu_admin</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.55 }}>
            Evaluates Form BPLO-01 pre-assessment submissions, verifies document readiness, manages Window 1 walk-in schedules, and maintains municipal requirements.
          </p>
        </div>

        {/* Business Owner */}
        <div className="card" style={{ borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)', borderTop: '3px solid #1D4ED8' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ padding: '0.65rem', backgroundColor: '#DBEAFE', color: '#1E40AF', borderRadius: '8px' }}>
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>MSME / Business Owner</h3>
                <span className="badge" style={{ background: '#DBEAFE', color: '#1E40AF', marginTop: '0.2rem', fontWeight: 700 }}>business_owner</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.55 }}>
            Registers business profiles, runs AI permit assessments, estimates taxes and regulatory fees, prepares Form BPLO-01, and books Window 1 visits.
          </p>
        </div>

      </div>

      {/* Structured RBAC Matrix Table */}
      <div className="municipal-table-card">
        <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Shield size={16} color="#15803D" /> Module & Capability Authorization Matrix
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
            Enforced via JWT & Role Middleware
          </span>
        </div>
        <div className="table-responsive">
          <table className="municipal-table">
            <thead>
              <tr>
                <th>System Capability / Module</th>
                <th style={{ textAlign: 'center' }}>MSME Owner (`business_owner`)</th>
                <th style={{ textAlign: 'center' }}>BPLO Officer (`lgu_admin`)</th>
                <th style={{ textAlign: 'center' }}>System Admin (`system_admin`)</th>
              </tr>
            </thead>
            <tbody>
              {permissionsMatrix.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.capability}</td>
                  <td style={{ textAlign: 'center' }}>{renderAccessCell(row.msme)}</td>
                  <td style={{ textAlign: 'center' }}>{renderAccessCell(row.bplo)}</td>
                  <td style={{ textAlign: 'center' }}>{renderAccessCell(row.sysadmin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
