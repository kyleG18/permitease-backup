import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  CheckSquare, 
  FolderOpen, 
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
  History,
  Rocket,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { isOnboarded } = useContext(BusinessContext);

  const getNavItems = () => {
    const baseNav = [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }];
    const role = user?.role;

    if (role === 'business_owner') {
      if (!isOnboarded) {
        return [
          ...baseNav,
          { name: 'Set Up My Business', path: '/onboarding', icon: Rocket },
          { name: 'AI Help', path: '/assistant', icon: MessageSquare }
        ];
      }
      
      return [
        ...baseNav,
        { name: 'My Business', path: '/profile', icon: Building2 },
        { name: 'Permit Readiness', path: '/readiness', icon: ShieldCheck },
        { name: 'My Applications', path: '/applications', icon: FileText },
        { name: 'My Permits', path: '/permits', icon: Shield },
        { name: 'Renewals', path: '/renewals', icon: CalendarClock },
        { name: 'AI Assessment', path: '/assessment', icon: BrainCircuit },
        { name: 'AI Help', path: '/assistant', icon: MessageSquare }
      ];
    }

    if (role === 'lgu_admin') {
      return [
        ...baseNav,
        { name: 'Permit Applications', path: '/admin/applications', icon: ClipboardCheck },
        { name: 'Renewal Monitoring', path: '/admin/renewals', icon: CalendarClock },
        { name: 'Issued Permits', path: '/admin/permits', icon: Shield },
        { name: 'Permit Requirements', path: '/requirements', icon: CheckSquare },
        { name: 'AI Classification', path: '/assessment', icon: BrainCircuit },
        { name: 'Tax & Fee Rules', path: '/tax-estimate', icon: Receipt },
        { name: 'Knowledge Base', path: '/knowledge', icon: Library },
        { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
        { name: 'Notifications', path: '/notifications', icon: Bell },
        { name: 'LGU Analytics', path: '/admin/analytics', icon: BarChart },
        { name: 'Reports', path: '/reports', icon: FileText },
      ];
    }

    if (role === 'system_admin') {
      return [
        ...baseNav,
        { name: 'User Management', path: '/user-management', icon: Users },
        { name: 'Role Management', path: '/role-management', icon: ShieldAlert },
        { name: 'Permit Applications', path: '/admin/applications', icon: ClipboardCheck },
        { name: 'Renewal Monitoring', path: '/admin/renewals', icon: CalendarClock },
        { name: 'Issued Permits', path: '/admin/permits', icon: Shield },
        { name: 'Business Profiles', path: '/profile', icon: Building2 },
        { name: 'AI Assessment', path: '/assessment', icon: BrainCircuit },
        { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
        { name: 'Permit Requirements', path: '/requirements', icon: CheckSquare },
        { name: 'Knowledge Base', path: '/knowledge', icon: Library },
        { name: 'Audit Logs', path: '/audit-logs', icon: FileText },
        { name: 'LGU Analytics', path: '/admin/analytics', icon: BarChart },
        { name: 'Reports', path: '/reports', icon: FileText },
      ];
    }

    return baseNav;
  };

  const navItems = getNavItems();

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      {/* Logo Area */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ 
          width: '40px', height: '40px', backgroundColor: 'var(--primary-green)', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.25rem',
          flexShrink: 0
        }}>P</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--primary-green)' }}>PermitEase</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Municipality of Roxas</span>
        </div>
        {/* Mobile Close Button */}
        <button
          className="sidebar-close-btn"
          onClick={closeSidebar}
          aria-label="Close navigation"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'none', padding: '0.25rem' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link to={item.path} onClick={closeSidebar} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem',
                  borderRadius: 'var(--radius-sm)', backgroundColor: isActive ? 'var(--light-green)' : 'transparent',
                  color: isActive ? 'var(--primary-green)' : 'var(--text-muted)', fontWeight: isActive ? '600' : '500',
                  fontSize: '0.875rem', transition: 'all var(--transition-fast)', textDecoration: 'none'
                }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.color = 'var(--text-dark)'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings */}
      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border-color)' }}>
        <Link to="/settings" onClick={closeSidebar} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem',
          borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontWeight: '500',
          fontSize: '0.875rem', transition: 'all var(--transition-fast)', textDecoration: 'none'
        }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.color = 'var(--text-dark)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Settings size={18} /> Settings
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
