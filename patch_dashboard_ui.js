const fs = require('fs');
const path = './frontend/src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldArray = `[
            { label: 'Businesses',    value: stats?.total_businesses,    icon: Building2,     color: 'var(--primary-green)',   to: '/profile',    link: 'View Business Details' },
            { label: 'Total Permits', value: stats?.total_permits,       icon: FileText,      color: 'var(--government-navy)', to: '/readiness',  link: 'View Readiness' },
            { label: 'Active Permits',value: stats?.active_permits,      icon: CheckCircle,   color: 'var(--success)',         to: '/readiness',  link: 'View Readiness' },
            { label: 'Expiring Soon', value: stats?.expiring_soon,       icon: AlertTriangle, color: 'var(--warning)',         to: '/renewals',   link: 'View Renewals' },
            { label: 'Expired',       value: stats?.expired_permits,     icon: XCircle,       color: 'var(--danger)',          to: '/renewals',   link: 'View Renewals' },
            { label: 'Pending Review',value: stats?.pending_applications, icon: Clock,        color: 'var(--text-secondary)',  to: '/renewals',   link: 'View Renewals' },
          ]`;

const newArray = `[
            { label: 'Businesses',    value: stats?.total_businesses,    icon: Building2,     color: 'var(--primary-green)',   to: '/profile',    link: 'View Details' },
            { label: 'Readiness %', value: stats?.compliance_score ? \`\${stats.compliance_score}%\` : '0%', icon: ShieldCheck, color: stats?.compliance_score >= 80 ? 'var(--success)' : 'var(--warning)', to: '/readiness', link: 'View Readiness' },
            { label: 'Total Reqs', value: stats?.total_requirements || 0, icon: FileText,      color: 'var(--government-navy)', to: '/readiness',  link: 'View Requirements' },
            { label: 'Ready Reqs', value: stats?.ready_requirements || 0, icon: CheckCircle,   color: 'var(--success)',         to: '/readiness',   link: 'View Checklist' },
            { label: 'Missing Reqs', value: stats?.missing_requirements || 0, icon: AlertCircle, color: 'var(--danger)',          to: '/readiness',   link: 'Complete Now' },
            { label: 'Assessment',value: stats?.assessment_completed ? 'Done' : 'Pending', icon: BrainCircuit, color: stats?.assessment_completed ? 'var(--success)' : 'var(--text-secondary)',  to: '/assessment',   link: 'View Assessment' },
          ]`;

if (content.includes('Total Permits')) {
    content = content.replace(oldArray, newArray);
    fs.writeFileSync(path, content);
    console.log('Patched Dashboard.jsx stats array');
} else {
    console.log('Already patched Dashboard UI');
}
