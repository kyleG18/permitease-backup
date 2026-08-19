import React from 'react';
import { Shield, Users, Building2 } from 'lucide-react';

const RoleManagement = () => {
  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h2 className="m-0" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Role Matrix & Permissions</h2>
        <p className="text-muted">Overview of the system's Role-Based Access Control (RBAC) levels.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* System Admin */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: 'var(--radius-lg)' }}>
                <Shield size={24} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1.125rem' }}>System Administrator</h3>
                <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626', marginTop: '0.25rem' }}>system_admin</span>
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
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#DBEAFE', color: '#2563EB', borderRadius: 'var(--radius-lg)' }}>
                <Users size={24} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1.125rem' }}>LGU Administrator</h3>
                <span className="badge" style={{ background: '#DBEAFE', color: '#2563EB', marginTop: '0.25rem' }}>lgu_admin</span>
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
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--light-green)', color: 'var(--primary-green)', borderRadius: 'var(--radius-lg)' }}>
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1.125rem' }}>Business Owner</h3>
                <span className="badge badge-approved" style={{ marginTop: '0.25rem' }}>business_owner</span>
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
