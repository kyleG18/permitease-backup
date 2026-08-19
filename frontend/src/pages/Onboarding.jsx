import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { Building2, MapPin, Calculator, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

const Onboarding = () => {
  const { user } = useContext(AuthContext);
  const { isOnboarded, loadingBusinesses, refreshBusinesses } = useContext(BusinessContext);
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
    industry_category: '',
    business_status: 'New Application',
    address: '',
    capitalization: '',
    gross_sales: '',
    floor_area: '',
    employees: ''
  });

  // If already onboarded, send to dashboard
  useEffect(() => {
    if (!loadingBusinesses && isOnboarded) {
      navigate('/dashboard');
    }
  }, [isOnboarded, loadingBusinesses, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    setError('');
    // Validation
    if (step === 1) {
      if (!formData.business_name || !formData.business_type || !formData.industry_category) {
        setError('Please fill out all required fields.');
        return;
      }
    } else if (step === 2) {
      if (!formData.address) {
        setError('Business address is required.');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.post('http://localhost:5000/api/businesses', formData, config);
      
      // Update global context
      await refreshBusinesses();
      
      // Navigate to Permit Readiness with the new business ID
      navigate(`/readiness?businessId=${response.data.id}&type=${formData.business_status === 'Renewal' ? 'RENEWAL' : 'NEW'}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create business profile.');
      setLoading(false);
    }
  };

  if (loadingBusinesses) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>;
  }

  const steps = [
    { num: 1, title: 'Information', icon: Building2 },
    { num: 2, title: 'Location', icon: MapPin },
    { num: 3, title: 'Financials', icon: Calculator },
    { num: 4, title: 'Review', icon: CheckCircle2 }
  ];

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '0 1rem' }} className="animate-fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.5rem' }}>Welcome to PermitEase</h1>
        <p style={{ color: 'var(--text-muted)' }}>Let's get your business ready for permit processing.</p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {/* Progress Tracker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '20px', left: '0', right: '0', height: '2px', backgroundColor: 'var(--border-light)', zIndex: 0 }}></div>
          <div style={{ position: 'absolute', top: '20px', left: '0', height: '2px', backgroundColor: 'var(--primary-green)', zIndex: 0, width: `${((step - 1) / 3) * 100}%`, transition: 'width 0.3s ease' }}></div>
          
          {steps.map(s => {
            const Icon = s.icon;
            const isActive = step >= s.num;
            return (
              <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isActive ? 'var(--primary-green)' : 'var(--white)',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  border: `2px solid ${isActive ? 'var(--primary-green)' : 'var(--border-light)'}`,
                  transition: 'all 0.3s ease'
                }}>
                  <Icon size={18} />
                </div>
                <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: isActive ? '600' : '400', color: isActive ? 'var(--text-dark)' : 'var(--text-muted)' }}>
                  {s.title}
                </span>
              </div>
            )
          })}
        </div>

        {error && <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

        {/* Form Steps */}
        <div style={{ minHeight: '300px' }}>
          {step === 1 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Business Information</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Tell us the basic identity of your business.</p>
              
              <div className="form-group mb-4">
                <input className="form-control" name="business_name" value={formData.business_name} onChange={handleChange} placeholder=" " />
                <label className="form-label">Business Name *</label>
              </div>
              
              <div className="form-group mb-4">
                <select className="form-control" style={{ paddingTop: '0.75rem' }} name="business_type" value={formData.business_type} onChange={handleChange}>
                  <option value="">Select Type</option>
                  <option>Food</option><option>Retail</option><option>Services</option>
                  <option>Manufacturing</option><option>Agriculture</option><option>Others</option>
                </select>
                <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>Type of Business / Industry *</label>
              </div>
              
              <div className="form-group mb-4">
                <input className="form-control" name="industry_category" value={formData.industry_category} onChange={handleChange} placeholder=" " />
                <label className="form-label">Specific Category (e.g. Sari-Sari Store, Restaurant) *</label>
              </div>

              <div className="form-group mb-4">
                <select className="form-control" style={{ paddingTop: '0.75rem' }} name="business_status" value={formData.business_status} onChange={handleChange}>
                  <option value="New Application">New Business</option>
                  <option value="Renewal">Existing Business (Renewal)</option>
                </select>
                <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>Application Type *</label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Business Location</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your business location helps PermitEase determine which specific local clearances apply to your business.</p>
              
              <div className="form-group mb-4">
                <input className="form-control" name="address" value={formData.address} onChange={handleChange} placeholder=" " />
                <label className="form-label">Complete Business Address *</label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Financial & Operational Details</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>This information is used strictly to calculate your estimated local taxes and regulatory fees.</p>
              
              <div className="form-group mb-4">
                <input type="number" className="form-control" name="capitalization" value={formData.capitalization} onChange={handleChange} placeholder=" " />
                <label className="form-label">Capitalization (₱)</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>The amount invested in starting or operating the business.</p>
              </div>
              
              <div className="form-group mb-4">
                <input type="number" className="form-control" name="gross_sales" value={formData.gross_sales} onChange={handleChange} placeholder=" " />
                <label className="form-label">Gross Sales (₱)</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Your business's total sales for the applicable period. Leave empty if new.</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <input type="number" className="form-control" name="floor_area" value={formData.floor_area} onChange={handleChange} placeholder=" " />
                  <label className="form-label">Floor Area (sqm)</label>
                </div>
                <div className="form-group">
                  <input type="number" className="form-control" name="employees" value={formData.employees} onChange={handleChange} placeholder=" " />
                  <label className="form-label">No. of Employees</label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Review Your Information</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Please verify that your business details are correct before proceeding.</p>
              
              <div style={{ backgroundColor: 'var(--light-green)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Business Name</span>
                    <strong style={{ color: 'var(--text-dark)' }}>{formData.business_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Business Type</span>
                    <strong style={{ color: 'var(--text-dark)' }}>{formData.business_type}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Industry</span>
                    <strong style={{ color: 'var(--text-dark)' }}>{formData.industry_category}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Address</span>
                    <strong style={{ color: 'var(--text-dark)' }}>{formData.address}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Capitalization</span>
                    <strong style={{ color: 'var(--text-dark)' }}>{formData.capitalization ? `₱${formData.capitalization}` : '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Gross Sales</span>
                    <strong style={{ color: 'var(--text-dark)' }}>{formData.gross_sales ? `₱${formData.gross_sales}` : '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
          <button 
            onClick={prevStep} 
            disabled={step === 1 || loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? 'none' : 'auto' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          {step < 4 ? (
            <button onClick={nextStep} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading ? 'Saving...' : 'Save & Continue'} <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
