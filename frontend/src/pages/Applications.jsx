import { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FileText, Plus, Search, Filter, Download, ChevronRight } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',              color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  PREPARED:         { label: 'Prepared',           color: '#1E40AF', bg: '#DBEAFE', dot: '#3B82F6' },
  SUBMITTED:        { label: 'Submitted to BPLO',  color: '#1E3A8A', bg: '#EFF6FF', dot: '#2563EB' },
  UNDER_REVIEW:     { label: 'Under Review',       color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  NEEDS_CORRECTION: { label: 'For Compliance',     color: '#9A3412', bg: '#FFEDD5', dot: '#EA580C' },
  APPROVED:         { label: 'Approved',           color: '#166534', bg: '#DCFCE7', dot: '#22C55E' },
  REJECTED:         { label: 'Rejected',           color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
  CANCELLED:        { label: 'Cancelled',          color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  COMPLETED:        { label: 'Completed',          color: '#14532D', bg: '#F0FDF4', dot: '#16A34A' }
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
      padding: '0.25rem 0.6rem', borderRadius: '4px', 
      fontSize: '0.75rem', fontWeight: '600', 
      color: cfg.color, backgroundColor: cfg.bg,
      border: `1px solid ${cfg.bg}` 
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.dot }}></span>
      {cfg.label}
    </span>
  );
};

export default function Applications() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/applications`, { headers })
      .then(r => r.json())
      .then(data => { setApplications(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Unable to load applications.'); setLoading(false); });
  }, []);

  // Compute Summary
  const summary = useMemo(() => {
    const counts = { ALL: applications.length, DRAFT: 0, SUBMITTED: 0, COMPLETED: 0 };
    applications.forEach(app => {
      if (app.status === 'DRAFT') counts.DRAFT++;
      else if (['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION'].includes(app.status)) counts.SUBMITTED++;
      else if (['COMPLETED', 'APPROVED'].includes(app.status)) counts.COMPLETED++;
    });
    return counts;
  }, [applications]);

  // Derived existing statuses for the filter dropdown
  const existingStatuses = useMemo(() => {
    const statuses = new Set(applications.map(a => a.status));
    return Array.from(statuses);
  }, [applications]);

  // Filter applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = 
        (app.application_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.business_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.application_type === 'NEW' ? 'new business permit' : 'renewal').includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 0.25rem', color: 'var(--government-navy)' }}>
            My Applications
          </h1>
          <p style={{ color: '#64748B', fontSize: '15px', margin: 0 }}>
            Track and manage your business permit application records and their current status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href="/forms/Roxas_Business_Permit_Application_Form.pdf" target="_blank" rel="noopener noreferrer" 
             style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', color: 'var(--government-navy)', border: '1px solid #CBD5E1', padding: '0.625rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '500', fontSize: '14px', transition: 'background 0.15s' }}>
            <Download size={16} /> Download Application Form
          </a>
          <Link to="/readiness" 
             style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-green)', color: 'white', border: '1px solid var(--primary-green)', padding: '0.625rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '500', fontSize: '14px', transition: 'background 0.15s' }}>
            <Plus size={16} /> Prepare Application
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>Loading application records...</div>
      ) : error ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#DC2626' }}>{error}</div>
      ) : applications.length === 0 ? (
        
        /* EMPTY STATE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '3rem 2rem', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#F1F5F9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <FileText size={24} color="#64748B" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--government-navy)', margin: '0 0 0.5rem' }}>No application records yet</h3>
            <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '420px', margin: '0 0 1.5rem', lineHeight: '1.5' }}>
              You haven't created or recorded a business permit application in PermitEase. Prepare your requirements first, then download your application form and submit the required physical documents to the BPLO office.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to="/readiness" style={{ padding: '0.625rem 1.25rem', backgroundColor: 'var(--primary-green)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '500', fontSize: '14px' }}>
                Prepare an Application
              </Link>
              <a href="/forms/Roxas_Business_Permit_Application_Form.pdf" target="_blank" rel="noopener noreferrer" style={{ padding: '0.625rem 1.25rem', backgroundColor: 'white', color: 'var(--government-navy)', border: '1px solid #CBD5E1', borderRadius: '6px', textDecoration: 'none', fontWeight: '500', fontSize: '14px' }}>
                Download Form
              </a>
            </div>
          </div>
          
          {/* Informational Stepper */}
          <div style={{ padding: '2rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', margin: '0 0 1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How the process works</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)', marginBottom: '0.5rem' }}>1 <span style={{ color: 'var(--government-navy)', fontSize: '15px', marginLeft: '0.25rem' }}>Prepare</span></div>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>Check your requirements and documents in PermitEase.</p>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)', marginBottom: '0.5rem' }}>2 <span style={{ color: 'var(--government-navy)', fontSize: '15px', marginLeft: '0.25rem' }}>Visit BPLO</span></div>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>Bring your required physical documents to the BPLO office.</p>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)', marginBottom: '0.5rem' }}>3 <span style={{ color: 'var(--government-navy)', fontSize: '15px', marginLeft: '0.25rem' }}>Official Review</span></div>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>The BPLO evaluates your submitted documents and application.</p>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)', marginBottom: '0.5rem' }}>4 <span style={{ color: 'var(--government-navy)', fontSize: '15px', marginLeft: '0.25rem' }}>Track</span></div>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>Use PermitEase to keep track of your application status.</p>
              </div>
            </div>
          </div>
        </div>

      ) : (

        /* LIST VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Row */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'ALL APPLICATIONS', count: summary.ALL },
              { label: 'DRAFT', count: summary.DRAFT },
              { label: 'SUBMITTED', count: summary.SUBMITTED },
              { label: 'COMPLETED', count: summary.COMPLETED }
            ].map((stat, i) => (
              <div key={i} style={{ flex: '1', minWidth: '150px', backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
                <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--government-navy)', lineHeight: 1 }}>{stat.count}</span>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1', maxWidth: '320px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search applications..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', fontSize: '14px', border: '1px solid #CBD5E1', borderRadius: '6px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#64748B" />
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.5rem 2rem 0.5rem 0.75rem', fontSize: '14px', border: '1px solid #CBD5E1', borderRadius: '6px', color: 'var(--government-navy)', outline: 'none', backgroundColor: 'white', cursor: 'pointer' }}
              >
                <option value="ALL">All Statuses</option>
                {existingStatuses.map(status => (
                  <option key={status} value={status}>{STATUS_CONFIG[status]?.label || status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  {['Application', 'Business', 'Type', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '1rem 1.25rem', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                      No applications match your search.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '13px', fontFamily: 'monospace', color: 'var(--government-navy)', fontWeight: '500' }}>
                        {app.application_number || <span style={{ color: '#94A3B8' }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '14px', fontWeight: '600', color: 'var(--government-navy)' }}>
                        {app.business_name}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '13px', color: '#64748B' }}>
                        {app.application_type === 'NEW' ? 'New Business Permit' : 'Renewal'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '13px', color: '#64748B' }}>
                        {app.submitted_at 
                          ? new Date(app.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) 
                          : new Date(app.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <StatusBadge status={app.status} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <Link to={`/applications/${app.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '13px', fontWeight: '600', color: 'var(--primary-green)', textDecoration: 'none' }}>
                          View Details <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}
