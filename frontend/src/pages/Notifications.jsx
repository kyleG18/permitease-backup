import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { Bell, CheckCheck, Trash2, BellOff, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const getNotificationIcon = (type, status) => {
  const isUnread = status === 'Unread';
  const color = isUnread ? '#fff' : 'var(--text-muted)';
  
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
  if (n.related_application_id) return `/applications/${n.related_application_id}`;
  if (n.related_permit_id) return '/applications';
  return null;
};

export default function Notifications() {
  const { user } = useContext(AuthContext);
  const { lang, t } = useContext(LanguageContext);
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
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API}/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, status: 'Read' })));
    } catch (err) { console.error(err); }
  };

  const deleteNotif = async (id, e) => {
    if (e) e.preventDefault();
    try {
      await fetch(`${API}/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.filter(n => n.id !== id));
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
    <div className="animate-fade-in notifications-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      <div className="notifications-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--primary-green)', fontSize: '1.6rem', fontWeight: '700' }}>{tn.title}</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'white', color: 'var(--text-dark)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
            <CheckCheck size={16} /> {tn.markAllRead}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '4rem', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <BellOff size={48} style={{ color: '#CBD5E1', margin: '0 auto 1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-dark)' }}>{tn.noNotifications}</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{tn.noNotificationsDesc}</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          {notifications.map((n, idx) => {
            const isUnread = n.status === 'Unread';
            const link = getNotificationLink(n);
            
            const content = (
              <div className="notification-item" style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem 1.5rem',
                borderBottom: idx < notifications.length - 1 ? '1px solid var(--border-light)' : 'none',
                background: isUnread ? '#F0FDF4' : 'white',
                transition: 'background 0.2s',
                textDecoration: 'none',
                color: 'inherit'
              }}>
                <div style={{ 
                  width: '42px', height: '42px', borderRadius: '50%', 
                  background: isUnread ? 'var(--primary-green)' : '#F1F5F9', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                }}>
                  {getNotificationIcon(n.type, n.status)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: isUnread ? '700' : '600', color: 'var(--text-dark)' }}>{n.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '1rem', flexShrink: 0 }}>{fmtDate(n.created_at)}</span>
                  </div>
                  
                  <p style={{ margin: 0, fontSize: '0.85rem', color: isUnread ? '#334155' : 'var(--text-muted)', lineHeight: '1.4' }}>{n.message}</p>
                  
                  {n.email_sent === 1 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={10} color="#10B981" /> Email notification sent
                    </div>
                  )}
                </div>
                
                <div className="notification-actions" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem', opacity: isUnread ? 1 : 0.6 }}>
                  {isUnread && (
                    <button onClick={(e) => markRead(n.id, e)} title="Mark as read"
                      style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-green)', background: 'transparent', color: 'var(--primary-green)', cursor: 'pointer', display: 'flex' }}>
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button onClick={(e) => deleteNotif(n.id, e)} title="Delete"
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid #FEE2E2', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex' }}>
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
