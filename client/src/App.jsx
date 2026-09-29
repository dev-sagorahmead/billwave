import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

// Pages
import Login from './pages/Login';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import CustomerList from './pages/admin/CustomerList';
import CustomerProfile from './pages/admin/CustomerProfile';
import DueManagement from './pages/admin/DueManagement';
import CollectionHistory from './pages/admin/CollectionHistory';
import BillingGeneration from './pages/admin/BillingGeneration';
import AreaList from './pages/admin/AreaList';
import CollectorList from './pages/admin/CollectorList';
import PackageList from './pages/admin/PackageList';
import Reports from './pages/admin/Reports';
import CompanySettings from './pages/admin/CompanySettings';
import ImportPage from './pages/admin/ImportPage';
import CollectorDashboard from './pages/collector/CollectorDashboard';
import CollectorCustomers from './pages/collector/CollectorCustomers';
import CollectorCollections from './pages/collector/CollectorCollections';
import CustomerPortal from './pages/customer/CustomerPortal';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white text-xs">
        <span>Authenticating...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard
    if (user.role === 'super_admin') return <Navigate to="/superadmin" replace />;
    if (user.role === 'company_admin') return <Navigate to="/admin" replace />;
    if (user.role === 'collector') return <Navigate to="/collector" replace />;
    if (user.role === 'customer') return <Navigate to="/customer" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RoleHomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'super_admin') return <Navigate to="/superadmin" replace />;
  if (user.role === 'company_admin') return <Navigate to="/admin" replace />;
  if (user.role === 'collector') return <Navigate to="/collector" replace />;
  if (user.role === 'customer') return <Navigate to="/customer" replace />;
  return <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  const { user } = useAuth();

  if (!user) return children;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RoleHomeRedirect />} />

            {/* Super Admin Routes */}
            <Route path="/superadmin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/superadmin/companies" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/superadmin/settings" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            {/* Company Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/customers" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <CustomerList />
              </ProtectedRoute>
            } />
            <Route path="/admin/customers/:id" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <CustomerProfile />
              </ProtectedRoute>
            } />
            <Route path="/admin/dues" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <DueManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/collections" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <CollectionHistory />
              </ProtectedRoute>
            } />
            <Route path="/admin/billing" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <BillingGeneration />
              </ProtectedRoute>
            } />
            <Route path="/admin/areas" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <AreaList />
              </ProtectedRoute>
            } />
            <Route path="/admin/collectors" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <CollectorList />
              </ProtectedRoute>
            } />
            <Route path="/admin/packages" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <PackageList />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/admin/import" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <ImportPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={['company_admin', 'super_admin']}>
                <CompanySettings />
              </ProtectedRoute>
            } />

            {/* Collector Routes */}
            <Route path="/collector" element={
              <ProtectedRoute allowedRoles={['collector']}>
                <CollectorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/collector/customers" element={
              <ProtectedRoute allowedRoles={['collector']}>
                <CollectorCustomers />
              </ProtectedRoute>
            } />
            <Route path="/collector/collections" element={
              <ProtectedRoute allowedRoles={['collector']}>
                <CollectorCollections />
              </ProtectedRoute>
            } />

            {/* Customer Routes */}
            <Route path="/customer" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerPortal />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}
