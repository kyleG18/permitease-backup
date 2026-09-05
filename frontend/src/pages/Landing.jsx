import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      
      {/* Public Navigation */}
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1rem 5%', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border-light)',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '36px', height: '36px', backgroundColor: 'var(--primary-green)', 
            borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1.2rem'
          }}>P</div>
          <div>
            <h1 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--government-navy)' }}>PermitEase</h1>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Municipality of Roxas</div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#services" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Services</a>
          <a href="#how-it-works" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>How It Works</a>
          <a href="#help" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Help</a>
          <button 
            onClick={() => navigate('/login')}
            className="btn btn-outline btn-sm"
          >
            Sign In
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <div style={{ 
        position: 'relative', 
        minHeight: '85vh', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        {/* Background Image with Dark Navy Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url("/images/roxas-building.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(rgba(23, 32, 51, 0.85), rgba(23, 32, 51, 0.7))',
          zIndex: 1
        }} />
        
        <div style={{ position: 'relative', zIndex: 2, padding: '0 5%', maxWidth: '800px' }}>
          <div style={{ 
            display: 'inline-block', backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', 
            color: 'var(--accent-gold-light)', fontSize: '0.8rem', fontWeight: '600', 
            letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            Business Permit Services
          </div>
          
          <h1 style={{ fontSize: '4rem', fontWeight: '800', margin: '0 0 1.25rem 0', color: '#ffffff', lineHeight: 1.1 }}>
            Your Business Permit, Made Simple.
          </h1>
          
          <p style={{ fontSize: '1.25rem', margin: '0 auto 3rem auto', color: '#E2E7E4', lineHeight: 1.6, maxWidth: '640px' }}>
            Know what you need before applying. Prepare your requirements, track your application, and stay ahead of permit renewals.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-lg">
              Start a New Business
            </button>
            <button onClick={() => setShowModal(true)} className="btn btn-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              Renew an Existing Permit &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Trust / Introduction Section */}
      <section id="services" style={{ padding: '6rem 5%', backgroundColor: 'var(--surface)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          
          <div>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--government-navy)', margin: '0 0 1.5rem', lineHeight: 1.2 }}>
              Everything you need to stay compliant
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              PermitEase helps business owners understand what they need before applying, organize their requirements, and stay informed about their permits.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ color: 'var(--primary-green)', fontSize: '1.25rem', fontWeight: '800', marginTop: '2px' }}>01</div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--government-navy)', margin: '0 0 0.5rem' }}>Check requirements</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Know what documents and information are needed based on your business type.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ color: 'var(--primary-green)', fontSize: '1.25rem', fontWeight: '800', marginTop: '2px' }}>02</div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--government-navy)', margin: '0 0 0.5rem' }}>Prepare your application</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Organize your business permit requirements in one secure dashboard.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ color: 'var(--primary-green)', fontSize: '1.25rem', fontWeight: '800', marginTop: '2px' }}>03</div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--government-navy)', margin: '0 0 0.5rem' }}>Track and renew</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Monitor your application status and stay ahead of upcoming renewals.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img 
              src="/images/dashboard-screenshot.png" 
              alt="PermitEase Dashboard Interface" 
              style={{ 
                width: '100%', 
                borderRadius: 'var(--radius-lg)', 
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border-light)'
              }} 
            />
          </div>

        </div>
      </section>

      {/* Civic Trust Section */}
      <section style={{ padding: '5rem 5%', backgroundColor: 'var(--background)', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ 
            width: '64px', height: '64px', margin: '0 auto 1.5rem',
            backgroundColor: 'var(--surface)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img src="/images/roxas-seal.png" alt="Roxas Seal" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>
          
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Municipality of Roxas
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--government-navy)', marginBottom: '2rem' }}>
            A simpler way to manage your business permit compliance.
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              <span style={{ color: 'var(--success)' }}>✓</span> Clear permit requirements
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              <span style={{ color: 'var(--success)' }}>✓</span> Application tracking
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              <span style={{ color: 'var(--success)' }}>✓</span> Renewal monitoring
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              <span style={{ color: 'var(--success)' }}>✓</span> Accessible digital assistance
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--government-navy)', color: 'white', padding: '4rem 5% 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem', marginBottom: '2rem' }}>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <img src="/images/roxas-seal.png" alt="Roxas Seal" style={{ width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '50%' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>PermitEase</h3>
                  <div style={{ fontSize: '0.75rem', color: '#A0AAB4' }}>Municipality of Roxas</div>
                </div>
              </div>
              <p style={{ color: '#A0AAB4', fontSize: '0.85rem', maxWidth: '300px', margin: 0, lineHeight: 1.6 }}>
                Business Permit Compliance and Renewal System for the Municipality of Roxas, Oriental Mindoro, Philippines.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '4rem' }}>
              <div>
                <h4 style={{ color: 'white', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Services</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li><a href="#" style={{ color: '#A0AAB4', fontSize: '0.85rem', textDecoration: 'none' }}>New Business</a></li>
                  <li><a href="#" style={{ color: '#A0AAB4', fontSize: '0.85rem', textDecoration: 'none' }}>Permit Renewal</a></li>
                  <li><a href="#" style={{ color: '#A0AAB4', fontSize: '0.85rem', textDecoration: 'none' }}>Check Requirements</a></li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: 'white', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Support</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li><a href="#" style={{ color: '#A0AAB4', fontSize: '0.85rem', textDecoration: 'none' }}>Help Center</a></li>
                  <li><a href="#" style={{ color: '#A0AAB4', fontSize: '0.85rem', textDecoration: 'none' }}>Contact BPLO</a></li>
                </ul>
              </div>
            </div>
            
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#A0AAB4', fontSize: '0.8rem' }}>
            <div>&copy; {new Date().getFullYear()} Municipality of Roxas. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="#" style={{ color: '#A0AAB4' }}>Privacy Policy</a>
              <a href="#" style={{ color: '#A0AAB4' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Pop-up Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(23, 32, 51, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div className="card animate-slide-up" style={{
            width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2.5rem'
          }}>
            <h2 style={{ color: 'var(--government-navy)', marginBottom: '0.5rem' }}>Welcome to PermitEase</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Please log in or register to continue.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary btn-block"
                style={{ padding: '0.875rem' }}
              >
                Log In to Existing Account
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="btn btn-outline btn-block"
                style={{ padding: '0.875rem' }}
              >
                Register New Business
              </button>
            </div>
            
            <button 
              onClick={() => setShowModal(false)}
              style={{
                marginTop: '1.5rem', background: 'none', border: 'none',
                color: 'var(--text-light)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Landing;
