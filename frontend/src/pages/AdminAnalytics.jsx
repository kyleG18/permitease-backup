import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Building2, FileText, CheckCircle, Clock, AlertTriangle, AlertCircle, FileX, CreditCard, RotateCw } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const COLORS = ['#059669', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

export default function AdminAnalytics() {
    const { user } = useContext(AuthContext);
    const token = user?.token;

    const [period, setPeriod] = useState('30d');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [overview, setOverview] = useState(null);
    const [applications, setApplications] = useState(null);
    const [permits, setPermits] = useState(null);
    const [requirements, setRequirements] = useState(null);
    const [businesses, setBusinesses] = useState(null);
    const [activity, setActivity] = useState(null);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const q = `?period=${period}`;

            const [ov, app, perm, reqs, biz, act] = await Promise.all([
                axios.get(`${API}/analytics/overview${q}`, config),
                axios.get(`${API}/analytics/applications${q}`, config),
                axios.get(`${API}/analytics/permits${q}`, config),
                axios.get(`${API}/analytics/requirements${q}`, config),
                axios.get(`${API}/analytics/businesses${q}`, config),
                axios.get(`${API}/analytics/activity${q}`, config)
            ]);

            setOverview(ov.data);
            setApplications(app.data);
            setPermits(perm.data);
            setRequirements(reqs.data);
            setBusinesses(biz.data);
            setActivity(act.data);
        } catch (err) {
            console.error(err);
            setError('Unable to load analytics data. Please ensure you have appropriate permissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, token]);

    if (!user || (user.role !== 'lgu_admin' && user.role !== 'system_admin')) {
        return (
            <div className="card text-center" style={{ padding: '4rem', marginTop: '2rem' }}>
                <AlertTriangle size={48} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
                <h3>Access Denied</h3>
                <p className="text-muted">You do not have permission to view municipal analytics.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card text-center" style={{ padding: '4rem', marginTop: '2rem' }}>
                <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
                <h3 className="text-danger">Error</h3>
                <p className="text-muted">{error}</p>
                <button className="btn btn-primary mt-3" onClick={fetchData}>Try Again</button>
            </div>
        );
    }

    if (loading && !overview) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading municipal analytics...</div>;
    }

    // Format currency safely
    const formatCurrency = (val) => {
        if (val === null || val === undefined || isNaN(val)) return 'Data unavailable';
        return `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Format date safely
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
    };

    // Card Component
    const StatCard = ({ title, value, icon, colorClass, subtitle }) => (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
                <div className={`text-${colorClass}`}>{icon}</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-dark)', lineHeight: '1' }}>{value !== null ? value : 'N/A'}</div>
            {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{subtitle}</div>}
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Header & Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>LGU Analytics</h1>
                    <p className="text-muted">Municipality of Roxas Business Permit and Licensing Office</p>
                </div>
                <div>
                    <select className="form-control" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: '200px' }}>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="1y">This Year</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* Current Snapshot Row */}
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-dark)', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.5rem' }}>Current Municipal Status (Snapshot)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard title="Total Businesses" value={overview?.totalBusinesses} icon={<Building2 size={24} />} colorClass="primary" />
                <StatCard title="Verified Submissions" value={overview?.activePermits} icon={<CheckCircle size={24} />} colorClass="success" />
                <StatCard title="Expiring Soon" value={overview?.expiringSoonPermits} icon={<Clock size={24} />} colorClass="warning" subtitle="<= 60 days remaining" />
                <StatCard title="Expired Submissions" value={overview?.expiredPermits} icon={<AlertTriangle size={24} />} colorClass="danger" />
            </div>

            {/* Selected Period Row */}
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-dark)', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.5rem' }}>Selected Period ({period === 'all' ? 'All Time' : period === '1y' ? 'This Year' : `Last ${period.replace('d','') } Days`})</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard title="Apps Submitted" value={overview?.totalApplications} icon={<FileText size={24} />} colorClass="primary" />
                <StatCard title="Pending Review" value={overview?.pendingApplications} icon={<Clock size={24} />} colorClass="warning" />
                <StatCard title="Renewal Apps" value={overview?.renewalApplications} icon={<RotateCw size={24} />} colorClass="primary" />
                <StatCard title="Estimated Fees" value={formatCurrency(overview?.estimatedFees)} icon={<CreditCard size={24} />} colorClass="success" subtitle="SYSTEM ESTIMATE ONLY" />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Application Trends */}
                <div className="card" style={{ flex: '2', minWidth: '280px' }}>
                    <h5 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Application Trends</h5>
                    {applications?.trend?.length > 0 ? (
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={applications.trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                                    <Line type="monotone" dataKey="count" stroke="var(--primary-green)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Applications" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No application data available for this period.</div>
                    )}
                </div>

                {/* Applications by Status */}
                <div className="card" style={{ flex: '1', minWidth: '280px' }}>
                    <h5 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Applications by Status</h5>
                    {applications?.byStatus?.length > 0 ? (
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={applications.byStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="status">
                                        {applications.byStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                                    <Legend iconType="circle" fontSize={12} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No status data available.</div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Business Distribution */}
                <div className="card" style={{ flex: '1', minWidth: '280px' }}>
                    <h5 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Businesses by Industry</h5>
                    {businesses?.byIndustry?.length > 0 ? (
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={businesses.byIndustry} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                                    <YAxis dataKey="industry_category" type="category" stroke="#64748B" fontSize={11} tickLine={false} width={100} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                                    <Bar dataKey="count" fill="var(--primary-green)" radius={[0, 4, 4, 0]} barSize={20} name="Businesses" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No business data available.</div>
                    )}
                </div>

                {/* Common Missing Requirements & Preparation Bottlenecks */}
                <div className="card" style={{ flex: '1', minWidth: '280px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div>
                            <h5 style={{ margin: '0 0 0.25rem', color: 'var(--text-dark)' }}>Preparation Bottlenecks</h5>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Top requirements local businesses still need to prepare</p>
                        </div>
                    </div>

                    {requirements?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {requirements.map((req, idx) => {
                                const total = (req.missingCount || 0) + (req.preparedCount || 0);
                                const prepRate = total > 0 ? Math.round(((req.preparedCount || 0) / total) * 100) : 0;
                                return (
                                    <div key={idx} style={{ padding: '0.85rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <div style={{ width: '22px', height: '22px', backgroundColor: idx < 3 ? '#FEE2E2' : '#F1F5F9', color: idx < 3 ? '#DC2626' : '#64748B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0 }}>
                                                    {idx + 1}
                                                </div>
                                                <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-dark)' }}>{req.requirementName}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#16A34A', backgroundColor: '#DCFCE7', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                                                    {req.preparedCount || 0} Ready
                                                </span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                                                    {req.missingCount || 0} Missing
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div style={{ height: '6px', backgroundColor: '#FEE2E2', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                            <div style={{ height: '100%', width: `${prepRate}%`, backgroundColor: '#16A34A', transition: 'width 0.4s ease' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                                            <span>Preparation rate</span>
                                            <span style={{ fontWeight: '600', color: prepRate > 70 ? '#16A34A' : '#EA580C' }}>{prepRate}% prepared</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <FileX size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <div>No requirement data recorded.</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h5 style={{ margin: 0, color: 'var(--text-dark)' }}>Recent Application Activity</h5>
                    {activity?.processingTime?.available ? (
                        <span className="badge" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                            Avg. Processing (Submit to Approve): {Number(activity.processingTime.avgHours).toFixed(1)} hours
                        </span>
                    ) : (
                        <span className="badge badge-pending" title={activity?.processingTime?.reason}>Avg. Processing: N/A</span>
                    )}
                </div>
                
                {activity?.recentActivity?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem 1rem', color: '#64748B', fontWeight: '600' }}>Date</th>
                                    <th style={{ padding: '0.75rem 1rem', color: '#64748B', fontWeight: '600' }}>App #</th>
                                    <th style={{ padding: '0.75rem 1rem', color: '#64748B', fontWeight: '600' }}>Action</th>
                                    <th style={{ padding: '0.75rem 1rem', color: '#64748B', fontWeight: '600' }}>Admin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activity.recentActivity.map((act, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{formatDate(act.created_at)}</td>
                                        <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: 'var(--text-dark)' }}>{act.application_number}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={{ fontWeight: '500', color: 'var(--primary-green)' }}>{act.action}</span>
                                            {act.remarks && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.remarks}</div>}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dark)' }}>{act.actor_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No historical administrative activity available for this period.</div>
                )}
            </div>

        </div>
    );
}
