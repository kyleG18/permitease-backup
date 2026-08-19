import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const isChatPage = location.pathname === '/assistant';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>

      {/* Floating AI Chat Button (Hidden on the actual chat page) */}
      {!isChatPage && (
        <Link 
          to="/assistant" 
          className="btn btn-primary"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
            zIndex: 100,
            padding: 0
          }}
          title="Ask AI Assistant"
        >
          <MessageSquare size={28} />
        </Link>
      )}
    </div>
  );
};

export default Layout;
