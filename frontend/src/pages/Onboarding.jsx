import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { Building2, MapPin, Calculator, CheckCircle2, ArrowRight, ArrowLeft, Globe } from 'lucide-react';

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
    business_status: 'New Application',
    owner_name: '',
    contact_number: '',
    barangay: '',
    address: '',
    date_established: '',
    capitalization: '',
    gross_sales: '',
    floor_area: '',
    employees: ''
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
      bAppType: 'Application Type *',
      s2title: 'Business Location',
      s2desc: 'Your business location helps PermitEase determine which specific local clearances apply to your business.',
      bAddress: 'Complete Business Address *',
      s3title: 'Financial & Operational Details',
      s3desc: 'This information is used strictly to calculate your estimated local taxes and regulatory fees.',
      cap: 'Capitalization (₱)',
      capDesc: 'The amount invested in starting or operating the business.',
      gross: 'Gross Sales (₱)',
      grossDesc: "Your business's total sales for the applicable period. Leave empty if new.",
      floor: 'Floor Area (sqm)',
      emp: 'No. of Employees',
      s4title: 'Review Your Information',
      s4desc: 'Please verify that your business details are correct before proceeding.',
      back: 'Back',
      cont: 'Continue',
      save: 'Save & Continue',
      saving: 'Saving...'
    },
    tl: {
      welcome: 'Maligayang pagdating sa PermitEase',
      subtitle: 'Ihanda natin ang iyong negosyo para sa pagproseso ng permit.',
      info: 'Impormasyon', loc: 'Lokasyon', fin: 'Pinansyal', rev: 'Pagsusuri',
      s1title: 'Impormasyon ng Negosyo',
      s1desc: 'Ibigay sa amin ang pangunahing pagkakakilanlan ng iyong negosyo.',
      bName: 'Pangalan ng Negosyo *',
      bType: 'Uri ng Negosyo / Industriya *',
      bCat: 'Tiyak na Kategorya (hal. Sari-Sari Store, Restaurant) *',
      bAppType: 'Uri ng Aplikasyon *',
      s2title: 'Lokasyon ng Negosyo',
      s2desc: 'Tinutulungan ng iyong lokasyon ang PermitEase na matukoy kung aling mga lokal na clearance ang naaangkop.',
      bAddress: 'Kumpletong Address ng Negosyo *',
      s3title: 'Detalye ng Pinansyal at Operasyon',
      s3desc: 'Ang impormasyong ito ay ginagamit lamang para makalkula ang iyong tinatayang lokal na buwis at bayarin.',
      cap: 'Kapitalisasyon (₱)',
      capDesc: 'Ang halagang ipinuhunan sa pagsisimula o pagpapatakbo ng negosyo.',
      gross: 'Gross Sales (₱)',
      grossDesc: 'Kabuuang benta ng iyong negosyo para sa naaangkop na panahon. Iwanang walang laman kung bago.',
      floor: 'Floor Area (sqm)',
      emp: 'Bilang ng Empleyado',
      s4title: 'Suriin ang Iyong Impormasyon',
      s4desc: 'Pakitiyak na tama ang mga detalye ng iyong negosyo bago magpatuloy.',
      back: 'Bumalik',
      cont: 'Magpatuloy',
      save: 'I-save at Magpatuloy',
      saving: 'Sini-save...'
    }
  };

  const text = t[lang];

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
        setError(lang === 'tl' ? 'Pakisagutan ang lahat ng kinakailangang field.' : 'Please fill out all required fields.');
        return;
      }
    } else if (step === 2) {
      if (!formData.address) {
        setError(lang === 'tl' ? 'Kinakailangan ang address ng negosyo.' : 'Business address is required.');
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
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, formData, config);
      
      // Update global context
      await refreshBusinesses();
      
      // Navigate to Permit Readiness with the new business ID
      navigate(`/readiness?businessId=${response.data.id}&type=${formData.business_status === 'Renewal' ? 'RENEWAL' : 'NEW'}`);
    } catch (err) {
      setError(err.response?.data?.message || (lang === 'tl' ? 'Nabigong gumawa ng profile ng negosyo.' : 'Failed to create business profile.'));
      setLoading(false);
    }
  };

  if (loadingBusinesses) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>;
  }

  const steps = [
    { num: 1, title: text.info, icon: Building2 },
    { num: 2, title: text.loc, icon: MapPin },
    { num: 3, title: text.fin, icon: Calculator },
    { num: 4, title: text.rev, icon: CheckCircle2 }
  ];

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '0 1rem' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          onClick={() => setLang(lang === 'en' ? 'tl' : 'en')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-dark)' }}
        >
          <Globe size={16} color="var(--primary-green)" />
          {lang === 'en' ? 'Tagalog' : 'English'}
        </button>
      </div>

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

        {/* Form Steps */}
        <div style={{ minHeight: '300px' }}>
          {step === 1 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{text.s1title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{text.s1desc}</p>
              
              <div className="form-group mb-4">
                <input className="form-control" name="business_name" value={formData.business_name} onChange={handleChange} placeholder=" " />
                <label className="form-label">{text.bName}</label>
              </div>
              
              <div className="form-group mb-4">
                <select className="form-control" style={{ paddingTop: '0.75rem' }} name="business_type" value={formData.business_type} onChange={handleChange}>
                  <option value="">{lang === 'en' ? 'Select Sector / Type' : 'Pumili ng Uri'}</option>
                  <option>Food & Beverage</option>
                  <option>Retail & Wholesale</option>
                  <option>Services (Professional & Personal)</option>
                  <option>Manufacturing & Industrial</option>
                  <option>Agriculture & Aquaculture</option>
                  <option>Real Estate & Leasing</option>
                  <option>Information Technology</option>
                  <option>Healthcare & Medical</option>
                  <option>Tourism & Hospitality</option>
                  <option>Construction</option>
                  <option>Education & Training</option>
                  <option>Others</option>
                </select>
                <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>{text.bType}</label>
              </div>
              
              <div className="form-group mb-4">
                <select className="form-control" style={{ paddingTop: '0.75rem' }} name="industry_category" value={formData.industry_category} onChange={handleChange}>
                  <option value="">{lang === 'en' ? 'Select Specific Category' : 'Pumili ng Tiyak na Kategorya'}</option>
                  <optgroup label="Food & Dining">
                    <option>Restaurant / Eatery</option>
                    <option>Cafe / Coffee Shop</option>
                    <option>Bakery / Bakeshop</option>
                    <option>Catering Services</option>
                    <option>Food Kiosk / Cart</option>
                    <option>Water Refilling Station</option>
                  </optgroup>
                  <optgroup label="Retail & Shops">
                    <option>Sari-Sari Store</option>
                    <option>Grocery / Supermarket</option>
                    <option>Convenience Store</option>
                    <option>Boutique / Clothing Store</option>
                    <option>Hardware / Construction Supplies</option>
                    <option>Pharmacy / Drugstore</option>
                    <option>Auto Parts / Supply</option>
                    <option>Agrivet Supply</option>
                  </optgroup>
                  <optgroup label="Services">
                    <option>Salon / Barbershop / Spa</option>
                    <option>Laundry Shop</option>
                    <option>Car Wash / Auto Repair</option>
                    <option>Internet Cafe / Computer Shop</option>
                    <option>Print Shop / Advertising</option>
                    <option>Logistics / Trucking</option>
                    <option>Financial / Remittance Services</option>
                  </optgroup>
                  <optgroup label="Healthcare">
                    <option>Clinic / Medical Office</option>
                    <option>Dental Clinic</option>
                    <option>Veterinary Clinic</option>
                  </optgroup>
                  <optgroup label="Real Estate & Hospitality">
                    <option>Boarding House / Apartment</option>
                    <option>Hotel / Resort</option>
                    <option>Travel Agency</option>
                  </optgroup>
                  <optgroup label="Industrial & Others">
                    <option>Manufacturing / Plant</option>
                    <option>Junk Shop</option>
                    <option>Gym / Fitness Center</option>
                    <option>Others (Please specify in description)</option>
                  </optgroup>
                </select>
                <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>{text.bCat}</label>
              </div>

              <div className="form-group mb-4">
                <textarea className="form-control" name="business_description" value={formData.business_description || ''} onChange={handleChange} placeholder=" " style={{ height: '80px', paddingTop: '1rem', resize: 'none' }} />
                <label className="form-label" style={{ top: '0.5rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>
                  {lang === 'en' ? 'Brief Business Description / Activities' : 'Maikling Deskripsyon ng Negosyo'}
                </label>
              </div>

              <div className="form-group mb-4">
                <select className="form-control" style={{ paddingTop: '0.75rem' }} name="business_status" value={formData.business_status} onChange={handleChange}>
                  <option value="New Application">{lang === 'en' ? 'New Business' : 'Bagong Negosyo'}</option>
                  <option value="Renewal">{lang === 'en' ? 'Existing Business (Renewal)' : 'Umiiral na Negosyo (Renewal)'}</option>
                </select>
                <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>{text.bAppType}</label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <input className="form-control" name="owner_name" value={formData.owner_name} onChange={handleChange} placeholder=" " />
                  <label className="form-label">{lang === 'en' ? 'Owner / Proprietor Name' : 'Pangalan ng May-ari'}</label>
                </div>
                <div className="form-group">
                  <input className="form-control" name="contact_number" value={formData.contact_number} onChange={handleChange} placeholder=" " />
                  <label className="form-label">{lang === 'en' ? 'Contact Number' : 'Numero ng Telepono'}</label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{text.s2title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{text.s2desc}</p>
              
              <div className="form-group mb-4">
                <select className="form-control" style={{ paddingTop: '0.75rem' }} name="barangay" value={formData.barangay} onChange={handleChange}>
                  <option value="">{lang === 'en' ? 'Select Barangay' : 'Pumili ng Barangay'}</option>
                  <option>Barangay Banica</option><option>Barangay Bolo</option><option>Barangay Culajao</option>
                  <option>Barangay Culasi</option><option>Barangay Dayao</option><option>Barangay Dinginan</option>
                  <option>Barangay Dumolog</option><option>Barangay Inzo Arnaldo Village</option><option>Barangay Jumaguicjic</option>
                  <option>Barangay Lanot</option><option>Barangay Lawaan</option><option>Barangay Libas</option>
                  <option>Barangay Linao</option><option>Barangay Loog</option><option>Barangay Milibili</option>
                  <option>Barangay Pani-an</option><option>Barangay Poblacion Ilawod</option><option>Barangay Poblacion Ilaya</option>
                  <option>Barangay Quipot</option><option>Barangay Tico</option><option>Others</option>
                </select>
                <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>{lang === 'en' ? 'Barangay' : 'Barangay'}</label>
              </div>

              <div className="form-group mb-4">
                <input className="form-control" name="address" value={formData.address} onChange={handleChange} placeholder=" " />
                <label className="form-label">{text.bAddress}</label>
              </div>

              <div className="form-group mb-4">
                <input type="date" className="form-control" name="date_established" value={formData.date_established} onChange={handleChange} placeholder=" " style={{ paddingTop: '0.75rem' }} />
                <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>
                  {lang === 'en' ? 'Date Business Started / Established' : 'Petsa ng Pagsisimula ng Negosyo'}
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{text.s3title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{text.s3desc}</p>
              
              <div className="form-group mb-4">
                <input type="number" className="form-control" name="capitalization" value={formData.capitalization} onChange={handleChange} placeholder=" " />
                <label className="form-label">{text.cap}</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.capDesc}</p>
              </div>
              
              <div className="form-group mb-4">
                <input type="number" className="form-control" name="gross_sales" value={formData.gross_sales} onChange={handleChange} placeholder=" " />
                <label className="form-label">{text.gross}</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{text.grossDesc}</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <input type="number" className="form-control" name="floor_area" value={formData.floor_area} onChange={handleChange} placeholder=" " />
                  <label className="form-label">{text.floor}</label>
                </div>
                <div className="form-group">
                  <input type="number" className="form-control" name="employees" value={formData.employees} onChange={handleChange} placeholder=" " />
                  <label className="form-label">{text.emp}</label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{text.s4title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{text.s4desc}</p>
              
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
