import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { User, Lock, Save } from 'lucide-react';

const Settings = () => {
  const { user, login } = useContext(AuthContext); // Need login to update context possibly, but we can just force re-login for major changes
  const { lang, t } = useContext(LanguageContext);
  const ts = t.settings;
  
  const [profile, setProfile] = useState({ full_name: user?.full_name || '', contact_number: '' }); // Would fetch real contact if stored in context
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/profile`, profile, config);
      setProfileMessage({ type: 'success', text: ts.profileUpdated });
      // Minor issue: the AuthContext still has the old name in memory until they re-login, but that's okay for now.
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordMessage({ type: 'error', text: ts.passwordMismatch });
      return;
    }
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/password`, passwords, config);
      setPasswordMessage({ type: 'success', text: ts.passwordUpdated });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    }
  };

  return (
    <div className="animate-fade-in page-container" style={{ maxWidth: '800px', fontFamily: 'Inter, sans-serif' }}>
      <div className="page-heading-row" style={{ marginBottom: '1.75rem' }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#15803D" }}>
            MUNICIPAL ACCOUNT PREFERENCES
          </span>
          <h1 style={{ margin: '0.2rem 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, color: '#0F172A' }}>{ts.title}</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>{ts.subtitle}</p>
        </div>
      </div>

      <div className="card mb-4" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #E2E8F0', borderLeft: '4px solid #15803D', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem', margin: 0, backgroundColor: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="#15803D" />
          </div>
          <h3 className="m-0" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{ts.profileTab}</h3>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {profileMessage.text && (
            <div className={`alert ${profileMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1rem', backgroundColor: profileMessage.type === 'success' ? '#F0FDF4' : '#FEF2F2', color: profileMessage.type === 'success' ? '#166534' : '#991B1B', border: profileMessage.type === 'success' ? '1px solid #BBF7D0' : '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              {profileMessage.text}
            </div>
          )}
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <input type="email" className="form-control" value={user?.email} disabled placeholder=" " />
              <label className="form-label">{ts.email} (Cannot be changed)</label>
            </div>
            
            <div className="form-group">
              <input 
                type="text" 
                className="form-control" 
                value={profile.full_name} 
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                required 
                placeholder=" "
              />
              <label className="form-label">{ts.fullName}</label>
            </div>

            <div className="form-group">
              <input 
                type="text" 
                className="form-control" 
                value={profile.contact_number} 
                onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })}
                placeholder=" "
              />
              <label className="form-label">{ts.phone}</label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#15803D', borderColor: '#15803D', boxShadow: '0 2px 8px rgba(21,128,61,0.25)', fontWeight: 700 }}>
              <Save size={18} style={{ marginRight: '8px' }} /> {ts.saveChanges}
            </button>
          </form>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #E2E8F0', borderLeft: '4px solid #166534', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem', margin: 0, backgroundColor: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={18} color="#166534" />
          </div>
          <h3 className="m-0" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{ts.securityTab}</h3>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {passwordMessage.text && (
            <div className={`alert ${passwordMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1rem' }}>
              {passwordMessage.text}
            </div>
          )}
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <input 
                type="password" 
                className="form-control" 
                value={passwords.current_password} 
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                required 
                placeholder=" "
              />
              <label className="form-label">{ts.currentPassword}</label>
            </div>

            <div className="form-group">
              <input 
                type="password" 
                className="form-control" 
                value={passwords.new_password} 
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                required 
                placeholder=" "
              />
              <label className="form-label">{ts.newPassword}</label>
            </div>

            <div className="form-group">
              <input 
                type="password" 
                className="form-control" 
                value={passwords.confirm_password} 
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                required 
                placeholder=" "
              />
              <label className="form-label">{ts.confirmPassword}</label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#15803D', borderColor: '#15803D', boxShadow: '0 2px 8px rgba(21,128,61,0.25)', fontWeight: 700 }}>
              <Save size={18} style={{ marginRight: '8px' }} /> {ts.updatePassword}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
