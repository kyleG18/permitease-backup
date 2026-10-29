import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  FileText, Search, Edit3, Printer, Eye, CheckCircle2,
  AlertCircle, ShieldCheck, Building2, Phone, Calendar,
  ArrowRight, Download, Filter, Check, X
} from 'lucide-react';
import UnifiedApplicationFormView from '../components/UnifiedApplicationFormView';
import FormBPLOEditModal from '../components/FormBPLOEditModal';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',                   color: '#64748B', bg: '#F1F5F9' },
  SUBMITTED:        { label: 'Submitted',               color: '#2563EB', bg: '#DBEAFE' },
  UNDER_REVIEW:     { label: 'Under Review',            color: '#D97706', bg: '#FEF3C7' },
  NEEDS_CORRECTION: { label: 'Needs Correction',        color: '#DC2626', bg: '#FEE2E2' },
  APPROVED:         { label: 'Verified',                color: '#16A34A', bg: '#DCFCE7' },
  REJECTED:         { label: 'Corrections Requested',   color: '#991B1B', bg: '#FEE2E2' },
  CANCELLED:        { label: 'Cancelled',               color: '#64748B', bg: '#F1F5F9' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };
  return (
    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '11px', fontWeight: '700', color: cfg.color, backgroundColor: cfg.bg, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
};

const FILTERS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED'];

export default function LGUApplications() {
  const { token, user } = useContext(AuthContext);
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modal states for Preview & Edit Form
  const [previewApp, setPreviewApp] = useState(null);
  const [editApp, setEditApp] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadApplications = (status = filter) => {
    setLoading(true);
    const url = status === 'ALL'
      ? `${API}/applications/admin/all`
      : `${API}/applications/admin/all?status=${status}`;
    fetch(url, { headers })
      .then(r => r.json())
      .then(data => {
        setApplications(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadApplications(filter);
  }, [filter]);

  // Handle saving form data edited by BPLO personnel
  const handleSaveFormData = async (updatedData) => {
    if (!editApp?.id) return;
    try {
      await axios.put(`${API}/applications/admin/${editApp.id}/form-data`, updatedData, { headers });
      localStorage.setItem(`bplo_form_data_admin_${editApp.id}`, JSON.stringify(updatedData));
      
      setActionSuccess('Application form details updated and reflected successfully!');
      setTimeout(() => setActionSuccess(''), 4000);

      // If previewing, immediately update the preview state to reflect changes live
      if (previewApp && previewApp.id === editApp.id) {
        setPreviewApp({ ...previewApp, ...updatedData });
      }

      loadApplications(filter);
    } catch (err) {
      setActionError('Failed to save updated form fields.');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  // Convert raw app row into standard Form BPLO data structure
  const getAppFormData = (app) => {
    if (!app) return null;
    const savedKey = `bplo_form_data_admin_${app.id}`;
    let savedLocal = {};
    try {
      const stored = localStorage.getItem(savedKey);
      if (stored) savedLocal = JSON.parse(stored);
    } catch (e) {}

    const ownerParts = (app.owner_name || '').trim().split(' ');
    return {
      business_id: app.business_id,
      application_number: app.application_number,
      application_type: app.application_type || 'NEW',
      payment_mode: app.payment_mode || 'Annually',
      tax_year: app.tax_year || new Date().getFullYear(),
      application_date: app.created_at
        ? new Date(app.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
      business_name: app.business_name || '',
      trade_name: app.trade_name || app.business_name || '',
      ownership_type: app.ownership_type || 'Sole Proprietorship',
      owner_gender: app.owner_gender || 'Male',
      corp_nationality: app.corp_nationality || 'Filipino',
      dti_sec_cda_number: app.dti_sec_cda_number || app.registration_number || '',
      tin: app.tin || '',
      owner_name: app.owner_name || '',
      owner_surname: ownerParts.length > 1 ? ownerParts.slice(-1)[0] : '',
      owner_given_name: ownerParts.length > 1 ? ownerParts.slice(0, -1).join(' ') : (ownerParts[0] || ''),
      owner_middle_name: '',
      owner_suffix: '',
      signatory_title: (app.ownership_type || '').toLowerCase().includes('corp') ? 'PRESIDENT / CEO' : 'OWNER / PROPRIETOR',
      house_bldg_no: '', building_name: '', lot_no: '', block_no: '',
      street: app.address || '',
      address: app.address || '',
      barangay: app.barangay || 'Poblacion',
      subdivision: '',
      city_municipality: 'Roxas',
      province: 'Oriental Mindoro',
      zip_code: '5212',
      contact_number: app.contact_number || '',
      telephone_no: '',
      email: app.email || '',
      business_area: app.floor_area || '',
      floor_area: app.floor_area || '',
      employees: app.employees || 0,
      employees_male: Math.ceil((app.employees || 0) / 2),
      employees_female: Math.floor((app.employees || 0) / 2),
      employees_residing_lgu: app.employees || 0,
      delivery_trucks: 0, delivery_motorcycles: 0,
      is_owned: !(app.premises_type || '').toLowerCase().includes('rent'),
      tax_dec_no: '', pin_no: '', monthly_rental: '', lessor_name: '',
      has_tax_incentives: false, incentive_details: '',
      business_activity: 'Main Office',
      industry_category: app.industry_category || app.business_type || '',
      business_type: app.business_type || app.industry_category || '',
      primary_products: app.primary_products || 'Commercial Operations',
      units_count: '1',
      capitalization: app.capitalization || '',
      gross_sales: app.gross_sales || '',
      ...savedLocal,
      ...app
    };
  };

  const filteredApps = applications.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (a.application_number || '').toLowerCase().includes(s) ||
      (a.business_name || '').toLowerCase().includes(s) ||
      (a.owner_name || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="page-container lgu-applications-page" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--government-navy, #0F172A)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} strokeWidth={2.4} />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary-green, #15803D)' }}>
                MUNICIPALITY OF ROXAS • BPLO LICENSING SECTION
              </span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--government-navy, #0F172A)', margin: 0 }}>
                Application Forms (Form BPLO-01)
              </h1>
            </div>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Official Roxas Unified Business Permit Application Forms submitted by MSMEs. BPLO personnel can edit all form fields, print, download, or conduct preparation reviews.
          </p>
        </div>

        {/* Quick Link to Walk-in Schedule */}
        <Link
          to="/admin/walkins"
          className="btn btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1rem',
            fontSize: '13px',
            fontWeight: 700,
            borderColor: '#CBD5E1',
            color: 'var(--government-navy, #0F172A)',
            textDecoration: 'none',
            borderRadius: '8px'
          }}
        >
          <Calendar size={15} color="var(--primary-green, #15803D)" />
          View Walk-in Schedule Roster &rarr;
        </Link>
      </header>

      {/* ── NOTIFICATIONS / ALERTS ───────────────────────────────────────── */}
      {actionSuccess && (
        <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#166534', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* ── TOOLBAR: SEARCH & STATUS FILTER ──────────────────────────────── */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px', backgroundColor: '#F8FAFC', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search by Form #, Business Name, or Owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13.5px', width: '100%' }}
          />
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: filter === f ? '1px solid var(--government-navy, #0F172A)' : '1px solid #CBD5E1',
                backgroundColor: filter === f ? 'var(--government-navy, #0F172A)' : '#FFFFFF',
                color: filter === f ? '#FFFFFF' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>

      </div>

      {/* ── APPLICATIONS TABLE ───────────────────────────────────────────── */}
      <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            Loading application forms...
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <FileText size={38} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--government-navy, #0F172A)', margin: '0 0 0.25rem' }}>
              No Application Forms Found
            </h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
              There are no MSME applications matching the selected criteria.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Form / Ref #</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Business Profile</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Applicant / Owner</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Type &amp; Date</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>BPLO Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => {
                  const formData = getAppFormData(app);
                  return (
                    <tr
                      key={app.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Form Ref # */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '13px',
                          color: 'var(--primary-green, #15803D)',
                          backgroundColor: '#F0FDF4',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #DCFCE7'
                        }}>
                          {app.application_number}
                        </span>
                        {app.queue_ticket_number && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                            Ticket: #{app.queue_ticket_number}
                          </div>
                        )}
                      </td>

                      {/* Business Profile */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--government-navy, #0F172A)' }}>
                          {app.business_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {app.ownership_type || 'Sole Proprietorship'} • {app.industry_category || app.business_type || 'Retail'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          Brgy. {app.barangay || 'Poblacion'}, Roxas
                        </div>
                      </td>

                      {/* Owner & Contact */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {app.owner_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Phone size={11} /> {app.contact_number || 'No contact'}
                        </div>
                      </td>

                      {/* Type & Date */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--government-navy, #0F172A)' }}>
                          {app.application_type === 'NEW' ? 'New Permit' : 'Renewal'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {app.created_at ? new Date(app.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <StatusBadge status={app.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          
                          {/* Edit Form Button */}
                          <button
                            onClick={() => {
                              setEditApp(formData);
                              setIsEditModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1.5px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--government-navy, #0F172A)',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Edit all fields of Form BPLO-01"
                          >
                            <Edit3 size={13} /> Edit Form
                          </button>

                          {/* View & Print Form BPLO-01 */}
                          <button
                            onClick={() => setPreviewApp(formData)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--primary-green, #15803D)',
                              backgroundColor: '#F0FDF4',
                              color: 'var(--primary-green, #15803D)',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Preview and print filled Form BPLO-01"
                          >
                            <Printer size={13} /> Print Form
                          </button>

                          {/* Review Details */}
                          <Link
                            to={`/admin/applications/${app.id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              backgroundColor: 'var(--government-navy, #0F172A)',
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                            title="Full administrative review and checklist"
                          >
                            Review &rarr;
                          </Link>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ── FORM BPLO-01 FULL PREVIEW / PRINT MODAL ──────────────────────── */}
      {previewApp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Top Toolbar */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--government-navy, #0F172A)' }}>
                  Form BPLO-01: {previewApp.business_name}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Application #{previewApp.application_number}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setEditApp(previewApp);
                    setIsEditModalOpen(true);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                >
                  <Edit3 size={14} /> Edit Fields
                </button>
                <button
                  onClick={() => setPreviewApp(null)}
                  className="btn btn-outline btn-sm"
                  style={{ fontWeight: 600 }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
              <UnifiedApplicationFormView
                app={previewApp}
                printable={true}
                showInstructions={false}
                onEditInfo={() => {
                  setEditApp(previewApp);
                  setIsEditModalOpen(true);
                }}
                onBack={() => setPreviewApp(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── BPLO FORM EDIT MODAL (ALL FIELDS) ────────────────────────────── */}
      <FormBPLOEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={editApp}
        onSave={handleSaveFormData}
        isTl={false}
      />

    </div>
  );
}
