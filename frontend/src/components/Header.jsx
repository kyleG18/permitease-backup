import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import LanguageSwitchButton from './LanguageSwitchButton';
import { useTranslation } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const Header = ({ toggleSidebar }) => {
  const { t } = useTranslation();
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = user?.token;

  useEffect(() => {
    if (!token) return;
    const fetchCount = () => {
      fetch(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setUnreadCount(d.count || 0))
        .catch(() => {});
    };
    fetchCount();
    window.addEventListener('notificationUpdate', fetchCount);
    const interval = setInterval(fetchCount, 60000);
    return () => {
      window.removeEventListener('notificationUpdate', fetchCount);
      clearInterval(interval);
    };
  }, [token]);

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        {/* Hamburger Menu (Mobile Only) */}
        <button 
          className="menu-btn" 
          onClick={toggleSidebar} 
          aria-label="Open navigation"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          <Menu size={22} strokeWidth={2.5} />
        </button>

        {/* Search Bar */}
        <div className="header-search" style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            type="text"
            placeholder={t.header?.searchPlaceholder || 'Search permits, requirements...'}
            className="form-control"
            style={{ 
              padding: '0.6rem 1rem 0.6rem 2.75rem', 
              borderRadius: 'var(--radius-full)', 
              backgroundColor: 'var(--background)', 
              border: '1px solid transparent', 
              fontSize: '0.875rem'
            }}
            onFocus={(e) => { e.target.style.backgroundColor = 'var(--surface)'; e.target.style.borderColor = 'var(--primary-green)'; }}
            onBlur={(e) => { e.target.style.backgroundColor = 'var(--background)'; e.target.style.borderColor = 'transparent'; }}
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Language Switch Button */}
        <LanguageSwitchButton />
        {/* Notification Bell */}
        <Link 
          to="/notifications" 
          style={{ 
            background: 'none', border: 'none', position: 'relative', cursor: 'pointer', 
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center', textDecoration: 'none',
            padding: '0.5rem'
          }} 
          title="Notifications"
        >
          <Bell size={20} strokeWidth={2} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '2px', right: '4px',
              minWidth: '18px', height: '18px',
              backgroundColor: 'var(--danger)', borderRadius: '999px',
              border: '2px solid var(--surface)', fontSize: '0.65rem', fontWeight: '700',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', lineHeight: 1
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile */}
        <div className="header-profile-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1.25rem', borderLeft: '1px solid var(--border-light)' }}>
          <div style={{ textAlign: 'right', display: 'none' }} className="user-profile-info">
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.full_name || 'User'}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email || ''}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              backgroundColor: 'var(--primary-green-light)', color: 'var(--primary-green)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontWeight: '700', fontSize: '0.85rem'
            }}>
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button 
              onClick={logout} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '0.25rem' }} 
              title="Logout"
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-light)'}
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Hide text info on mobile, keeping it clean */}
      <style>{`
        @media (min-width: 640px) {
          .user-profile-info { display: block !important; }
        }
      `}</style>
    </header>
  );
};

export default Header;

