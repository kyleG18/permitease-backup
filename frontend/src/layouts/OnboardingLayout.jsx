import React from 'react';
import LanguageSwitchButton from '../components/LanguageSwitchButton';

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
        <img 
          src="/images/roxas-seal.png" 
          alt="Municipality of Roxas Seal" 
          style={{ 
            width: '38px', 
            height: '38px', 
            objectFit: 'contain',
            flexShrink: 0
          }} 
        />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-dark)' }}>PermitEase</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Municipality of Roxas</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <LanguageSwitchButton />
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

