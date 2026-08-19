import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Landing = () => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif', margin: 0, padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Banner */}
      <div style={{ backgroundColor: '#15803D', color: 'white', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img 
          src="/images/roxas-seal.png" 
          alt="Municipality of Roxas Seal" 
          style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'white' }} 
        />
        <div>
          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Republic of the Philippines</div>
          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Province of Oriental Mindoro</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>Municipality of Roxas</div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ 
        position: 'relative', 
        minHeight: '600px', 
        height: '65vh', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        {/* Background Image with Overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'url("/images/roxas-building.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0
        }} />
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.75))',
          zIndex: 1
        }} />
        
        <div style={{ position: 'relative', zIndex: 2, padding: '0 2rem' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '700', margin: '0 0 1rem 0', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            Your Business Permit, Made Simple
          </h1>
          <p style={{ fontSize: '1.2rem', margin: '0 auto 2.5rem auto', color: '#ffffff', opacity: 0.95, maxWidth: '700px', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            Know what you need, prepare your requirements, estimate your fees, and stay on top of your permit renewals.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => setShowModal(true)} style={{ 
              backgroundColor: '#22C55E', color: 'white', border: 'none', cursor: 'pointer',
              padding: '0.75rem 2rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.95rem',
              transition: 'background-color 0.2s'
            }}>
              New Business
            </button>
            <button onClick={() => setShowModal(true)} style={{ 
              backgroundColor: '#16A34A', color: 'white', border: 'none', cursor: 'pointer',
              padding: '0.75rem 2rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.95rem',
              transition: 'background-color 0.2s'
            }}>
              Renewal
            </button>
            <button onClick={() => setShowModal(true)} style={{ 
              backgroundColor: '#15803D', color: 'white', border: 'none', cursor: 'pointer',
              padding: '0.75rem 2rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.95rem',
              transition: 'background-color 0.2s'
            }}>
              Login to Portal
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div style={{ flex: 1, background: 'linear-gradient(to bottom right, #ffffff, #DCFCE7)', padding: '4rem 10%', display: 'flex', alignItems: 'center', gap: '4rem' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '2.5rem', color: '#1E293B', margin: '0 0 1rem 0', fontWeight: '400', lineHeight: 1.2 }}>Everything You Need for Business Permit Compliance</h2>
          <h3 style={{ fontSize: '1.25rem', color: '#334155', margin: '0 0 1.5rem 0', fontWeight: '400' }}>Know your requirements. Prepare your documents. Track your permit.</h3>
          
          <p style={{ color: '#475569', lineHeight: 1.6, maxWidth: '500px' }}>
            PermitEase helps business owners understand what they need before applying, organize their requirements, monitor their application status, and stay informed about upcoming renewals.
          </p>
        </div>
        
        {/* Dashboard Screenshot */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <img 
            src="/images/dashboard-screenshot.png" 
            alt="PermitEase Dashboard" 
            style={{ 
              width: '100%', maxWidth: '600px', 
              borderRadius: '8px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0'
            }} 
          />
        </div>
      </div>

      {/* Auth Pop-up Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2.5rem', borderRadius: '12px',
            width: '90%', maxWidth: '400px', textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ color: '#1E293B', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Welcome to PermitEase</h2>
            <p style={{ color: '#64748B', marginBottom: '2rem', fontSize: '0.95rem' }}>Please login or register to continue.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                onClick={() => navigate('/login')}
                style={{
                  backgroundColor: '#16A34A', color: 'white', border: 'none', padding: '1rem',
                  borderRadius: '6px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer'
                }}>
                Login to Existing Account
              </button>
              <button 
                onClick={() => navigate('/register')}
                style={{
                  backgroundColor: 'white', color: '#16A34A', border: '2px solid #16A34A', padding: '1rem',
                  borderRadius: '6px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer'
                }}>
                Register New Business
              </button>
            </div>
            
            <button 
              onClick={() => setShowModal(false)}
              style={{
                marginTop: '1.5rem', background: 'none', border: 'none',
                color: '#94A3B8', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline'
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Landing;
