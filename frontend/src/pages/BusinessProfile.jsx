import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Building2, Plus, Edit, Trash2, X, Users, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { BUSINESS_TYPES, getCategoriesForType } from '../data/businessCategories';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const BusinessProfile = () => {
  const { user } = useContext(AuthContext);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
    industry_category: '',
    ownership_type: '',
    primary_products: '',
    business_description: '',
    business_status: 'New Application',
    owner_name: '',
    contact_number: '',
    
    island_group_id: '',
    region_id: '',
    province_id: '',
    city_municipality_id: '',
    barangay_id: '',
    address: '',
    premises_type: '',
    date_established: '',
    
    capitalization: '',
    gross_sales: '',
    floor_area: '',
    employees: '',
    business_characteristics: {}
  });

  const [locations, setLocations] = useState({
    islandGroups: [],
    regions: [],
    provinces: [],
    cities: [],
    barangays: []
  });

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  const fetchBusinesses = async () => {
    try {
      const { data } = await axios.get(`${API}/businesses`, config);
      setBusinesses(data);
    } catch (err) {
      setError('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchBusinesses(); 
    fetchIslandGroups();
  }, []);

  const fetchIslandGroups = async () => {
    try {
      const res = await axios.get(`${API}/locations/island-groups`);
      setLocations(prev => ({ ...prev, islandGroups: res.data }));
    } catch (err) {
      console.error('Failed to load island groups');
    }
  };

  const loadLocationCascade = async (biz) => {
    try {
      const newLocs = { ...locations };
      if (biz.island_group_id) {
        const r1 = await axios.get(`${API}/locations/regions?islandGroupId=${biz.island_group_id}`);
        newLocs.regions = r1.data;
      }
      if (biz.region_id) {
        const r2 = await axios.get(`${API}/locations/provinces?regionId=${biz.region_id}`);
        newLocs.provinces = r2.data;
        if (r2.data.length === 0) {
          const r3 = await axios.get(`${API}/locations/cities-municipalities?regionId=${biz.region_id}`);
          newLocs.cities = r3.data;
        }
      }
      if (biz.province_id) {
        const r3 = await axios.get(`${API}/locations/cities-municipalities?provinceId=${biz.province_id}`);
        newLocs.cities = r3.data;
      }
      if (biz.city_municipality_id) {
        const r4 = await axios.get(`${API}/locations/barangays?cityMunicipalityId=${biz.city_municipality_id}`);
        newLocs.barangays = r4.data;
      }
      setLocations(newLocs);
    } catch (err) {
      console.error('Failed to load location cascade for edit', err);
    }
  };

  const openAddModal = () => {
    setEditingBusiness(null);
    setFormData({ 
      business_name: '', business_type: '', industry_category: '', ownership_type: '', primary_products: '', business_description: '',
      owner_name: '', contact_number: '', 
      island_group_id: '', region_id: '', province_id: '', city_municipality_id: '', barangay_id: '', address: '', premises_type: '',
      employees: '', business_status: 'New Application', date_established: '', 
      capitalization: '', gross_sales: '', floor_area: '', business_characteristics: {}
    });
    setLocations(prev => ({ ...prev, regions: [], provinces: [], cities: [], barangays: [] }));
    setShowModal(true);
  };

  const openEditModal = (biz) => {
    setEditingBusiness(biz);
    
    let chars = {};
    if (biz.business_characteristics) {
        try { chars = typeof biz.business_characteristics === 'string' ? JSON.parse(biz.business_characteristics) : biz.business_characteristics; } catch(e){}
    }

    setFormData({
      business_name: biz.business_name || '', business_type: biz.business_type || '', industry_category: biz.industry_category || '', 
      ownership_type: biz.ownership_type || '', primary_products: biz.primary_products || '', business_description: biz.business_description || '',
      owner_name: biz.owner_name || '', contact_number: biz.contact_number || '', 
      island_group_id: biz.island_group_id || '', region_id: biz.region_id || '', province_id: biz.province_id || '', city_municipality_id: biz.city_municipality_id || '', barangay_id: biz.barangay_id || '',
      address: biz.address || '', premises_type: biz.premises_type || '',
      employees: biz.employees || '', business_status: biz.business_status || 'New Application',
      date_established: biz.date_established ? biz.date_established.split('T')[0] : '',
      capitalization: biz.capitalization || '', gross_sales: biz.gross_sales || '', floor_area: biz.floor_area || '',
      business_characteristics: chars
    });
    
    loadLocationCascade(biz);
    setShowModal(true);
  };

  const handleLocationChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    try {
      if (name === 'island_group_id') {
        setFormData(prev => ({ ...prev, region_id: '', province_id: '', city_municipality_id: '', barangay_id: '' }));
        setLocations(prev => ({ ...prev, regions: [], provinces: [], cities: [], barangays: [] }));
        if (value) {
          const res = await axios.get(`${API}/locations/regions?islandGroupId=${value}`);
          setLocations(prev => ({ ...prev, regions: res.data }));
        }
      } 
      else if (name === 'region_id') {
        setFormData(prev => ({ ...prev, province_id: '', city_municipality_id: '', barangay_id: '' }));
        setLocations(prev => ({ ...prev, provinces: [], cities: [], barangays: [] }));
        if (value) {
          const res = await axios.get(`${API}/locations/provinces?regionId=${value}`);
          setLocations(prev => ({ ...prev, provinces: res.data }));
          if (res.data.length === 0) {
            const cityRes = await axios.get(`${API}/locations/cities-municipalities?regionId=${value}`);
            setLocations(prev => ({ ...prev, cities: cityRes.data }));
          }
        }
      } 
      else if (name === 'province_id') {
        setFormData(prev => ({ ...prev, city_municipality_id: '', barangay_id: '' }));
        setLocations(prev => ({ ...prev, cities: [], barangays: [] }));
        if (value) {
          const res = await axios.get(`${API}/locations/cities-municipalities?provinceId=${value}`);
          setLocations(prev => ({ ...prev, cities: res.data }));
        }
      } 
      else if (name === 'city_municipality_id') {
        setFormData(prev => ({ ...prev, barangay_id: '', barangay: '' }));
        setLocations(prev => ({ ...prev, barangays: [] }));
        if (value) {
          const res = await axios.get(`${API}/locations/barangays?cityMunicipalityId=${value}`);
          setLocations(prev => ({ ...prev, barangays: res.data }));
        }
      }
      else if (name === 'barangay_id') {
        const found = locations.barangays.find(b => String(b.id) === String(value));
        setFormData(prev => ({ ...prev, barangay_id: value, barangay: found ? found.name : '' }));
      }
    } catch (err) {
      console.error('Failed to load location data');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBusiness) {
        await axios.put(`${API}/businesses/${editingBusiness.id}`, formData, config);
      } else {
        await axios.post(`${API}/businesses`, formData, config);
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
      await axios.delete(`${API}/businesses/${id}`, config);
      fetchBusinesses();
    } catch (err) {
      setError('Failed to delete business');
    }
  };

  const renderConditionalQuestions = () => {
    const isFood = formData.business_type === 'Food & Beverage' || (formData.industry_category || '').includes('Restaurant');
    const isMfg = formData.business_type === 'Manufacturing & Processing';
    const isService = formData.business_type === 'Services (Personal & Professional)';
    
    if (!isFood && !isMfg && !isService) return null;

    const handleChar = (k, v) => setFormData(p => ({ ...p, business_characteristics: { ...p.business_characteristics, [k]: v }}));

    return (
      <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--light-gray)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-dark)', fontSize: '14px' }}>Operational Characteristics</h4>
        
        {isFood && (
          <>
            <div className="mb-3">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Food prepared on premises?</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label><input type="radio" checked={formData.business_characteristics.food_prep === 'Yes'} onChange={() => handleChar('food_prep', 'Yes')} /> Yes</label>
                <label><input type="radio" checked={formData.business_characteristics.food_prep === 'No'} onChange={() => handleChar('food_prep', 'No')} /> No</label>
              </div>
            </div>
            <div className="mb-3">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Serves alcoholic beverages?</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label><input type="radio" checked={formData.business_characteristics.alcohol === 'Yes'} onChange={() => handleChar('alcohol', 'Yes')} /> Yes</label>
                <label><input type="radio" checked={formData.business_characteristics.alcohol === 'No'} onChange={() => handleChar('alcohol', 'No')} /> No</label>
              </div>
            </div>
          </>
        )}
        {isMfg && (
          <div className="mb-3">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Manufacturing/processing on-site?</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label><input type="radio" checked={formData.business_characteristics.mfg_onsite === 'Yes'} onChange={() => handleChar('mfg_onsite', 'Yes')} /> Yes</label>
              <label><input type="radio" checked={formData.business_characteristics.mfg_onsite === 'No'} onChange={() => handleChar('mfg_onsite', 'No')} /> No</label>
            </div>
          </div>
        )}
        {isService && (
          <div className="mb-3">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Repair/maintenance on-site?</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label><input type="radio" checked={formData.business_characteristics.repair_onsite === 'Yes'} onChange={() => handleChar('repair_onsite', 'Yes')} /> Yes</label>
              <label><input type="radio" checked={formData.business_characteristics.repair_onsite === 'No'} onChange={() => handleChar('repair_onsite', 'No')} /> No</label>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
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

      {/* Modern Top-Label Form Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: 'var(--primary-dark)' }}>{editingBusiness ? 'Edit Business Profile' : 'Add Business'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              
              {/* Business Identity */}
              <h3 style={{ fontSize: '15px', color: 'var(--primary-green)', marginBottom: '1rem' }}>1. Business Identity</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Business Name *</label>
                  <input className="form-control" name="business_name" value={formData.business_name} onChange={handleChange} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Ownership Type *</label>
                  <select className="form-control" name="ownership_type" value={formData.ownership_type} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option>Sole Proprietorship</option><option>Partnership</option>
                    <option>Corporation</option><option>Cooperative</option><option>Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Business Type *</label>
                  <select className="form-control" name="business_type" value={formData.business_type} onChange={handleChange} required>
                    <option value="">Select Type</option>
                    {BUSINESS_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Industry Category *</label>
                  <select className="form-control" name="industry_category" value={formData.industry_category} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    {getCategoriesForType(formData.business_type).map((group, idx) => (
                      <optgroup key={idx} label={group.group}>
                        {group.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Primary Products / Services *</label>
                <input className="form-control" name="primary_products" value={formData.primary_products} onChange={handleChange} placeholder="e.g. Fried chicken, rice meals" required />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Business Description *</label>
                <textarea className="form-control" name="business_description" value={formData.business_description} onChange={handleChange} rows="2" placeholder="Briefly describe operations" required></textarea>
              </div>

              {/* Location */}
              <h3 style={{ fontSize: '15px', color: 'var(--primary-green)', marginBottom: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>2. Business Location</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Island Group *</label>
                  <select className="form-control" name="island_group_id" value={formData.island_group_id} onChange={handleLocationChange} required>
                    <option value="">Select</option>
                    {locations.islandGroups.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Region *</label>
                  <select className="form-control" name="region_id" value={formData.region_id} onChange={handleLocationChange} required disabled={!formData.island_group_id}>
                    <option value="">Select</option>
                    {locations.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Province *</label>
                  <select className="form-control" name="province_id" value={formData.province_id} onChange={handleLocationChange} disabled={!formData.region_id || locations.provinces.length === 0}>
                    <option value="">Select (Skip if NCR)</option>
                    {locations.provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>City / Municipality *</label>
                  <select className="form-control" name="city_municipality_id" value={formData.city_municipality_id} onChange={handleLocationChange} required disabled={!formData.province_id && (!formData.region_id || locations.provinces.length > 0)}>
                    <option value="">Select</option>
                    {locations.cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Barangay *</label>
                  <select className="form-control" name="barangay_id" value={formData.barangay_id} onChange={handleLocationChange} required disabled={!formData.city_municipality_id}>
                    <option value="">Select</option>
                    {locations.barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Complete Address *</label>
                  <input className="form-control" name="address" value={formData.address} onChange={handleChange} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Premises Type *</label>
                  <select className="form-control" name="premises_type" value={formData.premises_type} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option>Commercial Establishment</option><option>Home-Based</option>
                    <option>Residential/Commercial</option><option>Shared/Leased Space</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Date Established</label>
                  <input type="date" className="form-control" name="date_established" value={formData.date_established} onChange={handleChange} />
                </div>
              </div>

              {/* Financials & Operations */}
              <h3 style={{ fontSize: '15px', color: 'var(--primary-green)', marginBottom: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>3. Operations & Financials</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Status *</label>
                  <select className="form-control" name="business_status" value={formData.business_status} onChange={handleChange} required>
                    <option value="New Application">New Application</option>
                    <option value="Renewal">Renewal</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Employees *</label>
                  <input type="number" className="form-control" name="employees" value={formData.employees} onChange={handleChange} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Floor Area (sqm) *</label>
                  <input type="number" className="form-control" name="floor_area" value={formData.floor_area} onChange={handleChange} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Capitalization (?) *</label>
                  <input type="number" step="0.01" className="form-control" name="capitalization" value={formData.capitalization} onChange={handleChange} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Gross Sales (?)</label>
                  <input type="number" step="0.01" className="form-control" name="gross_sales" value={formData.gross_sales} onChange={handleChange} required={formData.business_status === 'Renewal'} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Owner Name *</label>
                  <input className="form-control" name="owner_name" value={formData.owner_name} onChange={handleChange} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Contact Number *</label>
                  <input className="form-control" name="contact_number" value={formData.contact_number} onChange={handleChange} required />
                </div>
              </div>

              {renderConditionalQuestions()}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
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
