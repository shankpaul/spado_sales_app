import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import OfflineNotice from './components/OfflineNotice';
import { Loader2 } from 'lucide-react';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const SubscriptionDetail = lazy(() => import('./pages/SubscriptionDetail'));
const Users = lazy(() => import('./pages/Users'));
const Employees = lazy(() => import('./pages/Employees'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

/**
 * Main App Component
 * Handles routing and authentication flow
 */
function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        {/* Offline detection */}
        <OfflineNotice />
        
        {/* Toast notifications */}
        <Toaster 
          position="top-right"
          richColors
          // closeButton
          duration={4000}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Placeholder routes for navigation items */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales_executive']}>
                <Layout>
                  <Customers />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales_executive']}>
                <Layout>
                  <Orders />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales_executive']}>
                <Layout>
                  <OrderDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales_executive']}>
                <Layout>
                  <Subscriptions />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/subscriptions/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales_executive']}>
                <Layout>
                  <SubscriptionDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/services"
            element={
              <ProtectedRoute allowedRoles={['admin', 'sales_executive']}>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Services</h2>
                    <p className="text-gray-600">Services management page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Employees />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Transactions</h2>
                    <p className="text-gray-600">Transactions page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports</h2>
                    <p className="text-gray-600">Reports page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
                    <p className="text-gray-600">Settings page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 Not Found */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                  <p className="text-xl text-gray-600 mb-6">Page not found</p>
                  <a
                    href="/dashboard"
                    className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
