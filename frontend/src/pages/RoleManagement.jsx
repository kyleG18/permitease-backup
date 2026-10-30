import React from 'react';
import { Shield, Users, Building2 } from 'lucide-react';

const RoleManagement = () => {
  return (
    <div className="animate-fade-in" style={{ fontFamily: 'Inter, sans-serif', paddingBottom: '2rem' }}>
      <div className="mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
          <div style={{ padding: '0.45rem', backgroundColor: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#15803D" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ACCESS CONTROL</span>
        </div>
        <h2 className="m-0" style={{ fontWeight: 800, color: '#0F172A', fontSize: '1.65rem' }}>Role Matrix & Permissions</h2>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Overview of the system's Role-Based Access Control (RBAC) levels.</p>
      </div>

      <div className="role-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        
        {/* System Admin */}
        <div className="card" style={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderTop: '3px solid #DC2626' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '10px' }}>
                <Shield size={24} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>System Administrator</h3>
                <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626', marginTop: '0.25rem', fontWeight: 700 }}>system_admin</span>
              </div>
            </div>
          </div>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)' }}>
            <li>Full access to all system modules.</li>
            <li>Manage user accounts (activate/deactivate).</li>
            <li>Assign and revoke roles.</li>
            <li>View detailed system audit logs.</li>
            <li>Manage knowledge base and requirements.</li>
          </ul>
        </div>

        {/* LGU Admin */}
        <div className="card" style={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderTop: '3px solid #15803D' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: '10px' }}>
                <Users size={24} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>LGU Administrator</h3>
                <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', marginTop: '0.25rem', fontWeight: 700 }}>lgu_admin</span>
              </div>
            </div>
          </div>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)' }}>
            <li>View all registered businesses.</li>
            <li>Review and process permit applications.</li>
            <li>Manage permit requirements and knowledge base.</li>
            <li>View system reports and compliance analytics.</li>
            <li>Cannot manage users or view audit logs.</li>
          </ul>
        </div>

        {/* Business Owner */}
        <div className="card" style={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderTop: '3px solid #0284C7' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#E0F2FE', color: '#0284C7', borderRadius: '10px' }}>
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>Business Owner</h3>
                <span className="badge" style={{ background: '#E0F2FE', color: '#0284C7', marginTop: '0.25rem', fontWeight: 700 }}>business_owner</span>
              </div>
            </div>
          </div>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)' }}>
            <li>Manage own business profiles.</li>
            <li>Apply for and track permits.</li>
            <li>Upload required compliance documents.</li>
            <li>Use the AI Assessment and Assistant tools.</li>
            <li>Receive notifications regarding renewals.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default RoleManagement;
