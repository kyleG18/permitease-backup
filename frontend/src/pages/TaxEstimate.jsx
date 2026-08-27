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
      fetch(`${API}/taxes/rules`, { headers }).then(r => r.json()).then(data => setRules(Array.isArray(data) ? data : []));
    }
  }, []);

  useEffect(() => {
    if (selectedBizId) fetchEstimate();
  }, [selectedBizId]);

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/taxes/estimate/${selectedBizId}`, { headers });
      const data = await res.json();
      setEstimate(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    const method = editingRule ? 'PUT' : 'POST';
    const url = editingRule ? `${API}/taxes/rules/${editingRule.id}` : `${API}/taxes/rules`;
    await fetch(url, { method, headers, body: JSON.stringify(ruleForm) });
    const fresh = await fetch(`${API}/taxes/rules`, { headers });
    setRules(await fresh.json());
    setShowRuleForm(false);
    setEditingRule(null);
    setRuleForm({ name: '', description: '', category: 'Permit Fee', basis: 'fixed', rate: 0, fixed_amount: 0, condition_field: 'always', condition_value: '', is_active: true });
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Delete this rule?')) return;
    await fetch(`${API}/taxes/rules/${id}`, { method: 'DELETE', headers });
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

      <div style={{ marginBottom: '1.5rem' }}>
        <select value={selectedBizId} onChange={e => setSelectedBizId(e.target.value)}
          style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', minWidth: '240px', fontSize: '0.9rem' }}>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calculating estimate...</div>
      ) : estimate ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Disclaimer */}
          <div style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={18} color="#CA8A04" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.825rem', color: '#78350F', margin: 0 }}>{estimate.disclaimer}</p>
          </div>

          {/* Breakdown Table */}
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calculator size={18} color="var(--primary-green)" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Estimated Charges — {estimate.business_name}</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#F9FAFB' }}>
                <tr>{['Component', 'Category', 'Basis', 'Rate', 'Estimated Amount'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {estimate.breakdown?.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No applicable fees found for this business.</td></tr>
                ) : estimate.breakdown?.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--text-dark)' }}>{item.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{item.category}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.basis}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{item.rate}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '600', textAlign: 'right', color: 'var(--primary-green)' }}>₱{Number(item.estimated_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F0FDF4' }}>
                  <td colSpan="4" style={{ padding: '1rem 1.5rem', fontWeight: '700', fontSize: '0.9rem' }}>Estimated Total</td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '700', fontSize: '1.1rem', textAlign: 'right', color: 'var(--primary-green)' }}>
                    ₱{Number(estimate.estimated_total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            💡 Tip: Update your <strong>Business Profile</strong> with your capitalization and gross sales for a more accurate estimate.
          </p>
        </div>
      ) : null}
    </div>
  );
}
