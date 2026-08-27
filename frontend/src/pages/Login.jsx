import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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
          const bizRes = await fetch('http://localhost:5000/api/businesses', {
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
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>PermitEase</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Business Permit Compliance and Renewal System — Municipality of Roxas, Oriental Mindoro.
          </p>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>© 2026 Municipality of Roxas. All rights reserved.</p>
        </div>
      </div>

      {/* Main Login Area */}
      <div className="auth-content">
        <div className="auth-card">
          <div className="text-center mb-4">
            <h2 style={{ color: 'var(--text-dark)' }}>Welcome to PermitEase</h2>
            <p className="text-muted">Sign in to manage your business permits.</p>
          </div>
          
          {error && (
            <div style={{ 
              backgroundColor: 'var(--status-expired-bg)', 
              color: 'var(--status-expired)', 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-sm)', 
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="Email Address"
              />
              <label htmlFor="email" className="form-label">Email Address</label>
            </div>
            
            <div className="form-group mb-4">
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={password}
                onChange={onChange}
                placeholder="Password"
              />
              <label htmlFor="password" className="form-label">Password</label>
            </div>
            
            <button type="submit" className="btn btn-primary btn-block" style={{ padding: '0.875rem' }}>
              Sign In
            </button>
          </form>
          
          <div className="text-center mt-4 text-muted">
            <p>
              Don't have an account? <Link to="/register" style={{ fontWeight: '600' }}>Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;