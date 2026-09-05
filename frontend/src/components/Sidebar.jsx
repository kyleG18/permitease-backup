import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  CheckSquare, 
  CalendarClock, 
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
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { isOnboarded } = useContext(BusinessContext);

  const getNavSections = () => {
    const role = user?.role;

    if (role === 'business_owner') {
      if (!isOnboarded) {
        return [
          {
            title: 'MAIN',
            items: [
              { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
              { name: 'Set Up My Business', path: '/onboarding', icon: Rocket }
            ]
          },
          {
            title: 'ASSISTANCE',
            items: [
              { name: 'Tax & Fee Estimation', path: '/tax-estimate', icon: Receipt },
              { name: 'AI Help', path: '/assistant', icon: MessageSquare }
            ]
          }
        ];
      }
      
      return [
        {
          title: 'MAIN',
          items: [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'My Business', path: '/profile', icon: Building2 },
            { name: 'Permit Readiness', path: '/readiness', icon: ShieldCheck },
            { name: 'My Permits', path: '/permits', icon: Shield },
            { name: 'Renewals', path: '/renewals', icon: CalendarClock }
          ]
        },
        {
          title: 'ASSISTANCE',
          items: [
            { name: 'AI Assessment', path: '/assessment', icon: BrainCircuit },
            { name: 'Tax & Fee Estimation', path: '/tax-estimate', icon: Receipt },
            { name: 'AI Help', path: '/assistant', icon: MessageSquare }
          ]
        }
      ];
    }

    if (role === 'lgu_admin') {
      return [
        {
          title: 'MAIN',
          items: [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Permit Applications', path: '/admin/applications', icon: ClipboardCheck },
            { name: 'Renewal Monitoring', path: '/admin/renewals', icon: CalendarClock },
            { name: 'Issued Permits', path: '/admin/permits', icon: Shield },
            { name: 'Permit Requirements', path: '/requirements', icon: CheckSquare }
          ]
        },
        {
          title: 'ASSISTANCE & DATA',
          items: [
            { name: 'AI Classification', path: '/assessment', icon: BrainCircuit },
            { name: 'Tax & Fee Rules', path: '/tax-estimate', icon: Receipt },
            { name: 'Knowledge Base', path: '/knowledge', icon: Library },
            { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
            { name: 'LGU Analytics', path: '/admin/analytics', icon: BarChart },
            { name: 'Reports', path: '/reports', icon: FileText },
          ]
        }
      ];
    }

    if (role === 'system_admin') {
      return [
        {
          title: 'MAIN',
          items: [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Permit Applications', path: '/admin/applications', icon: ClipboardCheck },
            { name: 'Renewal Monitoring', path: '/admin/renewals', icon: CalendarClock },
            { name: 'Issued Permits', path: '/admin/permits', icon: Shield },
            { name: 'Business Profiles', path: '/profile', icon: Building2 },
            { name: 'Permit Requirements', path: '/requirements', icon: CheckSquare }
          ]
        },
        {
          title: 'ADMIN & SYSTEM',
          items: [
            { name: 'User Management', path: '/user-management', icon: Users },
            { name: 'Role Management', path: '/role-management', icon: ShieldAlert },
            { name: 'AI Assessment', path: '/assessment', icon: BrainCircuit },
            { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
            { name: 'Knowledge Base', path: '/knowledge', icon: Library },
            { name: 'LGU Analytics', path: '/admin/analytics', icon: BarChart },
            { name: 'Reports', path: '/reports', icon: FileText },
            { name: 'Audit Logs', path: '/audit-logs', icon: FileText }
          ]
        }
      ];
    }

    return [{ title: 'MAIN', items: [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] }];
  };

  const navSections = getNavSections();

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      {/* Logo Area */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">P</div>
        <div className="sidebar-logo-text">
          <h2>PermitEase</h2>
          <span>Municipality of Roxas</span>
        </div>
        <button
          className="sidebar-close-btn"
          onClick={closeSidebar}
          aria-label="Close navigation"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'none', padding: '0.25rem', marginLeft: 'auto' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navSections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: '1.25rem' }}>
            <div className="sidebar-section-label">{section.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    to={item.path} 
                    onClick={closeSidebar} 
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? 'var(--primary-green)' : 'var(--text-muted)' }} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings Footer */}
      <div className="sidebar-footer">
        <Link 
          to="/settings" 
          onClick={closeSidebar} 
          className={`sidebar-item ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          <Settings size={18} strokeWidth={location.pathname === '/settings' ? 2.5 : 2} /> 
          Settings
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
