import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import BusinessProfile from './pages/BusinessProfile';
import Requirements from './pages/Requirements';
import Permits from './pages/Permits';
import Documents from './pages/Documents';
import Renewals from './pages/Renewals';
import Assessment from './pages/Assessment';
import Chatbot from './pages/Chatbot';
import KnowledgeBase from './pages/KnowledgeBase';
import Notifications from './pages/Notifications';
import AccessDenied from './pages/AccessDenied';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import AuditLogs from './pages/AuditLogs';
import Reports from './pages/Reports';
import AdminAnalytics from './pages/AdminAnalytics';
import Settings from './pages/Settings';
import Compliance from './pages/Compliance';
import TaxEstimate from './pages/TaxEstimate';
import PermitReadiness from './pages/PermitReadiness';
import ComplianceHistory from './pages/ComplianceHistory';
import Applications from './pages/Applications';
import StartApplication from './pages/StartApplication';
import ApplicationDetail from './pages/ApplicationDetail';
import LGUApplications from './pages/LGUApplications';
import LGUApplicationReview from './pages/LGUApplicationReview';
import AdminRenewals from './pages/AdminRenewals';
import PermitDetail from './pages/PermitDetail';
import VerifyPermit from './pages/VerifyPermit';
import AdminPermits from './pages/AdminPermits';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';

// Reusable wrapper for protected layout pages
const ProtectedLayout = ({ children, allowedRoles }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-permit/:verificationCode" element={<VerifyPermit />} />

          {/* Protected routes with Layout */}
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/onboarding" element={<ProtectedLayout allowedRoles={['business_owner']}><Onboarding /></ProtectedLayout>} />
          
          {/* Business Owner & System Admin Routes */}
          <Route path="/profile" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><BusinessProfile /></ProtectedLayout>} />
          <Route path="/permits" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><Permits /></ProtectedLayout>} />
          <Route path="/permits/:id" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><PermitDetail /></ProtectedLayout>} />
          <Route path="/documents" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><Documents /></ProtectedLayout>} />
          <Route path="/renewals" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><Renewals /></ProtectedLayout>} />
          <Route path="/assessment" element={<ProtectedLayout allowedRoles={['business_owner', 'lgu_admin', 'system_admin']}><Assessment /></ProtectedLayout>} />
          <Route path="/assistant" element={<ProtectedLayout allowedRoles={['business_owner', 'lgu_admin', 'system_admin']}><Chatbot /></ProtectedLayout>} />
          <Route path="/compliance" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><Compliance /></ProtectedLayout>} />
          <Route path="/tax-estimate" element={<ProtectedLayout><TaxEstimate /></ProtectedLayout>} />
          <Route path="/readiness" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><PermitReadiness /></ProtectedLayout>} />
          <Route path="/compliance-history" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><ComplianceHistory /></ProtectedLayout>} />
          
          <Route path="/applications" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><Applications /></ProtectedLayout>} />
          <Route path="/applications/new" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><StartApplication /></ProtectedLayout>} />
          <Route path="/applications/:id" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><ApplicationDetail /></ProtectedLayout>} />
          
          {/* All Authenticated Users */}
          <Route path="/requirements" element={<ProtectedLayout><Requirements /></ProtectedLayout>} />
          <Route path="/knowledge" element={<ProtectedLayout><KnowledgeBase /></ProtectedLayout>} />
          <Route path="/notifications" element={<ProtectedLayout><Notifications /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />

          {/* LGU Admin + System Admin */}
          <Route path="/reports" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><Reports /></ProtectedLayout>} />
          <Route path="/admin/applications" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><LGUApplications /></ProtectedLayout>} />
          <Route path="/admin/applications/:id" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><LGUApplicationReview /></ProtectedLayout>} />
          <Route path="/admin/renewals" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><AdminRenewals /></ProtectedLayout>} />
          <Route path="/admin/analytics" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><AdminAnalytics /></ProtectedLayout>} />
          <Route path="/admin/permits" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><AdminPermits /></ProtectedLayout>} />

          {/* System Admin Only */}
          <Route path="/user-management" element={<ProtectedLayout allowedRoles={['system_admin']}><UserManagement /></ProtectedLayout>} />
          <Route path="/role-management" element={<ProtectedLayout allowedRoles={['system_admin']}><RoleManagement /></ProtectedLayout>} />
          <Route path="/audit-logs" element={<ProtectedLayout allowedRoles={['system_admin']}><AuditLogs /></ProtectedLayout>} />

          {/* Shared Access Denied */}
          <Route path="/access-denied" element={<ProtectedLayout><AccessDenied /></ProtectedLayout>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </BusinessProvider>
    </AuthProvider>
  );
}

export default App;
