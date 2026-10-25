import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  FileText, 
  Clock, 
  User, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Shield, 
  Activity, 
  Globe, 
  Filter,
  CheckCircle2
} from 'lucide-react';

const AuditLogs = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const config = useMemo(() => ({
    headers: { Authorization: `Bearer ${user.token}` }
  }), [user.token]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/audit-logs`, config);
      setLogs(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      (log.user_name && log.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ip_address && log.ip_address.includes(searchQuery));

    if (!matchesSearch) return false;

    if (actionFilter === 'ALL') return true;
    if (actionFilter === 'USER' && (log.action.includes('User') || log.action.includes('Role') || log.action.includes('Status') || log.action.includes('Create User'))) return true;
    if (actionFilter === 'PERMIT' && (log.action.includes('Permit') || log.action.includes('Application') || log.action.includes('Approve') || log.action.includes('Reject'))) return true;
    if (actionFilter === 'SYSTEM' && !log.action.includes('User') && !log.action.includes('Permit') && !log.action.includes('Application')) return true;
    return true;
  });

  // Stats
  const today = new Date().toDateString();
  const todayCount = logs.filter(l => new Date(l.created_at).toDateString() === today).length;
  const uniqueUsers = new Set(logs.map(l => l.user_name || l.user_id)).size;

  const getActionBadge = (action = '') => {
    const lower = action.toLowerCase();
    if (lower.includes('create') || lower.includes('approve') || lower.includes('issue')) {
      return <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 600 }}>{action}</span>;
    }
    if (lower.includes('update') || lower.includes('role') || lower.includes('status')) {
      return <span className="badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: 600 }}>{action}</span>;
    }
    if (lower.includes('delete') || lower.includes('reject') || lower.includes('deactivate')) {
      return <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', fontWeight: 600 }}>{action}</span>;
    }
    return <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600 }}>{action}</span>;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 audit-header-row" style={{ gap: '1rem' }}>
        <div>
          <h2 className="m-0" style={{ fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={28} color="var(--primary-green, #16A34A)" />
            System Audit Trail
          </h2>
          <p className="text-muted m-0 mt-1" style={{ fontSize: '0.9rem' }}>
            Immutable security log recording administrative actions, staff approvals, and account modifications.
          </p>
        </div>
        <div>
          <button 
            className="btn btn-outline"
            onClick={fetchLogs}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} /> Refresh Trail
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '8px', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="audit-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #16A34A' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Events</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-dark)', marginTop: '0.2rem' }}>{logs.length}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Security audit records</span>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #0284C7' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Logged Today</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0369A1', marginTop: '0.2rem' }}>{todayCount}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activity in last 24 hrs</span>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #8B5CF6' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Actors</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#6D28D9', marginTop: '0.2rem' }}>{uniqueUsers}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Distinct users logged</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="card mb-4 audit-toolbar" style={{ padding: '1rem' }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center" style={{ gap: '1rem' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input 
              type="text"
              className="form-control"
              placeholder="Filter by action, user, details, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '0.9rem' }}
            />
          </div>

          <div className="audit-filter-tabs" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Events' },
              { id: 'USER', label: 'User & Role Changes' },
              { id: 'PERMIT', label: 'Permits & Applications' },
              { id: 'SYSTEM', label: 'System Operations' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id)}
                className="btn"
                style={{
                  fontSize: '0.825rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: actionFilter === tab.id ? 600 : 500,
                  backgroundColor: actionFilter === tab.id ? 'var(--primary-green, #16A34A)' : '#F1F5F9',
                  color: actionFilter === tab.id ? '#FFFFFF' : '#475569',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Timestamp</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Operator / Role</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Details</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Origin IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-5 text-muted">
                    <RefreshCw className="animate-spin" size={24} style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                    <div>Loading audit logs...</div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-5 text-muted">
                    <FileText size={36} color="#CBD5E1" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 600, color: '#64748B' }}>No audit trail records found.</div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div className="d-flex align-items-center" style={{ gap: '0.45rem' }}>
                        <Clock size={14} className="text-muted" />
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-dark)' }}>
                          {new Date(log.created_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <strong style={{ color: 'var(--text-dark)', fontSize: '0.875rem' }}>{log.user_name || 'System / Automated'}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {log.user_role === 'system_admin' ? 'System Administrator' : log.user_role === 'lgu_admin' ? 'BPLO Officer' : log.user_role || 'Automated'}
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      {getActionBadge(log.action)}
                    </td>

                    <td style={{ padding: '1rem', maxWidth: '380px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.45 }}>
                      {log.details}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Globe size={13} color="#94A3B8" />
                        <code>{log.ip_address || '127.0.0.1'}</code>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
