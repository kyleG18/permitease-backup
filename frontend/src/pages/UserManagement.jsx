import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  Mail, 
  User, 
  Lock, 
  Phone,
  X,
  RefreshCw
} from 'lucide-react';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'lgu_admin',
    contact_number: ''
  });
  const [createError, setCreateError] = useState('');

  const config = useMemo(() => ({
    headers: { Authorization: `Bearer ${user.token}` }
  }), [user.token]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/users`, config);
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.full_name || !createForm.email || !createForm.password || !createForm.role) {
      setCreateError('Please complete all required fields.');
      return;
    }

    if (createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }

    try {
      setCreating(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/users`,
        createForm,
        config
      );
      setSuccessMsg(res.data?.message || 'User registered successfully!');
      setShowCreateModal(false);
      setCreateForm({
        full_name: '',
        email: '',
        password: '',
        role: 'lgu_admin',
        contact_number: ''
      });
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (id, newRole) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/users/${id}/role`, { role: newRole }, config);
      setSuccessMsg(`Role updated to ${newRole}`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/users/${id}/status`, { status: newStatus }, config);
      setSuccessMsg(`Account status changed to ${newStatus}`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.contact_number && u.contact_number.includes(searchQuery));
    
    if (!matchesSearch) return false;
    if (roleFilter === 'ALL') return true;
    return u.role === roleFilter;
  });

  // Statistics
  const stats = {
    total: users.length,
    bplo: users.filter(u => u.role === 'lgu_admin').length,
    msme: users.filter(u => u.role === 'business_owner').length,
    admin: users.filter(u => u.role === 'system_admin').length,
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 um-header-row" style={{ gap: '1rem' }}>
        <div>
          <h2 className="m-0" style={{ fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={28} color="var(--primary-green, #16A34A)" />
            User Management
          </h2>
          <p className="text-muted m-0 mt-1" style={{ fontSize: '0.9rem' }}>
            Manage municipality staff, BPLO processing officers, and registered business owners.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline"
            onClick={fetchUsers}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            title="Refresh list"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { setShowCreateModal(true); setCreateError(''); }}
            style={{ 
              backgroundColor: 'var(--primary-green, #16A34A)', 
              borderColor: 'var(--primary-green, #16A34A)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              padding: '0.55rem 1.1rem'
            }}
          >
            <UserPlus size={18} /> Register Staff / User
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: '#ECFDF5', 
          color: '#065F46', 
          border: '1px solid #A7F3D0', 
          borderRadius: '8px', 
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: '#FEF2F2', 
          color: '#991B1B', 
          border: '1px solid #FECACA', 
          borderRadius: '8px', 
          marginBottom: '1.25rem',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="um-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #16A34A' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Users</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-dark)', marginTop: '0.2rem' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #0284C7' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>BPLO Personnel</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0369A1', marginTop: '0.2rem' }}>{stats.bplo}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LGU Processing Officers</span>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #10B981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Business Owners</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#047857', marginTop: '0.2rem' }}>{stats.msme}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered MSMEs</span>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #7C3AED' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>System Admins</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#6D28D9', marginTop: '0.2rem' }}>{stats.admin}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-4 um-toolbar" style={{ padding: '1rem' }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center" style={{ gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input 
              type="text"
              className="form-control"
              placeholder="Search by name, email, or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Role Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Users' },
              { id: 'lgu_admin', label: 'BPLO Staff' },
              { id: 'business_owner', label: 'Business Owners' },
              { id: 'system_admin', label: 'System Admins' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className="btn"
                style={{
                  fontSize: '0.825rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: roleFilter === tab.id ? 600 : 500,
                  backgroundColor: roleFilter === tab.id ? 'var(--primary-green, #16A34A)' : '#F1F5F9',
                  color: roleFilter === tab.id ? '#FFFFFF' : '#475569',
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

      {/* Users Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>User Details</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role / Permission</th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account Status</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Registered</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-5 text-muted">
                    <RefreshCw className="animate-spin" size={24} style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                    <div>Loading users...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-5 text-muted">
                    <Users size={36} color="#CBD5E1" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 600, color: '#64748B' }}>No users found matching your search.</div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initials = u.full_name
                    ? u.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'U';
                  const isSelf = u.id === user.id;

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: u.role === 'system_admin' ? '#EDE9FE' : u.role === 'lgu_admin' ? '#E0F2FE' : '#DCFCE7',
                            color: u.role === 'system_admin' ? '#6D28D9' : u.role === 'lgu_admin' ? '#0369A1' : '#15803D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.925rem' }}>
                              {u.full_name} {isSelf && <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600 }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1px' }}>
                              <Mail size={12} /> {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: u.contact_number ? 'var(--text-dark)' : 'var(--text-muted)' }}>
                          {u.contact_number || 'None provided'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <select 
                            className="form-control" 
                            style={{ 
                              width: '160px', 
                              fontSize: '0.825rem', 
                              padding: '0.35rem 0.6rem',
                              fontWeight: 500,
                              borderRadius: '6px'
                            }}
                            value={u.role}
                            onChange={(e) => updateRole(u.id, e.target.value)}
                            disabled={isSelf}
                          >
                            <option value="business_owner">Business Owner (MSME)</option>
                            <option value="lgu_admin">BPLO Officer (LGU Admin)</option>
                            <option value="system_admin">System Administrator</option>
                          </select>
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <select 
                          className="form-control" 
                          style={{ 
                            width: '110px', 
                            fontSize: '0.825rem', 
                            padding: '0.35rem 0.6rem', 
                            fontWeight: 600,
                            color: u.status === 'active' ? '#15803D' : '#B91C1C',
                            backgroundColor: u.status === 'active' ? '#F0FDF4' : '#FEF2F2',
                            borderColor: u.status === 'active' ? '#BBF7D0' : '#FECACA',
                            borderRadius: '6px'
                          }}
                          value={u.status}
                          onChange={(e) => updateStatus(u.id, e.target.value)}
                          disabled={isSelf}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.825rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE USER MODAL (for BPLO Personnel / Admin) ── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1rem'
        }}>
          <div className="card animate-fade-in" style={{
            maxWidth: '520px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            padding: 0
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-dark)', fontSize: '1.15rem' }}>
                  Register New Staff or User
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Create official accounts for BPLO officers, LGU staff, or administrators.
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '0.25rem' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateUser} style={{ padding: '1.5rem' }}>
              {createError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  color: '#991B1B',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  {createError}
                </div>
              )}

              {/* Notice Banner */}
              <div style={{
                padding: '0.75rem 0.9rem',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                color: '#1E40AF',
                fontSize: '0.825rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>BPLO Personnel Provisioning:</strong> Public registration is restricted to business owners. BPLO personnel and LGU staff accounts must be created here by the System Administrator.
                </div>
              </div>

              {/* Full Name */}
              <div className="mb-3">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="e.g. Maria Santos"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="mb-3">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                  Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input 
                    type="email"
                    className="form-control"
                    placeholder="e.g. maria.santos@roxas.gov.ph"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="mb-3">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                  Account Role *
                </label>
                <select 
                  className="form-control"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  style={{ fontWeight: 600 }}
                  required
                >
                  <option value="lgu_admin">BPLO Personnel / LGU Admin (Default)</option>
                  <option value="system_admin">System Administrator (Full access)</option>
                  <option value="business_owner">Business Owner (MSME)</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                  {createForm.role === 'lgu_admin' && 'Can review permit applications, verify documents, and issue approvals.'}
                  {createForm.role === 'system_admin' && 'Full administrative access including user management, audit logs, and settings.'}
                  {createForm.role === 'business_owner' && 'Can register businesses, submit applications, and monitor permits.'}
                </p>
              </div>

              {/* Temporary / Initial Password */}
              <div className="mb-3">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                  Initial Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Minimum 6 characters (e.g. RoxasBPLO@2026)"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>The staff member will use this password to sign in for the first time.</span>
              </div>

              {/* Contact Number */}
              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                  Contact Number (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="e.g. 09171234567"
                    value={createForm.contact_number}
                    onChange={(e) => setCreateForm({ ...createForm, contact_number: e.target.value })}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ backgroundColor: 'var(--primary-green, #16A34A)', borderColor: 'var(--primary-green, #16A34A)', fontWeight: 600 }}
                  disabled={creating}
                >
                  {creating ? 'Registering...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
