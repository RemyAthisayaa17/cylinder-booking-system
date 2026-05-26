import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import type { Role } from './types';

// Auth
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Customer
import Dashboard     from './pages/customer/Dashboard';
import NewOrder      from './pages/customer/NewOrder';
import Orders        from './pages/customer/Orders';
import OrderDetail   from './pages/customer/OrderDetail';
import InvoiceDetail from './pages/customer/InvoiceDetail';
import Profile       from './pages/customer/Profile';

// Delivery Partner
import PartnerDashboard from './pages/partner/PartnerDashboard';
import PartnerOrders    from './pages/partner/PartnerOrders';

// Admin — three isolated pages
import AutoAssignmentMonitor from './pages/admin/AutoAssignmentMonitor';
import CreatePartner         from './pages/admin/CreatePartner';
import PartnerTable          from './pages/admin/PartnerTable';

// ── Role-based route guard ──────────────────────────────────────────────────
function RoleGuard({ allow }: { allow: Role[] }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && !allow.includes(role)) {
    if (role === 'DELIVERY_PARTNER') return <Navigate to="/partner/dashboard" replace />;
    if (role === 'ADMIN')            return <Navigate to="/admin/assignments" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <main className="p-6 lg:p-8 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Root redirect ───────────────────────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'DELIVERY_PARTNER') return <Navigate to="/partner/dashboard" replace />;
  if (role === 'ADMIN')            return <Navigate to="/admin/assignments" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '12px',
              border: '1px solid #f3e8ff',
              boxShadow: '0 4px 24px rgba(147,51,234,.12)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#9333ea', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/"         element={<RootRedirect />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer */}
          <Route element={<RoleGuard allow={['CUSTOMER']} />}>
            <Route path="/dashboard"         element={<Dashboard />} />
            <Route path="/orders/new"        element={<NewOrder />} />
            <Route path="/orders"            element={<Orders />} />
            <Route path="/invoices/:orderId" element={<InvoiceDetail />} />
            <Route path="/profile"           element={<Profile />} />
          </Route>

          {/* Shared order detail */}
          <Route element={<RoleGuard allow={['CUSTOMER', 'DELIVERY_PARTNER']} />}>
            <Route path="/orders/:orderId" element={<OrderDetail />} />
          </Route>

          {/* Delivery Partner */}
          <Route element={<RoleGuard allow={['DELIVERY_PARTNER']} />}>
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/partner/orders"    element={<PartnerOrders />} />
          </Route>

          {/* Admin — 3 isolated sections */}
          <Route element={<RoleGuard allow={['ADMIN']} />}>
            <Route path="/admin/assignments"     element={<AutoAssignmentMonitor />} />
            <Route path="/admin/partners/create" element={<CreatePartner />} />
            <Route path="/admin/partners"        element={<PartnerTable />} />
            {/* legacy redirect — old /admin/dashboard link now lands on assignments */}
            <Route path="/admin/dashboard"       element={<Navigate to="/admin/assignments" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}