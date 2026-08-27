import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = user?.token;

  const getRoleBadge = (role) => {
    switch(role) {
      case 'system_admin': return <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.5rem' }}>System Admin</span>;
      case 'lgu_admin': return <span className="badge" style={{ background: '#DBEAFE', color: '#2563EB', fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.5rem' }}>LGU Admin</span>;
      default: return <span className="badge badge-approved" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.5rem' }}>Business Owner</span>;
    }
  };

  useEffect(() => {
    if (!token) return;
    const fetchCount = () => {
      fetch(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setUnreadCount(d.count || 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <header className="header" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1rem 2rem', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)',
      position: 'sticky', top: 0, zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        {/* Hamburger Menu (Mobile Only) */}
        <button 
          className="menu-btn" 
          onClick={toggleSidebar} 
          aria-label="Open navigation"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dark)', display: 'none' }}
        >
          <Menu size={24} />
        </button>

        {/* Search Bar */}
        <div className="header-search" style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search permits, requirements..."
            className="form-control"
            style={{ paddingLeft: '2.5rem', borderRadius: 'var(--radius-full)', backgroundColor: '#F9FAFB', border: '1px solid transparent', transition: 'all var(--transition-fast)' }}
            onFocus={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.borderColor = 'var(--primary-green)'; }}
            onBlur={(e) => { e.target.style.backgroundColor = '#F9FAFB'; e.target.style.borderColor = 'transparent'; }}
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Notification Bell with real count */}
        <Link to="/notifications" style={{ background: 'none', border: 'none', position: 'relative', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', textDecoration: 'none' }} title="Notifications">
          <Bell size={20} color="var(--text-muted)" />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-8px',
              minWidth: '18px', height: '18px',
              backgroundColor: 'var(--danger)', borderRadius: '999px',
              border: '2px solid white', fontSize: '0.65rem', fontWeight: '700',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', lineHeight: 1
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-light)' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-dark)' }}>{user?.full_name || 'User'}</p>
              {getRoleBadge(user?.role)}
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || ''}</p>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--light-green)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '0.5rem' }} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
