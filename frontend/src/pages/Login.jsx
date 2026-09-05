import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      const user = result.data;
      if (user.role === 'business_owner') {
        try {
          const bizRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          const businesses = await bizRes.json();
          if (businesses.length === 0) {
            navigate('/onboarding');
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-layout">
      {/* Sidebar Branding (Desktop Only) */}
      <div className="auth-sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4rem' }}>
            <div style={{ 
              width: '40px', height: '40px', backgroundColor: 'var(--surface)', 
              borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', color: 'var(--primary-green-dark)', fontWeight: '800', fontSize: '1.25rem'
            }}>P</div>
            <h1 style={{ fontSize: '1.5rem', color: 'white', margin: 0 }}>PermitEase</h1>
          </div>

          <div style={{ 
            display: 'inline-block', backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', 
            color: 'var(--accent-gold-light)', fontSize: '0.75rem', fontWeight: '700', 
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            BUSINESS PERMIT SERVICES
          </div>

          <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            Business Permit Compliance and Renewal System
          </h2>
          
          <p style={{ fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '1.5rem', lineHeight: 1.5, maxWidth: '400px' }}>
            Municipality of Roxas<br />
            Oriental Mindoro
          </p>

          <p style={{ fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.5, maxWidth: '400px' }}>
            A simpler way to prepare, manage, and renew your business permit requirements.
          </p>
        </div>

        <div style={{ zIndex: 1 }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>© {new Date().getFullYear()} Municipality of Roxas. All rights reserved.</p>
        </div>
      </div>

      {/* Main Login Area */}
      <div className="auth-content">
        <div className="auth-card">
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--government-navy)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome back</h2>
            <p className="text-muted" style={{ fontSize: '0.9375rem' }}>Sign in to manage your business permits.</p>
          </div>
          
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.2rem' }}>We couldn't sign you in.</strong>
                {error}
              </div>
            </div>
          )}
          
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="email" className="label">Email address</label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="name@example.com"
                style={{ padding: '0.75rem 1rem' }}
              />
            </div>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="password" className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password
                <Link to="#" style={{ fontWeight: '500', fontSize: '0.75rem', color: 'var(--primary-green)' }}>Forgot password?</Link>
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={password}
                onChange={onChange}
                placeholder="••••••••••••"
                style={{ padding: '0.75rem 1rem' }}
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-block mt-4" style={{ padding: '0.875rem', fontSize: '0.9375rem' }}>
              Sign In
            </button>
          </form>
          
          <div className="text-center text-muted" style={{ marginTop: '2rem', fontSize: '0.875rem' }}>
            Don't have an account? <Link to="/register" style={{ fontWeight: '600', color: 'var(--primary-green)' }}>Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;