import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  FileText, Plus, Edit, Trash2, X, Search, Scale, 
  Building2, CheckCircle, AlertTriangle, ShieldCheck, Info 
} from 'lucide-react';

const COMMON_AGENCIES = [
  'All Agencies',
  'Barangay Office',
  'Bureau of Fire Protection (BFP)',
  'Municipal Health Office (MHO)',
  'Municipal Engineering Office (MEO)',
  'Municipal Planning & Development (MPDO)',
  'Municipal Economic Enterprise / ESO',
  'Municipal Treasurer Office (MTO)',
  'BPLO / LGU Roxas'
];

const INITIAL_FORM = {
  permit_name: '',
  description: '',
  applicable_business_type: 'All',
  renewal_period: 'Annual',
  required_documents: '',
  issuing_agency: 'BPLO / LGU Roxas',
  ordinance_reference: 'Municipal Ordinance & RA 7160',
  estimated_fee: '0.00',
  is_mandatory: true,
  condition_field: 'always',
  condition_value: ''
};

const Requirements = () => {
  const { user } = useContext(AuthContext);
  const [requirements, setRequirements] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('All Agencies');
  const [showModal, setShowModal] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);

  const config = { headers: { Authorization: `Bearer ${user.token}` } };
  const isAdmin = user.role === 'lgu_admin' || user.role === 'system_admin';

  const fetchRequirements = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/requirements`, config);
      setRequirements(data);
      setFiltered(data);
    } catch (err) { 
      setError('Failed to load municipal requirements.'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchRequirements(); 
  }, []);

  useEffect(() => {
    let result = requirements;

    if (agencyFilter !== 'All Agencies') {
      result = result.filter(r => (r.issuing_agency || '').toLowerCase().includes(agencyFilter.toLowerCase().split(' ')[0]));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        (r.permit_name || '').toLowerCase().includes(q) ||
        (r.applicable_business_type || '').toLowerCase().includes(q) ||
        (r.issuing_agency || '').toLowerCase().includes(q) ||
        (r.ordinance_reference || '').toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, agencyFilter, requirements]);

  const openAddModal = () => { 
    setEditingReq(null); 
    setFormData(INITIAL_FORM); 
    setError('');
    setShowModal(true); 
  };

  const openEditModal = (req) => { 
    setEditingReq(req); 
    setFormData({
      permit_name: req.permit_name || '',
      description: req.description || '',
      applicable_business_type: req.applicable_business_type || 'All',
      renewal_period: req.renewal_period || 'Annual',
      required_documents: req.required_documents || '',
      issuing_agency: req.issuing_agency || 'BPLO / LGU Roxas',
      ordinance_reference: req.ordinance_reference || 'Municipal Ordinance & RA 7160',
      estimated_fee: req.estimated_fee !== null ? String(req.estimated_fee) : '0.00',
      is_mandatory: req.is_mandatory !== 0,
      condition_field: req.condition_field || 'always',
      condition_value: req.condition_value || ''
    }); 
    setError('');
    setShowModal(true); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...formData,
        estimated_fee: parseFloat(formData.estimated_fee) || 0,
        is_mandatory: Boolean(formData.is_mandatory)
      };

      if (editingReq) { 
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/requirements/${editingReq.id}`, payload, config);
        setSuccessMsg(`Requirement "${formData.permit_name}" updated successfully.`);
      } else { 
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/requirements`, payload, config);
        setSuccessMsg(`New requirement "${formData.permit_name}" configured successfully.`);
      }
      setShowModal(false); 
      fetchRequirements();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) { 
      setError(err.response?.data?.message || 'Failed to save requirement configuration.'); 
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will affect readiness evaluations for MSMEs.`)) return;
    try { 
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/requirements/${id}`, config); 
      setSuccessMsg(`Requirement "${name}" removed.`);
      fetchRequirements(); 
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) { 
      setError('Failed to delete requirement.'); 
    }
  };

  // KPI calculations
  const totalCount = requirements.length;
  const mandatoryCount = requirements.filter(r => r.is_mandatory !== 0).length;
  const conditionalCount = requirements.filter(r => r.is_mandatory === 0).length;
  const distinctAgencies = new Set(requirements.map(r => r.issuing_agency).filter(Boolean)).size;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#15803D', marginBottom: '0.25rem' }}>
            Regulatory Compliance Masterlist
          </div>
          <h1 style={{ color: '#0F172A', margin: 0, fontSize: '28px', fontWeight: '800' }}>
            Permit Requirements & Local Ordinances
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '14px' }}>
            Configure and maintain statutory prerequisites under the <strong>Municipality of Roxas Citizen’s Charter (RA 11032)</strong> and Local Revenue Code.
          </p>
        </div>
        {isAdmin && (
          <button 
            className="btn btn-primary" 
            onClick={openAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '13.5px', backgroundColor: '#15803D', boxShadow: '0 2px 8px rgba(21,128,61,0.25)' }}
          >
            <Plus size={18} /> Configure New Requirement
          </button>
        )}
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderLeft: '4px solid #15803D', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#15803D', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Total Clearances
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#15803D' }}>{totalCount}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.25rem' }}>Monitored in PermitEase Masterlist</div>
        </div>
        
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderLeft: '4px solid #D97706', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Mandatory Prerequisites
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#B45309' }}>{mandatoryCount}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.25rem' }}>Required for permit issuance</div>
        </div>

        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderLeft: '4px solid #1E40AF', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#1E40AF', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Conditional Clearances
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#1E40AF' }}>{conditionalCount}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.25rem' }}>Triggered by industry/status</div>
        </div>

        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderLeft: '4px solid #166534', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Partner Agencies
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#166534' }}>{distinctAgencies}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.25rem' }}>BFP, MHO, MEO, MPDO, Barangay</div>
        </div>
      </div>

      {/* Citizen's Charter Reference Card */}
      <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '0.2rem' }}>
            OFFICIAL LGU CITIZEN’S CHARTER BENCHMARKS (ROXAS, ORIENTAL MINDORO)
          </div>
          <div style={{ fontSize: '13px', color: '#14532D' }}>
            Standard Processing Time: <strong>53 minutes</strong> at BPLO/BOSS | Classification: <strong>Complex (up to 7 days under RA 11032)</strong> | e-Filing: <strong>iBPLS Portal</strong>
          </div>
        </div>
        <a
          href="https://www.roxasormin.com/citizens-charter/securing-mayor-s-permit-business-permit"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '12.5px', fontWeight: '600', color: '#166534', backgroundColor: 'white', border: '1px solid #86EFAC', padding: '0.4rem 0.85rem', borderRadius: '6px', textDecoration: 'none' }}
        >
          View Roxas Portal Charter ↗
        </a>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', padding: '0.75rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
          <CheckCircle size={18} color="#166534" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.75rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px' }}>
          <AlertTriangle size={18} color="#DC2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Agency Filter Chips & Search Bar */}
      <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
          {COMMON_AGENCIES.map(agency => (
            <button
              key={agency}
              onClick={() => setAgencyFilter(agency)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: '600',
                border: agencyFilter === agency ? '1px solid var(--primary-green)' : '1px solid #E2E8F0',
                backgroundColor: agencyFilter === agency ? '#DCFCE7' : '#F8FAFC',
                color: agencyFilter === agency ? '#166534' : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {agency}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text" 
            placeholder="Search by permit name, issuing agency, or ordinance reference..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', fontFamily: 'Inter, sans-serif' }} 
          />
        </div>
      </div>

      {/* Requirements Table */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>Loading municipal requirements...</div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #15803D 0%, #166534 100%)', color: '#FFFFFF' }}>
                <th style={{ padding: '0.875rem 1.25rem', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Clearance & Legal Basis</th>
                <th style={{ padding: '0.875rem 1.25rem', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Classification & Rule</th>
                <th style={{ padding: '0.875rem 1.25rem', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Applicability</th>
                <th style={{ padding: '0.875rem 1.25rem', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Est. Fee & Cycle</th>
                {isAdmin && <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => {
                const isMandatory = req.is_mandatory !== 0;
                const fee = Number(req.estimated_fee);

                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', backgroundColor: '#F1F5F9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <FileText size={18} color="var(--primary-green)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.2rem' }}>
                            {req.permit_name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                              {req.issuing_agency || 'BPLO / LGU Roxas'}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                              <Scale size={12} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'text-bottom' }} />
                              {req.ordinance_reference || 'RA 7160'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em',
                          padding: '0.2rem 0.5rem', borderRadius: '4px',
                          color: isMandatory ? '#9A3412' : '#1E40AF',
                          backgroundColor: isMandatory ? '#FFEDD5' : '#EFF6FF',
                          border: isMandatory ? '1px solid #FDBA74' : '1px solid #BFDBFE'
                        }}>
                          {isMandatory ? 'Mandatory Prerequisite' : 'Conditional Clearance'}
                        </span>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.3rem' }}>
                          {req.condition_field === 'always' || !req.condition_field ? (
                            'Always required for matching businesses'
                          ) : (
                            <span>Trigger: <strong>{req.condition_field}</strong> = {req.condition_value || 'Applicable'}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontSize: '13px', color: '#334155' }}>
                      <div style={{ fontWeight: '500' }}>{req.applicable_business_type}</div>
                      {req.required_documents && (
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '0.2rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.required_documents}>
                          Docs: {req.required_documents}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: '600', color: fee > 0 ? '#166534' : '#64748B', fontSize: '14px' }}>
                        {fee > 0 ? `₱${fee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'Free / Excluded'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.15rem' }}>
                        {req.renewal_period || 'Annual'}
                      </div>
                    </td>

                    {isAdmin && (
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem' }} 
                            onClick={() => openEditModal(req)}
                            title="Edit Requirement Configuration"
                          >
                            <Edit size={13} /> Edit
                          </button>
                          <button 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }} 
                            onClick={() => handleDelete(req.id, req.permit_name)}
                            title="Delete Requirement"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    No requirements matched the search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Requirement Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--government-navy)' }}>
                  {editingReq ? 'Configure Requirement & Ordinance' : 'Add New Municipal Requirement'}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.2rem' }}>
                  Municipality of Roxas, Oriental Mindoro • BPLO Regulatory Manager
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                  Clearance / Permit Name *
                </label>
                <input 
                  type="text"
                  className="form-control" 
                  value={formData.permit_name} 
                  onChange={e => setFormData({ ...formData, permit_name: e.target.value })} 
                  placeholder="e.g. Fire Safety Inspection Certificate (FSIC)"
                  required 
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                    Issuing Agency / Office *
                  </label>
                  <input 
                    type="text"
                    className="form-control" 
                    value={formData.issuing_agency} 
                    onChange={e => setFormData({ ...formData, issuing_agency: e.target.value })} 
                    placeholder="e.g. Bureau of Fire Protection (BFP)"
                    required
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                    Ordinance / Legal Reference *
                  </label>
                  <input 
                    type="text"
                    className="form-control" 
                    value={formData.ordinance_reference} 
                    onChange={e => setFormData({ ...formData, ordinance_reference: e.target.value })} 
                    placeholder="e.g. Revised Fire Code (RA 9514)"
                    required
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                    Applicable Business Type *
                  </label>
                  <input 
                    type="text"
                    className="form-control" 
                    value={formData.applicable_business_type} 
                    onChange={e => setFormData({ ...formData, applicable_business_type: e.target.value })} 
                    placeholder="e.g. All, Sole Proprietorship, Retail"
                    required 
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                    Renewal Period
                  </label>
                  <select 
                    className="form-control" 
                    value={formData.renewal_period} 
                    onChange={e => setFormData({ ...formData, renewal_period: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="Annual">Annual (Expires Dec 31 / Jan Renewal)</option>
                    <option value="Semi-Annual">Semi-Annual</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="One-time">One-time (New Business Only)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                    Estimated Statutory Fee (₱)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control" 
                    value={formData.estimated_fee} 
                    onChange={e => setFormData({ ...formData, estimated_fee: e.target.value })} 
                    placeholder="0.00"
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '0.2rem' }}>
                    Official fee estimate for applicant guidance.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                    Classification
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem', fontSize: '13px', color: 'var(--government-navy)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.is_mandatory} 
                      onChange={e => setFormData({ ...formData, is_mandatory: e.target.checked })} 
                      style={{ accentColor: 'var(--primary-green)' }}
                    />
                    <strong>Mandatory Prerequisite</strong> (Required before permit release)
                  </label>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.5rem' }}>
                  Dynamic Trigger Condition (PermitEase Evaluation Rule)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '0.25rem' }}>Condition Field</label>
                    <select 
                      value={formData.condition_field} 
                      onChange={e => setFormData({ ...formData, condition_field: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                    >
                      <option value="always">Always Required (All Applicants)</option>
                      <option value="business_status">Business Status (New / Renewal)</option>
                      <option value="industry_category">Industry Category (Sector)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '0.25rem' }}>Matching Value</label>
                    <input 
                      type="text"
                      disabled={formData.condition_field === 'always'}
                      value={formData.condition_value} 
                      onChange={e => setFormData({ ...formData, condition_value: e.target.value })} 
                      placeholder={formData.condition_field === 'always' ? 'N/A (Always applies)' : 'e.g. New Application or Tourism'}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', backgroundColor: formData.condition_field === 'always' ? '#F1F5F9' : 'white' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                  Description & Citizen's Charter Notes
                </label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Explain why this clearance is required and any instructions for the applicant..."
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }} 
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)', marginBottom: '0.35rem' }}>
                  Required Physical Supporting Documents
                </label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  value={formData.required_documents} 
                  onChange={e => setFormData({ ...formData, required_documents: e.target.value })} 
                  placeholder="e.g. Official receipt of inspection fee, 2 copies of floor plan, valid government ID..."
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '0.625rem' }} 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1.5, padding: '0.625rem', fontWeight: '600' }}
                >
                  {editingReq ? 'Save Changes' : 'Create Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requirements;
