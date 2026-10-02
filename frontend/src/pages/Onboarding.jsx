import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { Building2, MapPin, Calculator, CheckCircle2, ArrowRight, ArrowLeft, Globe, AlertCircle } from 'lucide-react';
import { BUSINESS_TYPES, getCategoriesForType } from '../data/businessCategories';

const Onboarding = () => {
  const { user } = useContext(AuthContext);
  const { isOnboarded, loadingBusinesses, refreshBusinesses } = useContext(BusinessContext);
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('en');
  
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

  const [resolvedNames, setResolvedNames] = useState(null);
  const [locations, setLocations] = useState({
    islandGroups: [],
    regions: [],
    provinces: [],
    cities: [],
    barangays: []
  });

  const t = {
    en: {
      welcome: 'Welcome to PermitEase',
      subtitle: "Let's get your business ready for permit processing.",
      info: 'Information', loc: 'Location', fin: 'Financials', rev: 'Review',
      s1title: 'Business Information',
      s1desc: 'Tell us the basic identity of your business.',
      bName: 'Business Name *',
      bType: 'Type of Business / Industry *',
      bCat: 'Specific Category (e.g. Sari-Sari Store, Restaurant) *',
      bOwnType: 'Business Ownership Type *',
      bOwnTypeDesc: 'Select the legal or ownership structure of your business.',
      bProd: 'Primary Products / Services *',
      bProdDesc: 'Tell us what products or services your business mainly offers.',
      bDesc: 'Brief Description of Business Operations *',
      bDescHelper: 'Briefly describe how your business operates and what activities are performed at the establishment.',
      bAppType: 'Application Type *',
      owner: 'Owner / Proprietor Name *',
      contact: 'Contact Number *',
      s2title: 'Business Location',
      s2desc: 'Your business location helps PermitEase determine which specific local clearances apply.',
      island: 'Island Group *',
      region: 'Region *',
      province: 'Province *',
      city: 'City / Municipality *',
      brgy: 'Barangay *',
      bAddress: 'Complete Business Address *',
      bAddressHelper: 'House/Building No., Street, Subdivision, etc.',
      premises: 'Business Premises Type *',
      premisesHelper: 'Select the type of location where your business operates.',
      dateEst: 'Date Business Started / Established',
      s3title: 'Financial & Operational Details',
      s3desc: 'This information is used strictly to calculate your estimated local taxes and regulatory fees.',
      cap: 'Capitalization (₱) *',
      capDesc: 'The amount invested in starting or operating the business.',
      grossNew: 'Gross Sales / Receipts (₱)',
      grossNewDesc: 'Leave this blank if the business has no applicable previous-period sales.',
      grossRen: "Previous Year's Gross Sales / Receipts (₱) *",
      grossRenDesc: 'For renewal estimates, enter the applicable gross sales or receipts from the previous period.',
      floor: 'Floor Area (sqm) *',
      floorDesc: 'Approximate floor area used for business operations.',
      emp: 'No. of Employees *',
      empDesc: 'Enter the approximate number of employees working in the business.',
      s4title: 'Review Your Information',
      s4desc: 'Please verify that your business details are correct before proceeding.',
      back: 'Back',
      cont: 'Continue',
      save: 'Save & Continue',
      saving: 'Saving...'
    }
  };
  const text = t.en; // Currently hardcoding en for simplicity, can re-add tl

  useEffect(() => {
    if (!loadingBusinesses && isOnboarded) {
      navigate('/dashboard');
    }
  }, [isOnboarded, loadingBusinesses, navigate]);

    // Resolve names for Step 4
  useEffect(() => {
    if (step === 4) {
      const fetchResolvedNames = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/locations/resolve?islandGroup=${formData.island_group_id}&region=${formData.region_id}&province=${formData.province_id}&city=${formData.city_municipality_id}&barangay=${formData.barangay_id}`);
          setResolvedNames(res.data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchResolvedNames();
    }
  }, [step, formData]);

  // Load Island Groups initially
  useEffect(() => {
    const fetchIslandGroups = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/locations/island-groups`);
        setLocations(prev => ({ ...prev, islandGroups: res.data }));
      } catch (err) {
        console.error('Failed to load island groups');
      }
    };
    fetchIslandGroups();
  }, []);

  const handleLocationChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      if (name === 'island_group_id') {
        // Reset dependents
        setFormData(prev => ({ ...prev, region_id: '', province_id: '', city_municipality_id: '', barangay_id: '' }));
        setLocations(prev => ({ ...prev, regions: [], provinces: [], cities: [], barangays: [] }));
        if (value) {
          const res = await axios.get(`${baseUrl}/locations/regions?islandGroupId=${value}`);
          setLocations(prev => ({ ...prev, regions: res.data }));
        }
      } 
      else if (name === 'region_id') {
        setFormData(prev => ({ ...prev, province_id: '', city_municipality_id: '', barangay_id: '' }));
        setLocations(prev => ({ ...prev, provinces: [], cities: [], barangays: [] }));
        if (value) {
          const res = await axios.get(`${baseUrl}/locations/provinces?regionId=${value}`);
          setLocations(prev => ({ ...prev, provinces: res.data }));
          
          // Special case for NCR (has no provinces)
          if (res.data.length === 0) {
            const cityRes = await axios.get(`${baseUrl}/locations/cities-municipalities?regionId=${value}`);
            setLocations(prev => ({ ...prev, cities: cityRes.data }));
          }
        }
      } 
      else if (name === 'province_id') {
        setFormData(prev => ({ ...prev, city_municipality_id: '', barangay_id: '' }));
        setLocations(prev => ({ ...prev, cities: [], barangays: [] }));
        if (value) {
          const res = await axios.get(`${baseUrl}/locations/cities-municipalities?provinceId=${value}`);
          setLocations(prev => ({ ...prev, cities: res.data }));
        }
      } 
      else if (name === 'city_municipality_id') {
        setFormData(prev => ({ ...prev, barangay_id: '' }));
        setLocations(prev => ({ ...prev, barangays: [] }));
        if (value) {
          const res = await axios.get(`${baseUrl}/locations/barangays?cityMunicipalityId=${value}`);
          setLocations(prev => ({ ...prev, barangays: res.data }));
        }
      }
    } catch (err) {
      console.error('Failed to load location data');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCharChange = (key, val) => {
    setFormData(prev => ({
      ...prev,
      business_characteristics: {
        ...prev.business_characteristics,
        [key]: val
      }
    }));
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!formData.business_name || !formData.business_type || !formData.industry_category || !formData.ownership_type || !formData.primary_products || !formData.business_description || !formData.owner_name || !formData.contact_number) {
        setError('Please fill out all required fields in Step 1.');
        return;
      }
    } else if (step === 2) {
      if (!formData.island_group_id || !formData.region_id || (!formData.province_id && locations.provinces.length > 0) || !formData.city_municipality_id || !formData.barangay_id || !formData.address || !formData.premises_type) {
        setError('Please fill out all required location fields.');
        return;
      }
    } else if (step === 3) {
      if (!formData.capitalization || !formData.floor_area || !formData.employees) {
        setError('Please fill out all required financial fields.');
        return;
      }
      if (formData.business_status === 'Renewal' && !formData.gross_sales) {
        setError("Previous Year's Gross Sales is required for Renewal applications.");
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
      
      // Look up text names for the review/saving
      const locationNames = {
        islandGroup: locations.islandGroups.find(i => i.id === formData.island_group_id)?.name || '',
        region: locations.regions.find(r => r.id === formData.region_id)?.name || '',
        province: locations.provinces.find(p => p.id === formData.province_id)?.name || '',
        city: locations.cities.find(c => c.id === formData.city_municipality_id)?.name || '',
        barangay: locations.barangays.find(b => b.id === formData.barangay_id)?.name || ''
      };

      const payload = { ...formData, ...locationNames }; // pass names if backend needs them, but backend saves IDs
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, formData, config);
      await refreshBusinesses();
      navigate(`/readiness?businessId=${response.data.id}&type=${formData.business_status === 'Renewal' ? 'RENEWAL' : 'NEW'}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create business profile.');
      setLoading(false);
    }
  };

  const renderConditionalQuestions = () => {
    const isFood = formData.business_type === 'Food and Dining' || formData.industry_category.includes('Restaurant');
    const isMfg = formData.business_type === 'Manufacturing & Processing';
    const isService = formData.business_type === 'Services' || formData.business_type === 'Repairs';
    
    if (!isFood && !isMfg && !isService) return null;

    return (
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--light-gray)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--text-dark)' }}>Operational Characteristics</h4>
        
        {isFood && (
          <>
            <div className="mb-3">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Does your business prepare food on the premises?</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label><input type="radio" name="food_prep" checked={formData.business_characteristics.food_prep === 'Yes'} onChange={() => handleCharChange('food_prep', 'Yes')} /> Yes</label>
                <label><input type="radio" name="food_prep" checked={formData.business_characteristics.food_prep === 'No'} onChange={() => handleCharChange('food_prep', 'No')} /> No</label>
              </div>
            </div>
            <div className="mb-3">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Does your business sell or serve alcoholic beverages?</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label><input type="radio" name="alcohol" checked={formData.business_characteristics.alcohol === 'Yes'} onChange={() => handleCharChange('alcohol', 'Yes')} /> Yes</label>
                <label><input type="radio" name="alcohol" checked={formData.business_characteristics.alcohol === 'No'} onChange={() => handleCharChange('alcohol', 'No')} /> No</label>
              </div>
            </div>
          </>
        )}

        {isMfg && (
          <div className="mb-3">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Does your business perform manufacturing or processing activities on-site?</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label><input type="radio" name="mfg_onsite" checked={formData.business_characteristics.mfg_onsite === 'Yes'} onChange={() => handleCharChange('mfg_onsite', 'Yes')} /> Yes</label>
              <label><input type="radio" name="mfg_onsite" checked={formData.business_characteristics.mfg_onsite === 'No'} onChange={() => handleCharChange('mfg_onsite', 'No')} /> No</label>
            </div>
          </div>
        )}

        {isService && (
          <div className="mb-3">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Do you perform repair or maintenance activities at the business location?</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label><input type="radio" name="repair_onsite" checked={formData.business_characteristics.repair_onsite === 'Yes'} onChange={() => handleCharChange('repair_onsite', 'Yes')} /> Yes</label>
              <label><input type="radio" name="repair_onsite" checked={formData.business_characteristics.repair_onsite === 'No'} onChange={() => handleCharChange('repair_onsite', 'No')} /> No</label>
            </div>
          </div>
        )}
      </div>
    );
  };

  const steps = [
    { num: 1, title: text.info, icon: Building2 },
    { num: 2, title: text.loc, icon: MapPin },
    { num: 3, title: text.fin, icon: Calculator },
    { num: 4, title: text.rev, icon: CheckCircle2 }
  ];

  const getLocName = (arr, id) => arr.find(x => x.id === id)?.name || '';

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }} className="animate-fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.5rem' }}>{text.welcome}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{text.subtitle}</p>
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

        <div style={{ minHeight: '300px' }}>
          {step === 1 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{text.s1title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{text.s1desc}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bName}</label>
                  <input className="form-control" name="business_name" value={formData.business_name} onChange={handleChange} />
                </div>
                
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bOwnType}</label>
                  <select className="form-control" name="ownership_type" value={formData.ownership_type} onChange={handleChange}>
                    <option value="">Select Ownership Type</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Corporation">Corporation</option>
                    <option value="Cooperative">Cooperative</option>
                    <option value="Other">Other</option>
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.bOwnTypeDesc}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bType}</label>
                  <select className="form-control" name="business_type" value={formData.business_type} onChange={handleChange}>
                    <option value="">Select Business Type</option>
                    <option value="Retail">Retail</option>
                    <option value="Food and Dining">Food & Dining</option>
                    <option value="Services">Services</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bCat}</label>
                  <select className="form-control" name="industry_category" value={formData.industry_category} onChange={handleChange}>
                      <option value="">Select Category</option>
                      {getCategoriesForType(formData.business_type).map((group, idx) => (
                        <optgroup key={idx} label={group.group}>
                          {group.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </optgroup>
                      ))}
                    </select>
                </div>
              </div>

              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bProd}</label>
                <input className="form-control" name="primary_products" value={formData.primary_products} onChange={handleChange} placeholder="Example: Fried chicken, rice meals, burgers, and beverages" />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.bProdDesc}</p>
              </div>

              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bDesc}</label>
                <textarea className="form-control" name="business_description" value={formData.business_description} onChange={handleChange} rows="3" placeholder="Briefly describe your day-to-day operations..."></textarea>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.bDescHelper}</p>
              </div>

              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bAppType}</label>
                <select className="form-control" name="business_status" value={formData.business_status} onChange={handleChange}>
                  <option value="New Application">New Business</option>
                  <option value="Renewal">Renewal</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.owner}</label>
                  <input className="form-control" name="owner_name" value={formData.owner_name} onChange={handleChange} />
                </div>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.contact}</label>
                  <input className="form-control" name="contact_number" value={formData.contact_number} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{text.s2title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{text.s2desc}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.island}</label>
                  <select className="form-control" name="island_group_id" value={formData.island_group_id} onChange={handleLocationChange}>
                    <option value="">Select Island Group</option>
                    {locations.islandGroups.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.region}</label>
                  <select className="form-control" name="region_id" value={formData.region_id} onChange={handleLocationChange} disabled={!formData.island_group_id}>
                    <option value="">Select Region</option>
                    {locations.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.province}</label>
                  <select className="form-control" name="province_id" value={formData.province_id} onChange={handleLocationChange} disabled={!formData.region_id || locations.provinces.length === 0}>
                    <option value="">Select Province</option>
                    {locations.provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.city}</label>
                  <select className="form-control" name="city_municipality_id" value={formData.city_municipality_id} onChange={handleLocationChange} disabled={!formData.province_id && (!formData.region_id || locations.provinces.length > 0)}>
                    <option value="">Select City / Municipality</option>
                    {locations.cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.brgy}</label>
                <select className="form-control" name="barangay_id" value={formData.barangay_id} onChange={handleLocationChange} disabled={!formData.city_municipality_id}>
                  <option value="">Select Barangay</option>
                  {locations.barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {formData.barangay_id && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--light-green)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--primary-dark)' }}>
                  <strong>Selected Location: </strong>
                  {getLocName(locations.barangays, formData.barangay_id)}, {getLocName(locations.cities, formData.city_municipality_id)}, {formData.province_id ? getLocName(locations.provinces, formData.province_id) + ', ' : ''}{getLocName(locations.regions, formData.region_id)}
                </div>
              )}

              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bAddress}</label>
                <input className="form-control" name="address" value={formData.address} onChange={handleChange} placeholder={text.bAddressHelper} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.premises}</label>
                  <select className="form-control" name="premises_type" value={formData.premises_type} onChange={handleChange}>
                    <option value="">Select Premises Type</option>
                    <option value="Commercial Establishment">Commercial Establishment</option>
                    <option value="Home-Based">Home-Based</option>
                    <option value="Residential/Commercial">Residential/Commercial</option>
                    <option value="Shared/Leased Space">Shared/Leased Space</option>
                    <option value="Other">Other</option>
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.premisesHelper}</p>
                </div>

                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.dateEst}</label>
                  <input type="date" className="form-control" name="date_established" value={formData.date_established} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{text.s3title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{text.s3desc}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.cap}</label>
                  <input type="number" className="form-control" name="capitalization" value={formData.capitalization} onChange={handleChange} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.capDesc}</p>
                </div>
                
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>
                    {formData.business_status === 'Renewal' ? text.grossRen : text.grossNew}
                  </label>
                  <input type="number" className="form-control" name="gross_sales" value={formData.gross_sales} onChange={handleChange} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {formData.business_status === 'Renewal' ? text.grossRenDesc : text.grossNewDesc}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.floor}</label>
                  <input type="number" className="form-control" name="floor_area" value={formData.floor_area} onChange={handleChange} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.floorDesc}</p>
                </div>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.emp}</label>
                  <input type="number" className="form-control" name="employees" value={formData.employees} onChange={handleChange} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.empDesc}</p>
                </div>
              </div>

              {renderConditionalQuestions()}
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{text.s4title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{text.s4desc}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Information Section */}
                <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-dark)' }}>Business Information</h4>
                    <button onClick={() => setStep(1)} style={{ color: 'var(--primary-green)', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>Edit</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Business Name</span><strong>{formData.business_name}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Ownership Type</span><strong>{formData.ownership_type}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Industry / Category</span><strong>{formData.business_type} - {formData.industry_category}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Application Type</span><strong>{formData.business_status}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Primary Products/Services</span><strong>{formData.primary_products}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Owner / Contact</span><strong>{formData.owner_name} ({formData.contact_number})</strong></div>
                    <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)', display: 'block' }}>Operations</span><strong>{formData.business_description}</strong></div>
                  </div>
                </div>

                {/* Location Section */}
                <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-dark)' }}>Business Location</h4>
                    <button onClick={() => setStep(2)} style={{ color: 'var(--primary-green)', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>Edit</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Geographic Location</span>
                      <strong>
                        {getLocName(locations.barangays, formData.barangay_id)}, {getLocName(locations.cities, formData.city_municipality_id)}<br/>
                        {getLocName(locations.provinces, formData.province_id)}, {getLocName(locations.regions, formData.region_id)}<br/>
                        Philippines
                      </strong>
                    </div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Complete Address</span><strong>{formData.address}</strong></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Premises Type</span><strong>{formData.premises_type}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Date Established</span><strong>{formData.date_established || 'Not provided'}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Financial Section */}
                <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-dark)' }}>Financial & Operational Details</h4>
                    <button onClick={() => setStep(3)} style={{ color: 'var(--primary-green)', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>Edit</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Capitalization</span><strong>₱{formData.capitalization}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Gross Sales</span><strong>{formData.gross_sales ? `₱${formData.gross_sales}` : 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Floor Area</span><strong>{formData.floor_area} sqm</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Employees</span><strong>{formData.employees}</strong></div>
                    
                    {Object.keys(formData.business_characteristics).length > 0 && (
                      <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Operational Characteristics</span>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                          {Object.entries(formData.business_characteristics).map(([k, v]) => (
                            <li key={k}><strong>{k.replace('_', ' ')}:</strong> {v}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#F0F9FF', color: '#0369A1', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.4' }}>
                    PermitEase uses the information you provide to generate AI-assisted permit guidance and estimated taxes and fees. Final requirements, assessments, charges, and permit decisions are subject to official evaluation by the appropriate LGU/BPLO and other government offices.
                  </p>
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
            <ArrowLeft size={16} /> {text.back}
          </button>
          
          {step < 4 ? (
            <button onClick={nextStep} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {text.cont} <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading ? text.saving : text.save} <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
