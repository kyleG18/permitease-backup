import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Calculator, AlertTriangle, FileText, Info } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

export default function TaxEstimation() {
  const { token, user } = useContext(AuthContext);

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  
  const [businessType, setBusinessType] = useState('');
  const [assessmentType, setAssessmentType] = useState('Renewal');
  const [taxYear, setTaxYear] = useState('2026');
  const [grossSales, setGrossSales] = useState('');
  const [capitalization, setCapitalization] = useState('');
  
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/businesses`, { headers })
      .then(r => r.json())
      .then(data => {
        const bizList = Array.isArray(data) ? data : [];
        setBusinesses(bizList);
        if (bizList.length > 0) {
          const first = bizList[0];
          setSelectedBizId(String(first.id));
          setBusinessType(first.business_type || '');
          setAssessmentType(first.business_status === 'New Application' ? 'New Business' : 'Renewal');
          setGrossSales(first.gross_sales || '');
          setCapitalization(first.capitalization || '');
        }
      })
      .catch(console.error);
  }, []);

  const handleBusinessChange = (e) => {
    const id = e.target.value;
    setSelectedBizId(id);
    const biz = businesses.find(b => String(b.id) === id);
    if (biz) {
      setBusinessType(biz.business_type || '');
      setAssessmentType(biz.business_status === 'New Application' ? 'New Business' : 'Renewal');
      setGrossSales(biz.gross_sales || '');
      setCapitalization(biz.capitalization || '');
      setEstimate(null);
    }
  };

  const handleCalculate = async () => {
    if (!selectedBizId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/tax/estimate/${selectedBizId}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to estimate tax.');
      setEstimate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // The backend returns the raw AI JSON. Handle both old (fees[]) and new (local_business_tax[]) shapes.
  const lbtList = estimate?.local_business_tax || estimate?.fees || [];
  const totalTax = lbtList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const needsAssessment = lbtList.some(t => t.status === 'TO BE ASSESSED' || t.amount === null);

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 0.25rem', color: 'var(--government-navy)' }}>
          Tax Estimation
        </h1>
        <p style={{ color: '#64748B', fontSize: '15px', margin: 0, maxWidth: '800px' }}>
          Estimate your potential local business tax based on your business information and applicable local tax rules.
        </p>
        <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#94A3B8' }}>
          For preparation purposes only. Final assessment is determined by the appropriate LGU office.
        </div>
      </header>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <AlertTriangle size={18} />
          <div style={{ fontSize: '14px', fontWeight: '500' }}>Unable to calculate the estimate right now. Please review the information and try again.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', alignItems: 'start', marginBottom: '2rem' }}>
        
        {/* LEFT: BUSINESS INFORMATION */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '2rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--government-navy)', margin: '0 0 0.25rem' }}>Business Information</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 1.5rem' }}>Review the information used for this estimate.</p>

          {businesses.length > 1 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Select Business</label>
              <select value={selectedBizId} onChange={handleBusinessChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: 'var(--government-navy)', outline: 'none' }}>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Business Type</label>
            <input type="text" value={businessType} onChange={e => setBusinessType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: 'var(--government-navy)' }} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Assessment Type</label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', color: 'var(--government-navy)', cursor: 'pointer' }}>
                <input type="radio" name="assessmentType" value="New Business" checked={assessmentType === 'New Business'} onChange={e => setAssessmentType(e.target.value)} style={{ accentColor: 'var(--primary-green)' }} /> New Business
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', color: 'var(--government-navy)', cursor: 'pointer' }}>
                <input type="radio" name="assessmentType" value="Renewal" checked={assessmentType === 'Renewal'} onChange={e => setAssessmentType(e.target.value)} style={{ accentColor: 'var(--primary-green)' }} /> Renewal
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Tax Year</label>
            <select value={taxYear} onChange={e => setTaxYear(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: 'var(--government-navy)', outline: 'none' }}>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {assessmentType === 'Renewal' ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Gross Sales / Receipts</label>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '0.5rem' }}>Enter the gross sales or receipts for the applicable preceding calendar year.</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '14px' }}>₱</span>
                <input type="number" value={grossSales} onChange={e => setGrossSales(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: 'var(--government-navy)' }} placeholder="0.00" />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Capital Investment</label>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '0.5rem' }}>Initial capital investment used as basis for new business tax.</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '14px' }}>₱</span>
                <input type="number" value={capitalization} onChange={e => setCapitalization(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: 'var(--government-navy)' }} placeholder="0.00" />
              </div>
            </div>
          )}

          <button onClick={handleCalculate} disabled={loading} style={{ width: '100%', padding: '0.875rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={18} />
            {loading ? 'Calculating...' : estimate ? 'Recalculate Estimate' : 'Calculate Estimate'}
          </button>
        </div>

        {/* RIGHT: RESULT PANEL */}
        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Calculator size={24} color="var(--primary-green)" />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--government-navy)', margin: 0 }}>Estimated Local Business Tax</h2>
          </div>
          
          {!estimate ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>No estimate yet</div>
              <div style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>Enter or review the required business information on the left to calculate your estimated local business tax.</div>
            </div>
          ) : estimate.supportedLGU === false ? (
            <div style={{ padding: '1.25rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="#92400E" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '0.25rem', fontSize: '14px' }}>Estimation Unavailable for This Location</div>
                <div style={{ fontSize: '13px', color: '#78350F', lineHeight: '1.5' }}>{estimate.summary}</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '36px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  {needsAssessment ? 'TO BE ASSESSED' : `₱${totalTax.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                </span>
                {!needsAssessment && <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>Estimated</span>}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '2rem' }}>Preparation estimate based on the information and configured rules.</div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem', display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Business Type</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)' }}>{estimate.business_summary?.business_type || businessType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Assessment Type</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)' }}>{estimate.business_summary?.application_type || assessmentType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Tax Year</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)' }}>{taxYear}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>{assessmentType === 'Renewal' ? 'Gross Sales / Receipts' : 'Capitalization'}</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)' }}>₱{Number(assessmentType === 'Renewal' ? grossSales : capitalization).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {estimate.missing_information?.length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '13px', color: '#92400E' }}>
                  <strong>Unable to estimate fully:</strong> {estimate.missing_information.join(' ')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CALCULATION BREAKDOWN */}
      {estimate && estimate.supportedLGU !== false && lbtList.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--government-navy)', margin: 0 }}>Calculation Breakdown</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Item</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)' }}>Declared {assessmentType === 'Renewal' ? 'Gross Sales / Receipts' : 'Capitalization'}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '14px', color: '#475569' }}>₱{Number(assessmentType === 'Renewal' ? grossSales : capitalization).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                </tr>
                {lbtList.map((tax, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)', verticalAlign: 'top' }}>
                      Applicable Tax Rule
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '0.25rem', fontWeight: '400' }}>{tax.name}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '14px', color: '#475569', verticalAlign: 'top' }}>
                      <div style={{ marginBottom: '0.5rem' }}>{tax.rate || tax.basis}</div>
                      <div style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>{tax.calculation}</div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '14px', fontWeight: '600', color: 'var(--government-navy)' }}>Computed Tax</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '15px', fontWeight: '700', color: 'var(--primary-green)' }}>
                    {needsAssessment ? 'TO BE ASSESSED' : `₱${totalTax.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DOCUMENT PREPARATION */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--government-navy)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--primary-green)" /> Preparing for official assessment?
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '600px', lineHeight: '1.5' }}>
            Make sure you have your {assessmentType === 'Renewal' ? 'previous business permit, sworn declaration of gross receipts, and supporting payment records' : 'business registration documents'} ready for physical submission.
          </p>
        </div>
        <Link to="/readiness" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'white', color: 'var(--government-navy)', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', flexShrink: 0 }}>
          Review Permit Readiness
        </Link>
      </div>

      {/* OFFICIAL PROCESS NOTICE */}
      <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
        <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={16} /> How the Official Process Works
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>1. File</div><div style={{ fontSize: '12px', color: '#64748B' }}>Submit the unified application form and requirements.</div></div>
          <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>2. Assess</div><div style={{ fontSize: '12px', color: '#64748B' }}>Official assessment of regulatory fees, business tax, and other applicable charges.</div></div>
          <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>3. Payment</div><div style={{ fontSize: '12px', color: '#64748B' }}>Pay the assessed regulatory fees, business tax, and other charges.</div></div>
          <div><div style={{ fontWeight: '600', color: 'var(--government-navy)', fontSize: '14px', marginBottom: '0.25rem' }}>4. Claim</div><div style={{ fontSize: '12px', color: '#64748B' }}>Claim the business permit and other documents.</div></div>
        </div>
        <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
          PermitEase provides estimates for preparation purposes only. Actual taxes, fees, and other charges are subject to official assessment by the appropriate LGU office during actual processing.
        </div>
      </div>

    </div>
  );
}
