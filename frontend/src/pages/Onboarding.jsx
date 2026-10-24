import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { useTranslation } from '../context/LanguageContext';
import { Building2, MapPin, Calculator, CheckCircle2, ArrowRight, ArrowLeft, Globe, AlertCircle, Check } from 'lucide-react';
import { BUSINESS_TYPES, getCategoriesForType } from '../data/businessCategories';

// Fixed location IDs and names for Municipality of Roxas, Oriental Mindoro
const ROXAS_LOCATION = {
  island_group_id: 'luzon',
  region_id: '170000000',
  province_id: '175200000',
  city_municipality_id: '175212000',
  islandGroupName: 'Luzon',
  regionName: 'MIMAROPA Region',
  provinceName: 'Oriental Mindoro',
  cityName: 'Roxas'
};

// Financial & Operational Dropdown Options
export const CAPITALIZATION_RANGES = [
  { value: '5000', labelEn: 'Below ₱10,000 (Micro / Sari-Sari)', labelTl: 'Mababa sa ₱10,000 (Micro / Sari-Sari)' },
  { value: '15000', labelEn: '₱10,000 – ₱20,000', labelTl: '₱10,000 – ₱20,000' },
  { value: '35000', labelEn: '₱20,000 – ₱50,000', labelTl: '₱20,000 – ₱50,000' },
  { value: '75000', labelEn: '₱50,000 – ₱100,000', labelTl: '₱50,000 – ₱100,000' },
  { value: '175000', labelEn: '₱100,000 – ₱250,000', labelTl: '₱100,000 – ₱250,000' },
  { value: '375000', labelEn: '₱250,000 – ₱500,000', labelTl: '₱250,000 – ₱500,000' },
  { value: '750000', labelEn: '₱500,000 – ₱1,000,000', labelTl: '₱500,000 – ₱1,000,000' },
  { value: '2000000', labelEn: '₱1,000,000 – ₱3,000,000', labelTl: '₱1,000,000 – ₱3,000,000' },
  { value: '5000000', labelEn: '₱3,000,000 and Above', labelTl: '₱3,000,000 at Pataas' },
];

export const GROSS_SALES_RANGES = [
  { value: '0', labelEn: '₱0 / Not Applicable (No Prior Sales)', labelTl: '₱0 / Hindi Naaangkop (Walang Nakaraang Benta)' },
  { value: '25000', labelEn: 'Below ₱50,000', labelTl: 'Mababa sa ₱50,000' },
  { value: '75000', labelEn: '₱50,000 – ₱100,000', labelTl: '₱50,000 – ₱100,000' },
  { value: '175000', labelEn: '₱100,000 – ₱250,000', labelTl: '₱100,000 – ₱250,000' },
  { value: '325000', labelEn: '₱250,000 – ₱400,000', labelTl: '₱250,000 – ₱400,000' },
  { value: '450000', labelEn: '₱400,000 – ₱500,000', labelTl: '₱400,000 – ₱500,000' },
  { value: '750000', labelEn: '₱500,000 – ₱1,000,000', labelTl: '₱500,000 – ₱1,000,000' },
  { value: '2000000', labelEn: '₱1,000,000 – ₱3,000,000', labelTl: '₱1,000,000 – ₱3,000,000' },
  { value: '5000000', labelEn: '₱3,000,000 and Above', labelTl: '₱3,000,000 at Pataas' },
];

export const FLOOR_AREA_RANGES = [
  { value: '10', labelEn: 'Below 15 sqm (Micro stall / Kiosk)', labelTl: 'Mababa sa 15 sqm (Kiosk / Maliit na puwesto)' },
  { value: '25', labelEn: '15 – 30 sqm (Small store)', labelTl: '15 – 30 sqm (Maliit na tindahan)' },
  { value: '40', labelEn: '31 – 50 sqm (Medium shop / office)', labelTl: '31 – 50 sqm (Katamtamang puwesto / opisina)' },
  { value: '75', labelEn: '51 – 100 sqm (Commercial space)', labelTl: '51 – 100 sqm (Komersyal na espasyo)' },
  { value: '150', labelEn: '101 – 200 sqm (Large store / restaurant)', labelTl: '101 – 200 sqm (Malaking tindahan / kainan)' },
  { value: '350', labelEn: '201 – 500 sqm (Warehouse / complex)', labelTl: '201 – 500 sqm (Bodega / malaking espasyo)' },
  { value: '750', labelEn: 'Above 500 sqm', labelTl: 'Higit sa 500 sqm' },
];

export const EMPLOYEE_RANGES = [
  { value: '1', labelEn: '1 Employee (Owner / Solo)', labelTl: '1 Empleyado (May-ari / Solo)' },
  { value: '3', labelEn: '2 – 4 Employees', labelTl: '2 – 4 Empleyado' },
  { value: '7', labelEn: '5 – 9 Employees (Micro Enterprise)', labelTl: '5 – 9 Empleyado (Micro Enterprise)' },
  { value: '15', labelEn: '10 – 19 Employees', labelTl: '10 – 19 Empleyado' },
  { value: '35', labelEn: '20 – 49 Employees (Small Enterprise)', labelTl: '20 – 49 Empleyado (Small Enterprise)' },
  { value: '75', labelEn: '50 – 99 Employees (Medium Enterprise)', labelTl: '50 – 99 Empleyado (Medium Enterprise)' },
  { value: '150', labelEn: '100+ Employees (Large Enterprise)', labelTl: '100+ Empleyado (Large Enterprise)' },
];

const Onboarding = () => {
  const { user } = useContext(AuthContext);
  const { isOnboarded, loadingBusinesses, refreshBusinesses } = useContext(BusinessContext);
  const { lang, setLanguage, t } = useTranslation();
  const navigate = useNavigate();

  // Step 0: Language selection (always ask language first on onboarding)
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    business_name: sessionStorage.getItem('pending_business_name') || '',
    business_type: '',
    industry_category: '',
    ownership_type: '',
    primary_products: '',
    business_description: '',
    business_status: 'New Application',
    owner_name: user?.full_name || '',
    contact_number: user?.contact_number || '',
    notification_email: user?.email || '',

    // Automatically locked to Roxas, Oriental Mindoro
    island_group_id: ROXAS_LOCATION.island_group_id,
    region_id: ROXAS_LOCATION.region_id,
    province_id: ROXAS_LOCATION.province_id,
    city_municipality_id: ROXAS_LOCATION.city_municipality_id,
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

  const [barangays, setBarangays] = useState([]);
  const text = t.onboarding;

  useEffect(() => {
    if (!loadingBusinesses && isOnboarded) {
      navigate('/dashboard');
    }
  }, [isOnboarded, loadingBusinesses, navigate]);

  // Load Roxas Barangays on mount
  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await axios.get(`${baseUrl}/locations/barangays?cityMunicipalityId=${ROXAS_LOCATION.city_municipality_id}`);
        setBarangays(res.data || []);
      } catch (err) {
        console.error('Failed to load Roxas barangays', err);
      }
    };
    fetchBarangays();
  }, []);

  const handleSelectLanguage = (selectedLang) => {
    setLanguage(selectedLang);
    setStep(1);
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
      if (!formData.business_name || !formData.business_type || !formData.industry_category || !formData.ownership_type || !formData.primary_products || !formData.owner_name || !formData.contact_number) {
        setError(text.errorFillAll);
        return;
      }
    } else if (step === 2) {
      if (!formData.barangay_id || !formData.address || !formData.premises_type) {
        setError(text.errorFillAll);
        return;
      }
    } else if (step === 3) {
      if (!formData.capitalization || !formData.floor_area || !formData.employees) {
        setError(text.errorFillAll);
        return;
      }
      if (formData.business_status === 'Renewal' && !formData.gross_sales) {
        setError(text.errorRenewalSales);
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
      
      const selectedBrgyName = barangays.find(b => b.id === formData.barangay_id)?.name || '';

      const payload = {
        ...formData,
        email: formData.notification_email || null,
        island_group_id: ROXAS_LOCATION.island_group_id,
        region_id: ROXAS_LOCATION.region_id,
        province_id: ROXAS_LOCATION.province_id,
        city_municipality_id: ROXAS_LOCATION.city_municipality_id,
        barangay: selectedBrgyName,
        islandGroup: ROXAS_LOCATION.islandGroupName,
        region: ROXAS_LOCATION.regionName,
        province: ROXAS_LOCATION.provinceName,
        city: ROXAS_LOCATION.cityName
      };
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, payload, config);
      sessionStorage.removeItem('pending_business_name');
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
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #E2E8F0' }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--government-navy, #172033)' }}>{text.opCharacteristics}</h4>
        
        {isFood && (
          <>
            <div className="mb-3">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{text.foodPrepQ}</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input type="radio" name="food_prep" checked={formData.business_characteristics.food_prep === 'Yes'} onChange={() => handleCharChange('food_prep', 'Yes')} /> {t.yes}
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input type="radio" name="food_prep" checked={formData.business_characteristics.food_prep === 'No'} onChange={() => handleCharChange('food_prep', 'No')} /> {t.no}
                </label>
              </div>
            </div>
            <div className="mb-3">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{text.alcoholQ}</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input type="radio" name="alcohol" checked={formData.business_characteristics.alcohol === 'Yes'} onChange={() => handleCharChange('alcohol', 'Yes')} /> {t.yes}
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input type="radio" name="alcohol" checked={formData.business_characteristics.alcohol === 'No'} onChange={() => handleCharChange('alcohol', 'No')} /> {t.no}
                </label>
              </div>
            </div>
          </>
        )}

        {isMfg && (
          <div className="mb-3">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{text.mfgQ}</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input type="radio" name="mfg_onsite" checked={formData.business_characteristics.mfg_onsite === 'Yes'} onChange={() => handleCharChange('mfg_onsite', 'Yes')} /> {t.yes}
              </label>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input type="radio" name="mfg_onsite" checked={formData.business_characteristics.mfg_onsite === 'No'} onChange={() => handleCharChange('mfg_onsite', 'No')} /> {t.no}
              </label>
            </div>
          </div>
        )}

        {isService && (
          <div className="mb-3">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{text.repairQ}</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input type="radio" name="repair_onsite" checked={formData.business_characteristics.repair_onsite === 'Yes'} onChange={() => handleCharChange('repair_onsite', 'Yes')} /> {t.yes}
              </label>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input type="radio" name="repair_onsite" checked={formData.business_characteristics.repair_onsite === 'No'} onChange={() => handleCharChange('repair_onsite', 'No')} /> {t.no}
              </label>
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

  const selectedBrgyName = barangays.find(b => b.id === formData.barangay_id)?.name || '';

  // ── Step 0: Language Preference Selection ──
  if (step === 0) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1rem' }} className="animate-fade-in">
        <div className="card" style={{ padding: '2.5rem 2rem', textAlign: 'center', borderRadius: '12px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#DCFCE7',
            color: '#166534',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <Globe size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--government-navy, #172033)', marginBottom: '0.5rem' }}>
            {text.chooseLangTitle}
          </h2>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' }}>
            {text.chooseLangDesc}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => handleSelectLanguage('en')}
              className="btn btn-outline"
              style={{
                padding: '1.25rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '10px',
                borderColor: lang === 'en' ? 'var(--primary-green, #167A3D)' : '#CBD5E1',
                backgroundColor: lang === 'en' ? '#F0FDF4' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#166534' }}>English</span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Default English System</span>
            </button>

            <button
              onClick={() => handleSelectLanguage('tl')}
              className="btn btn-outline"
              style={{
                padding: '1.25rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '10px',
                borderColor: lang === 'tl' ? 'var(--primary-green, #167A3D)' : '#CBD5E1',
                backgroundColor: lang === 'tl' ? '#F0FDF4' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#166534' }}>Tagalog</span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Wikang Filipino</span>
            </button>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>
            Maaaring palitan ang wika anumang oras gamit ang wika switch button sa bandang itaas ng bawat pahina.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '820px', margin: '2rem auto', padding: '0 1rem' }} className="animate-fade-in">
      {/* Title & Language Switcher Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: 'var(--primary-green)', margin: '0 0 0.25rem', fontSize: '1.75rem' }}>{text.welcome}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{text.subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setLanguage(lang === 'en' ? 'tl' : 'en')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: '600',
              cursor: 'pointer',
              color: 'var(--text-dark, #172033)'
            }}
          >
            <Globe size={15} color="var(--primary-green)" />
            <span>{t.switchLanguage}</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {/* Progress Tracker */}
        <div className="onboarding-stepper-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative' }}>
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
                <span className={`onboarding-stepper-title ${isActive ? 'active' : ''}`} style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: isActive ? '600' : '400', color: isActive ? 'var(--text-dark)' : 'var(--text-muted)' }}>
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.bAppType}</label>
                <select className="form-control" name="business_status" value={formData.business_status} onChange={handleChange}>
                  <option value="New Application">{text.newApp}</option>
                  <option value="Renewal">{text.renewalApp}</option>
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

              {/* Notification Email */}
              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>
                  {text.notifEmail}
                </label>
                <input
                  type="email"
                  className="form-control"
                  name="notification_email"
                  value={formData.notification_email}
                  onChange={handleChange}
                  placeholder={user?.email || 'your@email.com'}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.notifEmailDesc}</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Location (Locked to Roxas, Oriental Mindoro) ── */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--text-dark)' }}>{text.s2title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{text.s2desc}</p>
              
              {/* Municipality Scope Banner */}
              <div style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <MapPin size={20} color="#166534" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.875rem', color: '#14532D', lineHeight: 1.4 }}>
                  <strong>{text.locationNotice}</strong>
                </div>
              </div>

              {/* Readonly Municipal Info (Island, Region, Province, Municipality) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>{text.island}</span>
                  <strong style={{ fontSize: '0.875rem', color: '#0F172A' }}>{ROXAS_LOCATION.islandGroupName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>{text.region}</span>
                  <strong style={{ fontSize: '0.875rem', color: '#0F172A' }}>{ROXAS_LOCATION.regionName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>{text.province}</span>
                  <strong style={{ fontSize: '0.875rem', color: '#0F172A' }}>{ROXAS_LOCATION.provinceName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>{text.city}</span>
                  <strong style={{ fontSize: '0.875rem', color: '#166534' }}>{ROXAS_LOCATION.cityName}</strong>
                </div>
              </div>

              {/* Barangay Selection within Roxas */}
              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>
                  {text.brgy}
                </label>
                <select className="form-control" name="barangay_id" value={formData.barangay_id} onChange={handleChange}>
                  <option value="">{text.selectBrgy}</option>
                  {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {formData.barangay_id && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-green-light)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--primary-green-dark)' }}>
                  <strong>Selected Jurisdiction: </strong>
                  Barangay {selectedBrgyName}, Municipality of Roxas, Oriental Mindoro, MIMAROPA Region
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
                    <option value="Public Market Stall">Public Market Stall</option>
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
                  <select className="form-control" name="capitalization" value={formData.capitalization} onChange={handleChange}>
                    <option value="">{text.selectCap}</option>
                    {CAPITALIZATION_RANGES.map(opt => (
                      <option key={opt.value} value={opt.value}>{lang === 'tl' ? opt.labelTl : opt.labelEn}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.capDesc}</p>
                </div>
                
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>
                    {formData.business_status === 'Renewal' ? text.grossRen : text.grossNew}
                  </label>
                  <select className="form-control" name="gross_sales" value={formData.gross_sales} onChange={handleChange}>
                    <option value="">{text.selectGross}</option>
                    {GROSS_SALES_RANGES.map(opt => (
                      <option key={opt.value} value={opt.value}>{lang === 'tl' ? opt.labelTl : opt.labelEn}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {formData.business_status === 'Renewal' ? text.grossRenDesc : text.grossNewDesc}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.floor}</label>
                  <select className="form-control" name="floor_area" value={formData.floor_area} onChange={handleChange}>
                    <option value="">{text.selectFloor}</option>
                    {FLOOR_AREA_RANGES.map(opt => (
                      <option key={opt.value} value={opt.value}>{lang === 'tl' ? opt.labelTl : opt.labelEn}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.floorDesc}</p>
                </div>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{text.emp}</label>
                  <select className="form-control" name="employees" value={formData.employees} onChange={handleChange}>
                    <option value="">{text.selectEmp}</option>
                    {EMPLOYEE_RANGES.map(opt => (
                      <option key={opt.value} value={opt.value}>{lang === 'tl' ? opt.labelTl : opt.labelEn}</option>
                    ))}
                  </select>
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
                    <h4 style={{ margin: 0, color: 'var(--primary-dark)' }}>{text.s1title}</h4>
                    <button onClick={() => setStep(1)} style={{ color: 'var(--primary-green)', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>{t.edit}</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.bName}</span><strong>{formData.business_name}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.bOwnType}</span><strong>{formData.ownership_type}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.bType} / {text.bCat}</span><strong>{formData.business_type} - {formData.industry_category}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.bAppType}</span><strong>{formData.business_status}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.bProd}</span><strong>{formData.primary_products}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.owner}</span><strong>{formData.owner_name} ({formData.contact_number})</strong></div>
                  </div>
                </div>

                {/* Location Section */}
                <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-dark)' }}>{text.s2title}</h4>
                    <button onClick={() => setStep(2)} style={{ color: 'var(--primary-green)', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>{t.edit}</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.geoLoc}</span>
                      <strong>
                        Barangay {selectedBrgyName}, {ROXAS_LOCATION.cityName}<br/>
                        {ROXAS_LOCATION.provinceName}, {ROXAS_LOCATION.regionName}<br/>
                        Philippines
                      </strong>
                    </div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.bAddress}</span><strong>{formData.address}</strong></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.premises}</span><strong>{formData.premises_type}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.dateEst}</span><strong>{formData.date_established || 'Not provided'}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Financial Section */}
                <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-dark)' }}>{text.s3title}</h4>
                    <button onClick={() => setStep(3)} style={{ color: 'var(--primary-green)', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>{t.edit}</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.cap}</span>
                      <strong>{CAPITALIZATION_RANGES.find(r => r.value === String(formData.capitalization))?.[lang === 'tl' ? 'labelTl' : 'labelEn'] || `₱${formData.capitalization}`}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.grossNew}</span>
                      <strong>{GROSS_SALES_RANGES.find(r => r.value === String(formData.gross_sales))?.[lang === 'tl' ? 'labelTl' : 'labelEn'] || (formData.gross_sales ? `₱${formData.gross_sales}` : 'N/A')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.floor}</span>
                      <strong>{FLOOR_AREA_RANGES.find(r => r.value === String(formData.floor_area))?.[lang === 'tl' ? 'labelTl' : 'labelEn'] || `${formData.floor_area} sqm`}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>{text.emp}</span>
                      <strong>{EMPLOYEE_RANGES.find(r => r.value === String(formData.employees))?.[lang === 'tl' ? 'labelTl' : 'labelEn'] || formData.employees}</strong>
                    </div>
                    
                    {Object.keys(formData.business_characteristics).length > 0 && (
                      <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{text.opCharacteristics}</span>
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
                    {text.disclaimer}
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
            disabled={step <= 1 || loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step <= 1 ? 0 : 1, pointerEvents: step <= 1 ? 'none' : 'auto' }}
          >
            <ArrowLeft size={16} /> {t.back}
          </button>
          
          {step < 4 ? (
            <button onClick={nextStep} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t.continue} <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading ? text.saving : text.saveAndContinue} <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
