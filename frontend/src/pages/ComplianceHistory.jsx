import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { History, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';

const API = 'http://localhost:5000/api';

const ScoreBadge = ({ score }) => {
  const color = score >= 80 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626';
  const bg = score >= 80 ? '#DCFCE7' : score >= 50 ? '#FEF3C7' : '#FEE2E2';
  const label = score >= 80 ? 'Compliant' : score >= 50 ? 'Partial' : 'Non-Compliant';
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700', color, backgroundColor: bg }}>
      {score}% — {label}
    </span>
  );
};

const TrendIcon = ({ current, previous }) => {
  if (previous === null || previous === undefined) return <Minus size={16} color="#9CA3AF" />;
  if (current > previous) return <TrendingUp size={16} color="#16A34A" />;
  if (current < previous) return <TrendingDown size={16} color="#DC2626" />;
  return <Minus size={16} color="#9CA3AF" />;
};

export default function ComplianceHistory() {
  const { token } = useContext(AuthContext);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/businesses`, { headers }).then(r => r.json()).then(data => {
      setBusinesses(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedBizId(String(data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!selectedBizId) return;
    setLoading(true);
    fetch(`${API}/assessments`, { headers })
      .then(r => r.json())
      .then(data => {
        const filtered = (Array.isArray(data) ? data : [])
          .filter(a => String(a.business_id) === selectedBizId)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setHistory(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBizId]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Compliance History</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track how your compliance score has changed over time.</p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <select value={selectedBizId} onChange={e => setSelectedBizId(e.target.value)}
          style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', minWidth: '240px', fontSize: '0.9rem' }}>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>
      </div>

      {/* Chart: score timeline */}
      {!loading && history.length >= 2 && (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-card)', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--primary-green)" /> Score Trend (Latest 6)
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px' }}>
            {history.slice(0, 6).reverse().map((a, i) => {
              const score = a.compliance_score || 0;
              const color = score >= 80 ? '#16A34A' : score >= 50 ? '#F59E0B' : '#EF4444';
              return (
                <div key={a.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color }}>{score}%</span>
                  <div style={{ width: '100%', height: `${Math.max(score, 4)}%`, backgroundColor: color, borderRadius: '4px 4px 0 0', minHeight: '4px', transition: 'height 0.5s ease' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                    {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading history...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
          No assessment history found. Run an AI Assessment to start tracking compliance over time.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map((item, i) => {
            const prev = history[i + 1];
            const result = (() => { try { return typeof item.assessment_result === 'string' ? JSON.parse(item.assessment_result) : item.assessment_result; } catch { return null; } })();
            const score = item.compliance_score || 0;
            const prevScore = prev?.compliance_score;
            const diff = prevScore !== undefined ? score - prevScore : null;

            return (
              <div key={item.id} style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                  onClick={() => toggleExpand(item.id)}>
                  {/* Date Badge */}
                  <div style={{ backgroundColor: 'var(--light-green)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--primary-green)', fontWeight: '600', textAlign: 'center' }}>
                      {new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short' }).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary-green)', textAlign: 'center', lineHeight: 1 }}>
                      {new Date(item.created_at).getDate()}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {new Date(item.created_at).getFullYear()}
                    </div>
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <ScoreBadge score={score} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: diff > 0 ? '#16A34A' : diff < 0 ? '#DC2626' : '#6B7280' }}>
                        <TrendIcon current={score} previous={prevScore} />
                        {diff !== null ? (diff > 0 ? `+${diff}%` : `${diff}%`) : 'First record'}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      {result?.recommended_permits && ` · ${result.recommended_permits.length} permit(s) assessed`}
                    </div>
                  </div>

                  {expanded[item.id] ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>

                {/* Expanded detail */}
                {expanded[item.id] && result && (
                  <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                    {result.explanation && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>{result.explanation}</p>
                    )}
                    {result.recommended_permits?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.775rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Recommended Permits</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {result.recommended_permits.map((p, pi) => (
                            <span key={pi} style={{ padding: '0.25rem 0.7rem', backgroundColor: 'var(--light-green)', color: 'var(--primary-green)', borderRadius: '999px', fontSize: '0.775rem', fontWeight: '600' }}>
                              {p.permit_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
