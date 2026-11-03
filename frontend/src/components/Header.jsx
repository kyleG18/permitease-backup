import { useContext, useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Bell, LogOut, Menu, CheckCheck, Check,
  Calendar, CheckCircle, AlertTriangle, Info, ArrowRight, Clock
} from 'lucide-react';
import LanguageSwitchButton from './LanguageSwitchButton';
import { useTranslation } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const getNotificationIcon = (type) => {
  if (type === 'WALKIN_SCHEDULED' || type === 'WALKIN_CONFIRMED' || type === 'WALKIN_REQUESTED') {
    return <Calendar size={15} color="#15803D" />;
  }
  if (type === 'APPLICATION_APPROVED' || type === 'PERMIT_ISSUED' || type === 'PREPARATION_VERIFIED') {
    return <CheckCircle size={15} color="#15803D" />;
  }
  if (type === 'APPLICATION_REJECTED' || type === 'PERMIT_EXPIRED' || type === 'CORRECTION_REQUESTED' || type === 'CORRECTIONS_REQUESTED') {
    return <AlertTriangle size={15} color="#D97706" />;
  }
  if (type === 'RENEWAL_REMINDER') {
    return <Clock size={15} color="#2563EB" />;
  }
  return <Info size={15} color="#64748B" />;
};

const getNotificationLink = (n) => {
  if (n.type === 'WALKIN_SCHEDULED' || n.type === 'WALKIN_CONFIRMED') return '/schedule-walkin';
  if (n.type === 'WALKIN_REQUESTED') return '/admin/walkins';
  if (n.related_application_id) return `/applications/${n.related_application_id}`;
  if (n.related_permit_id) return '/applications';
  return null;
};

const formatTimeAgo = (dateStr, isTl) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = Math.max(0, now - date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 60) return isTl ? 'Kamakailan lang' : 'Just now';
  if (diffMin < 60) return `${diffMin}${isTl ? 'm ang nakalipas' : 'm ago'}`;
  if (diffHour < 24) return `${diffHour}${isTl ? 'o ang nakalipas' : 'h ago'}`;
  if (diffDays === 1) return isTl ? 'Kahapon' : 'Yesterday';
  if (diffDays < 7) return `${diffDays}${isTl ? ' araw ang nakalipas' : 'd ago'}`;
  return date.toLocaleDateString(isTl ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric' });
};

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { lang, t } = useTranslation();
  const isTl = lang === 'tl';
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef(null);
  const token = user?.token;

  const fetchCount = () => {
    if (!token) return;
    fetch(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUnreadCount(d.count || 0))
      .catch(() => {});
  };

  useEffect(() => {
    if (!token) return;
    fetchCount();
    window.addEventListener('notificationUpdate', fetchCount);
    const interval = setInterval(fetchCount, 60000);
    return () => {
      window.removeEventListener('notificationUpdate', fetchCount);
      clearInterval(interval);
    };
  }, [token]);

  // Click outside listener to close notification popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const fetchRecentNotifications = async () => {
    if (!token) return;
    setLoadingNotifs(true);
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (e) {
      console.warn('Failed to fetch recent notifications:', e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const toggleDropdown = () => {
    const nextState = !isDropdownOpen;
    setIsDropdownOpen(nextState);
    if (nextState) {
      fetchRecentNotifications();
    }
  };

  const handleMarkAllAsRead = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!token) return;
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, status: 'Read' })));
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleMarkSingleAsRead = async (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!token) return;
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Read' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleNotificationClick = async (n) => {
    if (n.status === 'Unread') {
      try {
        await fetch(`${API}/notifications/${n.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, status: 'Read' } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
      } catch (err) {
        console.error('Failed to mark as read on click:', err);
      }
    }
    setIsDropdownOpen(false);
    const link = getNotificationLink(n);
    if (link) {
      navigate(link);
    } else {
      navigate('/notifications');
    }
  };

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

        {/* Notification Bell with Dropdown Popover */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={toggleDropdown}
            style={{
              background: isDropdownOpen ? 'var(--primary-green-light, #DCFCE7)' : 'none',
              border: 'none',
              position: 'relative',
              cursor: 'pointer',
              color: isDropdownOpen ? 'var(--primary-green, #15803D)' : 'var(--text-muted, #64748B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              borderRadius: '8px',
              transition: 'all 0.15s ease'
            }}
            title={unreadCount > 0 
              ? (isTl ? `Mga Abiso (${unreadCount} bago)` : `Notifications (${unreadCount} unread)`)
              : (isTl ? 'Mga Abiso' : 'Notifications')}
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <Bell size={20} strokeWidth={2} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '4px',
                  minWidth: '18px',
                  height: '18px',
                  backgroundColor: 'var(--danger, #DC2626)',
                  borderRadius: '999px',
                  border: '2px solid var(--surface, #FFFFFF)',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  lineHeight: 1,
                  boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)'
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: '-8px',
                width: '370px',
                maxWidth: 'calc(100vw - 24px)',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
                zIndex: 1050,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {/* Dropdown Header */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {isTl ? 'Mga Abiso' : 'Notifications'}
                  </span>
                  {unreadCount > 0 ? (
                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        border: '1px solid #BBF7D0'
                      }}
                    >
                      {unreadCount} {isTl ? 'bago' : 'new'}
                    </span>
                  ) : null}
                </div>

                {/* Mark all as read button */}
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#15803D',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '6px',
                      padding: '0.3rem 0.65rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#DCFCE7';
                      e.currentTarget.style.borderColor = '#86EFAC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F0FDF4';
                      e.currentTarget.style.borderColor = '#BBF7D0';
                    }}
                    title={isTl ? 'Markahan lahat bilang nabasa' : 'Mark all notifications as read'}
                  >
                    <CheckCheck size={13} strokeWidth={2.5} />
                    <span>{isTl ? 'Markahan bilang nabasa' : 'Mark as read'}</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Check size={12} color="#15803D" strokeWidth={2.5} />
                    <span>{isTl ? 'Nabasa na lahat' : 'All caught up'}</span>
                  </span>
                )}
              </div>

              {/* Dropdown Items List */}
              <div style={{ maxHeight: '330px', overflowY: 'auto' }}>
                {loadingNotifs ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    {isTl ? 'Ikinakarga ang mga abiso...' : 'Loading notifications...'}
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '2.25rem 1rem', textAlign: 'center' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.6rem',
                        color: '#94A3B8'
                      }}
                    >
                      <Bell size={20} />
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      {isTl ? 'Walang mga abiso' : 'No notifications'}
                    </p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                      {isTl ? 'Ikaw ay updated sa lahat ng balita.' : "You're all caught up with recent updates."}
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = n.status === 'Unread';
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #F8FAFC',
                          backgroundColor: isUnread ? '#F8FAFC' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F1F5F9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isUnread ? '#F8FAFC' : '#FFFFFF';
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isUnread ? '#DCFCE7' : '#F1F5F9'
                          }}
                        >
                          {getNotificationIcon(n.type)}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '2px' }}>
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: isUnread ? 700 : 600,
                                color: '#0F172A',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {n.title}
                            </span>
                            <span style={{ fontSize: '10.5px', color: '#94A3B8', flexShrink: 0 }}>
                              {formatTimeAgo(n.created_at, isTl)}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '11.5px',
                              color: '#64748B',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {n.message}
                          </p>
                        </div>

                        {/* Right: Unread indicator and single mark read */}
                        {isUnread && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, alignSelf: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => handleMarkSingleAsRead(n.id, e)}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: '4px',
                                cursor: 'pointer',
                                color: '#94A3B8',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: '4px'
                              }}
                              title={isTl ? 'Markahan bilang nabasa' : 'Mark as read'}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#15803D';
                                e.currentTarget.style.backgroundColor = '#DCFCE7';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#94A3B8';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Check size={13} strokeWidth={2.5} />
                            </button>
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#15803D'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              <div
                style={{
                  padding: '0.65rem 1rem',
                  borderTop: '1px solid #F1F5F9',
                  backgroundColor: '#FAFAFA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Link
                  to="/notifications"
                  onClick={() => setIsDropdownOpen(false)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#15803D',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  <span>{isTl ? 'Tingnan lahat ng abiso' : 'View all notifications'}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="header-profile-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1.25rem', borderLeft: '1px solid var(--border-light)' }}>
          <div style={{ textAlign: 'right', display: 'none' }} className="user-profile-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.full_name || 'User'}
              </p>
              {user?.role === 'lgu_admin' && (
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '0.12rem 0.45rem', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', letterSpacing: '0.04em' }}>
                  BPLO
                </span>
              )}
              {user?.role === 'system_admin' && (
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '0.12rem 0.45rem', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', letterSpacing: '0.04em' }}>
                  ADMIN
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {user?.role === 'lgu_admin'
                ? 'BPLO Licensing Officer'
                : user?.role === 'system_admin'
                ? 'System Administrator'
                : (user?.email || 'Business Owner')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '34px', height: '34px', borderRadius: '50%', 
              backgroundColor: '#DCFCE7', color: '#15803D', 
              border: '1.5px solid #BBF7D0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontWeight: '800', fontSize: '0.85rem'
            }}>
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button 
              onClick={logout} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '0.25rem' }} 
              title="Logout"
              aria-label="Logout"
              onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
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

