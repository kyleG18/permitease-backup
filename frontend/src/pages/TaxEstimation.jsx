import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { LanguageContext } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import {
  Building2,
  Info,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  FileText,
  CalendarClock,
  Printer,
  ChevronRight,
  Receipt,
  Clock,
  ArrowRight
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const php = (n) =>
  isNaN(n) || n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(n));

/* TRAIN Law graduated income tax brackets */
const GRADUATED_BRACKETS = [
  { min: 0,         max: 250_000,     base: 0,         rate: 0.00 },
  { min: 250_001,   max: 400_000,     base: 0,         rate: 0.15 },
  { min: 400_001,   max: 800_000,     base: 22_500,    rate: 0.20 },
  { min: 800_001,   max: 2_000_000,   base: 102_500,   rate: 0.25 },
  { min: 2_000_001, max: 8_000_000,   base: 402_500,   rate: 0.30 },
  { min: 8_000_001, max: Infinity,    base: 2_202_500, rate: 0.35 },
];

function graduatedTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  const bracket = GRADUATED_BRACKETS.slice().reverse().find((b) => taxableIncome > b.min);
  if (!bracket) return 0;
  return bracket.base + (taxableIncome - bracket.min) * bracket.rate;
}

function detectEntityType(biz) {
  if (!biz) return null;
  const ot = (biz.ownership_type || '').toLowerCase();
  const bt = (biz.business_type || '').toLowerCase();
  const gross = parseFloat(biz.gross_sales) || 0;

  if (ot.includes('corporation') || ot.includes('partnership')) return 'corporate';
  if (gross > 3_000_000) return 'vat';
  if (bt.includes('service') || bt.includes('professional') || bt.includes('freelan')) return 'freelancer';
  return 'sole_prop';
}

function getEntityLabel(type, isTl) {
  const map = {
    sole_prop: 'Sole Proprietorship / Micro-Retail',
    freelancer: isTl ? 'Freelancer / Propesyonal' : 'Freelancer / Individual Professional',
    corporate: isTl ? 'Korporasyon / Partnership' : 'Corporation / Partnership',
    vat: isTl ? 'Negosyong Sakop ng VAT (Benta > ₱3M)' : 'VAT-Registered Business (Gross Sales > ₱3M)',
  };
  return map[type] || 'Sole Proprietorship';
}

function getApplicableTaxes(type) {
  const map = {
    sole_prop:  ['BIR Income Tax (Form 1701 / 1701Q)', 'Percentage Tax (Form 2551Q)'],
    freelancer: ['BIR Income Tax (Form 1701 / 1701Q)', 'Creditable Withholding Tax (Form 2307)'],
    corporate:  ['Corporate Income Tax (Form 1702)', 'Expanded Withholding Tax (Form 1601EQ)'],
    vat:        ['Value-Added Tax / VAT (Form 2550Q)', 'Graduated / Corporate Income Tax'],
  };
  return map[type] || map.sole_prop;
}

function isEligibleFlat8(type) {
  return type === 'sole_prop' || type === 'freelancer';
}

export default function TaxEstimation() {
  const { user } = useContext(AuthContext);
  const { businesses, loadingBusinesses } = useContext(BusinessContext);
  const { lang } = useContext(LanguageContext);
  const isTl = lang === 'tl';

  const [selectedBizId, setSelectedBizId] = useState('');
  const [grossRevenue, setGrossRevenue] = useState('');
  const [revenueFrequency, setRevenueFrequency] = useState('annual');
  const [totalExpenses, setTotalExpenses] = useState('');
  const [taxElection, setTaxElection] = useState('flat8');
  const [viewMode, setViewMode] = useState('annual');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const activeBiz = useMemo(
    () => businesses.find((b) => String(b.id) === selectedBizId) || null,
    [businesses, selectedBizId]
  );

  useEffect(() => {
    if (businesses.length > 0 && !selectedBizId) {
      setSelectedBizId(String(businesses[0].id));
    }
  }, [businesses]);

  const entityType = useMemo(() => detectEntityType(activeBiz), [activeBiz]);
  const eligible8 = isEligibleFlat8(entityType);

  useEffect(() => {
    if (!entityType) return;
    if (entityType === 'corporate') setTaxElection('corporate');
    else if (entityType === 'vat') setTaxElection('vat');
    else setTaxElection('flat8');
    setShowBreakdown(false);
  }, [entityType]);

  useEffect(() => {
    setShowBreakdown(false);
  }, [grossRevenue, revenueFrequency, taxElection, totalExpenses]);

  // Pre-fill from active business profile if available
  useEffect(() => {
    if (activeBiz && activeBiz.gross_sales && parseFloat(activeBiz.gross_sales) > 0) {
      setGrossRevenue(String(activeBiz.gross_sales));
      setRevenueFrequency('annual');
    }
  }, [activeBiz?.id]);

  /* ── Calculation Engine ── */
  const calc = useMemo(() => {
    const raw = parseFloat(grossRevenue.replace(/,/g, '')) || 0;
    const grossAnnual = revenueFrequency === 'quarterly' ? raw * 4 : raw;
    const expenses = parseFloat(totalExpenses.replace(/,/g, '')) || 0;
    const netIncome = Math.max(0, grossAnnual - expenses);

    let annualTax = 0;
    let percentageTax = 0;
    let incomeTax = 0;
    let exemptionUsed = 0;
    let taxableBase = 0;
    let appliedRate = '';
    let lines = [];

    if (taxElection === 'flat8') {
      exemptionUsed = 250_000;
      taxableBase = Math.max(0, grossAnnual - 250_000);
      annualTax = taxableBase * 0.08;
      appliedRate = '8% Flat Income Tax Rate';
      lines = [
        { label: isTl ? 'Kabuuang Taunang Kita' : 'Gross Annual Sales / Receipts', value: grossAnnual },
        { label: isTl ? 'Exemption (₱250,000 Tax-Free Base)' : 'Tax-Exempt Base (₱250,000 Exemption)', value: -250_000, note: '−' },
        { label: isTl ? 'Nabubuwisang Kita (Taxable Base)' : 'Taxable Income Base', value: taxableBase },
        { label: isTl ? 'Inilapat na Rate' : 'Applied Rate', value: null, rateText: '× 8%' },
        { label: isTl ? 'KABUUANG TINATAYANG BIR TAX' : 'TOTAL ESTIMATED BIR TAX', value: annualTax, total: true },
      ];
    } else if (taxElection === 'graduated') {
      percentageTax = grossAnnual * 0.03;
      taxableBase = Math.max(0, netIncome);
      incomeTax = graduatedTax(taxableBase);
      annualTax = percentageTax + incomeTax;
      const bracket = GRADUATED_BRACKETS.slice().reverse().find((b) => taxableBase > b.min);
      appliedRate = bracket ? `${(bracket.rate * 100).toFixed(0)}% (Graduated Bracket)` : '0%';
      lines = [
        { label: isTl ? 'Kabuuang Taunang Kita' : 'Gross Annual Sales / Receipts', value: grossAnnual },
        { label: isTl ? 'Kabuuang Gastos (Deductions)' : 'Total Deductible Expenses', value: -expenses, note: '−' },
        { label: isTl ? 'Net Taxable Income' : 'Net Taxable Income', value: taxableBase },
        { label: isTl ? 'Income Tax (Graduated TRAIN Law)' : 'Income Tax (Graduated TRAIN Law)', value: incomeTax },
        { label: isTl ? 'Percentage Tax (3% ng Gross — 2551Q)' : 'Percentage Tax (3% of Gross — 2551Q)', value: percentageTax },
        { label: isTl ? 'KABUUANG TINATAYANG BIR TAX' : 'TOTAL ESTIMATED BIR TAX', value: annualTax, total: true },
      ];
    } else if (taxElection === 'corporate') {
      taxableBase = Math.max(0, netIncome);
      const rate = taxableBase > 5_000_000 ? 0.25 : 0.20;
      annualTax = taxableBase * rate;
      appliedRate = rate === 0.20 ? '20% (CREATE Act — Micro/Small Corp)' : '25% (Regular Corporate Rate)';
      lines = [
        { label: isTl ? 'Kabuuang Taunang Kita' : 'Gross Annual Sales / Receipts', value: grossAnnual },
        { label: isTl ? 'Kabuuang Gastos (Deductions)' : 'Total Deductible Expenses', value: -expenses, note: '−' },
        { label: isTl ? 'Net Taxable Income' : 'Net Taxable Income', value: taxableBase },
        { label: isTl ? 'Inilapat na Rate (CREATE Act)' : 'Applied Rate (CREATE Act)', value: null, rateText: `× ${rate === 0.20 ? '20%' : '25%'}` },
        { label: isTl ? 'KABUUANG TINATAYANG CORPORATE TAX' : 'TOTAL ESTIMATED CORPORATE TAX', value: annualTax, total: true },
      ];
    } else if (taxElection === 'vat') {
      const inputVAT = expenses * 0.12;
      const outputVAT = grossAnnual * 0.12;
      annualTax = Math.max(0, outputVAT - inputVAT);
      appliedRate = '12% Output VAT − Input VAT';
      lines = [
        { label: isTl ? 'Kabuuang Taunang Benta' : 'Gross Annual Sales', value: grossAnnual },
        { label: isTl ? 'Output VAT (12% ng Benta)' : 'Output VAT (12% of Gross Sales)', value: outputVAT },
        { label: isTl ? 'Input VAT (12% ng Gastos)' : 'Input VAT (12% of Expenses)', value: -inputVAT, note: '−' },
        { label: isTl ? 'KABUUANG NET VAT PAYABLE (2550Q)' : 'TOTAL NET VAT PAYABLE (2550Q)', value: annualTax, total: true },
      ];
    }

    const quarterlyTax = annualTax / 4;
    return { grossAnnual, annualTax, quarterlyTax, lines, appliedRate, netIncome };
  }, [grossRevenue, revenueFrequency, taxElection, totalExpenses, isTl]);

  function handleBizChange(e) {
    setSelectedBizId(e.target.value);
    setGrossRevenue('');
    setTotalExpenses('');
    setShowBreakdown(false);
  }

  function handleCalculate() {
    if (!grossRevenue || parseFloat(grossRevenue.replace(/,/g, '')) <= 0) {
      alert(isTl ? 'Mangyaring maglagay ng wastong halaga ng kita.' : 'Please enter a valid gross revenue amount.');
      return;
    }
    setShowBreakdown(true);
    setViewMode('annual');
    setTimeout(() => {
      document.getElementById('tax-breakdown-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  if (loadingBusinesses) {
    return (
      <div className="animate-fade-in page-container" style={{ maxWidth: '820px', margin: '0 auto', padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Calculator size={36} style={{ color: 'var(--primary-green)', marginBottom: '0.75rem' }} />
        <div>{isTl ? 'Naglo-load ng profile ng negosyo...' : 'Loading business profile...'}</div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="animate-fade-in page-container" style={{ maxWidth: '640px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <Building2 size={44} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--government-navy)', fontSize: '1.35rem', marginBottom: '0.5rem' }}>
            {isTl ? 'Walang Nakarehistrong Negosyo' : 'No Business Registered'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            {isTl
              ? 'Kumpletuhin muna ang profile o onboarding ng iyong negosyo upang magamit ang Tax Estimator.'
              : 'Complete your business profile or onboarding first to calculate estimated national taxes.'}
          </p>
          <Link to="/onboarding" className="btn btn-primary btn-lg">
            {isTl ? 'Ihanda ang Negosyo' : 'Complete Business Setup'}
          </Link>
        </div>
      </div>
    );
  }

  const needsExpenses = taxElection === 'graduated' || taxElection === 'corporate' || taxElection === 'vat';

  return (
    <div className="animate-fade-in page-container" style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── HEADER SECTION ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--primary-green-light)', color: 'var(--primary-green-dark)', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          <Receipt size={14} />
          {isTl ? 'Bureau of Internal Revenue (BIR) • Pagpaplano sa Buwis' : 'Bureau of Internal Revenue (BIR) • Tax Preparation Engine'}
        </div>
        <h1 style={{ color: 'var(--government-navy)', fontSize: '1.85rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
          {isTl ? 'Estimador ng Buwis sa BIR' : 'National BIR Tax Estimator'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem', marginBottom: 0 }}>
          {isTl
            ? 'Tantyahin ang pambansang buwis sa kita at negosyo (Income Tax, Percentage Tax, o VAT) na dapat i-file sa BIR batay sa iyong rehimeng buwis.'
            : 'Estimate national income and business taxes owed to the Bureau of Internal Revenue (BIR) based on your registered entity type and revenue regime.'}
        </p>
      </div>

      {/* ── JURISDICTION NOTICE ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        padding: '0.9rem 1.15rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--info-light, #EAF1FB)',
        border: '1px solid #BFDBFE',
        color: '#1E3A8A',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        lineHeight: 1.55
      }}>
        <Info size={19} color="#1D5FAD" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>{isTl ? 'Pambansang Buwis (BIR):' : 'National Revenue Tax Notice:'}</strong>{' '}
          {isTl
            ? 'Ang mga buwis na ito ay ini-file sa BIR Revenue District Office (RDO), hiwalay sa mga bayarin sa lokal na permit na babayaran sa Munisipyo ng Roxas.'
            : 'These taxes are filed directly with your designated BIR Revenue District Office (RDO) and are legally distinct from municipal permit and clearance fees paid to the Municipality of Roxas.'}
        </div>
      </div>

      {/* ── SINGLE UNIFIED LENGTH FLOW CONTAINER ── */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* STEP 1: BUSINESS PROFILE & AUTO-DETECTED STATUS */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} style={{ color: 'var(--primary-green)' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--government-navy)', margin: 0 }}>
                {isTl ? '1. Katayuan ng Negosyo at Rehimeng Buwis' : '1. Business Profile & Auto-Detected Tax Status'}
              </h2>
            </div>
            {activeBiz && entityType && (
              <span className="badge" style={{ backgroundColor: 'var(--primary-green-light)', color: 'var(--primary-green)' }}>
                {entityType.toUpperCase()}
              </span>
            )}
          </div>

          {/* Business Switcher (if multiple) */}
          {businesses.length > 1 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                {isTl ? 'Piliin ang Negosyo:' : 'Select Business Profile:'}
              </label>
              <select
                value={selectedBizId}
                onChange={handleBizChange}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--surface)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--text-dark)'
                }}
              >
                {businesses.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.business_name} {b.business_status ? `(${b.business_status})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Details Box */}
          {activeBiz && entityType && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)', border: '1px solid var(--border-light)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' }}>
                    {isTl ? 'Klasipikasyon ng Entidad' : 'Entity Classification'}
                  </div>
                  <div style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '0.95rem' }}>
                    {getEntityLabel(entityType, isTl)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' }}>
                    {isTl ? 'Mga Form ng Buwis sa BIR' : 'Applicable BIR Tax Forms'}
                  </div>
                  <div style={{ fontWeight: '600', color: 'var(--primary-green-dark)' }}>
                    {getApplicableTaxes(entityType).join(' & ')}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8125rem' }}>
                {eligible8 ? (
                  <span style={{ color: 'var(--primary-green-dark)', fontWeight: '600' }}>
                    ✓ {isTl ? 'Kwalipikado sa 8% Flat Rate Option (may ₱250,000 standard tax-free exemption)' : 'Eligible for 8% Flat Rate regime with ₱250,000 standard exemption.'}
                  </span>
                ) : entityType === 'corporate' ? (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    ℹ {isTl ? 'Sakop ng CREATE Act Corporate Income Tax (20% o 25%)' : 'Subject to CREATE Act Corporate Income Tax (20% or 25%).'}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    ℹ {isTl ? 'Sakop ng 12% Value-Added Tax (Benta > ₱3,000,000 threshold)' : 'Subject to 12% Output VAT (Annual sales exceed ₱3,000,000 threshold).'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: REVENUE INPUT & REPORTING FREQUENCY */}
        <div>
          <div style={{ marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--government-navy)', margin: 0 }}>
              {isTl ? '2. Ilagay ang Tinatayang Benta o Kita' : '2. Enter Estimated Gross Sales / Receipts'}
            </h2>
          </div>

          {/* Reporting Frequency Toggle */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
              {isTl ? 'Dalas ng Halagang Ilalagay:' : 'Revenue Reporting Frequency:'}
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '380px' }}>
              <button
                type="button"
                onClick={() => setRevenueFrequency('annual')}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${revenueFrequency === 'annual' ? 'var(--primary-green)' : 'var(--border-color)'}`,
                  backgroundColor: revenueFrequency === 'annual' ? 'var(--primary-green-light)' : 'var(--surface)',
                  color: revenueFrequency === 'annual' ? 'var(--primary-green-dark)' : 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                📅 {isTl ? 'Taunan (Annual)' : 'Annual Sales'}
              </button>
              <button
                type="button"
                onClick={() => setRevenueFrequency('quarterly')}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${revenueFrequency === 'quarterly' ? 'var(--primary-green)' : 'var(--border-color)'}`,
                  backgroundColor: revenueFrequency === 'quarterly' ? 'var(--primary-green-light)' : 'var(--surface)',
                  color: revenueFrequency === 'quarterly' ? 'var(--primary-green-dark)' : 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                📋 {isTl ? 'Quarterly na Benta' : 'Quarterly Sales'}
              </button>
            </div>
          </div>

          {/* Gross Revenue Field */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
              {isTl
                ? `Tinatayang Kabuuang Benta (${revenueFrequency === 'annual' ? 'Taunan' : 'Quarterly'}) ₱ *`
                : `Gross Sales / Receipts (${revenueFrequency === 'annual' ? 'Annual' : 'Quarterly'}) ₱ *`}
            </label>
            <div style={{ position: 'relative', maxWidth: '420px' }}>
              <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--text-muted)' }}>₱</span>
              <input
                type="number"
                min="0"
                placeholder="e.g. 500000"
                value={grossRevenue}
                onChange={(e) => setGrossRevenue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem 0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-dark)'
                }}
              />
            </div>
            {revenueFrequency === 'quarterly' && grossRevenue && (
              <div style={{ fontSize: '0.8rem', color: 'var(--info)', marginTop: '0.35rem', fontWeight: '600' }}>
                ≈ {php(parseFloat(grossRevenue || 0) * 4)} {isTl ? 'taunang katumbas (Projected annual)' : 'projected annual equivalent'}
              </div>
            )}
          </div>

          {/* Expenses Input (if needed) */}
          {needsExpenses && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--background)', border: '1px solid var(--border-light)', maxWidth: '540px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                {isTl ? 'Kabuuang Gastos / Deductible Operating Expenses (Taunan) ₱' : 'Total Deductible Operating Expenses / Costs (Annual) ₱'}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--text-muted)' }}>₱</span>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 150000"
                  value={totalExpenses}
                  onChange={(e) => setTotalExpenses(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-dark)'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                {isTl ? 'Kasama ang allowable business deductions, COGS, pasahod, upa, at utilities.' : 'Includes allowable operating expenses, cost of sales, rent, utilities, and wages.'}
              </span>
            </div>
          )}
        </div>

        {/* STEP 3: TAX REGIME ELECTION */}
        <div>
          <div style={{ marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--government-navy)', margin: 0 }}>
              {isTl ? '3. Paraan ng Pagbubuwis (Tax Regime Election)' : '3. Select Applicable Tax Regime'}
            </h2>
          </div>

          {/* Locked Notice for Corporate */}
          {!eligible8 && entityType === 'corporate' && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.875rem', lineHeight: 1.55 }}>
              <strong>{isTl ? 'Rehimeng Corporate (CREATE Act):' : 'Mandatory Corporate Tax (CREATE Act):'}</strong>{' '}
              {isTl
                ? 'Ang mga korporasyon at partnership ay hindi kwalipikado sa 8% flat rate. Awtomatikong inilalapat ang CREATE Act Corporate Tax (20% o 25%).'
                : 'Corporations and partnerships are legally ineligible for the 8% flat rate option. Corporate income tax is automatically calculated.'}
            </div>
          )}

          {/* Locked Notice for VAT */}
          {!eligible8 && entityType === 'vat' && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.875rem', lineHeight: 1.55 }}>
              <strong>{isTl ? 'Rehimeng Value-Added Tax (12% VAT):' : 'Mandatory VAT Regime (12% Output VAT):'}</strong>{' '}
              {isTl
                ? 'Ang mga negosyong lumampas sa ₱3M taunang gross sales ay mandatoryong sakop ng 12% Output VAT.'
                : 'Businesses with gross annual sales exceeding ₱3,000,000 are subject to mandatory 12% Value-Added Tax.'}
            </div>
          )}

          {/* Selectable Options for Sole Prop & Freelancers */}
          {eligible8 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              
              {/* Option A: 8% Flat */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setTaxElection('flat8')}
                onKeyDown={(e) => e.key === 'Enter' && setTaxElection('flat8')}
                style={{
                  padding: '1.1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${taxElection === 'flat8' ? 'var(--primary-green)' : 'var(--border-color)'}`,
                  backgroundColor: taxElection === 'flat8' ? 'var(--primary-green-soft, #F4FAF6)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: `2px solid ${taxElection === 'flat8' ? 'var(--primary-green)' : 'var(--border-medium)'}`,
                      backgroundColor: taxElection === 'flat8' ? 'var(--primary-green)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {taxElection === 'flat8' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />}
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                      {isTl ? 'Opsyon A — 8% Flat Rate' : 'Option A — 8% Flat Tax Rate'}
                    </span>
                  </div>
                  <span className="badge" style={{ backgroundColor: 'var(--primary-green-light)', color: 'var(--primary-green)' }}>
                    {isTl ? 'Inirerekomenda' : 'Recommended'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', paddingLeft: '1.6rem', lineHeight: 1.5 }}>
                  {isTl
                    ? 'Pinakasimple para sa micro MSME. Pinalitan ang income tax at percentage tax. May ₱250,000 tax-free exemption.'
                    : 'Replaces both income tax & 3% percentage tax. Includes ₱250,000 standard tax-free exemption.'}
                </div>

                <details style={{ marginTop: '0.65rem', paddingLeft: '1.6rem' }}>
                  <summary style={{ fontSize: '0.78rem', color: 'var(--info)', cursor: 'pointer', fontWeight: '600' }}>
                    {isTl ? '▸ Mga Kondisyon ng Pagiging Kwalipikado' : '▸ Eligibility conditions & caveats'}
                  </summary>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.55, marginBottom: 0 }}>
                    {isTl
                      ? 'Ang 8% flat rate ay nakasalalay sa opisyal na eleksyon sa 1st quarter filing, klase ng nagbabayad ng buwis, at gross sales (≤ ₱3M). Ang mga may halo-halong kita (mixed-income) o may nakaraang OSD election ay maaaring may dagdag na kondisyon.'
                      : 'Eligibility depends on BIR rules, proper 1st quarter filing election, and remaining below ₱3M gross receipts. Mixed-income earners or those with prior-year OSD elections may be subject to specific rules.'}
                  </p>
                </details>
              </div>

              {/* Option B: Graduated */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setTaxElection('graduated')}
                onKeyDown={(e) => e.key === 'Enter' && setTaxElection('graduated')}
                style={{
                  padding: '1.1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${taxElection === 'graduated' ? 'var(--primary-green)' : 'var(--border-color)'}`,
                  backgroundColor: taxElection === 'graduated' ? 'var(--primary-green-soft, #F4FAF6)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: `2px solid ${taxElection === 'graduated' ? 'var(--primary-green)' : 'var(--border-medium)'}`,
                    backgroundColor: taxElection === 'graduated' ? 'var(--primary-green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {taxElection === 'graduated' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />}
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                    {isTl ? 'Opsyon B — Graduated Tax + 3% PT' : 'Option B — Graduated Tax + 3% PT'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', paddingLeft: '1.6rem', lineHeight: 1.5 }}>
                  {isTl
                    ? 'Mas kapaki-pakinabang kung mataas ang operating expenses. Kinakalkula sa net profit gamit ang TRAIN Law brackets (0%–35%) + 3% gross percentage tax.'
                    : 'Better if business has high deductible operating expenses. Based on net profit (0%–35%) plus 3% gross percentage tax.'}
                </div>
              </div>

            </div>
          )}

          {/* Primary Calculate CTA Button */}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={handleCalculate}
              className="btn btn-primary btn-block btn-lg"
              style={{ minHeight: '52px', fontSize: '1.05rem', fontWeight: '800', letterSpacing: '0.02em' }}
            >
              <Calculator size={20} />
              {isTl ? 'KALKULAHIN ANG TINATAYANG BUWIS (BIR)' : 'CALCULATE ESTIMATED TAX (BIR)'}
            </button>
          </div>
        </div>

        {/* STEP 4: TAX BREAKDOWN & RESULTS (FLOWS INLINE IN THE SAME CARD) */}
        {showBreakdown && (
          <div id="tax-breakdown-section" className="animate-fade-in" style={{ paddingTop: '1.5rem', borderTop: '2px solid var(--border-light)' }}>
            
            {/* Header & Dual View Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--government-navy)', margin: 0 }}>
                  {isTl ? '4. Buod ng Tinatayang Buwis sa BIR' : '4. Estimated National Tax Breakdown'}
                </h2>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {calc.appliedRate}
                </div>
              </div>

              {/* Annual vs Quarterly Toggle */}
              <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--background)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('annual')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.8125rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'annual' ? 'var(--primary-green)' : 'transparent',
                    color: viewMode === 'annual' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  📅 {isTl ? 'Taunan (Annual)' : 'Annual View'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('quarterly')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.8125rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'quarterly' ? 'var(--primary-green)' : 'transparent',
                    color: viewMode === 'quarterly' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  📋 {isTl ? 'Quarterly' : 'Quarterly View'}
                </button>
              </div>
            </div>

            {/* Hero Stat Box */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.35rem 1.6rem',
              backgroundColor: 'var(--primary-green-light)',
              border: '1.5px solid #A7F3D0',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary-green-dark)' }}>
                  {viewMode === 'annual'
                    ? (isTl ? 'Kabuuang Taunang BIR Tax' : 'Total Estimated Annual BIR Tax')
                    : (isTl ? 'Tinatayang Buwis Bawat Quarter' : 'Estimated Quarterly BIR Target')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary-green)', marginTop: '0.2rem' }}>
                  {viewMode === 'annual'
                    ? (isTl ? `Katumbas ng ${php(calc.quarterlyTax)} bawat quarter` : `Equivalent to ${php(calc.quarterlyTax)} per quarterly filing`)
                    : (isTl ? `Batay sa taunang kabuuang ${php(calc.annualTax)}` : `Derived from annual liability of ${php(calc.annualTax)}`)}
                </div>
              </div>

              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--primary-green-dark)', letterSpacing: '-0.02em' }}>
                {php(viewMode === 'annual' ? calc.annualTax : calc.quarterlyTax)}
              </div>
            </div>

            {/* Line-by-Line Breakdown Table */}
            <div className="table-responsive estimation-table-wrap" style={{ marginBottom: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <tbody>
                  {calc.lines.map((line, i) => {
                    if (line.total) {
                      const displayVal = viewMode === 'annual' ? line.value : line.value / 4;
                      return (
                        <tr key={i} style={{ backgroundColor: 'var(--primary-green-light)', borderTop: '2px solid var(--primary-green)' }}>
                          <td style={{ padding: '0.9rem 1.15rem', fontWeight: '800', color: 'var(--primary-green-dark)' }}>
                            {line.label} {viewMode === 'quarterly' && <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>({isTl ? 'bawat quarter' : 'per quarter'})</span>}
                          </td>
                          <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: '900', fontSize: '1.15rem', color: 'var(--primary-green-dark)' }}>
                            {php(displayVal)}
                          </td>
                        </tr>
                      );
                    }
                    if (line.rateText) {
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--background)' }}>
                          <td style={{ padding: '0.8rem 1.15rem', color: 'var(--text-secondary)' }}>{line.label}</td>
                          <td style={{ padding: '0.8rem 1.15rem', textAlign: 'right', fontWeight: '700', color: 'var(--text-dark)' }}>{line.rateText}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--background)' }}>
                        <td style={{ padding: '0.8rem 1.15rem', color: 'var(--text-dark)' }}>{line.label}</td>
                        <td style={{ padding: '0.8rem 1.15rem', textAlign: 'right', fontWeight: line.note === '−' ? 500 : 700, color: line.note === '−' ? '#991B1B' : 'var(--text-dark)' }}>
                          {line.note === '−' && line.value < 0 ? `(${php(Math.abs(line.value))})` : php(line.value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Caution Notices */}
            {taxElection === 'vat' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.9rem 1.15rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', fontSize: '0.8125rem', color: '#991B1B', marginBottom: '1.5rem', lineHeight: 1.55 }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>{isTl ? 'Paalala sa Input VAT Credits:' : 'Input VAT Credit Notice:'}</strong>{' '}
                  {isTl
                    ? 'Hindi lahat ng gastusin sa negosyo ay kwalipikado para sa input VAT credits. Tanging ang mga pagbili mula sa mga VAT-registered na supplier na may opisyal na VAT invoice ang maaaring ibawas sa Output VAT.'
                    : 'Not all business expenses qualify for input VAT credits. In practice, only purchases supported by valid VAT invoices from VAT-registered suppliers may be credited against Output VAT.'}
                </div>
              </div>
            )}

            {taxElection === 'corporate' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.9rem 1.15rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', fontSize: '0.8125rem', color: '#991B1B', marginBottom: '1.5rem', lineHeight: 1.55 }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>{isTl ? 'Paalala sa CREATE Act Corporate Rate:' : 'CREATE Act Asset Threshold Notice:'}</strong>{' '}
                  {isTl
                    ? 'Ang 20% micro/small corporate rate ay may mga kondisyon sa net taxable income (≤ ₱5M) at kabuuang ari-arian (assets ≤ ₱100M, hindi kasama ang lupa). Kung lalampas, 25% ang regular na rate. Ang estimator na ito ay hindi sumusuri sa halaga ng assets.'
                    : 'The 20% micro/small corporate rate requires net taxable income ≤ ₱5M and total balance sheet assets ≤ ₱100M (excluding land). Otherwise, the 25% regular rate applies. This tool estimates based on income only.'}
                </div>
              </div>
            )}

            {/* BIR Filing Deadlines Reference */}
            <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--background)', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--government-navy)', marginBottom: '0.75rem' }}>
                <CalendarClock size={16} style={{ color: 'var(--primary-green)' }} />
                {isTl ? 'Iskedyul ng Pag-file sa BIR' : 'BIR Filing Deadlines Reference'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                  <strong style={{ display: 'block', color: 'var(--primary-green-dark)' }}>Form 1701Q / 2551Q</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>Q1: May 15 • Q2: Aug 15 • Q3: Nov 15</span>
                </div>
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                  <strong style={{ display: 'block', color: 'var(--primary-green-dark)' }}>Form 1701 (Annual)</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{isTl ? 'Abril 15 ng sumunod na taon' : 'April 15 of following tax year'}</span>
                </div>
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                  <strong style={{ display: 'block', color: 'var(--primary-green-dark)' }}>Form 2550Q (VAT)</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{isTl ? 'Ika-25 ng buwan pagkatapos ng quarter' : '25th day following close of each quarter'}</span>
                </div>
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                  <strong style={{ display: 'block', color: 'var(--primary-green-dark)' }}>Form 1702 (Corporate)</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{isTl ? 'Ika-15 ng ika-4 na buwan pagkatapos ng FY' : '15th day of 4th month after fiscal year-end'}</span>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '0.78rem', color: '#92400E', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {isTl
                  ? 'Pagtatantya lamang ito para sa pagpaplano sa pananalapi. Kumonsulta sa isang lisensyadong Certified Public Accountant (CPA) o sa inyong lokal na BIR Revenue District Office (RDO) para sa tiyak na tax liability at opisyal na pag-file.'
                  : 'This calculation is an indicative planning estimate only. Consult a licensed Certified Public Accountant (CPA) or your designated BIR Revenue District Office (RDO) for exact figures and proper statutory tax compliance.'}
              </div>
            </div>

            {/* Action Row */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-outline"
                style={{ flex: 1, minHeight: '44px' }}
              >
                <Printer size={16} />
                {isTl ? 'I-print ang Buod ng Buwis' : 'Print Tax Summary'}
              </button>
              <Link
                to="/fee-estimation"
                className="btn btn-primary"
                style={{ flex: 1.2, minHeight: '44px' }}
              >
                {isTl ? 'Tingnan ang Lokal na Bayarin sa Permit' : 'View Local Permit Fees'}
                <ChevronRight size={16} />
              </Link>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
