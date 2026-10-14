import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Printer,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const php = (n) =>
  isNaN(n) || n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

const CATEGORY_INFO = {
  'permit fee': { label: "Mayor's Permit & Licensing", why: 'Required to operate legally within the municipality.' },
  'fire safety fee': { label: 'Fire Safety Clearance (BFP)', why: 'Required under RA 9514. BFP inspects the premises for fire hazards.' },
  'sanitary fee': { label: 'Health & Sanitation Clearance', why: 'Required by the Municipal Health Office for food and commercial establishments.' },
  'other fee': { label: 'Environmental & Garbage Services', why: 'Solid waste collection fee based on floor area.' },
};

const getCatInfo = (category) => {
  const key = (category || '').toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_INFO)) {
    if (key.includes(k)) return v;
  }
  return { label: category, why: 'Standard regulatory fee.' };
};

export default function FeeEstimation() {
  const { token } = useContext(AuthContext);

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [industryCategory, setIndustryCategory] = useState('');
  const [floorArea, setFloorArea] = useState('');
  const [employees, setEmployees] = useState('');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showDetails, setShowDetails] = useState(true);
  const [expandedFeeId, setExpandedFeeId] = useState(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    fetch(`${API}/businesses`, { headers })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setBusinesses(list);
        if (list.length > 0) {
          const b = list[0];
          setSelectedBizId(String(b.id));
          setBusinessType(b.business_type || '');
          setIndustryCategory(b.industry_category || '');
          setFloorArea(b.floor_area || '');
          setEmployees(b.employees || '');
        }
      })
      .catch(console.error);
  }, [headers]);

  const doFetch = async (bizId) => {
    if (!bizId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/tax/estimate/${bizId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load estimate.');
      setEstimate(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedBizId) doFetch(selectedBizId); }, [selectedBizId]);

  const handleBizChange = (e) => {
    const id = e.target.value;
    setSelectedBizId(id);
    const b = businesses.find(x => String(x.id) === id);
    if (b) {
      setBusinessType(b.business_type || '');
      setIndustryCategory(b.industry_category || '');
      setFloorArea(b.floor_area || '');
      setEmployees(b.employees || '');
    }
  };

  const feeList = estimate?.regulatory_fees || [];
  const lbtList = estimate?.local_business_tax || [];

  const totalFees = useMemo(() =>
    estimate?.total_fee_amount ?? feeList.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [estimate, feeList]);

  const totalTax = useMemo(() =>
    estimate?.total_tax_amount ?? lbtList.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [estimate, lbtList]);

  const grandTotal = useMemo(() =>
    estimate?.total_estimated_amount ?? (totalFees + totalTax),
    [estimate, totalFees, totalTax]);

  const grouped = useMemo(() => {
    const map = {};
    for (const f of feeList) {
      const info = getCatInfo(f.category);
      if (!map[info.label]) map[info.label] = { info, items: [] };
      map[info.label].items.push(f);
    }
    return Object.values(map);
  }, [feeList]);

  return (
    <div className="estimation-page-container">

      {/* ── PRINT HEADER ── */}
      <div className="print-header" style={{ display: 'none', borderBottom: '2px solid #0F5C2D', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F5C2D' }}>MUNICIPALITY OF ROXAS — PermitEase</div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '0.25rem' }}>
          <strong>FOR PREPARATION PURPOSES ONLY — NOT AN OFFICIAL ASSESSMENT.</strong> Date: {new Date().toLocaleDateString('en-PH')}
        </div>
      </div>

      {/* ── PAGE HEADING ── */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#167A3D', fontWeight: '700', marginBottom: '0.2rem' }}>Municipality of Roxas</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#172033', margin: 0 }}>Estimate Your Regulatory Fees</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {businesses.length > 1 && (
            <select
              value={selectedBizId} onChange={handleBizChange}
              style={{ padding: '0.55rem 0.85rem', borderRadius: '7px', border: '1.5px solid #CBD5E1', fontSize: '13px', color: '#172033', backgroundColor: 'white' }}
            >
              {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
            </select>
          )}
          <button
            onClick={() => window.print()}
            style={{ padding: '0.55rem 0.95rem', backgroundColor: '#172033', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', color: '#991B1B', fontSize: '14px', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ════════════════════════════════════════
          THE BIG NUMBER — Full Width Hero Banner
          ════════════════════════════════════════ */}
      <div style={{
        backgroundColor: '#F0FDF4', border: '2px solid #86EFAC',
        borderRadius: '14px', padding: '1.75rem 2rem',
        textAlign: 'center', marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(22, 122, 61, 0.05)'
      }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
          Amount to Prepare
        </div>

        {loading ? (
          <div style={{ fontSize: '24px', color: '#64748B', padding: '0.5rem 0' }}>Calculating…</div>
        ) : (
          <>
            <div style={{ fontSize: '48px', fontWeight: '900', color: '#15803D', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {php(grandTotal)}
            </div>
            <div style={{ fontSize: '13.5px', color: '#166534', marginTop: '0.5rem' }}>
              Estimated combined amount for your BPLO visit
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '0.5rem 1.25rem', backgroundColor: 'white', borderRadius: '9999px', border: '1px solid #BBF7D0', fontSize: '13.5px', color: '#1E293B', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                Regulatory Fees: <strong style={{ color: '#15803D' }}>{php(totalFees)}</strong>
              </div>
              <Link to="/tax-estimation" style={{ padding: '0.5rem 1.25rem', backgroundColor: 'white', borderRadius: '9999px', border: '1px solid #BBF7D0', fontSize: '13.5px', color: '#1E293B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                Business Tax: <strong style={{ color: '#15803D' }}>{php(totalTax)}</strong> →
              </Link>
            </div>
          </>
        )}

        <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '1rem', fontStyle: 'italic' }}>
          Preliminary estimate only — not an official assessment. Confirm with the BPLO before paying.
        </div>
      </div>

      {/* ════════════════════════════════════════
          TWO BALANCED COLUMNS (FILLS SCREEN SPACE)
          ════════════════════════════════════════ */}
      <div className="estimation-grid">

        {/* ── LEFT COLUMN: Input & Fee Breakdown ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Business Space & Staff Input */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#172033', marginBottom: '0.85rem' }}>
              Update your business space & staff
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', color: '#334155', marginBottom: '0.3rem' }}>
                  Business space size
                </label>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '0.4rem' }}>in square meters (sqm)</div>
                <input
                  type="number" value={floorArea} onChange={e => setFloorArea(e.target.value)}
                  placeholder="e.g. 50"
                  style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '15px', color: '#172033', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', color: '#334155', marginBottom: '0.3rem' }}>
                  Number of employees
                </label>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '0.4rem' }}>include owner if working</div>
                <input
                  type="number" value={employees} onChange={e => setEmployees(e.target.value)}
                  placeholder="e.g. 2"
                  style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '15px', color: '#172033', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              onClick={() => doFetch(selectedBizId)} disabled={loading}
              style={{ width: '100%', padding: '0.85rem', backgroundColor: '#167A3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'default' : 'pointer', transition: 'background-color 0.15s' }}
            >
              {loading ? 'Updating…' : 'Update Estimate'}
            </button>
          </div>

          {/* Fee Breakdown Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#172033' }}>
                What fees make up this total?
              </div>
              <span style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: '600' }}>
                {feeList.length} fee items
              </span>
            </div>

            {grouped.map((group, gi) => (
              <div key={gi} style={{ marginBottom: gi < grouped.length - 1 ? '1.25rem' : 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  {group.info.label}
                </div>

                {group.items.map((fee, fi) => (
                  <div key={fi} style={{ marginBottom: fi < group.items.length - 1 ? '0.5rem' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{fee.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.15rem', fontFamily: 'monospace' }}>
                          {fee.calculation_details || fee.description}
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedFeeId(expandedFeeId === fee.id ? null : fee.id)}
                          style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', color: '#167A3D', fontWeight: '600', cursor: 'pointer', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          {expandedFeeId === fee.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          Why does this fee apply?
                        </button>
                        {expandedFeeId === fee.id && (
                          <div style={{ marginTop: '0.45rem', fontSize: '12.5px', color: '#334155', lineHeight: '1.5', padding: '0.65rem', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                            {group.info.why}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', flexShrink: 0 }}>
                        {fee.status === 'TO BE ASSESSED' ? (
                          <span style={{ fontSize: '12px', color: '#D97706' }}>To assess</span>
                        ) : php(fee.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

        </div>

        {/* ── RIGHT COLUMN: Clearance Roadmap & Municipal Guidance ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Card 1: Before You Visit the BPLO */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#172033', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={19} color="#167A3D" /> Before You Visit the BPLO
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '1rem' }}>
              You will need to visit these offices for clearances — prepare them in this order:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { n: 1, label: 'Barangay Office', sub: 'Get your Barangay Business Clearance first' },
                { n: 2, label: 'Bureau of Fire Protection (BFP)', sub: 'Fire Safety Inspection Certificate (FSIC)' },
                { n: 3, label: 'Municipal Health Office', sub: 'Sanitary Permit to Operate (for food / commercial)' },
                { n: 4, label: 'BPLO — Submit application', sub: 'Bring all clearances and this printed estimate' },
                { n: 5, label: "Municipal Treasurer's Office (MTO)", sub: 'Pay assessed taxes and regulatory fees' },
              ].map(item => (
                <div key={item.n} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#167A3D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>
                    {item.n}
                  </span>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1E293B' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/readiness"
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.45rem', marginTop: '1.25rem', padding: '0.8rem', backgroundColor: '#167A3D', color: 'white', borderRadius: '8px', fontSize: '13.5px', fontWeight: '700', textDecoration: 'none' }}
            >
              Review Full Permit Readiness Checklist <ArrowRight size={15} />
            </Link>
          </div>

          {/* Card 2: Filing Location */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#172033', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Building2 size={16} color="#167A3D" /> Filing at Roxas Municipal Hall
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '13px', color: '#475569' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <MapPin size={15} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong>Location:</strong> Business Permits & Licensing Office (BPLO), Ground Floor, Municipal Hall, Roxas, Oriental Mindoro</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Calendar size={15} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong>Office Hours:</strong> Monday to Friday, 8:00 AM – 5:00 PM</span>
              </div>
            </div>
          </div>

          {/* Card 3: Switch to Business Tax */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#172033' }}>Looking for Business Tax?</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.15rem' }}>Calculate Local Business Tax based on sales or capital</div>
            </div>
            <Link
              to="/tax-estimation"
              style={{ padding: '0.5rem 0.85rem', backgroundColor: 'white', color: '#167A3D', border: '1.5px solid #167A3D', borderRadius: '7px', fontSize: '12.5px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
            >
              Tax Estimation <ArrowRight size={13} />
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
