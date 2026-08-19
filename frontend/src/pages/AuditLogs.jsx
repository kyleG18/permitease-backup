import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FileText, Clock, User, ShieldAlert } from 'lucide-react';

const AuditLogs = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get('http://localhost:5000/api/admin/audit-logs', config);
        setLogs(res.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch audit logs');
        setLoading(false);
      }
    };
    fetchLogs();
  }, [user.token]);

  if (loading) return <div className="p-4">Loading audit logs...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>System Audit Logs</h2>
          <p className="text-muted">Security trail tracking user actions and administrative changes.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                      <Clock size={14} className="text-muted" />
                      <span style={{ fontSize: '0.85rem' }}>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{log.user_name}</strong>
                    <br/>
                    <small className="text-muted">{log.user_role}</small>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {log.details}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {log.ip_address}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-4 text-muted">No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
