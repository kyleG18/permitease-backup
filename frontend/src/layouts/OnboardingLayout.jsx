import React from 'react';

const OnboardingLayout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F9FAFB' }}>
      {/* Minimal Header with subtle branding */}
      <header style={{ 
        padding: '1rem 2rem', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #E2E8F0', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem' 
      }}>
        <div style={{ 
          width: '36px', height: '36px', 
          backgroundColor: 'var(--primary-green)', color: 'white', 
          borderRadius: 'var(--radius-sm)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontWeight: 'bold', fontSize: '1.2rem' 
        }}>
          P
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-dark)' }}>PermitEase</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Municipality of Roxas</p>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
};

export default OnboardingLayout;
