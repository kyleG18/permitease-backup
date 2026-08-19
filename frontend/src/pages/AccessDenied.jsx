import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AccessDenied = () => {
  return (
    <div style={{ height: 'calc(100vh - 150px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card text-center animate-fade-in" style={{ padding: '3rem', maxWidth: '450px' }}>
        <div style={{ width: '80px', height: '80px', background: 'var(--status-expired-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <ShieldAlert size={40} style={{ color: 'var(--danger)' }} />
        </div>
        <h1 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Access Denied</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          Sorry, you don't have permission to view this page. If you believe this is a mistake, please contact your System Administrator.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', minWidth: '200px' }}>
          <ArrowLeft size={18} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default AccessDenied;
