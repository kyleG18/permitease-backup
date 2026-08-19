import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BusinessContext } from '../context/BusinessContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { isOnboarded, loadingBusinesses } = useContext(BusinessContext);
  const location = useLocation();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  // Navigation Guard for first-time business owners
  if (user.role === 'business_owner' && !loadingBusinesses && !isOnboarded) {
    const restrictedPaths = [
      '/applications',
      '/permits',
      '/renewals',
      '/readiness',
      '/documents',
      '/compliance',
      '/tax-estimate',
      '/compliance-history',
      '/requirements'
    ];
    
    // Check if the current path starts with any restricted path
    const isRestricted = restrictedPaths.some(path => location.pathname.startsWith(path));
    
    if (isRestricted) {
      return (
        <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: '3rem', boxShadow: 'var(--shadow-card)' }}>
            <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Profile Required</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
              Before you can manage permits or applications, let's set up your business profile first.
            </p>
            <a href="/onboarding" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.75rem 2rem', fontWeight: '600', textDecoration: 'none' }}>
              Set Up My Business
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
