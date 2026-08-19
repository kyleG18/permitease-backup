import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Shield, ShieldAlert, Edit, CheckCircle, XCircle } from 'lucide-react';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', config);
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      setLoading(false);
    }
  };

  const updateRole = async (id, newRole) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/users/${id}/role`, { role: newRole }, config);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/users/${id}/status`, { status: newStatus }, config);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) return <div className="p-4">Loading users...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>User Management</h2>
          <p className="text-muted">Manage system users, roles, and access status.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.full_name}</strong><br/>
                    <small className="text-muted">{u.email}</small>
                  </td>
                  <td>{u.contact_number || 'N/A'}</td>
                  <td>
                    <select 
                      className="form-control" 
                      style={{ width: '150px', fontSize: '0.85rem', padding: '0.25rem' }}
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      disabled={u.id === user.id}
                    >
                      <option value="business_owner">Business Owner</option>
                      <option value="lgu_admin">LGU Admin</option>
                      <option value="system_admin">System Admin</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      className={`form-control ${u.status === 'active' ? 'text-success' : 'text-danger'}`} 
                      style={{ width: '100px', fontSize: '0.85rem', padding: '0.25rem', fontWeight: 600 }}
                      value={u.status}
                      onChange={(e) => updateStatus(u.id, e.target.value)}
                      disabled={u.id === user.id}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={u.id === user.id}>
                      <Edit size={14} style={{ marginRight: '4px' }} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
