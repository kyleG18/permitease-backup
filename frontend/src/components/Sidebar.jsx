import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { useTranslation } from '../context/LanguageContext';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  CheckSquare, 
  CalendarClock, 
  Calendar,
  MessageSquare, 
  Library,
  Settings,
  BrainCircuit,
  Bell,
  Users,
  ShieldAlert,
  BarChart,
  ClipboardCheck,
  Receipt,
  ShieldCheck,
  Shield,
  Rocket,
  X,
  History,
} from 'lucide-react';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { isOnboarded } = useContext(BusinessContext);

  const getNavSections = () => {
    const role = user?.role;

    if (role === 'business_owner') {
      if (!isOnboarded) {
        return [
          {
            title: (t.nav?.main || 'MAIN'),
            items: [
              { name: (t.nav?.dashboard || 'Dashboard'), path: '/dashboard', icon: LayoutDashboard, tour: 'dashboard' },
              { name: (t.nav?.setUpBusiness || 'Set Up My Business'), path: '/onboarding', icon: Rocket }
            ]
          },
          {
            title: (t.nav?.assistance || 'ASSISTANCE'),
            items: [
              { name: (t.nav?.taxEstimation || 'Tax Estimation'), path: '/tax-estimation', icon: Receipt, tour: 'tax-estimation' },
              { name: (t.nav?.feeEstimation || 'Fee Estimation'), path: '/fee-estimation', icon: Receipt, tour: 'fee-estimation' },
              { name: (t.nav?.aiHelp || 'AI Help'), path: '/assistant', icon: MessageSquare, tour: 'ai-help' }
            ]
          },
          {
            title: 'NOTIFICATIONS',
            items: [
              { name: (t.nav?.notifications || 'Notifications'), path: '/notifications', icon: Bell, tour: 'notifications' }
            ]
          }
        ];
      }
      
      // ONBOARDED business_owner — flattened flow order
      return [
        {
          title: (t.nav?.main || 'MAIN'),
          items: [
            { name: (t.nav?.dashboard || 'Dashboard'), path: '/dashboard', icon: LayoutDashboard, tour: 'dashboard' },
            { name: (t.nav?.myBusiness || 'My Business'), path: '/profile', icon: Building2, tour: 'my-business' },
          ]
        },
        {
          title: (t.nav?.assessment || 'ASSESSMENT'),
          items: [
            { name: (t.nav?.aiAssessment || 'AI Permit Assessment'), path: '/assessment', icon: BrainCircuit, tour: 'ai-assessment' },
            { name: (t.nav?.taxEstimation || 'Tax Estimation'), path: '/tax-estimation', icon: Receipt, tour: 'tax-estimation' },
            { name: (t.nav?.feeEstimation || 'Fee Estimation'), path: '/fee-estimation', icon: Receipt, tour: 'fee-estimation' },
          ]
        },
        {
          title: (t.nav?.permitPreparation || 'PERMIT PREPARATION'),
          items: [
            { name: (t.nav?.prepareApplication || 'Prepare Application'), path: '/applications', icon: ClipboardCheck, tour: 'prepare-application' },
            { name: (t.nav?.scheduleWalkin || 'Schedule Walk-in'), path: '/schedule-walkin', icon: Calendar, tour: 'schedule-walkin' },
            { name: (t.nav?.myPermits || 'Verify Requirements'), path: '/permits', icon: Shield, tour: 'my-permits' },
          ]
        },
        {
          title: (t.nav?.renewals || 'RENEWALS'),
          items: [
            { name: (t.nav?.renewalMonitoring || 'Renewals'), path: '/renewals', icon: CalendarClock, tour: 'renewals' },
          ]
        },
        {
          title: (t.nav?.assistance || 'ASSISTANCE'),
          items: [
            { name: (t.nav?.aiHelp || 'AI Help'), path: '/assistant', icon: MessageSquare, tour: 'ai-help' },
          ]
        },
        {
          title: 'NOTIFICATIONS',
          items: [
            { name: (t.nav?.notifications || 'Notifications'), path: '/notifications', icon: Bell, tour: 'notifications' },
          ]
        }
      ];
    }

    if (role === 'lgu_admin') {
      return [
        {
          title: (t.nav?.main || 'MAIN'),
          items: [
            { name: (t.nav?.dashboard || 'Dashboard'), path: '/dashboard', icon: LayoutDashboard },
            { name: 'Application Forms', path: '/admin/applications', icon: FileText },
            { name: 'Walk-in Schedule', path: '/admin/walkins', icon: Calendar },
            { name: 'Clearance Verification', path: '/permits', icon: ShieldCheck },
            { name: 'Renewal Monitoring', path: '/admin/renewals', icon: CalendarClock },
            { name: 'Permit Registry', path: '/admin/permits', icon: FileText },
            { name: 'Municipal Requirements', path: '/requirements', icon: CheckSquare }
          ]
        },
        {
          title: 'REPORTS & INSIGHTS',
          items: [
            { name: 'Reports & Analytics', path: '/admin/analytics', icon: BarChart },
            { name: 'Knowledge Base', path: '/knowledge', icon: Library },
          ]
        }
      ];
    }

    if (role === 'system_admin') {
      return [
        {
          title: (t.nav?.main || 'MAIN'),
          items: [
            { name: (t.nav?.dashboard || 'Dashboard'), path: '/dashboard', icon: LayoutDashboard },
            { name: 'Application Forms', path: '/admin/applications', icon: FileText },
            { name: 'Walk-in Schedule', path: '/admin/walkins', icon: Calendar },
            { name: 'Clearance Verification', path: '/permits', icon: ShieldCheck },
            { name: 'Renewal Monitoring', path: '/admin/renewals', icon: CalendarClock },
            { name: 'Permit Registry', path: '/admin/permits', icon: FileText },
            { name: 'Municipal Requirements', path: '/requirements', icon: CheckSquare }
          ]
        },
        {
          title: 'ADMINISTRATION',
          items: [
            { name: 'User Management', path: '/user-management', icon: Users },
            { name: 'Audit Trail', path: '/audit-logs', icon: History }
          ]
        },
        {
          title: 'REPORTS & INSIGHTS',
          items: [
            { name: 'Reports & Analytics', path: '/admin/analytics', icon: BarChart },
            { name: 'Knowledge Base', path: '/knowledge', icon: Library }
          ]
        }
      ];
    }

    return [{ title: (t.nav?.main || 'MAIN'), items: [{ name: (t.nav?.dashboard || 'Dashboard'), path: '/dashboard', icon: LayoutDashboard }] }];
  };

  const navSections = getNavSections();

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      {/* Logo Area */}
      <div className="sidebar-logo">
        <img 
          src="/images/roxas-seal.png" 
          alt="Municipality of Roxas Seal" 
          style={{ 
            width: '38px', 
            height: '38px', 
            objectFit: 'contain', 
            flexShrink: 0 
          }} 
        />
        <div className="sidebar-logo-text">
          <h2>PermitEase</h2>
          <span>Municipality of Roxas</span>
        </div>
        <button
          className="sidebar-close-btn"
          onClick={closeSidebar}
          aria-label="Close navigation"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', marginLeft: 'auto' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navSections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: '1.25rem' }}>
            <div className="sidebar-section-label">{section.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    to={item.path} 
                    onClick={closeSidebar} 
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    data-tour={item.tour || undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? 'var(--primary-green)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + Tour Footer */}
      <div className="sidebar-footer">
        <Link 
          to="/settings" 
          onClick={closeSidebar} 
          className={`sidebar-item ${location.pathname === '/settings' ? 'active' : ''}`}
          aria-current={location.pathname === '/settings' ? 'page' : undefined}
        >
          <Settings size={18} strokeWidth={location.pathname === '/settings' ? 2.5 : 2} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
