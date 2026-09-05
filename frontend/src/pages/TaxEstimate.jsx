import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Calculator, AlertTriangle, ChevronDown, ChevronUp, Settings } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

export default function TaxEstimate() {
  const { token, user } = useContext(AuthContext);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Admin Rule Management state
  const [rules, setRules] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ name: '', description: '', category: 'Permit Fee', basis: 'fixed', rate: 0, fixed_amount: 0, condition_field: 'always', condition_value: '', is_active: true });

  const isAdmin = user?.role === 'lgu_admin' || user?.role === 'system_admin';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!isAdmin) {
      fetch(`${API}/businesses`, { headers }).then(r => r.json()).then(data => {
        setBusinesses(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedBizId(String(data[0].id));
      });
    } else {
      fetch(`${API}/tax/rules`, { headers }).then(r => r.json()).then(data => setRules(Array.isArray(data) ? data : []));
    }
  }, []);

  // Estimate is now triggered manually via button

  const fetchEstimate = async () => {
    if (!selectedBizId) return;
    setLoading(true);
    setError('');
    setEstimate(null);
    try {
      const authToken = token || user?.token;
      const res = await fetch(`${API}/tax/estimate/${selectedBizId}`, {
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || `Error ${res.status}: Could not load estimate.`);
      } else {
        setEstimate(data);
      }
    } catch (e) {
      console.error('Estimate fetch error:', e);
      setError('Network error — make sure the server is running.');
    }
    setLoading(false);
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    const method = editingRule ? 'PUT' : 'POST';
    const url = editingRule ? `${API}/tax/rules/${editingRule.id}` : `${API}/tax/rules`;
    await fetch(url, { method, headers, body: JSON.stringify(ruleForm) });
    const fresh = await fetch(`${API}/tax/rules`, { headers });
    setRules(await fresh.json());
    setShowRuleForm(false);
    setEditingRule(null);
    setRuleForm({ name: '', description: '', category: 'Permit Fee', basis: 'fixed', rate: 0, fixed_amount: 0, condition_field: 'always', condition_value: '', is_active: true });
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Delete this rule?')) return;
    await fetch(`${API}/tax/rules/${id}`, { method: 'DELETE', headers });
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({ name: rule.name, description: rule.description, category: rule.category, basis: rule.basis, rate: rule.rate, fixed_amount: rule.fixed_amount, condition_field: rule.condition_field, condition_value: rule.condition_value, is_active: rule.is_active });
    setShowRuleForm(true);
  };

  // --- ADMIN VIEW ---
  if (isAdmin) {
    return (
      <div style={{ padding: '2rem', maxWidth: '900px' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Tax & Fee Rule Manager</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure computation rules for permit fee estimates.</p>
          </div>
          <button onClick={() => { setShowRuleForm(true); setEditingRule(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
            <Settings size={15} /> Add Rule
          </button>
        </div>

        {showRuleForm && (
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '1rem' }}>{editingRule ? 'Edit Rule' : 'New Rule'}</h3>
            <form onSubmit={handleRuleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Rule Name *</label>
                <input required value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Category *</label>
                <select value={ruleForm.category} onChange={e => setRuleForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  {['Business Tax', 'Permit Fee', 'Sanitary Fee', 'Fire Safety Fee', 'Other Fee'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Calculation Basis *</label>
                <select value={ruleForm.basis} onChange={e => setRuleForm(p => ({ ...p, basis: e.target.value }))} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  {['fixed', 'gross_sales', 'capitalization', 'floor_area', 'employees'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              {ruleForm.basis === 'fixed' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Fixed Amount (₱)</label>
                  <input type="number" step="0.01" value={ruleForm.fixed_amount} onChange={e => setRuleForm(p => ({ ...p, fixed_amount: e.target.value }))} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }} />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Rate (e.g. 0.02 = 2%)</label>
                  <input type="number" step="0.0001" value={ruleForm.rate} onChange={e => setRuleForm(p => ({ ...p, rate: e.target.value }))} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }} />
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Condition Field</label>
                <select value={ruleForm.condition_field} onChange={e => setRuleForm(p => ({ ...p, condition_field: e.target.value }))} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  {['always', 'industry_category', 'business_type', 'business_status'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              {ruleForm.condition_field !== 'always' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Condition Value</label>
                  <input value={ruleForm.condition_value} onChange={e => setRuleForm(p => ({ ...p, condition_value: e.target.value }))} placeholder="e.g. Food & Beverage" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }} />
                </div>
              )}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Description</label>
                <textarea value={ruleForm.description} onChange={e => setRuleForm(p => ({ ...p, description: e.target.value }))} rows="2" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', resize: 'vertical' }} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowRuleForm(false)} style={{ padding: '0.6rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: 'white' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.25rem', backgroundColor: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>Save Rule</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: '#F9FAFB' }}>
              <tr>{['Name', 'Category', 'Basis', 'Rate/Amount', 'Condition', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', fontSize: '0.775rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: '600' }}>{r.name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{r.category}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{r.basis}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: '500', color: 'var(--primary-green)' }}>
                    {r.basis === 'fixed' ? `₱${Number(r.fixed_amount).toLocaleString()}` : `${(parseFloat(r.rate) * 100).toFixed(2)}%`}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {r.condition_field === 'always' ? 'All businesses' : `${r.condition_field} = "${r.condition_value}"`}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', color: r.is_active ? '#16A34A' : '#6B7280', backgroundColor: r.is_active ? '#DCFCE7' : '#F3F4F6' }}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditRule(r)} style={{ padding: '0.3rem 0.7rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.775rem', backgroundColor: 'white' }}>Edit</button>
                      <button onClick={() => handleDeleteRule(r.id)} style={{ padding: '0.3rem 0.7rem', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.775rem', backgroundColor: '#FEF2F2', color: '#DC2626' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- BUSINESS OWNER VIEW ---
  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Estimated Permit Fees</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View an itemized estimate of your permit taxes and fees based on your business profile.</p>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <select
          value={selectedBizId}
          onChange={e => { setSelectedBizId(e.target.value); setEstimate(null); }}
          style={{ padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', minWidth: '240px', fontSize: '0.9rem', color: 'var(--text-primary)' }}
        >
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>

        <button
          onClick={fetchEstimate}
          disabled={!selectedBizId || loading}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px' }}
        >
          <Calculator size={16} />
          {loading ? 'Calculating...' : 'Run Estimation'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem 1rem', backgroundColor: '#FDECEC', border: '1px solid #F2C7C7', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', color: '#8B1E1E', fontSize: '0.875rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div><strong>Could not run estimation.</strong><br />{error}</div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          <Calculator size={20} color="var(--primary-green)" />
          Calculating your estimated permit fees...
        </div>
      ) : estimate ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Header & Confidence */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: 'var(--government-navy)' }}>
                Estimated Charges — {estimate.business_summary?.business_name || 'Business'}
              </h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {estimate.business_summary?.business_type} • {estimate.business_summary?.application_type}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: '600' }}>AI Confidence</div>
              <span style={{ 
                padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700',
                backgroundColor: estimate.estimation_confidence === 'HIGH' ? '#DCFCE7' : estimate.estimation_confidence === 'MEDIUM' ? '#FEF9C3' : '#FEE2E2',
                color: estimate.estimation_confidence === 'HIGH' ? '#166534' : estimate.estimation_confidence === 'MEDIUM' ? '#854D0E' : '#991B1B'
              }}>
                {estimate.estimation_confidence}
              </span>
            </div>
          </div>

          {/* Missing Info Warning */}
          {estimate.missing_information?.length > 0 && (
            <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
              <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#92400E', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Missing Information</strong>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#B45309', fontSize: '0.8125rem' }}>
                  {estimate.missing_information.map((info, idx) => <li key={idx}>{info}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Breakdown Table */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#F9FAFB' }}>
                <tr>{['Component', 'Category', 'Basis / Rate', 'Calculation', 'Estimated Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {(!estimate.fees || estimate.fees.length === 0) ? (
                  <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No applicable fees found.</td></tr>
                ) : estimate.fees.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--government-navy)', verticalAlign: 'top' }}>{item.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', verticalAlign: 'top' }}>{item.category}</td>
                    <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{item.basis}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate: {item.rate}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', verticalAlign: 'top' }}>{item.calculation}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', textAlign: 'right', color: 'var(--primary-green)', verticalAlign: 'top' }}>
                      ₱{Number(item.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: item.status === 'ESTIMATED' ? '#F0FDF4' : '#FFF7ED', color: item.status === 'ESTIMATED' ? '#166534' : '#C2410C', textTransform: 'uppercase' }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F0FDF4', borderTop: '2px solid var(--primary-green)' }}>
                  <td colSpan="4" style={{ padding: '1rem 1.5rem', fontWeight: '800', fontSize: '0.9375rem', color: 'var(--government-navy)' }}>ESTIMATED TOTAL</td>
                  <td colSpan="2" style={{ padding: '1rem 1.5rem', fontWeight: '800', fontSize: '1.25rem', textAlign: 'right', color: 'var(--primary-green)' }}>
                    ₱{Number(estimate.estimated_total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Explanation & Disclaimer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {estimate.explanation && (
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--government-navy)' }}>AI Explanation</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{estimate.explanation}</p>
              </div>
            )}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                {estimate.disclaimer || 'Estimated amount only. Final fees are determined by the Municipality of Roxas based on the submitted business information and applicable ordinances and fee schedules.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
