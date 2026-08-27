import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BarChart, Building2, CheckSquare, BrainCircuit, Activity } from 'lucide-react';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/summary`, config);
        setData(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchReports();
  }, [user.token]);

  if (loading) return <div className="p-4">Loading reports...</div>;
  if (!data) return <div className="p-4">Failed to load reports data.</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h2 className="m-0" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Analytics & Reports</h2>
        <p className="text-muted">System-wide statistics on business compliance and permit usage.</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--light-green)', color: 'var(--primary-green)', borderRadius: 'var(--radius-lg)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-muted m-0" style={{ fontSize: '0.875rem' }}>Total Businesses</p>
            <h3 className="m-0" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.overview.total_businesses}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#DBEAFE', color: '#2563EB', borderRadius: 'var(--radius-lg)' }}>
            <CheckSquare size={24} />
          </div>
          <div>
            <p className="text-muted m-0" style={{ fontSize: '0.875rem' }}>Active Permits</p>
            <h3 className="m-0" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.overview.active_permits}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: 'var(--radius-lg)' }}>
            <Activity size={24} />
          </div>
          <div>
            <p className="text-muted m-0" style={{ fontSize: '0.875rem' }}>Expired Permits</p>
            <h3 className="m-0" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.overview.expired_permits}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#F3E8FF', color: '#9333EA', borderRadius: 'var(--radius-lg)' }}>
            <BrainCircuit size={24} />
          </div>
          <div>
            <p className="text-muted m-0" style={{ fontSize: '0.875rem' }}>AI Assessments Run</p>
            <h3 className="m-0" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.overview.total_assessments}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="m-0" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Businesses by Type</h3>
          </div>
          <div className="p-3">
            <table className="table">
              <tbody>
                {data.businesses_by_type.map((b, i) => (
                  <tr key={i}>
                    <td>{b.business_type}</td>
                    <td className="text-right"><strong>{b.count}</strong></td>
                  </tr>
                ))}
                {data.businesses_by_type.length === 0 && <tr><td colSpan="2" className="text-center text-muted">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="m-0" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Permit Status Distribution</h3>
          </div>
          <div className="p-3">
            <table className="table">
              <tbody>
                {data.permits_by_status.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`badge ${p.status === 'Approved' ? 'badge-approved' : p.status === 'Pending' ? 'badge-pending' : 'badge-rejected'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-right"><strong>{p.count}</strong></td>
                  </tr>
                ))}
                {data.permits_by_status.length === 0 && <tr><td colSpan="2" className="text-center text-muted">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
