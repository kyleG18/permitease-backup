import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FileText, Plus, Edit, Trash2, X, Search } from 'lucide-react';

const Requirements = () => {
  const { user } = useContext(AuthContext);
  const [requirements, setRequirements] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ permit_name: '', description: '', applicable_business_type: '', renewal_period: 'Annual', required_documents: '' });

  const config = { headers: { Authorization: `Bearer ${user.token}` } };
  const isAdmin = user.role === 'lgu_admin' || user.role === 'system_admin';

  const fetchRequirements = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/requirements`);
      setRequirements(data);
      setFiltered(data);
    } catch (err) { setError('Failed to load requirements'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequirements(); }, []);

  useEffect(() => {
    setFiltered(requirements.filter(r =>
      r.permit_name.toLowerCase().includes(search.toLowerCase()) ||
      r.applicable_business_type.toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, requirements]);

  const openAddModal = () => { setEditingReq(null); setFormData({ permit_name: '', description: '', applicable_business_type: '', renewal_period: 'Annual', required_documents: '' }); setShowModal(true); };
  const openEditModal = (req) => { setEditingReq(req); setFormData({ permit_name: req.permit_name, description: req.description, applicable_business_type: req.applicable_business_type, renewal_period: req.renewal_period, required_documents: req.required_documents }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReq) { await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/requirements/${editingReq.id}`, formData, config); }
      else { await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/requirements`, formData, config); }
      setShowModal(false); fetchRequirements();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this requirement?')) return;
    try { await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/requirements/${id}`, config); fetchRequirements(); }
    catch (err) { setError('Failed to delete'); }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>Permit Requirements</h1>
          <p className="text-muted">View all permit requirements applicable to businesses.</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openAddModal}><Plus size={18} /> Add Requirement</button>}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search by permit name or business type..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }} />
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'var(--status-expired-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {loading ? <div className="text-muted text-center" style={{ padding: '4rem' }}>Loading...</div> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' }}>Permit Name</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' }}>Applicable To</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' }}>Renewal Period</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' }}>Required Documents</th>
                {isAdmin && <th style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid var(--border-light)' }} onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', background: 'var(--light-green)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={18} style={{ color: 'var(--primary-green)' }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: '600', margin: 0 }}>{req.permit_name}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{req.description?.substring(0, 60)}...</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{req.applicable_business_type}</td>
                  <td style={{ padding: '1rem 1.5rem' }}><span className="badge badge-approved">{req.renewal_period}</span></td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px' }}>{req.required_documents?.substring(0, 80)}</td>
                  {isAdmin && (
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openEditModal(req)}><Edit size={14} /></button>
                        <button className="btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'var(--status-expired-bg)', color: 'var(--danger)', border: 'none' }} onClick={() => handleDelete(req.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No requirements found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{editingReq ? 'Edit Requirement' : 'Add Requirement'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input className="form-control" placeholder=" " value={formData.permit_name} onChange={e => setFormData({...formData, permit_name: e.target.value})} required />
                <label className="form-label">Permit Name *</label>
              </div>
              <div className="form-group">
                <textarea className="form-control" placeholder=" " rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ resize: 'vertical' }} />
                <label className="form-label">Description</label>
              </div>
              <div className="form-group">
                <input className="form-control" placeholder=" " value={formData.applicable_business_type} onChange={e => setFormData({...formData, applicable_business_type: e.target.value})} required />
                <label className="form-label">Applicable Business Type *</label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <select className="form-control" style={{ paddingTop: '0.75rem' }} value={formData.renewal_period} onChange={e => setFormData({...formData, renewal_period: e.target.value})}>
                    <option>Annual</option><option>Semi-Annual</option><option>Quarterly</option><option>One-time</option>
                  </select>
                  <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>Renewal Period</label>
                </div>
              </div>
              <div className="form-group">
                <textarea className="form-control" placeholder=" " rows="3" value={formData.required_documents} onChange={e => setFormData({...formData, required_documents: e.target.value})} style={{ resize: 'vertical' }} />
                <label className="form-label">Required Documents</label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requirements;
