import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    contact_number: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const { full_name, email, contact_number, password, confirmPassword } = formData;

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!full_name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const result = await register({ full_name, email, contact_number, password, confirmPassword });
    if (result.success) {
      navigate('/onboarding');
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
            Join the digital platform for fast and easy business permit compliance.
          </p>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>© 2026 Municipality of Roxas. All rights reserved.</p>
        </div>
      </div>

      {/* Main Register Area */}
      <div className="auth-content">
        <div className="auth-card" style={{ maxWidth: '500px' }}>
          <div className="text-center mb-4">
            <h2 style={{ color: 'var(--text-dark)' }}>Create Account</h2>
            <p className="text-muted">Register as a Business Owner</p>
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
                type="text"
                className="form-control"
                id="full_name"
                name="full_name"
                value={full_name}
                onChange={onChange}
                placeholder="Full Name"
              />
              <label htmlFor="full_name" className="form-label">Full Name *</label>
            </div>

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
              <label htmlFor="email" className="form-label">Email Address *</label>
            </div>

            <div className="form-group">
              <input
                type="text"
                className="form-control"
                id="contact_number"
                name="contact_number"
                value={contact_number}
                onChange={onChange}
                placeholder="Contact Number"
              />
              <label htmlFor="contact_number" className="form-label">Contact Number</label>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                <label htmlFor="password" className="form-label">Password *</label>
              </div>

              <div className="form-group mb-4">
                <input
                  type="password"
                  className="form-control"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={onChange}
                  placeholder="Confirm Password"
                />
                <label htmlFor="confirmPassword" className="form-label">Confirm Password *</label>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary btn-block" style={{ padding: '0.875rem' }}>
              Register
            </button>
          </form>
          
          <div className="text-center mt-4 text-muted">
            <p>
              Already have an account? <Link to="/login" style={{ fontWeight: '600' }}>Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
