import React, { useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isChatPage = location.pathname === '/assistant';
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
        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>

      {/* Floating AI Chat Button */}
      {!isChatPage && (
        <Link 
          to="/assistant" 
          className="btn btn-primary"
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            width: '56px', height: '56px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: 0
          }}
          title="Ask AI Assistant"
        >
          <MessageSquare size={24} />
        </Link>
      )}
    </div>
  );
};

export default Layout;
