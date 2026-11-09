import React, { useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ProductOnboardingBanner from '../components/ProductOnboardingBanner';
import ChatWidget from '../components/ChatWidget';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isChatPage = location.pathname === '/assistant';
  const isFormPage = location.pathname === '/applications';
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  React.useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  const roleLabels = {
    'business_owner': 'BUSINESS OWNER',
    'lgu_admin': 'LGU ADMIN',
    'system_admin': 'SYSTEM ADMIN'
  };

  const roleClass = user?.role ? user.role.replace('_', '-') : 'business-owner';

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={closeSidebar}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(23, 32, 51, 0.6)', zIndex: 30
          }}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      
      <div className="main-content">
        <Header toggleSidebar={toggleSidebar} />

        {/* Product Onboarding Banner — renders between header and page content */}
        {user?.role === 'business_owner' && <ProductOnboardingBanner />}

        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>

      {/* Floating AI Chat Widget — opens a chat window on the current page.
          Hidden on the full chat page and the form/applications page */}
      {!isChatPage && !isFormPage && <ChatWidget />}
    </div>
  );
};

export default Layout;
