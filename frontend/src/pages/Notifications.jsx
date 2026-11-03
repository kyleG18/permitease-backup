import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { Bell, CheckCheck, Trash2, BellOff, Info, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const getNotificationIcon = (type, status) => {
  const isUnread = status === 'Unread';
  const color = isUnread ? '#fff' : 'var(--text-muted)';
  
  if (type === 'WALKIN_SCHEDULED' || type === 'WALKIN_CONFIRMED' || type === 'WALKIN_REQUESTED') {
    return <Calendar size={18} color={color} />;
  }
  // Preparation Verified (includes legacy APPLICATION_APPROVED / PERMIT_ISSUED)
  if (type === 'APPLICATION_APPROVED' || type === 'PERMIT_ISSUED' || type === 'PREPARATION_VERIFIED') {
    return <CheckCircle size={18} color={color} />;
  }
  // Corrections Requested (includes legacy APPLICATION_REJECTED)
  if (type === 'APPLICATION_REJECTED' || type === 'PERMIT_EXPIRED' || type === 'CORRECTION_REQUESTED' || type === 'CORRECTIONS_REQUESTED') {
    return <AlertTriangle size={18} color={color} />;
  }
  if (type === 'RENEWAL_REMINDER') {
    return <Clock size={18} color={color} />;
  }
  return <Info size={18} color={color} />;
};

const getNotificationLink = (n) => {
  if (n.type === 'WALKIN_SCHEDULED' || n.type === 'WALKIN_CONFIRMED') return '/schedule-walkin';
  if (n.type === 'WALKIN_REQUESTED') return '/admin/walkins';
  if (n.related_application_id) return `/applications/${n.related_application_id}`;
  if (n.related_permit_id) return '/applications';
  return null;
};

export default function Notifications() {
  const { user } = useContext(AuthContext);
  const { lang, t } = useContext(LanguageContext);
  const isTl = lang === 'tl';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = user?.token;
  const tn = t.notifications;

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);

  const markRead = async (id, e) => {
    if (e) e.preventDefault();
    try {
      await fetch(`${API}/notifications/${id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Read' } : n));
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API}/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, status: 'Read' })));
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    } catch (err) { console.error(err); }
  };

  const deleteNotif = async (id, e) => {
    if (e) e.preventDefault();
    try {
      await fetch(`${API}/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.filter(n => n.id !== id));
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    } catch (err) { console.error(err); }
  };

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  const fmtDate = (d) => {
    const date = new Date(d);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    if (isToday) return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>{tn.title}...</div>;

  return (
    <div className="animate-fade-in page-container" style={{ maxWidth: '860px' }}>
      
      <div className="page-heading-row" style={{ marginBottom: '1.75rem' }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#15803D" }}>
            MUNICIPAL ADVISORY & ALERT CENTER
          </span>
          <h1 style={{ margin: '0.2rem 0 0', color: '#0F172A', fontSize: '1.75rem', fontWeight: 800 }}>{tn.title}</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {isTl 
              ? `${unreadCount} ${unreadCount === 1 ? 'hindi pa nababasang abiso' : 'mga hindi pa nababasang abiso'}`
              : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#166534', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.45rem 0.9rem', borderRadius: '6px', cursor: 'pointer' }}
          >
            <CheckCheck size={16} /> {isTl ? 'Markahan Lahat Bilang Nabasa' : tn.markAllRead}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <BellOff size={48} className="empty-state__icon" style={{ color: 'var(--text-muted)' }} />
          <h3 className="empty-state__title">{tn.noNotifications}</h3>
          <p className="empty-state__desc">{tn.noNotificationsDesc}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {notifications.map((n, idx) => {
            const isUnread = n.status === 'Unread';
            const link = getNotificationLink(n);
            
            const content = (
              <div className={`notification-item ${isUnread ? 'notification-item--unread' : ''}`} style={{
                borderBottom: idx < notifications.length - 1 ? '1px solid var(--border-light)' : 'none',
                borderRadius: 0
              }}>
                <div className={`notification-item__icon-wrap ${isUnread ? 'notification-item__icon-wrap--unread' : 'notification-item__icon-wrap--read'}`}>
                  {getNotificationIcon(n.type, n.status)}
                </div>
                
                <div className="notification-item__content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', gap: '0.5rem' }}>
                    <h4 className="notification-item__title">{n.title}</h4>
                    <span className="notification-item__time">{fmtDate(n.created_at)}</span>
                  </div>
                  
                  <p className="notification-item__body">{n.message}</p>
                  
                  {n.email_sent === 1 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={11} color="var(--primary-green)" /> {isTl ? 'Naipadala ang abiso sa email' : 'Email notification sent'}
                    </div>
                  )}
                </div>
                
                <div className="notification-actions">
                  {isUnread && (
                    <button
                      onClick={(e) => markRead(n.id, e)}
                      title={isTl ? 'Markahan bilang nabasa' : 'Mark as read'}
                      aria-label="Mark notification as read"
                      style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-green)', background: 'transparent', color: 'var(--primary-green)', cursor: 'pointer', display: 'flex' }}
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => deleteNotif(n.id, e)}
                    title={isTl ? 'Burahin' : 'Delete'}
                    aria-label="Delete notification"
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger-light)', background: 'var(--danger-light)', color: 'var(--danger)', cursor: 'pointer', display: 'flex' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );

            return link ? (
              <Link key={n.id} to={link} style={{ textDecoration: 'none', display: 'block' }}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
