import React, { useState, useEffect } from 'react';
import {
  X, Save, RotateCcw, Building2, User, MapPin, 
  Briefcase, DollarSign, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function FormBPLOEditModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  isTl = false
}) {
  const [activeTab, setActiveTab] = useState('registration');
  const [formData, setFormData] = useState({});
  const [savedAlert, setSavedAlert] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(formData);
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  };

  const ROXAS_BARANGAYS = [
    'Bagumbayan', 'Cantil', 'Dangay', 'Happy Valley', 'Libertad', 
    'Mabuhay', 'Paclasan', 'Poblacion', 'San Aquilino', 'San Isidro', 
    'San Jose', 'San Mariano', 'San Rafael', 'San Vicente', 'Victoria'
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #CBD5E1'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F8FAFC'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: 'var(--primary-green-light, #DCFCE7)',
                color: 'var(--primary-green, #15803D)',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                Form BPLO-01
              </span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--government-navy, #0F172A)', margin: 0 }}>
                {isTl ? 'I-edit ang Impormasyon ng Form' : 'Edit Official Application Details'}
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
              {isTl 
                ? 'Punan ang mga natitirang patlang na hindi naisama sa unang pagpaparehistro bago i-print ang opisyal na form.'
                : 'Fill in or update any remaining fields required by the official Roxas BPLO form before printing.'}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F1F5F9',
          overflowX: 'auto',
          padding: '0 0.5rem'
        }}>
          {[
            { id: 'registration', label: isTl ? '1. Rehistro at May-ari' : '1. Registration & Owner', icon: User },
            { id: 'location', label: isTl ? '2. Lokasyon at Kontak' : '2. Location & Contact', icon: MapPin },
            { id: 'operations', label: isTl ? '3. Operasyon at Lugar' : '3. Operations & Facility', icon: Building2 },
            { id: 'financial', label: isTl ? '4. Pananalapi at Bayad' : '4. Financials & Payment', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderBottom: isActive ? '3px solid var(--primary-green, #15803D)' : '3px solid transparent',
                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? 'var(--government-navy, #0F172A)' : '#64748B',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} color={isActive ? 'var(--primary-green, #15803D)' : '#94A3B8'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>

          {/* TAB 1: REGISTRATION & OWNER */}
          {activeTab === 'registration' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Business Name (Pangalan ng Negosyo) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_name || ''}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Trade Name / Franchise (If applicable)
                  </label>
                  <input
                    type="text"
                    value={formData.trade_name || ''}
                    onChange={(e) => handleChange('trade_name', e.target.value)}
                    placeholder="Same as business name if none"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Organization Type (Uri ng Organisasyon)
                  </label>
                  <select
                    value={formData.ownership_type || 'Sole Proprietorship'}
                    onChange={(e) => handleChange('ownership_type', e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13.5px', background: '#fff' }}
                  >
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="One Person Corporation">One Person Corporation (OPC)</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Corporation">Corporation (Filipino / Foreign)</option>
                    <option value="Cooperative">Cooperative</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Gender of Registrant / Proprietor
                  </label>
                  <div style={{ display: 'flex', gap: '1.5rem', padding: '0.55rem 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="owner_gender"
                        checked={formData.owner_gender !== 'Female'}
                        onChange={() => handleChange('owner_gender', 'Male')}
                      /> Male (Lalaki)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="owner_gender"
                        checked={formData.owner_gender === 'Female'}
                        onChange={() => handleChange('owner_gender', 'Female')}
                      /> Female (Babae)
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    DTI / SEC / CDA Registration No.
                  </label>
                  <input
                    type="text"
                    value={formData.dti_sec_cda_number || ''}
                    onChange={(e) => handleChange('dti_sec_cda_number', e.target.value)}
                    placeholder="e.g. DTI Certificate # or SEC Reg #"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Tax Identification Number (TIN)
                  </label>
                  <input
                    type="text"
                    value={formData.tin || ''}
                    onChange={(e) => handleChange('tin', e.target.value)}
                    placeholder="e.g. 123-456-789-000"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  />
                </div>
              </div>

              {/* Owner Names breakdown */}
              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: '0.75rem' }}>
                  Owner / President / Authorized Representative Details
                </span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Surname (Apelyido) *
                    </label>
                    <input
                      type="text"
                      value={formData.owner_surname || ''}
                      onChange={(e) => handleChange('owner_surname', e.target.value)}
                      placeholder="e.g. Dela Cruz"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Given Name (Pangalan) *
                    </label>
                    <input
                      type="text"
                      value={formData.owner_given_name || ''}
                      onChange={(e) => handleChange('owner_given_name', e.target.value)}
                      placeholder="e.g. Juan"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Middle Name (Gitnang Pangalan)
                    </label>
                    <input
                      type="text"
                      value={formData.owner_middle_name || ''}
                      onChange={(e) => handleChange('owner_middle_name', e.target.value)}
                      placeholder="e.g. Santos"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Suffix (Jr., Sr., III)
                    </label>
                    <input
                      type="text"
                      value={formData.owner_suffix || ''}
                      onChange={(e) => handleChange('owner_suffix', e.target.value)}
                      placeholder="e.g. Jr."
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Signatory Designation / Position (Designasyon sa Form)
                  </label>
                  <input
                    type="text"
                    value={formData.signatory_title || ''}
                    onChange={(e) => handleChange('signatory_title', e.target.value)}
                    placeholder="e.g. Owner / Proprietor, President, General Manager"
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: LOCATION & CONTACT */}
          {activeTab === 'location' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    House / Bldg. No.
                  </label>
                  <input
                    type="text"
                    value={formData.house_bldg_no || ''}
                    onChange={(e) => handleChange('house_bldg_no', e.target.value)}
                    placeholder="e.g. Bldg 4, Unit 2"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Building Name
                  </label>
                  <input
                    type="text"
                    value={formData.building_name || ''}
                    onChange={(e) => handleChange('building_name', e.target.value)}
                    placeholder="e.g. Roxas Commercial Center"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Lot No. / Block No.
                  </label>
                  <input
                    type="text"
                    value={formData.lot_no || ''}
                    onChange={(e) => handleChange('lot_no', e.target.value)}
                    placeholder="e.g. Lot 12 Block 3"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Street Address (Kalye) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.street || formData.address || ''}
                    onChange={(e) => {
                      handleChange('street', e.target.value);
                      handleChange('address', e.target.value);
                    }}
                    placeholder="e.g. Rizal Street"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Barangay (Roxas) *
                  </label>
                  <select
                    value={formData.barangay || 'Poblacion'}
                    onChange={(e) => handleChange('barangay', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#fff' }}
                  >
                    {ROXAS_BARANGAYS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Subdivision / Sitio
                  </label>
                  <input
                    type="text"
                    value={formData.subdivision || ''}
                    onChange={(e) => handleChange('subdivision', e.target.value)}
                    placeholder="e.g. Purok 4"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Municipality / City
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Roxas"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#F1F5F9' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Province &amp; Zip
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Oriental Mindoro 5212"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#F1F5F9' }}
                  />
                </div>
              </div>

              {/* Contact numbers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contact_number || ''}
                    onChange={(e) => handleChange('contact_number', e.target.value)}
                    placeholder="e.g. 0917-123-4567"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Telephone Number (Landline)
                  </label>
                  <input
                    type="text"
                    value={formData.telephone_no || ''}
                    onChange={(e) => handleChange('telephone_no', e.target.value)}
                    placeholder="e.g. (043) 289-XXXX"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. owner@gmail.com"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: OPERATIONS & FACILITY */}
          {activeTab === 'operations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Total Floor Area (sq.m.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.floor_area || ''}
                    onChange={(e) => handleChange('floor_area', e.target.value)}
                    placeholder="e.g. 45.5"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Total Number of Employees
                  </label>
                  <input
                    type="number"
                    value={formData.employees ?? ''}
                    onChange={(e) => handleChange('employees', e.target.value)}
                    placeholder="e.g. 3"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Employees Residing within Roxas
                  </label>
                  <input
                    type="number"
                    value={formData.employees_residing_lgu ?? formData.employees ?? ''}
                    onChange={(e) => handleChange('employees_residing_lgu', e.target.value)}
                    placeholder="e.g. 3"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Delivery vehicles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Delivery Vehicles: Van / Truck
                  </label>
                  <input
                    type="number"
                    value={formData.delivery_trucks ?? 0}
                    onChange={(e) => handleChange('delivery_trucks', e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Delivery Vehicles: Motorcycle
                  </label>
                  <input
                    type="number"
                    value={formData.delivery_motorcycles ?? 0}
                    onChange={(e) => handleChange('delivery_motorcycles', e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Property ownership */}
              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Property Ownership (Katayuan ng Ari-arian)
                </label>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="is_owned"
                      checked={formData.is_owned !== false}
                      onChange={() => handleChange('is_owned', true)}
                    /> Owned (May-ari ng Lupa/Gusali)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="is_owned"
                      checked={formData.is_owned === false}
                      onChange={() => handleChange('is_owned', false)}
                    /> Rented / Leased (Inuupahan)
                  </label>
                </div>

                {formData.is_owned !== false ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                        Tax Declaration No. (TDN)
                      </label>
                      <input
                        type="text"
                        value={formData.tax_dec_no || ''}
                        onChange={(e) => handleChange('tax_dec_no', e.target.value)}
                        placeholder="e.g. TD-2024-00129"
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                        Property Identification No. (PIN)
                      </label>
                      <input
                        type="text"
                        value={formData.pin_no || ''}
                        onChange={(e) => handleChange('pin_no', e.target.value)}
                        placeholder="e.g. 035-08-001-..."
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                        Monthly Rental (PHP)
                      </label>
                      <input
                        type="number"
                        value={formData.monthly_rental || ''}
                        onChange={(e) => handleChange('monthly_rental', e.target.value)}
                        placeholder="e.g. 8000"
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                        Lessor's Full Name (May-ari ng Pinapaupahan)
                      </label>
                      <input
                        type="text"
                        value={formData.lessor_name || ''}
                        onChange={(e) => handleChange('lessor_name', e.target.value)}
                        placeholder="e.g. Maria Clara Properties"
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tax incentives */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Tax Incentives from Government Entity (e.g. BMBE, BOI, PEZA)
                </label>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="has_tax_incentives"
                      checked={!formData.has_tax_incentives}
                      onChange={() => handleChange('has_tax_incentives', false)}
                    /> None (Wala)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="has_tax_incentives"
                      checked={!!formData.has_tax_incentives}
                      onChange={() => handleChange('has_tax_incentives', true)}
                    /> Yes (Mayroon - attach certificate)
                  </label>
                </div>
                {formData.has_tax_incentives && (
                  <input
                    type="text"
                    value={formData.incentive_details || ''}
                    onChange={(e) => handleChange('incentive_details', e.target.value)}
                    placeholder="e.g. BMBE Registered under R.A. 9178"
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                )}
              </div>

            </div>
          )}

          {/* TAB 4: FINANCIALS & PAYMENT */}
          {activeTab === 'financial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Application Type (Uri ng Aplikasyon)
                  </label>
                  <select
                    value={formData.application_type || 'NEW'}
                    onChange={(e) => handleChange('application_type', e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="NEW">NEW (Bagong Negosyo)</option>
                    <option value="RENEWAL">RENEWAL (Pagpapanibago)</option>
                    <option value="ADDITIONAL">ADDITIONAL (Karagdagang Linya)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Mode of Payment (Paraan ng Pagbayad)
                  </label>
                  <select
                    value={formData.payment_mode || 'Annually'}
                    onChange={(e) => handleChange('payment_mode', e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="Annually">Annually (Taunan - 1 Pay)</option>
                    <option value="Bi-annually">Bi-annually (Kalahating Taon - 2 Pays)</option>
                    <option value="Quarterly">Quarterly (Kada Tatlong Buwan - 4 Pays)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Tax Year
                  </label>
                  <input
                    type="number"
                    value={formData.tax_year || new Date().getFullYear()}
                    onChange={(e) => handleChange('tax_year', e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Line of Business / Industry *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.industry_category || formData.business_type || ''}
                    onChange={(e) => {
                      handleChange('industry_category', e.target.value);
                      handleChange('business_type', e.target.value);
                    }}
                    placeholder="e.g. Retail / Sari-Sari Store, Eatery, Pharmacy"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Products / Services
                  </label>
                  <input
                    type="text"
                    value={formData.primary_products || formData.business_description || ''}
                    onChange={(e) => handleChange('primary_products', e.target.value)}
                    placeholder="e.g. Grocery items, canned goods, rice"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Capitalization (For New Business)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.capitalization || ''}
                    onChange={(e) => handleChange('capitalization', e.target.value)}
                    placeholder="PHP 50,000.00"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Gross Sales / Receipts (For Renewal)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gross_sales || ''}
                    onChange={(e) => handleChange('gross_sales', e.target.value)}
                    placeholder="Prior year gross sales"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

            </div>
          )}

        </form>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'transparent',
              border: '1px solid #CBD5E1',
              color: '#475569',
              padding: '0.55rem 1rem',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
            {isTl ? 'I-reset sa Default' : 'Reset'}
          </button>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {savedAlert && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#15803D', fontSize: '12.5px', fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Saved!
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748B',
                padding: '0.55rem 1rem',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isTl ? 'Kanselahin' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'var(--primary-green, #15803D)',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.6rem 1.35rem',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <Save size={15} />
              {isTl ? 'I-save at I-apply sa Form' : 'Save & Apply to Form'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
