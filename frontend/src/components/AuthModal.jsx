import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  Phone,
  AlertCircle,
  X,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    full_name: '',
    business_name: '',
    contact_number: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true
  });

  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  // Sync mode whenever initialMode or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
    }
  }, [isOpen, initialMode]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTabSwitch = (newMode) => {
    setError('');
    setMode(newMode);
    if (window.location.pathname === '/login' && newMode === 'register') {
      window.history.replaceState(null, '', '/register');
    } else if (window.location.pathname === '/register' && newMode === 'login') {
      window.history.replaceState(null, '', '/login');
    }
  };

  const handleLoginChange = (e) => {
    setLoginData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegisterChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setRegisterData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  // Submit Login
  const onLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginData.email || !loginData.password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(loginData.email, loginData.password);
      if (result.success) {
        const user = result.data;
        if (user.role === 'business_owner') {
          try {
            const bizRes = await fetch(
              `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`,
              { headers: { Authorization: `Bearer ${user.token}` } }
            );
            const businesses = await bizRes.json();
            if (businesses.length === 0) {
              onClose();
              navigate('/onboarding');
              return;
            }
          } catch (err) {
            console.error('Failed to check existing businesses:', err);
          }
        }
        onClose();
        navigate('/dashboard');
      } else {
        setError(result.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Registration
  const onRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (
      !registerData.full_name ||
      !registerData.email ||
      !registerData.password ||
      !registerData.confirmPassword
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Validate Philippine contact number format if provided
    if (registerData.contact_number && registerData.contact_number.trim() !== '') {
      const cleanContact = registerData.contact_number.replace(/[\s\-()]/g, '');
      const phPhoneRegex = /^(09\d{9}|\+639\d{9})$/;
      if (!phPhoneRegex.test(cleanContact)) {
        setError('Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g., 09158938768).');
        return;
      }
    }

    if (!registerData.agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({
        full_name: registerData.full_name,
        email: registerData.email,
        contact_number: registerData.contact_number,
        password: registerData.password,
        confirmPassword: registerData.confirmPassword
      });

      if (result.success) {
        if (registerData.business_name) {
          sessionStorage.setItem('pending_business_name', registerData.business_name);
        }
        onClose();
        navigate('/onboarding');
      } else {
        setError(result.message || 'Registration failed.');
      }
    } catch (err) {
      setError('An unexpected registration error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="animate-slide-up"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          padding: '2rem 2.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          maxHeight: '92vh',
          overflowY: 'auto',
          border: '1px solid #E2E8F0'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94A3B8',
            padding: '0.35rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#0F172A';
            e.currentTarget.style.backgroundColor = '#F1F5F9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94A3B8';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <img
            src="/images/roxas-seal.png"
            alt="Roxas Seal"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#15803D' }}>
              MUNICIPALITY OF ROXAS
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              PermitEase Portal
            </div>
          </div>
        </div>

        {/* Segmented Pill Tab Switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F1F5F9',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          border: '1px solid #E2E8F0'
        }}>
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            style={{
              flex: 1,
              padding: '0.5rem 0',
              borderRadius: '7px',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: mode === 'login' ? '#15803D' : 'transparent',
              color: mode === 'login' ? '#FFFFFF' : '#64748B',
              boxShadow: mode === 'login' ? '0 2px 6px rgba(21,128,61,0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register')}
            style={{
              flex: 1,
              padding: '0.5rem 0',
              borderRadius: '7px',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: mode === 'register' ? '#15803D' : 'transparent',
              color: mode === 'register' ? '#FFFFFF' : '#64748B',
              boxShadow: mode === 'register' ? '0 2px 6px rgba(21,128,61,0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Register
          </button>
        </div>

        {/* Titles */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Welcome back' : 'Create an Account'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.45 }}>
            {mode === 'login'
              ? 'Sign in to manage your business permits and view application status.'
              : 'Join PermitEase to fast-track your Roxas business permit preparation.'}
          </p>
        </div>

        {/* Alert Error Box */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            borderRadius: '8px',
            padding: '0.75rem 0.9rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            fontSize: '12.5px',
            lineHeight: 1.4
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── MODE: LOGIN ── */}
        {mode === 'login' && (
          <form onSubmit={onLoginSubmit}>
            <div style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  placeholder="owner@example.com"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.5rem 0.65rem 2.35rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                backgroundColor: '#15803D',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                padding: '0.8rem',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(21,128,61,0.25)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#166534'; }}
              onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#15803D'; }}
            >
              {isSubmitting ? 'Signing in...' : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '13px', color: '#64748B' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#15803D',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Register now
              </button>
            </div>
          </form>
        )}

        {/* ── MODE: REGISTER ── */}
        {mode === 'register' && (
          <form onSubmit={onRegisterSubmit}>
            {/* Full Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  name="full_name"
                  value={registerData.full_name}
                  onChange={handleRegisterChange}
                  placeholder="Juan Dela Cruz"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                />
              </div>
            </div>

            {/* Business Name (Optional) */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Business Name <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  name="business_name"
                  value={registerData.business_name}
                  onChange={handleRegisterChange}
                  placeholder="e.g. Dela Cruz Grocery"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                />
              </div>
            </div>

            {/* Mobile Contact Number */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Mobile Number *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  name="contact_number"
                  value={registerData.contact_number}
                  onChange={handleRegisterChange}
                  placeholder="0915 893 8768"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  placeholder="owner@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                />
              </div>
            </div>

            {/* Password & Confirm Password side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={registerData.password}
                    onChange={handleRegisterChange}
                    placeholder="Min. 6 chars"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 2rem 0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#F8FAFC',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Confirm Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={registerData.confirmPassword}
                    onChange={handleRegisterChange}
                    placeholder="Repeat password"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 2rem 0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#F8FAFC',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#15803D'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      padding: 0
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '12px', color: '#64748B', cursor: 'pointer', lineHeight: 1.4 }}>
              <input
                type="checkbox"
                name="agreeTerms"
                checked={registerData.agreeTerms}
                onChange={handleRegisterChange}
                style={{ marginTop: '2px', accentColor: '#15803D' }}
              />
              <span>I agree to the Roxas Municipal Data Privacy and Terms of Service.</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                backgroundColor: '#15803D',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                padding: '0.8rem',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(21,128,61,0.25)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#166534'; }}
              onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#15803D'; }}
            >
              {isSubmitting ? 'Creating account...' : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '13px', color: '#64748B' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#15803D',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
