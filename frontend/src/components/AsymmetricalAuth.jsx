import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  ShieldCheck,
  FileText,
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  Phone,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const AsymmetricalAuth = ({ defaultMode = 'login' }) => {
  const [mode, setMode] = useState(defaultMode); // 'login' | 'register'
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
  const location = useLocation();

  // Sync mode with route if needed
  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);

  const handleTabSwitch = (newMode) => {
    setError('');
    setMode(newMode);
    if (newMode === 'register' && location.pathname !== '/register') {
      window.history.pushState(null, '', '/register');
    } else if (newMode === 'login' && location.pathname !== '/login') {
      window.history.pushState(null, '', '/login');
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
              navigate('/onboarding');
              return;
            }
          } catch (err) {
            console.error('Failed to check existing businesses:', err);
          }
        }
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
    <div className="asym-canvas">
      <style>{`
        /* ── FULL SCREEN CANVAS (No modal framing) ── */
        .asym-canvas {
          min-height: 100vh;
          width: 100%;
          background: #ffffff;
          display: flex;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          overflow-x: hidden;
        }

        /* ── EDGE-TO-EDGE SPLIT CONTAINER ── */
        .asym-container {
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: stretch;
          margin: 0;
          padding: 0;
        }

        /* ── LEFT HERO PANEL (44% Width, Edge-to-Edge) ── */
        .asym-hero {
          width: 44%;
          min-height: 100vh;
          background: linear-gradient(160deg, #064E3B 0%, #0A4D2E 48%, #08331E 100%);
          border-radius: 0; /* No rounded corners at the middle seam or edges */
          padding: 4rem 3.5rem;
          color: #ffffff;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          flex-shrink: 0;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* Background Watermark Seal */
        .asym-watermark {
          position: absolute;
          top: 50%;
          right: -10%;
          transform: translateY(-50%) rotate(-6deg);
          width: 480px;
          height: 480px;
          opacity: 0.11;
          pointer-events: none;
          z-index: 0;
          user-select: none;
        }

        /* Hero Brand Header */
        .asym-brand-header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 3.5rem;
        }

        .asym-brand-logo-img {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #ffffff;
          padding: 2px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          flex-shrink: 0;
          object-fit: cover;
        }

        .asym-brand-name {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin: 0;
          line-height: 1.1;
        }

        .asym-brand-sub {
          font-size: 0.725rem;
          color: #A7F3D0;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          font-weight: 600;
          margin-top: 3px;
        }

        /* Vertical Feature Timeline */
        .asym-timeline {
          position: relative;
          z-index: 2;
          margin: 1rem 0 3rem 0;
          display: flex;
          flex-direction: column;
        }

        .asym-timeline-item {
          display: flex;
          gap: 1.35rem;
          position: relative;
        }

        .asym-timeline-track {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .asym-node {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.18);
          border: 1.5px solid #34D399;
          color: #34D399;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px rgba(52, 211, 153, 0.35);
          flex-shrink: 0;
          z-index: 2;
        }

        .asym-connector {
          width: 2px;
          flex-grow: 1;
          min-height: 44px;
          border-left: 2px dashed rgba(52, 211, 153, 0.4);
          margin: 4px 0;
        }

        .asym-timeline-content {
          padding-bottom: 2rem;
        }

        .asym-timeline-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.3rem 0;
          line-height: 1.3;
        }

        .asym-timeline-desc {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.55;
          margin: 0;
          max-width: 320px;
        }

        /* Bottom Accent */
        .asym-hero-footer {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        .asym-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #D1FAE5;
          background: rgba(255, 255, 255, 0.08);
          padding: 0.45rem 0.95rem;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        /* ── RIGHT FORM PANEL (56% Width, Edge-to-Edge) ── */
        .asym-form-panel {
          width: 56%;
          min-height: 100vh;
          background: #ffffff;
          border-radius: 0; /* Clean straight edge, seamlessly connected */
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3.5rem 4rem;
          box-sizing: border-box;
          position: relative;
        }

        .asym-form-container {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        /* Segmented Nav Pill */
        .asym-pill-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 2.25rem;
        }

        .asym-pill-nav {
          display: inline-flex;
          align-items: center;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 9999px;
          padding: 4px;
        }

        .asym-pill-btn {
          padding: 0.55rem 1.45rem;
          border-radius: 9999px;
          border: none;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          background: transparent;
          color: #64748B;
        }

        .asym-pill-btn.active {
          background: #15803D;
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 3px 10px rgba(21, 128, 61, 0.35);
        }

        .asym-pill-btn:not(.active):hover {
          color: #1E293B;
        }

        /* Form Titles */
        .asym-card-title {
          font-size: 2rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 0.45rem 0;
          letter-spacing: -0.025em;
        }

        .asym-card-subtitle {
          font-size: 0.95rem;
          color: #64748B;
          margin: 0 0 2rem 0;
          line-height: 1.55;
        }

        /* Alert Box */
        .asym-alert {
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #991B1B;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        /* Inputs */
        .asym-field-wrap {
          margin-bottom: 1.25rem;
          position: relative;
        }

        .asym-label {
          display: block;
          font-size: 0.825rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.45rem;
        }

        .asym-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .asym-input-icon {
          position: absolute;
          left: 1rem;
          color: #94A3B8;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .asym-input {
          width: 100%;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 0.85rem 1rem 0.85rem 2.85rem;
          font-size: 0.935rem;
          color: #0F172A;
          transition: all 0.2s ease;
          box-sizing: border-box;
          outline: none;
          font-family: inherit;
        }

        .asym-input:focus {
          background: #ffffff;
          border-color: #15803D;
          box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.15);
        }

        .asym-input::placeholder {
          color: #94A3B8;
        }

        .asym-toggle-pwd {
          position: absolute;
          right: 0.85rem;
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .asym-toggle-pwd:hover {
          color: #475569;
        }

        /* Grid for Registration */
        .asym-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        /* Actions Bar */
        .asym-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: -0.25rem 0 1.5rem 0;
          font-size: 0.825rem;
        }

        .asym-link {
          color: #15803D;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s ease;
        }

        .asym-link:hover {
          color: #166534;
          text-decoration: underline;
        }

        /* Checkbox Terms */
        .asym-checkbox-wrap {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin-bottom: 1.5rem;
          font-size: 0.825rem;
          color: #475569;
          line-height: 1.45;
        }

        .asym-checkbox-wrap input[type="checkbox"] {
          margin-top: 2px;
          accent-color: #15803D;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        /* Primary Submit Button */
        .asym-submit-btn {
          width: 100%;
          background: #15803D;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 0.95rem;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 4px 14px rgba(21, 128, 61, 0.35);
        }

        .asym-submit-btn:hover:not(:disabled) {
          background: #166534;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(21, 128, 61, 0.45);
        }

        .asym-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* Footer Switcher Link */
        .asym-footer-text {
          text-align: center;
          margin-top: 1.75rem;
          font-size: 0.875rem;
          color: #64748B;
        }

        .asym-footer-btn {
          background: transparent;
          border: none;
          color: #15803D;
          font-weight: 700;
          cursor: pointer;
          font-size: inherit;
          padding: 0;
          margin-left: 0.35rem;
        }

        .asym-footer-btn:hover {
          color: #166534;
          text-decoration: underline;
        }

        /* ── RESPONSIVE MEDIA QUERIES ── */
        @media (max-width: 1024px) {
          .asym-container {
            flex-direction: column;
          }
          .asym-hero {
            width: 100%;
            min-height: auto;
            padding: 3rem 2.25rem 2.5rem 2.25rem;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .asym-form-panel {
            width: 100%;
            min-height: auto;
            padding: 3rem 2.25rem 4rem 2.25rem;
          }
          .asym-timeline {
            flex-direction: row;
            justify-content: space-between;
            gap: 1.25rem;
          }
          .asym-timeline-item {
            flex-direction: column;
            align-items: flex-start;
            flex: 1;
          }
          .asym-connector {
            display: none;
          }
          .asym-timeline-desc {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .asym-hero {
            padding: 2.25rem 1.5rem;
          }
          .asym-form-panel {
            padding: 2.25rem 1.25rem;
          }
          .asym-grid-2 {
            grid-template-columns: 1fr;
          }
          .asym-timeline {
            flex-direction: column;
            gap: 1.25rem;
          }
        }
      `}</style>

      <div className="asym-container">
        {/* ── LEFT SECTION (Brand & Timeline Hero - 44% width) ── */}
        <div className="asym-hero">
          {/* Background Watermark Seal */}
          <img
            src="/images/roxas-seal.png"
            alt="Municipality of Roxas Seal Watermark"
            className="asym-watermark"
          />

          {/* Top Brand Header */}
          <div>
            <div className="asym-brand-header">
              {/* Official Roxas Seal image replacing the P text */}
              <img
                src="/images/roxas-seal.png"
                alt="Municipality of Roxas Seal"
                className="asym-brand-logo-img"
              />
              <div>
                <h1 className="asym-brand-name">PermitEase</h1>
                <div className="asym-brand-sub">Municipality of Roxas • Oriental Mindoro</div>
              </div>
            </div>

            {/* Vertical Feature Timeline */}
            <div className="asym-timeline">
              {/* Step 1: Secure Access */}
              <div className="asym-timeline-item">
                <div className="asym-timeline-track">
                  <div className="asym-node">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="asym-connector" />
                </div>
                <div className="asym-timeline-content">
                  <h3 className="asym-timeline-title">Secure Access</h3>
                  <p className="asym-timeline-desc">
                    Verified business owner login &amp; multi-factor protected account access.
                  </p>
                </div>
              </div>

              {/* Step 2: Applications */}
              <div className="asym-timeline-item">
                <div className="asym-timeline-track">
                  <div className="asym-node">
                    <FileText size={18} />
                  </div>
                  <div className="asym-connector" />
                </div>
                <div className="asym-timeline-content">
                  <h3 className="asym-timeline-title">Applications</h3>
                  <p className="asym-timeline-desc">
                    Easy permit application, renewal preparation, and requirement uploads.
                  </p>
                </div>
              </div>

              {/* Step 3: Real-time Tracking */}
              <div className="asym-timeline-item">
                <div className="asym-timeline-track">
                  <div className="asym-node">
                    <Activity size={18} />
                  </div>
                </div>
                <div className="asym-timeline-content">
                  <h3 className="asym-timeline-title">Real-time Tracking</h3>
                  <p className="asym-timeline-desc">
                    Track your business permit application status and pre-assessment live.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Accent */}
          <div className="asym-hero-footer">
            <span className="asym-hero-badge">
              <CheckCircle2 size={13} color="#34D399" />
              Official BPLO Support Portal
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              © 2026 Municipality of Roxas
            </span>
          </div>
        </div>

        {/* ── RIGHT SECTION (Full-Height Form Panel - 56% width, Straight Seam) ── */}
        <div className="asym-form-panel">
          <div className="asym-form-container">
            {/* Top Right Segmented Toggle */}
            <div className="asym-pill-header">
              <div className="asym-pill-nav" role="tablist" aria-label="Authentication modes">
                <button
                  type="button"
                  className={`asym-pill-btn ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => handleTabSwitch('login')}
                  role="tab"
                  aria-selected={mode === 'login'}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`asym-pill-btn ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => handleTabSwitch('register')}
                  role="tab"
                  aria-selected={mode === 'register'}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="asym-alert animate-shake">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{error}</div>
              </div>
            )}

            {/* ── VIEW A: LOGIN FORM ── */}
            {mode === 'login' ? (
              <div>
                <h2 className="asym-card-title">Welcome back</h2>
                <p className="asym-card-subtitle">
                  Sign in to manage your business permits and view compliance records.
                </p>

                <form onSubmit={onLoginSubmit}>
                  {/* Email Field */}
                  <div className="asym-field-wrap">
                    <label className="asym-label" htmlFor="login-email">
                      Email address
                    </label>
                    <div className="asym-input-container">
                      <span className="asym-input-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        className="asym-input"
                        placeholder="you@example.com"
                        value={loginData.email}
                        onChange={handleLoginChange}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="asym-field-wrap">
                    <label className="asym-label" htmlFor="login-password">
                      Password
                    </label>
                    <div className="asym-input-container">
                      <span className="asym-input-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className="asym-input"
                        placeholder="••••••••••••"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        className="asym-toggle-pwd"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Row Actions: Forgot Password */}
                  <div className="asym-actions-row">
                    <div />
                    <a
                      href="#forgot-password"
                      className="asym-link"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Please contact the BPLO Roxas office at bplo.roxas20@yahoo.com or 09158938768 for password reset assistance.');
                      }}
                    >
                      Forgot password?
                    </a>
                  </div>

                  {/* Primary Submit */}
                  <button
                    type="submit"
                    className="asym-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                    {!isSubmitting && <ArrowRight size={18} />}
                  </button>
                </form>

                <div className="asym-footer-text">
                  Don't have an account?
                  <button
                    type="button"
                    className="asym-footer-btn"
                    onClick={() => handleTabSwitch('register')}
                  >
                    Register here
                  </button>
                </div>
              </div>
            ) : (
              /* ── VIEW B: REGISTRATION FORM ── */
              <div>
                <h2 className="asym-card-title">Create Business Account</h2>
                <p className="asym-card-subtitle">
                  Register your business with the Municipality of Roxas to start your application.
                </p>

                <form onSubmit={onRegisterSubmit}>
                  {/* Grid 2-col: Full Name & Business Name */}
                  <div className="asym-grid-2">
                    <div className="asym-field-wrap">
                      <label className="asym-label" htmlFor="reg-fullname">
                        Full Name *
                      </label>
                      <div className="asym-input-container">
                        <span className="asym-input-icon">
                          <User size={18} />
                        </span>
                        <input
                          id="reg-fullname"
                          name="full_name"
                          type="text"
                          className="asym-input"
                          placeholder="Owner / Representative Name"
                          value={registerData.full_name}
                          onChange={handleRegisterChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="asym-field-wrap">
                      <label className="asym-label" htmlFor="reg-bizname">
                        Business Name
                      </label>
                      <div className="asym-input-container">
                        <span className="asym-input-icon">
                          <Building2 size={18} />
                        </span>
                        <input
                          id="reg-bizname"
                          name="business_name"
                          type="text"
                          className="asym-input"
                          placeholder="Registered Trade Name"
                          value={registerData.business_name}
                          onChange={handleRegisterChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid 2-col: Contact Number & Email */}
                  <div className="asym-grid-2">
                    <div className="asym-field-wrap">
                      <label className="asym-label" htmlFor="reg-contact">
                        Contact Number
                      </label>
                      <div className="asym-input-container">
                        <span className="asym-input-icon">
                          <Phone size={18} />
                        </span>
                        <input
                          id="reg-contact"
                          name="contact_number"
                          type="tel"
                          className="asym-input"
                          placeholder="09158938768"
                          value={registerData.contact_number}
                          onChange={handleRegisterChange}
                        />
                      </div>
                    </div>

                    <div className="asym-field-wrap">
                      <label className="asym-label" htmlFor="reg-email">
                        Business Email Address *
                      </label>
                      <div className="asym-input-container">
                        <span className="asym-input-icon">
                          <Mail size={18} />
                        </span>
                        <input
                          id="reg-email"
                          name="email"
                          type="email"
                          className="asym-input"
                          placeholder="owner@example.com"
                          value={registerData.email}
                          onChange={handleRegisterChange}
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid 2-col: Passwords */}
                  <div className="asym-grid-2">
                    <div className="asym-field-wrap">
                      <label className="asym-label" htmlFor="reg-password">
                        Password *
                      </label>
                      <div className="asym-input-container">
                        <span className="asym-input-icon">
                          <Lock size={18} />
                        </span>
                        <input
                          id="reg-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          className="asym-input"
                          placeholder="••••••••••••"
                          value={registerData.password}
                          onChange={handleRegisterChange}
                          required
                        />
                        <button
                          type="button"
                          className="asym-toggle-pwd"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="asym-field-wrap">
                      <label className="asym-label" htmlFor="reg-confirmpassword">
                        Confirm Password *
                      </label>
                      <div className="asym-input-container">
                        <span className="asym-input-icon">
                          <Lock size={18} />
                        </span>
                        <input
                          id="reg-confirmpassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="asym-input"
                          placeholder="••••••••••••"
                          value={registerData.confirmPassword}
                          onChange={handleRegisterChange}
                          required
                        />
                        <button
                          type="button"
                          className="asym-toggle-pwd"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Agreement */}
                  <label className="asym-checkbox-wrap">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={registerData.agreeTerms}
                      onChange={handleRegisterChange}
                      required
                    />
                    <span>
                      I agree to the Terms of Service and Privacy Policy of the Municipality of Roxas, Oriental Mindoro.
                    </span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="asym-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Business Account'}
                    {!isSubmitting && <ArrowRight size={18} />}
                  </button>
                </form>

                <div className="asym-footer-text">
                  Already have an account?
                  <button
                    type="button"
                    className="asym-footer-btn"
                    onClick={() => handleTabSwitch('login')}
                  >
                    Sign In here
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsymmetricalAuth;
