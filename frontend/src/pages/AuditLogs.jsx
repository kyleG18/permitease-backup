import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  FileText, 
  Clock, 
  User, 
  Search, 
  RefreshCw, 
  Shield, 
  Activity, 
  Globe, 
  Filter,
  Calendar,
  Users,
  Building2,
  X,
  RotateCcw
} from 'lucide-react';

const AuditLogs = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL'); // 'ALL' | '1D' | '1W' | '1M' | '1Y'
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'system_admin' | 'lgu_admin' | 'business_owner'

  const config = useMemo(() => ({
    headers: { Authorization: `Bearer ${user.token}` }
  }), [user.token]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (timeFilter !== 'ALL') params.period = timeFilter;
      if (roleFilter !== 'ALL') params.role = roleFilter;
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/audit-logs`,
        { ...config, params }
      );
      setLogs(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [config, timeFilter, roleFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const timeCutoffs = {
      '1D': now - oneDayMs,
      '1W': now - 7 * oneDayMs,
      '1M': now - 30 * oneDayMs,
      '1Y': now - 365 * oneDayMs,
    };
    const cutoff = timeCutoffs[timeFilter] || 0;

    return logs.filter((log) => {
      // 1. Time range filter
      if (cutoff > 0) {
        const logTime = new Date(log.created_at).getTime();
        if (isNaN(logTime) || logTime < cutoff) return false;
      }

      // 2. User role filter
      if (roleFilter !== 'ALL') {
        if (log.user_role !== roleFilter) return false;
      }

      // 3. Action category filter
      if (actionFilter === 'USER') {
        const matchesUser = log.action && (log.action.includes('User') || log.action.includes('Role') || log.action.includes('Status') || log.action.includes('Create User'));
        if (!matchesUser) return false;
      } else if (actionFilter === 'PERMIT') {
        const matchesPermit = log.action && (log.action.includes('Permit') || log.action.includes('Application') || log.action.includes('Approve') || log.action.includes('Reject'));
        if (!matchesPermit) return false;
      } else if (actionFilter === 'SYSTEM') {
        const isNotUserOrPermit = !log.action || (!log.action.includes('User') && !log.action.includes('Permit') && !log.action.includes('Application'));
        if (!isNotUserOrPermit) return false;
      }

      // 4. Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          (log.user_name && log.user_name.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.details && log.details.toLowerCase().includes(q)) ||
          (log.ip_address && log.ip_address.includes(q)) ||
          (log.user_role && log.user_role.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [logs, timeFilter, roleFilter, actionFilter, searchQuery]);

  // Reset all filters
  const handleResetFilters = () => {
    setTimeFilter('ALL');
    setRoleFilter('ALL');
    setActionFilter('ALL');
    setSearchQuery('');
  };

  const isFiltered = timeFilter !== 'ALL' || roleFilter !== 'ALL' || actionFilter !== 'ALL' || searchQuery.trim() !== '';

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

  const getRoleBadge = (role) => {
    switch (role) {
      case 'system_admin':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: '#EDE9FE', color: '#6D28D9' }}>
            <Shield size={11} /> System Admin
          </span>
        );
      case 'lgu_admin':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <Building2 size={11} /> BPLO Officer
          </span>
        );
      case 'business_owner':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
            <User size={11} /> Business Owner
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#F1F5F9', color: '#64748B' }}>
            {role || 'Automated / System'}
          </span>
        );
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2.5rem', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 audit-header-row" style={{ gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.45rem', backgroundColor: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="#15803D" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SECURITY & COMPLIANCE</span>
          </div>
          <h2 className="m-0" style={{ fontWeight: 800, color: '#0F172A', fontSize: '1.65rem' }}>
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
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Trail
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="audit-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #15803D', borderRadius: '12px', border: '1px solid #E2E8F0', borderLeftWidth: '4px', borderLeftColor: '#15803D', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Events</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>{logs.length}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Security audit records</span>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #0284C7', borderRadius: '12px', border: '1px solid #E2E8F0', borderLeftWidth: '4px', borderLeftColor: '#0284C7', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Filtered Results</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0284C7', marginTop: '0.2rem' }}>{filteredLogs.length}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Matching active filters</span>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #F59E0B', borderRadius: '12px', border: '1px solid #E2E8F0', borderLeftWidth: '4px', borderLeftColor: '#F59E0B', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Logged Today</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#D97706', marginTop: '0.2rem' }}>{todayCount}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activity in last 24 hrs</span>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #8B5CF6', borderRadius: '12px', border: '1px solid #E2E8F0', borderLeftWidth: '4px', borderLeftColor: '#8B5CF6', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Actors</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#6D28D9', marginTop: '0.2rem' }}>{uniqueUsers}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Distinct users logged</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card mb-4 audit-toolbar" style={{ padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        
        {/* Search & Reset Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.15rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '460px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input 
              type="text"
              className="form-control"
              placeholder="Search action, user, details, or IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', paddingRight: searchQuery ? '32px' : '12px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '12px',
                fontWeight: 600,
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                padding: '0.45rem 0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <RotateCcw size={13} /> Reset Filters
            </button>
          )}
        </div>

        {/* Filter Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* 1. Time Range Filter: day ago, week ago, month, a year ago */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '95px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={13} color="#15803D" /> Time Range:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Time' },
                { id: '1D', label: 'Day Ago (24h)' },
                { id: '1W', label: 'Week Ago (7d)' },
                { id: '1M', label: 'Month Ago (30d)' },
                { id: '1Y', label: 'A Year Ago' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id)}
                  style={{
                    fontSize: '12px',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: timeFilter === t.id ? 700 : 500,
                    backgroundColor: timeFilter === t.id ? '#15803D' : '#F1F5F9',
                    color: timeFilter === t.id ? '#FFFFFF' : '#475569',
                    border: timeFilter === t.id ? '1px solid #15803D' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. User Role Filter: BPLO, Admin, Business Owner */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '95px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={13} color="#1D4ED8" /> User Role:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Roles' },
                { id: 'lgu_admin', label: 'BPLO Officer' },
                { id: 'system_admin', label: 'System Admin' },
                { id: 'business_owner', label: 'Business Owner' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRoleFilter(r.id)}
                  style={{
                    fontSize: '12px',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: roleFilter === r.id ? 700 : 500,
                    backgroundColor: roleFilter === r.id ? '#1D4ED8' : '#F1F5F9',
                    color: roleFilter === r.id ? '#FFFFFF' : '#475569',
                    border: roleFilter === r.id ? '1px solid #1D4ED8' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Action Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '95px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Filter size={13} color="#D97706" /> Category:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Categories' },
                { id: 'USER', label: 'User & Role Changes' },
                { id: 'PERMIT', label: 'Permits & Applications' },
                { id: 'SYSTEM', label: 'System Operations' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActionFilter(tab.id)}
                  style={{
                    fontSize: '12px',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: actionFilter === tab.id ? 700 : 500,
                    backgroundColor: actionFilter === tab.id ? '#334155' : '#F1F5F9',
                    color: actionFilter === tab.id ? '#FFFFFF' : '#475569',
                    border: actionFilter === tab.id ? '1px solid #334155' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Active Filters Summary Footer */}
        <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '12px', color: '#64748B' }}>
          <div>
            Showing <strong style={{ color: '#0F172A' }}>{filteredLogs.length}</strong> of {logs.length} audit records
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {timeFilter !== 'ALL' && (
              <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                Time: {timeFilter === '1D' ? 'Day Ago (24h)' : timeFilter === '1W' ? 'Week Ago (7d)' : timeFilter === '1M' ? 'Month Ago (30d)' : 'Year Ago'}
              </span>
            )}
            {roleFilter !== 'ALL' && (
              <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                Role: {roleFilter === 'lgu_admin' ? 'BPLO Officer' : roleFilter === 'system_admin' ? 'System Admin' : 'Business Owner'}
              </span>
            )}
            {actionFilter !== 'ALL' && (
              <span style={{ backgroundColor: '#F1F5F9', color: '#334155', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                Category: {actionFilter}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #15803D 0%, #166534 100%)', color: '#FFFFFF' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Timestamp</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Operator & Role</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Details</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '11px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Origin IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-5 text-muted">
                    <RefreshCw className="animate-spin" size={24} style={{ display: 'inline-block', marginBottom: '0.5rem', color: '#16A34A' }} />
                    <div style={{ fontWeight: 600 }}>Loading audit records...</div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-5 text-muted">
                    <FileText size={36} color="#CBD5E1" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 700, color: '#475569', fontSize: '15px' }}>No audit trail records found.</div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '13px' }}>Try adjusting your time range, user role, or search filter.</p>
                    {isFiltered && (
                      <button
                        onClick={handleResetFilters}
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: '0.75rem', fontSize: '12px' }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.9rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div className="d-flex align-items-center" style={{ gap: '0.45rem' }}>
                        <Clock size={13} className="text-muted" />
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-dark)', fontWeight: 500 }}>
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

                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.875rem', marginBottom: '2px' }}>
                        {log.user_name || 'System / Automated'}
                      </div>
                      <div>
                        {getRoleBadge(log.user_role)}
                      </div>
                    </td>

                    <td style={{ padding: '0.9rem 1rem' }}>
                      {getActionBadge(log.action)}
                    </td>

                    <td style={{ padding: '0.9rem 1rem', maxWidth: '380px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.45 }}>
                      {log.details}
                    </td>

                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>
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
