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
  Clock,
  Building2,
  MapPin,
  Calendar,
  Sparkles,
  Save,
  Check
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const php = (n) =>
  isNaN(n) || n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

export default function TaxEstimation() {
  const { token } = useContext(AuthContext);

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [assessmentType, setAssessmentType] = useState('Renewal'); // 'Renewal' | 'New Business'
  const [taxYear] = useState('2026');

  // Sales Period: 'annual' | 'quarterly'
  const [salesPeriod, setSalesPeriod] = useState('annual');
  const [salesInput, setSalesInput] = useState('');
  const [capitalization, setCapitalization] = useState('');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const [showDetails, setShowDetails] = useState(false);
  const [showLate, setShowLate] = useState(false);
  const [lateDate, setLateDate] = useState('2026-03-20');
  const [paymentMode, setPaymentMode] = useState('annual'); // 'annual' | 'quarterly'

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }), [token]);

  useEffect(() => {
    fetch(`${API}/businesses`, { headers })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setBusinesses(list);
        if (list.length > 0) {
          const b = list[0];
          setSelectedBizId(String(b.id));
          setBusinessName(b.business_name || '');
          setBusinessType(b.business_type || '');
          const isNew = b.business_status === 'New Application';
          setAssessmentType(isNew ? 'New Business' : 'Renewal');
          setSalesInput(b.gross_sales ? String(b.gross_sales) : '');
          setCapitalization(b.capitalization ? String(b.capitalization) : '');
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
      setBusinessName(b.business_name || '');
      setBusinessType(b.business_type || '');
      const isNew = b.business_status === 'New Application';
      setAssessmentType(isNew ? 'New Business' : 'Renewal');
      setSalesInput(b.gross_sales ? String(b.gross_sales) : '');
      setCapitalization(b.capitalization ? String(b.capitalization) : '');
      setSaveSuccess(false);
    }
  };

  // Regulatory fees from backend (fixed clearances)
  const feeList = estimate?.regulatory_fees || [];
  const totalFees = useMemo(() =>
    estimate?.total_fee_amount ?? feeList.reduce((s, x) => s + (Number(x.amount) || 0), 0) ?? 1200,
    [estimate, feeList]);

  // Dynamic Live Tax Calculation
  // Renewal rate is 2% statutory cap under RA 7160 Sec. 143
  // New business rate is 0.05% statutory cap on capitalization
  const calc = useMemo(() => {
    if (assessmentType === 'New Business') {
      const cap = parseFloat(capitalization) || 0;
      const totalTax = cap * 0.0005; // 0.05%
      const quarterly = totalTax / 4;
      return {
        annualSales: 0,
        quarterlySales: 0,
        effectiveRate: 0.0005,
        rateLabel: '0.05% of capital',
        totalAnnualTax: totalTax,
        quarterlyInstallment: quarterly,
        hasInput: cap > 0
      };
    }

    const raw = parseFloat(salesInput) || 0;
    const rate = 0.02; // 2%
    let annualSales = 0;
    let quarterlySales = 0;

    if (salesPeriod === 'annual') {
      annualSales = raw;
      quarterlySales = raw / 4;
    } else {
      quarterlySales = raw;
      annualSales = raw * 4;
    }

    const totalAnnualTax = annualSales * rate;
    const quarterlyInstallment = totalAnnualTax / 4;

    return {
      annualSales,
      quarterlySales,
      effectiveRate: rate,
      rateLabel: '2.0% (RA 7160 Sec. 143 statutory cap)',
      totalAnnualTax,
      quarterlyInstallment,
      hasInput: raw > 0
    };
  }, [assessmentType, salesPeriod, salesInput, capitalization]);

  // Active business tax to prepare:
  // If payment mode is 'annual': full annual tax
  // If payment mode is 'quarterly': Q1 installment
  const activeTaxDue = paymentMode === 'annual'
    ? calc.totalAnnualTax
    : calc.quarterlyInstallment;

  // Grand total preparation estimate
  const grandTotal = activeTaxDue + totalFees;

  // Late Surcharge Calculation (based on active tax due)
  const penalty = useMemo(() => {
    const deadline = new Date(`${taxYear}-01-20T23:59:59`);
    const filing = new Date(`${lateDate}T00:00:00`);
    if (isNaN(filing) || filing <= deadline || activeTaxDue <= 0)
      return { isLate: false, total: activeTaxDue };
    const months = Math.min(Math.ceil((filing - deadline) / (1000 * 60 * 60 * 24 * 30)), 36);
    const surcharge = activeTaxDue * 0.25;
    const interest = activeTaxDue * 0.02 * months;
    return { isLate: true, months, surcharge, interest, total: activeTaxDue + surcharge + interest };
  }, [lateDate, taxYear, activeTaxDue]);

  // Save to business profile
  const handleSaveToProfile = async () => {
    if (!selectedBizId) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const b = businesses.find(x => String(x.id) === selectedBizId) || {};
      const payload = {
        ...b,
        business_status: assessmentType === 'New Business' ? 'New Application' : 'Renewal',
        gross_sales: calc.annualSales,
        capitalization: parseFloat(capitalization) || (b.capitalization || 0)
      };
      const res = await fetch(`${API}/businesses/${selectedBizId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update business profile.');
      setSaveSuccess(true);
      doFetch(selectedBizId);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="estimation-page-container">

      {/* ── PRINT HEADER (hidden on screen) ── */}
      <div className="print-header" style={{ display: 'none', borderBottom: '2px solid #0F5C2D', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F5C2D' }}>MUNICIPALITY OF ROXAS — PermitEase</div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '0.25rem' }}>
          <strong>FOR PREPARATION PURPOSES ONLY — NOT AN OFFICIAL TAX ASSESSMENT OR PERMIT.</strong> Date: {new Date().toLocaleDateString('en-PH')}
        </div>
      </div>

      {/* ── PAGE HEADING ── */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#167A3D', fontWeight: '700', marginBottom: '0.2rem' }}>Municipality of Roxas</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#172033', margin: 0 }}>Estimate Your Permit Costs</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {businesses.length > 1 && (
            <select
              value={selectedBizId}
              onChange={handleBizChange}
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
          {paymentMode === 'annual' ? 'Total Amount to Prepare (Annual)' : 'Amount to Prepare for Q1 (First Quarter)'}
        </div>

        {loading ? (
          <div style={{ fontSize: '24px', color: '#64748B', padding: '0.5rem 0' }}>Calculating…</div>
        ) : !calc.hasInput ? (
          <>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#D97706', margin: '0.25rem 0' }}>Enter your sales below</div>
            <div style={{ fontSize: '14px', color: '#92400E', marginTop: '0.35rem' }}>
              Select Annual or Quarterly below and type your sales to see your instant tax calculation.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', fontWeight: '900', color: '#15803D', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {php(grandTotal)}
            </div>
            <div style={{ fontSize: '13.5px', color: '#166534', marginTop: '0.5rem' }}>
              {paymentMode === 'annual'
                ? 'Full Annual Tax + Regulatory Clearances for your BPLO visit'
                : 'Quarter 1 Tax Installment + Regulatory Clearances for your BPLO visit'}
            </div>

            {/* Subtotal pills */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '0.5rem 1.25rem', backgroundColor: 'white', borderRadius: '9999px', border: '1px solid #BBF7D0', fontSize: '13.5px', color: '#1E293B', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                {paymentMode === 'annual' ? 'Annual Business Tax: ' : 'Q1 Business Tax: '}
                <strong style={{ color: '#15803D' }}>{php(activeTaxDue)}</strong>
              </div>
              <div style={{ padding: '0.5rem 1.25rem', backgroundColor: 'white', borderRadius: '9999px', border: '1px solid #BBF7D0', fontSize: '13.5px', color: '#1E293B', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                Regulatory Fees: <strong style={{ color: '#15803D' }}>{php(totalFees)}</strong>
              </div>
              {paymentMode === 'quarterly' && (
                <div style={{ padding: '0.5rem 1.25rem', backgroundColor: '#F8FAFC', borderRadius: '9999px', border: '1px solid #E2E8F0', fontSize: '13px', color: '#475569' }}>
                  Full Year Tax: <strong>{php(calc.totalAnnualTax)}</strong> (in 4 parts)
                </div>
              )}
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

        {/* ── LEFT COLUMN: Calculation & Options ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ════════════════════════════════════════
              PRIMARY CARD: SELECT ANNUAL OR QUARTERLY, INPUT SALES, TAX IS CALCULATED
              ════════════════════════════════════════ */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

            {/* Assessment Type Switcher (Renewal vs New Business) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#172033' }}>
                Business Tax Calculation
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setAssessmentType('Renewal')}
                  style={{
                    padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    border: assessmentType === 'Renewal' ? '1.5px solid #167A3D' : '1px solid #CBD5E1',
                    backgroundColor: assessmentType === 'Renewal' ? '#F0FDF4' : 'transparent',
                    color: assessmentType === 'Renewal' ? '#166534' : '#64748B'
                  }}
                >
                  Permit Renewal
                </button>
                <button
                  type="button"
                  onClick={() => setAssessmentType('New Business')}
                  style={{
                    padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    border: assessmentType === 'New Business' ? '1.5px solid #167A3D' : '1px solid #CBD5E1',
                    backgroundColor: assessmentType === 'New Business' ? '#F0FDF4' : 'transparent',
                    color: assessmentType === 'New Business' ? '#166534' : '#64748B'
                  }}
                >
                  New Business
                </button>
              </div>
            </div>

            {assessmentType === 'Renewal' ? (
              <>
                {/* 1. SELECT ANNUAL OR QUARTERLY */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#172033', marginBottom: '0.5rem' }}>
                    1. Select your sales period:
                  </label>
                  <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '10px', padding: '4px', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSalesPeriod('annual');
                        setPaymentMode('annual');
                      }}
                      style={{
                        flex: 1, padding: '0.65rem 0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        backgroundColor: salesPeriod === 'annual' ? '#FFFFFF' : 'transparent',
                        color: salesPeriod === 'annual' ? '#166534' : '#475569',
                        fontWeight: salesPeriod === 'annual' ? '700' : '500',
                        fontSize: '13.5px',
                        boxShadow: salesPeriod === 'annual' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center'
                      }}
                    >
                      <span>Annual Sales</span>
                      <span style={{ fontSize: '11px', color: salesPeriod === 'annual' ? '#167A3D' : '#64748B', fontWeight: 'normal' }}>Full 12-Month Year</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSalesPeriod('quarterly');
                        setPaymentMode('quarterly');
                      }}
                      style={{
                        flex: 1, padding: '0.65rem 0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        backgroundColor: salesPeriod === 'quarterly' ? '#FFFFFF' : 'transparent',
                        color: salesPeriod === 'quarterly' ? '#166534' : '#475569',
                        fontWeight: salesPeriod === 'quarterly' ? '700' : '500',
                        fontSize: '13.5px',
                        boxShadow: salesPeriod === 'quarterly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center'
                      }}
                    >
                      <span>Quarterly Sales</span>
                      <span style={{ fontSize: '11px', color: salesPeriod === 'quarterly' ? '#167A3D' : '#64748B', fontWeight: 'normal' }}>Single 3-Month Quarter</span>
                    </button>
                  </div>
                </div>

                {/* 2. INPUT SALES */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#172033', marginBottom: '0.3rem' }}>
                    2. Enter your {salesPeriod === 'annual' ? 'Annual Gross Sales' : 'Quarterly Sales'}:
                  </label>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '0.5rem' }}>
                    {salesPeriod === 'annual'
                      ? 'Total business revenue/sales for the preceding calendar year'
                      : 'Estimated business revenue/sales for one quarter (3 months)'}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '16px', fontWeight: '700' }}>₱</span>
                    <input
                      type="number"
                      value={salesInput}
                      onChange={e => {
                        setSalesInput(e.target.value);
                        setSaveSuccess(false);
                      }}
                      placeholder="e.g. 500000"
                      style={{
                        width: '100%', padding: '0.85rem 0.95rem 0.85rem 2.4rem', borderRadius: '8px',
                        border: '1.5px solid #CBD5E1', fontSize: '16px', fontWeight: '600', color: '#172033',
                        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s'
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* New Business Input */
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#172033', marginBottom: '0.3rem' }}>
                  Enter your Starting Capital Investment:
                </label>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '0.5rem' }}>
                  Under Philippine law, new businesses are taxed on paid-up capitalization (statutory cap 0.05%)
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '16px', fontWeight: '700' }}>₱</span>
                  <input
                    type="number"
                    value={capitalization}
                    onChange={e => {
                      setCapitalization(e.target.value);
                      setSaveSuccess(false);
                    }}
                    placeholder="e.g. 50000"
                    style={{
                      width: '100%', padding: '0.85rem 0.95rem 0.85rem 2.4rem', borderRadius: '8px',
                      border: '1.5px solid #CBD5E1', fontSize: '16px', fontWeight: '600', color: '#172033',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* 3. TAX IS CALCULATED (INSTANT REACTIVE COMPUTATION) */}
            <div style={{
              backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0',
              padding: '1rem 1.25rem', marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                3. Calculated Business Tax (Instant Result)
              </div>

              {calc.hasInput ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '13.5px', color: '#475569' }}>
                      {salesPeriod === 'quarterly' && assessmentType === 'Renewal' ? 'Equivalent Annual Sales:' : 'Assessed Sales Basis:'}
                    </span>
                    <strong style={{ fontSize: '14px', color: '#1E293B' }}>
                      {php(calc.annualSales)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '13.5px', color: '#475569' }}>Applied Statutory Tax Rate:</span>
                    <span style={{ fontSize: '13px', color: '#166534', fontWeight: '700', backgroundColor: '#EAF6EE', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      {calc.rateLabel}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#166534' }}>
                        {salesPeriod === 'quarterly' && assessmentType === 'Renewal' ? 'Tax Due This Quarter:' : 'Total Annual Business Tax:'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        {salesPeriod === 'quarterly' && assessmentType === 'Renewal'
                          ? `Full Year Projected Tax: ${php(calc.totalAnnualTax)}`
                          : `Equal Quarterly Installment: ${php(calc.quarterlyInstallment)} each`}
                      </div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#15803D' }}>
                      {php(salesPeriod === 'quarterly' && assessmentType === 'Renewal' ? calc.quarterlyInstallment : calc.totalAnnualTax)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic', padding: '0.3rem 0' }}>
                  Enter a sales amount above to instantly see your calculated tax.
                </div>
              )}
            </div>

            {/* Save to Profile button */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleSaveToProfile}
                disabled={saving || !calc.hasInput}
                style={{
                  flex: 1, padding: '0.75rem', backgroundColor: '#167A3D', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
                  cursor: saving || !calc.hasInput ? 'default' : 'pointer',
                  opacity: !calc.hasInput ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  transition: 'background-color 0.15s'
                }}
              >
                {saving ? 'Saving to Profile…' : saveSuccess ? (
                  <><Check size={16} /> Saved to Business Profile!</>
                ) : (
                  <><Save size={16} /> Save to Business Profile</>
                )}
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════
              PAYMENT SCHEDULE: ANNUAL VS QUARTERLY
              ════════════════════════════════════════ */}
          {calc.hasInput && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#172033', marginBottom: '0.75rem' }}>
                How would you like to pay at the Municipal Hall?
              </div>

              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '9999px', padding: '3px', marginBottom: '1rem' }}>
                {[
                  { id: 'annual', label: 'Annual Full Payment' },
                  { id: 'quarterly', label: '4 Quarterly Installments' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMode(opt.id)}
                    style={{
                      flex: 1, padding: '0.55rem 0.75rem', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                      backgroundColor: paymentMode === opt.id ? 'white' : 'transparent',
                      color: paymentMode === opt.id ? '#167A3D' : '#64748B',
                      fontWeight: paymentMode === opt.id ? '700' : '500',
                      fontSize: '13.5px',
                      boxShadow: paymentMode === opt.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {paymentMode === 'annual' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#1E293B' }}>Annual Full Payment</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.15rem' }}>Due on January 20, {taxYear} (RA 7160 Sec. 165)</div>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#167A3D' }}>{php(calc.totalAnnualTax)}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { q: 'Q1 Installment', due: `Jan 20, ${taxYear}` },
                    { q: 'Q2 Installment', due: `Apr 20, ${taxYear}` },
                    { q: 'Q3 Installment', due: `Jul 20, ${taxYear}` },
                    { q: 'Q4 Installment', due: `Oct 20, ${taxYear}` },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{item.q}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Statutory Deadline: {item.due}</div>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#167A3D' }}>
                        {php(calc.quarterlyInstallment)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════
              ACCORDION 1: LATE SURCHARGE SIMULATOR
              ════════════════════════════════════════ */}
          <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowLate(!showLate)}
              aria-expanded={showLate}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#D97706', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Clock size={16} color="#D97706" /> What if I pay late?
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.15rem' }}>Estimate late fees after the January 20 deadline</div>
              </div>
              {showLate ? <ChevronUp size={18} color="#94A3B8" /> : <ChevronDown size={18} color="#94A3B8" />}
            </button>

            {showLate && (
              <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #F1F5F9' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', color: '#334155', margin: '0.85rem 0 0.4rem' }}>
                  Pick the date you plan to pay:
                </label>
                <input
                  type="date" value={lateDate} onChange={e => setLateDate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '14px', color: '#172033', boxSizing: 'border-box' }}
                />
                <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', backgroundColor: penalty.isLate ? '#FEF2F2' : '#F0FDF4', borderRadius: '8px', border: `1px solid ${penalty.isLate ? '#FEE2E2' : '#BBF7D0'}` }}>
                  {penalty.isLate ? (
                    <>
                      <div style={{ fontSize: '13px', color: '#7F1D1D', marginBottom: '0.35rem' }}>
                        {penalty.months} month{penalty.months !== 1 ? 's' : ''} late after January 20
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#991B1B', marginBottom: '0.25rem' }}>
                        <span>25% surcharge (RA 7160 Sec. 168):</span><strong>{php(penalty.surcharge)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#991B1B', marginBottom: '0.5rem' }}>
                        <span>2%/month interest (RA 7160 Sec. 168):</span><strong>{php(penalty.interest)}</strong>
                      </div>
                      <div style={{ borderTop: '1px dashed #FCA5A5', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: '#991B1B' }}>
                        <span>Total if paid late:</span><span>{php(penalty.total)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#166534' }}>
                      ✓ On time — no late charges apply.
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '0.65rem', fontStyle: 'italic' }}>
                  Estimate only. Actual penalties assessed by the Municipal Treasurer's Office.
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
              ACCORDION 2: CALCULATION BREAKDOWN
              ════════════════════════════════════════ */}
          <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              aria-expanded={showDetails}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#172033' }}>
                  How was this amount calculated?
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.15rem' }}>View legal basis, formula, and regulatory fees</div>
              </div>
              {showDetails ? <ChevronUp size={18} color="#94A3B8" /> : <ChevronDown size={18} color="#94A3B8" />}
            </button>

            {showDetails && (
              <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ margin: '1rem 0 0.5rem' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    Business Tax Breakdown
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1E293B' }}>
                        Local Business Tax ({assessmentType})
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#167A3D', flexShrink: 0 }}>
                        {php(calc.totalAnnualTax)}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                      Formula: {assessmentType === 'Renewal' ? `${php(calc.annualSales)} annual sales × 2.0%` : `${php(parseFloat(capitalization) || 0)} capital × 0.05%`}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0.75rem 0 0.5rem' }}>
                    Regulatory Clearances (Paid in January)
                  </div>
                  {feeList.map((fee, i) => (
                    <div key={i} style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1E293B' }}>{fee.name}</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#475569', flexShrink: 0 }}>
                          {fee.status === 'TO BE ASSESSED' ? 'Assess at MTO' : php(fee.amount)}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                        {fee.calculation_details || fee.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN: Municipal Guidance & Readiness ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Card 1: Before You Visit the BPLO */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#172033', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={19} color="#167A3D" /> Before You Visit the BPLO
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '1rem' }}>
              Gather these documents before going to the municipal hall:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {(assessmentType === 'Renewal' ? [
                { n: 1, label: "Previous year's Mayor's Permit", sub: "Original copy and official receipts from MTO" },
                { n: 2, label: "Proof of total sales last year", sub: "Sworn statement, financial statement, or BIR ITR" },
                { n: 3, label: "Barangay Business Clearance", sub: "Current year clearance from your barangay" },
                { n: 4, label: "This printed estimate", sub: "So the assessor can cross-reference your figures" },
              ] : [
                { n: 1, label: "DTI or SEC Registration", sub: "Certificate of Business Name Registration" },
                { n: 2, label: "Barangay Business Clearance", sub: "From the barangay where your business is located" },
                { n: 3, label: "Lease contract or proof of location", sub: "Lease agreement, land title, or tax declaration" },
                { n: 4, label: "This printed estimate", sub: "So the assessor can cross-reference your figures" },
              ]).map(item => (
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

          {/* Card 2: BPLO Office Guide */}
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

          {/* Card 3: Switch to Regulatory Fees */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#172033' }}>Looking for Regulatory Fees?</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.15rem' }}>Estimate Mayor's permit, fire safety & sanitary clearances</div>
            </div>
            <Link
              to="/fee-estimation"
              style={{ padding: '0.5rem 0.85rem', backgroundColor: 'white', color: '#167A3D', border: '1.5px solid #167A3D', borderRadius: '7px', fontSize: '12.5px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
            >
              Fee Estimation <ArrowRight size={13} />
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
