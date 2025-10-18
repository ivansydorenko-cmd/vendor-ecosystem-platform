import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import CallbackPage from './pages/auth/CallbackPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import DashboardPage from './pages/DashboardPage';

import AdminUsersPage from './pages/admin/UsersPage';
import AdminVendorsPage from './pages/admin/VendorsPage';
import AdminQualificationsPage from './pages/admin/QualificationsPage';

import WorkOrdersPage from './pages/work-orders/WorkOrdersPage';
import CreateWorkOrderPage from './pages/work-orders/CreateWorkOrderPage';
import WorkOrderDetailPage from './pages/work-orders/WorkOrderDetailPage';

import AvailableWorkOrdersPage from './pages/vendor/AvailableWorkOrdersPage';
import VendorWorkOrdersPage from './pages/vendor/VendorWorkOrdersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  const { isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/callback" element={<CallbackPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>

          <Route element={<MainLayout />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/vendors"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminVendorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/qualifications"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminQualificationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/work-orders"
              element={
                <ProtectedRoute allowedRoles={['admin', 'work_requestor']}>
                  <WorkOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/work-orders/create"
              element={
                <ProtectedRoute allowedRoles={['admin', 'work_requestor']}>
                  <CreateWorkOrderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/work-orders/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'work_requestor']}>
                  <WorkOrderDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/vendor/available"
              element={
                <ProtectedRoute allowedRoles={['vendor']}>
                  <AvailableWorkOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/my-orders"
              element={
                <ProtectedRoute allowedRoles={['vendor']}>
                  <VendorWorkOrdersPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
