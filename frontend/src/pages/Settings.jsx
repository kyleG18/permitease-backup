import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, Save } from 'lucide-react';

const Settings = () => {
  const { user, login } = useContext(AuthContext); // Need login to update context possibly, but we can just force re-login for major changes
  
  const [profile, setProfile] = useState({ full_name: user?.full_name || '', contact_number: '' }); // Would fetch real contact if stored in context
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:5000/api/users/profile', profile, config);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      // Minor issue: the AuthContext still has the old name in memory until they re-login, but that's okay for now.
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    try {
      await axios.put('http://localhost:5000/api/users/password', passwords, config);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
      <div className="mb-4">
        <h2 className="m-0" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Account Settings</h2>
        <p className="text-muted">Manage your personal profile and security preferences.</p>
      </div>

      <div className="card mb-4">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <User size={20} className="text-muted" />
          <h3 className="m-0" style={{ fontSize: '1.125rem' }}>Profile Information</h3>
        </div>
        <div className="p-4">
          {profileMessage.text && (
            <div className={`p-3 mb-3 rounded ${profileMessage.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
              {profileMessage.text}
            </div>
          )}
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <input type="email" className="form-control" value={user?.email} disabled placeholder=" " />
              <label className="form-label">Email Address (Cannot be changed)</label>
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
              <label className="form-label">Full Name</label>
            </div>

            <div className="form-group">
              <input 
                type="text" 
                className="form-control" 
                value={profile.contact_number} 
                onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })}
                placeholder=" "
              />
              <label className="form-label">Contact Number</label>
            </div>

            <button type="submit" className="btn btn-primary">
              <Save size={18} style={{ marginRight: '8px' }} /> Save Changes
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Lock size={20} className="text-muted" />
          <h3 className="m-0" style={{ fontSize: '1.125rem' }}>Change Password</h3>
        </div>
        <div className="p-4">
          {passwordMessage.text && (
            <div className={`p-3 mb-3 rounded ${passwordMessage.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
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
              <label className="form-label">Current Password</label>
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
              <label className="form-label">New Password</label>
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
              <label className="form-label">Confirm New Password</label>
            </div>

            <button type="submit" className="btn btn-primary">
              <Save size={18} style={{ marginRight: '8px' }} /> Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
