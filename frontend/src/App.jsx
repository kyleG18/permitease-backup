import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProductOnboardingProvider } from './context/ProductOnboardingContext';
import AppTour from './components/AppTour';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import BusinessProfile from './pages/BusinessProfile';
import Requirements from './pages/Requirements';
import Documents from './pages/Documents';
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
import TaxEstimation from './pages/TaxEstimation';
import FeeEstimation from './pages/FeeEstimation';
import PermitReadiness from './pages/PermitReadiness';
import ComplianceHistory from './pages/ComplianceHistory';
import Applications from './pages/Applications';
import StartApplication from './pages/StartApplication';
import ApplicationDetail from './pages/ApplicationDetail';
import ScheduleWalkin from './pages/ScheduleWalkin';
import AdminWalkins from './pages/AdminWalkins';
import LGUApplications from './pages/LGUApplications';
import LGUApplicationReview from './pages/LGUApplicationReview';
import VerifyPermit from './pages/VerifyPermit';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layouts/Layout';
import OnboardingLayout from './layouts/OnboardingLayout';
import Onboarding from './pages/Onboarding';

// Reusable wrapper for protected layout pages
const ProtectedLayout = ({ children, allowedRoles }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

// Reusable wrapper for standalone protected pages (like onboarding)
const StandaloneProtectedLayout = ({ children, allowedRoles }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <OnboardingLayout>{children}</OnboardingLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
      <BusinessProvider>
        <ProductOnboardingProvider>
        <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-permit/:verificationCode" element={<VerifyPermit />} />

          {/* Protected routes with Layout */}
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/onboarding" element={<StandaloneProtectedLayout allowedRoles={['business_owner']}><Onboarding /></StandaloneProtectedLayout>} />
          
          {/* Business Owner & System Admin Routes */}
          <Route path="/profile" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><BusinessProfile /></ProtectedLayout>} />
          <Route path="/documents" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><Documents /></ProtectedLayout>} />
          <Route path="/assessment" element={<ProtectedLayout allowedRoles={['business_owner', 'lgu_admin', 'system_admin']}><Assessment /></ProtectedLayout>} />
          <Route path="/assistant" element={<ProtectedLayout allowedRoles={['business_owner', 'lgu_admin', 'system_admin']}><Chatbot /></ProtectedLayout>} />
          <Route path="/compliance" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><Compliance /></ProtectedLayout>} />
          <Route path="/tax-estimation" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><TaxEstimation /></ProtectedLayout>} />
          <Route path="/fee-estimation" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><FeeEstimation /></ProtectedLayout>} />
          <Route path="/readiness" element={<Navigate to="/assessment" replace />} />
          <Route path="/compliance-history" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><ComplianceHistory /></ProtectedLayout>} />
          
          <Route path="/applications" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><Applications /></ProtectedLayout>} />
          <Route path="/applications/new" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><StartApplication /></ProtectedLayout>} />
          <Route path="/applications/:id" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><ApplicationDetail /></ProtectedLayout>} />
          <Route path="/schedule-walkin" element={<ProtectedLayout allowedRoles={['business_owner', 'system_admin']}><ScheduleWalkin /></ProtectedLayout>} />
          <Route path="/walkin" element={<Navigate to="/schedule-walkin" replace />} />
          
          {/* All Authenticated Users */}
          <Route path="/requirements" element={<ProtectedLayout><Requirements /></ProtectedLayout>} />
          <Route path="/knowledge" element={<ProtectedLayout><KnowledgeBase /></ProtectedLayout>} />
          <Route path="/notifications" element={<ProtectedLayout><Notifications /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />

          {/* LGU Admin + System Admin */}
          <Route path="/reports" element={<Navigate to="/admin/analytics" replace />} />
          <Route path="/admin/reports" element={<Navigate to="/admin/analytics" replace />} />
          <Route path="/admin/applications" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><LGUApplications /></ProtectedLayout>} />
          <Route path="/admin/walkins" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><AdminWalkins /></ProtectedLayout>} />
          <Route path="/admin/walkin-schedule" element={<Navigate to="/admin/walkins" replace />} />
          <Route path="/admin/applications/:id" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><LGUApplicationReview /></ProtectedLayout>} />
          <Route path="/admin/analytics" element={<ProtectedLayout allowedRoles={['lgu_admin', 'system_admin']}><AdminAnalytics /></ProtectedLayout>} />

          {/* System Admin Only */}
          <Route path="/user-management" element={<ProtectedLayout allowedRoles={['system_admin']}><UserManagement /></ProtectedLayout>} />
          <Route path="/role-management" element={<ProtectedLayout allowedRoles={['system_admin']}><RoleManagement /></ProtectedLayout>} />
          <Route path="/audit-logs" element={<ProtectedLayout allowedRoles={['system_admin']}><AuditLogs /></ProtectedLayout>} />

          {/* Shared Access Denied */}
          <Route path="/access-denied" element={<ProtectedLayout><AccessDenied /></ProtectedLayout>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <AppTour />
      </Router>
        </ProductOnboardingProvider>
      </BusinessProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;

