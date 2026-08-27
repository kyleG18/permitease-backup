import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Building2, Plus, Edit, Trash2, X, Users, MapPin, Calendar } from 'lucide-react';

const BusinessProfile = () => {
  const { user } = useContext(AuthContext);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    business_name: '', business_type: '', industry_category: '',
    address: '', employees: '', business_status: 'New Application', date_established: '',
    capitalization: '', gross_sales: '', floor_area: ''
  });

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  const fetchBusinesses = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, config);
      setBusinesses(data);
    } catch (err) {
      setError('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBusinesses(); }, []);

  const openAddModal = () => {
    setEditingBusiness(null);
    setFormData({ business_name: '', business_type: '', industry_category: '', address: '', employees: '', business_status: 'New Application', date_established: '', capitalization: '', gross_sales: '', floor_area: '' });
    setShowModal(true);
  };

  const openEditModal = (biz) => {
    setEditingBusiness(biz);
    setFormData({
      business_name: biz.business_name, business_type: biz.business_type,
      industry_category: biz.industry_category, address: biz.address,
      employees: biz.employees, business_status: biz.business_status,
      date_established: biz.date_established ? biz.date_established.split('T')[0] : '',
      capitalization: biz.capitalization || '', gross_sales: biz.gross_sales || '', floor_area: biz.floor_area || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBusiness) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses/${editingBusiness.id}`, formData, config);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, formData, config);
      }
      setShowModal(false);
      fetchBusinesses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save business');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this business?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses/${id}`, config);
      fetchBusinesses();
    } catch (err) {
      setError('Failed to delete business');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>Business Profiles</h1>
          <p className="text-muted">Manage your registered business information.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add Business
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'var(--status-expired-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {loading ? (
        <div className="text-muted text-center" style={{ padding: '4rem' }}>Loading...</div>
      ) : businesses.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          <Building2 size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3 className="text-muted">No Businesses Yet</h3>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Add your first business to get started.</p>
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={18} /> Add Business</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {businesses.map(biz => (
            <div key={biz.id} className="card" style={{ borderLeft: '4px solid var(--primary-green)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '44px', height: '44px', background: 'var(--light-green)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={22} style={{ color: 'var(--primary-green)' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{biz.business_name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{biz.business_type}</span>
                  </div>
                </div>
                <span className={`badge ${biz.business_status === 'Renewal' ? 'badge-approved' : 'badge-pending'}`}>{biz.business_status}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} /><span>{biz.address}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <Users size={14} /><span>{biz.employees} Employees</span>
                </div>
                {biz.date_established && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <Calendar size={14} /><span>Est. {new Date(biz.date_established).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }} onClick={() => openEditModal(biz)}>
                  <Edit size={16} /> Edit
                </button>
                <button className="btn" style={{ flex: 1, padding: '0.5rem', background: 'var(--status-expired-bg)', color: 'var(--danger)', border: 'none' }} onClick={() => handleDelete(biz.id)}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{editingBusiness ? 'Edit Business' : 'Add Business'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input className="form-control" placeholder=" " value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} required />
                <label className="form-label">Business Name *</label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <select className="form-control" style={{ paddingTop: '0.75rem' }} value={formData.business_type} onChange={e => setFormData({...formData, business_type: e.target.value})} required>
                    <option value="">Select Type</option>
                    <option>Food</option><option>Retail</option><option>Services</option>
                    <option>Manufacturing</option><option>Agriculture</option><option>Others</option>
                  </select>
                  <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>Business Type *</label>
                </div>
                <div className="form-group">
                  <input className="form-control" placeholder=" " value={formData.industry_category} onChange={e => setFormData({...formData, industry_category: e.target.value})} required />
                  <label className="form-label">Industry Category *</label>
                </div>
              </div>
              <div className="form-group">
                <input className="form-control" placeholder=" " value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
                <label className="form-label">Business Address *</label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <input className="form-control" type="number" placeholder=" " value={formData.employees} onChange={e => setFormData({...formData, employees: e.target.value})} />
                  <label className="form-label">No. of Employees</label>
                </div>
                <div className="form-group">
                  <select className="form-control" style={{ paddingTop: '0.75rem' }} value={formData.business_status} onChange={e => setFormData({...formData, business_status: e.target.value})}>
                    <option>New Application</option><option>Renewal</option>
                  </select>
                  <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>Status</label>
                </div>
              </div>
              <div className="form-group">
                <input className="form-control" type="date" placeholder=" " value={formData.date_established} onChange={e => setFormData({...formData, date_established: e.target.value})} />
                <label className="form-label">Date Established</label>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: '600' }}>
                  💰 Financial Info <span style={{ fontWeight: '400' }}>(used for fee estimation)</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <input className="form-control" type="number" step="0.01" placeholder=" " value={formData.capitalization} onChange={e => setFormData({...formData, capitalization: e.target.value})} />
                    <label className="form-label">Capitalization (₱)</label>
                  </div>
                  <div className="form-group">
                    <input className="form-control" type="number" step="0.01" placeholder=" " value={formData.gross_sales} onChange={e => setFormData({...formData, gross_sales: e.target.value})} />
                    <label className="form-label">Gross Sales (₱)</label>
                  </div>
                  <div className="form-group">
                    <input className="form-control" type="number" step="0.01" placeholder=" " value={formData.floor_area} onChange={e => setFormData({...formData, floor_area: e.target.value})} />
                    <label className="form-label">Floor Area (sqm)</label>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingBusiness ? 'Save Changes' : 'Add Business'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessProfile;
