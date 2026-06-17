import { NavLink, useNavigate } from 'react-router-dom';
import {
  Flame,
  Activity,
  Users,
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  User,
  Truck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showSuccess } from '../utils/toast';
import type { Role } from '../types';

const NAV: Record<Role, { to: string; icon: typeof Flame; label: string }[]> = {
  CUSTOMER: [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
    { to: '/orders/new', icon: ShoppingCart,    label: 'New Order'  },
    { to: '/orders',     icon: ClipboardList,   label: 'My Orders'  },
    { to: '/profile',    icon: User,            label: 'Profile'    },
  ],
  DELIVERY_PARTNER: [
    { to: '/partner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/partner/orders',    icon: Truck,           label: 'My Orders' },
  ],
  ADMIN: [
    { to: '/admin/assignments', icon: Activity, label: 'Auto Assignment' },
    { to: '/admin/partners',    icon: Users,    label: 'Delivery Partners'   },
  ],
};

const roleLabel: Record<Role, string> = {
  CUSTOMER:         'Customer',
  DELIVERY_PARTNER: 'Delivery Partner',
  ADMIN:            'Administrator',
};

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

 function handleLogout() {
  const confirmed = window.confirm(
    'Are you sure you want to sign out?'
  );

  if (!confirmed) return;

  logout();
  showSuccess('Logged out');
  navigate('/login');
}

  const navItems = role ? (NAV[role] ?? []) : [];

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-r border-gray-100 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0 shadow-brand">
          <Flame size={17} className="text-white" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-gray-900 text-sm block">GasCylinder</span>
          {role && (
            <p className="text-xs text-gray-400 truncate">{roleLabel[role]}</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-brand-50 hover:text-brand-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={`flex-shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-500'
                  }`}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 space-y-1 border-t border-gray-100 pt-3">
        <div className="px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.phone}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 group"
        >
          <LogOut size={15} className="group-hover:text-red-500 transition-colors" />
          Sign out
        </button>
      </div>
    </aside>
  );
}