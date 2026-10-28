import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
    Building2, FileText, CheckCircle, Clock, AlertTriangle, AlertCircle, 
    FileX, CreditCard, RotateCw, Printer, Download, BarChart2, Calendar, 
    Ticket, Scale, Users, ShieldCheck, CheckSquare, ArrowRight, Eye
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const COLORS = ['#059669', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

export default function AdminAnalytics() {
    const { user } = useContext(AuthContext);
    const token = user?.token;

    const [period, setPeriod] = useState('30d');
    const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'report'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [overview, setOverview] = useState(null);
    const [applications, setApplications] = useState(null);
    const [permits, setPermits] = useState(null);
    const [requirements, setRequirements] = useState(null);
    const [businesses, setBusinesses] = useState(null);
    const [activity, setActivity] = useState(null);
    const [dashStats, setDashStats] = useState(null);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const q = `?period=${period}`;

            const [ov, app, perm, reqs, biz, act, dash] = await Promise.all([
                axios.get(`${API}/analytics/overview${q}`, config),
                axios.get(`${API}/analytics/applications${q}`, config),
                axios.get(`${API}/analytics/permits${q}`, config),
                axios.get(`${API}/analytics/requirements${q}`, config),
                axios.get(`${API}/analytics/businesses${q}`, config),
                axios.get(`${API}/analytics/activity${q}`, config),
                axios.get(`${API}/dashboard/stats`, config).catch(() => ({ data: null }))
            ]);

            setOverview(ov.data);
            setApplications(app.data);
            setPermits(perm.data);
            setRequirements(reqs.data);
            setBusinesses(biz.data);
            setActivity(act.data);
            if (dash.data) setDashStats(dash.data);
        } catch (err) {
            console.error(err);
            setError('Unable to load analytics & report data. Please ensure you have appropriate permissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, token]);

    const handlePrint = () => {
        window.print();
    };

    if (!user || (user.role !== 'lgu_admin' && user.role !== 'system_admin')) {
        return (
            <div className="card text-center" style={{ padding: '4rem', marginTop: '2rem' }}>
                <AlertTriangle size={48} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
                <h3>Access Denied</h3>
                <p className="text-muted">You do not have permission to view municipal reports & analytics.</p>
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
        return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading municipal reports & analytics...</div>;
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

    const periodLabel = period === 'all' ? 'All Time' : period === '1y' ? 'Year 2026' : period === '90d' ? 'Last 90 Days' : 'Last 30 Days';
    const currentDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const generatedTime = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

    // StatCard Component
    const StatCard = ({ title, value, icon, colorClass, subtitle }) => (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
                <div className={`text-${colorClass}`}>{icon}</div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--government-navy)', lineHeight: '1' }}>{value !== null && value !== undefined ? value : 'N/A'}</div>
            {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{subtitle}</div>}
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem', fontFamily: 'Inter, sans-serif' }}>

            {/* ── SCREEN HEADER (Hidden in print) ───────────────────────── */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: '0.25rem' }}>
                        Municipality of Roxas, Oriental Mindoro • BPLO
                    </div>
                    <h1 style={{ color: 'var(--government-navy)', margin: '0 0 0.25rem', fontSize: '28px', fontWeight: '700' }}>
                        Reports & Analytics
                    </h1>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
                        Operational intelligence, statutory compliance radar, and official printable executive summaries.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* View Switcher Pills */}
                    <div style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '0.25rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            style={{
                                padding: '0.45rem 0.85rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                backgroundColor: activeTab === 'analytics' ? 'white' : 'transparent',
                                color: activeTab === 'analytics' ? 'var(--government-navy)' : '#64748B',
                                boxShadow: activeTab === 'analytics' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <BarChart2 size={15} /> Visual Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('report')}
                            style={{
                                padding: '0.45rem 0.85rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                backgroundColor: activeTab === 'report' ? 'white' : 'transparent',
                                color: activeTab === 'report' ? 'var(--government-navy)' : '#64748B',
                                boxShadow: activeTab === 'report' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <FileText size={15} /> Executive Report Table
                        </button>
                    </div>

                    {/* Period Selector */}
                    <select 
                        className="form-control" 
                        value={period} 
                        onChange={(e) => setPeriod(e.target.value)} 
                        style={{ width: '150px', padding: '0.45rem 0.75rem', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    >
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="1y">This Year (2026)</option>
                        <option value="all">All Time</option>
                    </select>

                    {/* Print Report Button */}
                    <button
                        onClick={handlePrint}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            backgroundColor: 'var(--primary-green)',
                            color: 'white',
                            border: 'none',
                            padding: '0.55rem 1rem',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        <Printer size={16} /> Print Official Report
                    </button>
                </div>
            </div>

            {/* ── PRINT-ONLY OFFICIAL LGU LETTERHEAD ───────────────────── */}
            <div className="print-header" style={{ display: 'none', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <img src="/images/roxas-seal.png" alt="Roxas Seal" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                    <div>
                        <div style={{ fontSize: '11pt', fontWeight: '600', letterSpacing: '0.05em' }}>REPUBLIC OF THE PHILIPPINES</div>
                        <div style={{ fontSize: '10pt', color: '#333' }}>PROVINCE OF ORIENTAL MINDORO</div>
                        <div style={{ fontSize: '13pt', fontWeight: '800', letterSpacing: '0.05em', color: '#1B365D' }}>MUNICIPALITY OF ROXAS</div>
                        <div style={{ fontSize: '11pt', fontWeight: '700', color: '#166534' }}>BUSINESS PERMITS AND LICENSING OFFICE (BPLO)</div>
                    </div>
                </div>

                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #ccc' }}>
                    <h2 style={{ margin: '0 0 0.2rem', fontSize: '14pt', fontWeight: '800', textTransform: 'uppercase', color: '#000' }}>
                        EXECUTIVE PERMIT COMPLIANCE & OPERATIONAL SUMMARY REPORT
                    </h2>
                    <div style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic' }}>
                        Issued pursuant to Republic Act No. 7160 (Local Government Code) & Republic Act No. 11032 (Ease of Doing Business)
                    </div>
                    <div style={{ fontSize: '9pt', marginTop: '0.35rem', color: '#222' }}>
                        <strong>Reporting Period:</strong> {periodLabel} &nbsp;|&nbsp; 
                        <strong>Date Generated:</strong> {currentDate} at {generatedTime} &nbsp;|&nbsp; 
                        <strong>Generated By:</strong> {user?.full_name || 'BPLO Officer'} ({user?.email})
                    </div>
                </div>
            </div>

            {/* ── CONDITIONAL VIEW: 1. VISUAL ANALYTICS VIEW ───────────── */}
            {activeTab === 'analytics' && (
                <div className="analytics-content-view">
                    
                    {/* Current Snapshot Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--government-navy)', fontSize: '15px', fontWeight: '700' }}>
                            Municipal Business Snapshot (Live Status)
                        </h4>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Real-time database tally</span>
                    </div>

                    <div className="analytics-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <StatCard title="Total Businesses" value={overview?.totalBusinesses} icon={<Building2 size={22} />} colorClass="primary" subtitle="Registered MSMEs in Roxas" />
                        <StatCard title="Active / Verified" value={overview?.activePermits} icon={<CheckCircle size={22} />} colorClass="success" subtitle="In good regulatory standing" />
                        <StatCard title="Expiring (Dec Watch)" value={dashStats?.expiring_soon_count ?? overview?.expiringSoonPermits} icon={<Clock size={22} />} colorClass="warning" subtitle="Annual expiry Dec 31" />
                        <StatCard title="Delinquent (RA 7160)" value={dashStats?.delinquent_count ?? overview?.expiredPermits} icon={<AlertTriangle size={22} />} colorClass="danger" subtitle="25% statutory surcharge applies" />
                    </div>

                    {/* Operational Period Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--government-navy)', fontSize: '15px', fontWeight: '700' }}>
                            Operations in Selected Period ({periodLabel})
                        </h4>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Intake & verification metrics</span>
                    </div>

                    <div className="analytics-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <StatCard title="Apps Submitted" value={overview?.totalApplications} icon={<FileText size={22} />} colorClass="primary" subtitle="Digital pre-assessments" />
                        <StatCard title="Pending Review" value={overview?.pendingApplications} icon={<Clock size={22} />} colorClass="warning" subtitle="Awaiting BPLO officer screening" />
                        <StatCard title="Today's Walk-ins" value={dashStats?.todays_walkin_count ?? 0} icon={<Ticket size={22} />} colorClass="primary" subtitle={`${dashStats?.todays_attended_count ?? 0} sighted at Window 1`} />
                        <StatCard title="Estimated Fees" value={formatCurrency(overview?.estimatedFees)} icon={<CreditCard size={22} />} colorClass="success" subtitle="System tax & fee calculation" />
                    </div>

                    {/* Charts Row 1: Trends + Status */}
                    <div className="analytics-charts-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {/* Application Trends */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <h5 style={{ margin: '0 0 1rem', color: 'var(--government-navy)', fontSize: '14px', fontWeight: '700' }}>
                                Pre-Assessment Application Trends
                            </h5>
                            {applications?.trend?.length > 0 ? (
                                <div style={{ height: '260px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={applications.trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                                            <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                            <Line type="monotone" dataKey="count" stroke="var(--primary-green)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Applications" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '13px' }}>
                                    No application data available for this period.
                                </div>
                            )}
                        </div>

                        {/* Applications by Status */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <h5 style={{ margin: '0 0 1rem', color: 'var(--government-navy)', fontSize: '14px', fontWeight: '700' }}>
                                Applications by Status
                            </h5>
                            {applications?.byStatus?.length > 0 ? (
                                <div style={{ height: '260px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={applications.byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="count" nameKey="status">
                                                {applications.byStatus.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '13px' }}>
                                    No status distribution data available.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Charts Row 2: Industry Distribution + Bottlenecks */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {/* Business Distribution */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <h5 style={{ margin: '0 0 1rem', color: 'var(--government-navy)', fontSize: '14px', fontWeight: '700' }}>
                                Businesses by Industry Sector
                            </h5>
                            {businesses?.byIndustry?.length > 0 ? (
                                <div style={{ height: '280px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={businesses.byIndustry} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                            <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                                            <YAxis dataKey="industry_category" type="category" stroke="#64748B" fontSize={11} tickLine={false} width={110} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="count" fill="var(--primary-green)" radius={[0, 4, 4, 0]} barSize={16} name="Businesses" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '13px' }}>
                                    No industry distribution data available.
                                </div>
                            )}
                        </div>

                        {/* Common Missing Requirements / Preparation Bottlenecks */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h5 style={{ margin: '0 0 0.2rem', color: 'var(--government-navy)', fontSize: '14px', fontWeight: '700' }}>
                                        Regulatory Bottlenecks & Compliance Rates
                                    </h5>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                                        Which prerequisites local businesses struggle to prepare
                                    </p>
                                </div>
                            </div>

                            {requirements?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                    {requirements.slice(0, 5).map((req, idx) => {
                                        const total = (req.missingCount || 0) + (req.preparedCount || 0);
                                        const prepRate = total > 0 ? Math.round(((req.preparedCount || 0) / total) * 100) : 0;
                                        return (
                                            <div key={idx} style={{ padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--government-navy)' }}>
                                                        {idx + 1}. {req.requirementName}
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', backgroundColor: '#DCFCE7', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                                            {req.preparedCount || 0} Ready
                                                        </span>
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#991B1B', backgroundColor: '#FEE2E2', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                                            {req.missingCount || 0} Missing
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ height: '6px', backgroundColor: '#FEE2E2', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${prepRate}%`, backgroundColor: '#166534', transition: 'width 0.4s ease' }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginTop: '0.2rem' }}>
                                                    <span>Readiness rate</span>
                                                    <span style={{ fontWeight: '600', color: prepRate > 65 ? '#166534' : '#D97706' }}>{prepRate}% prepared</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '13px' }}>
                                    No clearance bottleneck data available.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Administrative Activity Log */}
                    <div className="card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h5 style={{ margin: '0 0 0.2rem', color: 'var(--government-navy)', fontSize: '14px', fontWeight: '700' }}>
                                    Recent Pre-Assessment Operational Log
                                </h5>
                                <div style={{ fontSize: '12px', color: '#64748B' }}>Audit trail of actions performed by BPLO officers</div>
                            </div>
                            {activity?.processingTime?.available && (
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '0.3rem 0.65rem', borderRadius: '6px' }}>
                                    Avg. Review Turnaround: {Number(activity.processingTime.avgHours).toFixed(1)} hours
                                </span>
                            )}
                        </div>

                        {activity?.recentActivity?.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                                            <th style={{ padding: '0.65rem 1rem', color: '#64748B', fontWeight: '600' }}>Date & Time</th>
                                            <th style={{ padding: '0.65rem 1rem', color: '#64748B', fontWeight: '600' }}>App Number</th>
                                            <th style={{ padding: '0.65rem 1rem', color: '#64748B', fontWeight: '600' }}>Action Taken</th>
                                            <th style={{ padding: '0.65rem 1rem', color: '#64748B', fontWeight: '600' }}>Reviewing Officer</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activity.recentActivity.map((act, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                                <td style={{ padding: '0.65rem 1rem', color: '#64748B' }}>{formatDate(act.created_at)}</td>
                                                <td style={{ padding: '0.65rem 1rem', fontWeight: '600', color: 'var(--government-navy)', fontFamily: 'monospace' }}>{act.application_number}</td>
                                                <td style={{ padding: '0.65rem 1rem' }}>
                                                    <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>{act.action}</span>
                                                    {act.remarks && <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '0.2rem' }}>{act.remarks}</div>}
                                                </td>
                                                <td style={{ padding: '0.65rem 1rem', color: '#334155' }}>{act.actor_name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                                No administrative activity recorded in this period.
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* ── CONDITIONAL VIEW 2: EXECUTIVE REPORT TABLE VIEW (Always displayed in print) ── */}
            <div className={`executive-report-view ${activeTab === 'analytics' ? 'print-only' : ''}`}>
                
                {/* On-screen Banner for Executive Table View */}
                <div className="no-print" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Printer size={18} color="#166534" />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>
                            Official Executive Report Mode — Click <strong>Print Official Report</strong> to print or export as PDF.
                        </span>
                    </div>
                    <button onClick={handlePrint} style={{ backgroundColor: 'white', color: '#166534', border: '1px solid #86EFAC', padding: '0.35rem 0.75rem', borderRadius: '5px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                        Print Now ↗
                    </button>
                </div>

                <div className="card" style={{ padding: '1.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                    
                    {/* Report Letterhead for screen preview */}
                    <div style={{ borderBottom: '2px solid var(--government-navy)', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Republic of the Philippines</div>
                        <div style={{ fontSize: '12px', color: '#334155' }}>Province of Oriental Mindoro • Municipality of Roxas</div>
                        <h2 style={{ margin: '0.35rem 0 0.15rem', fontSize: '18px', fontWeight: '800', color: 'var(--government-navy)' }}>
                            OFFICIAL BPLO EXECUTIVE COMPLIANCE & MONITORING REPORT
                        </h2>
                        <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                            Business Permits and Licensing Office (BPLO) • PermitEase Intelligence System
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '0.35rem' }}>
                            Period: <strong>{periodLabel}</strong> &nbsp;|&nbsp; Certified on: <strong>{currentDate}</strong> &nbsp;|&nbsp; Prepared by: <strong>{user?.full_name}</strong>
                        </div>
                    </div>

                    {/* Section 1: Top Executive KPI Table */}
                    <h5 style={{ margin: '0 0 0.5rem', fontSize: '13px', fontWeight: '700', color: 'var(--government-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        1. Executive Municipal Metrics Overview
                    </h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '12.5px', border: '1px solid #E2E8F0' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderRight: '1px solid #E2E8F0' }}>Indicator</th>
                                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>Metric Value</th>
                                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Statutory & Legal Benchmark Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Registered MSMEs</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', color: 'var(--government-navy)', borderRight: '1px solid #E2E8F0' }}>{overview?.totalBusinesses ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>Total active business profiles recorded across Roxas barangays</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Active & Compliant</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#166534', borderRight: '1px solid #E2E8F0' }}>{dashStats?.active_count ?? overview?.activePermits ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>Businesses with current valid clearances and compliance status</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Expiring Permits (Dec Watch)</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#D97706', borderRight: '1px solid #E2E8F0' }}>{dashStats?.expiring_soon_count ?? overview?.expiringSoonPermits ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>RA 7160 Sec 167: All annual permits legally expire Dec 31</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Delinquent Permits (Past Jan 20)</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#DC2626', borderRight: '1px solid #E2E8F0' }}>{dashStats?.delinquent_count ?? overview?.expiredPermits ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>RA 7160 Sec 168: Subject to 25% statutory surcharge + 2% monthly interest</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Pre-Assessments Submitted ({periodLabel})</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', borderRight: '1px solid #E2E8F0' }}>{overview?.totalApplications ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>Online pre-assessment submissions screened prior to physical walk-in</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Preparation Verified</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#166534', borderRight: '1px solid #E2E8F0' }}>{overview?.approvedApplications ?? dashStats?.verified_pre_assessments ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>Document readiness confirmed ready for Municipal Hall Window 1 fast-track</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Estimated Municipal Fees ({periodLabel})</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#1E40AF', borderRight: '1px solid #E2E8F0' }}>{formatCurrency(overview?.estimatedFees)}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>System estimation under Local Revenue Code (Final official receipt at Treasury)</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Section 2: Window 1 Walk-in Traffic & Queue Control */}
                    <h5 style={{ margin: '0 0 0.5rem', fontSize: '13px', fontWeight: '700', color: 'var(--government-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Window 1 Walk-in Counter Sighting Traffic
                    </h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '12.5px', border: '1px solid #E2E8F0' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderRight: '1px solid #E2E8F0' }}>Counter Window Indicator</th>
                                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>Count</th>
                                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Status & Operations Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Today's Scheduled Appointments</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', borderRight: '1px solid #E2E8F0' }}>{dashStats?.todays_walkin_count ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>MSMEs scheduled for Morning / Afternoon batch intake at Window 1</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Physical Documents Sighted Today</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#166534', borderRight: '1px solid #E2E8F0' }}>{dashStats?.todays_attended_count ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>Original folders verified by counter officer and endorsed to Cashier</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>Upcoming Week Queue Load (7-Day Outlook)</td>
                                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#1E40AF', borderRight: '1px solid #E2E8F0' }}>{dashStats?.week_walkins_scheduled ?? 0}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>Foot traffic projection to ensure crowd control and 53-min charter benchmark</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Section 3: Statutory Preparation Bottlenecks */}
                    <h5 style={{ margin: '0 0 0.5rem', fontSize: '13px', fontWeight: '700', color: 'var(--government-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        3. Statutory Prerequisite Bottlenecks (Citizen's Charter Clearances)
                    </h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '12px', border: '1px solid #E2E8F0' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                                <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', borderRight: '1px solid #E2E8F0' }}>Clearance / Prerequisite</th>
                                <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>Prepared</th>
                                <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>Missing</th>
                                <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>Readiness Rate</th>
                                <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left' }}>Citizen's Charter Recommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requirements?.map((req, i) => {
                                const total = (req.missingCount || 0) + (req.preparedCount || 0);
                                const rate = total > 0 ? Math.round(((req.preparedCount || 0) / total) * 100) : 0;
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: i % 2 === 1 ? '#F8FAFC' : 'white' }}>
                                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>{req.requirementName}</td>
                                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: '#166534', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>{req.preparedCount || 0}</td>
                                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: '#DC2626', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>{req.missingCount || 0}</td>
                                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '700', color: rate > 60 ? '#166534' : '#D97706', borderRight: '1px solid #E2E8F0' }}>{rate}%</td>
                                        <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>
                                            {rate < 50 ? 'High bottleneck — prior coordination with issuing office recommended' : 'Standard compliance level'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Section 4: Business Distribution by Industry & Legal Structure */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h5 style={{ margin: '0 0 0.5rem', fontSize: '13px', fontWeight: '700', color: 'var(--government-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                4A. Sector Distribution (Industry)
                            </h5>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #E2E8F0' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderRight: '1px solid #E2E8F0' }}>Industry Category</th>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Total MSMEs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {businesses?.byIndustry?.map((ind, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                            <td style={{ padding: '0.45rem 0.75rem', borderRight: '1px solid #E2E8F0' }}>{ind.industry_category || 'General / Unclassified'}</td>
                                            <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center', fontWeight: '600' }}>{ind.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <h5 style={{ margin: '0 0 0.5rem', fontSize: '13px', fontWeight: '700', color: 'var(--government-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                4B. Business Structure
                            </h5>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #E2E8F0' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderRight: '1px solid #E2E8F0' }}>Ownership / Entity Type</th>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Total MSMEs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {businesses?.byType?.map((t, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                            <td style={{ padding: '0.45rem 0.75rem', borderRight: '1px solid #E2E8F0' }}>{t.business_type || 'Sole Proprietorship'}</td>
                                            <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 5: Official Certification & Sign-off Block */}
                    <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #CBD5E1' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2.5rem' }}>Prepared and Submitted by:</div>
                                <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto 0.35rem' }} />
                                <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--government-navy)' }}>{user?.full_name || 'BPLO Licensing Officer'}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>BPLO Licensing Officer / Evaluator</div>
                            </div>

                            <div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2.5rem' }}>Attested and Noted by:</div>
                                <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto 0.35rem' }} />
                                <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--government-navy)' }}>HON. MUNICIPAL MAYOR / HEAD OF BPLO</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>Municipality of Roxas, Oriental Mindoro</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Print Stylesheet Hook */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print, .sidebar, .app-sidebar, .header, .navbar, nav {
                        display: none !important;
                    }
                    .print-header {
                        display: block !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                    .analytics-content-view {
                        display: none !important;
                    }
                    body, html {
                        background: #FFFFFF !important;
                        font-size: 10pt !important;
                    }
                    .card {
                        box-shadow: none !important;
                        border: 1px solid #666 !important;
                        padding: 0.5rem !important;
                    }
                    table {
                        font-size: 9pt !important;
                    }
                }
            `}} />

        </div>
    );
}
