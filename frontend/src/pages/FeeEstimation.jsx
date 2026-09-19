import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Calculator, AlertTriangle, FileText, Info } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

export default function FeeEstimation() {
  const { token, user } = useContext(AuthContext);

  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  
  const [businessType, setBusinessType] = useState('');
  const [floorArea, setFloorArea] = useState('');
  const [employees, setEmployees] = useState('');
  
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
          setFloorArea(first.floor_area || '');
          setEmployees(first.employees || '');
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
      setFloorArea(biz.floor_area || '');
      setEmployees(biz.employees || '');
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
      if (!res.ok) throw new Error(data.message || 'Unable to estimate fees.');
      setEstimate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle both old (fees[]) and new (regulatory_fees[]) AI response shapes.
  const feeList = estimate?.regulatory_fees || estimate?.fees || [];
  let totalFees = 0;
  let needsAssessment = false;
  
  feeList.forEach(f => {
    if (f.status === 'TO BE ASSESSED' || f.amount === null || f.amount === undefined) {
      needsAssessment = true;
    } else {
      totalFees += Number(f.amount);
    }
  });

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 0.25rem', color: 'var(--government-navy)' }}>
          Fee Estimation
        </h1>
        <p style={{ color: '#64748B', fontSize: '15px', margin: 0, maxWidth: '800px' }}>
          Estimate regulatory fees and other applicable charges based on your business information and configured local rules.
        </p>
        <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#94A3B8' }}>
          Some fees may require official assessment.
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Floor Area (sqm)</label>
              <input type="number" value={floorArea} onChange={e => setFloorArea(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: 'var(--government-navy)' }} placeholder="0" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Number of Employees</label>
              <input type="number" value={employees} onChange={e => setEmployees(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: 'var(--government-navy)' }} placeholder="0" />
            </div>
          </div>

          <button onClick={handleCalculate} disabled={loading} style={{ width: '100%', padding: '0.875rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={18} />
            {loading ? 'Estimating...' : estimate ? 'Recalculate Estimate' : 'Estimate Fees'}
          </button>
        </div>

        {/* RIGHT: RESULT PANEL */}
        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Calculator size={24} color="var(--primary-green)" />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--government-navy)', margin: 0 }}>Estimated Regulatory Fees</h2>
          </div>
          
          {!estimate ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>No fee estimate yet</div>
              <div style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>Enter or review the required business information on the left to estimate applicable regulatory fees.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '36px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  ₱{totalFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>Estimated</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '1rem' }}>Based on the information provided.</div>
              
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)', marginBottom: '2rem' }}>
                {feeList.length} Applicable / Potentially Applicable Charges
              </div>

              {needsAssessment && (
                <div style={{ padding: '1rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '13px', color: '#92400E', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Official Assessment Required:</strong> Some fees cannot be exactly calculated yet and will be determined during official processing.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CALCULATION BREAKDOWN */}
      {estimate && feeList.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--government-navy)', margin: 0 }}>Fee Breakdown</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Fee / Charge</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Basis / Details</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {feeList.map((fee, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--government-navy)', verticalAlign: 'top' }}>
                      {fee.name}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '13px', color: '#475569', verticalAlign: 'top' }}>
                      {fee.basis}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '14px', fontWeight: '600', color: 'var(--government-navy)', textAlign: 'right', verticalAlign: 'top' }}>
                      {fee.status === 'TO BE ASSESSED' || fee.amount === null ? (
                        <span style={{ color: '#D97706' }}>To Assess</span>
                      ) : (
                        `₱${Number(fee.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', verticalAlign: 'top' }}>
                      {fee.status === 'TO BE ASSESSED' || fee.amount === null ? (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                          TO BE ASSESSED
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
                          ESTIMATED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DOCUMENT PREPARATION */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--government-navy)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--primary-green)" /> Review the requirements that may be needed for your business.
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '600px', lineHeight: '1.5' }}>
            Regulatory fees are often associated with specific clearances, such as Sanitary Permits or Fire Safety Inspection Certificates. Make sure you have prepared the required documents.
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
