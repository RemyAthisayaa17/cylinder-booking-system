import { NavLink, useNavigate } from 'react-router-dom';
import {
  Flame, Activity, UserPlus, Users, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/toast';
import type { Role } from '../types';

const NAV: Record<Role, { to: string; icon: typeof Flame; label: string }[]> = {
  CUSTOMER: [
    { to: '/dashboard',   icon: Flame,     label: 'Dashboard'  },
    { to: '/orders/new',  icon: Flame,     label: 'New Order'  },
    { to: '/orders',      icon: Flame,     label: 'My Orders'  },
    { to: '/profile',     icon: Flame,     label: 'Profile'    },
  ],
  DELIVERY_PARTNER: [
    { to: '/partner/dashboard', icon: Flame, label: 'Dashboard' },
    { to: '/partner/orders',    icon: Flame, label: 'My Orders' },
  ],
  ADMIN: [
    { to: '/admin/assignments',     icon: Activity,  label: 'Auto Assignment Monitoring' },
    { to: '/admin/partners/create', icon: UserPlus,  label: 'Create Delivery Partner'    },
    { to: '/admin/partners',        icon: Users,     label: 'Delivery Partner Table'     },
  ],
};

// Re-import the original customer/partner icons so those nav items still look right
import {
  LayoutDashboard, ShoppingCart, ClipboardList, FileText, User, Truck, Shield,
} from 'lucide-react';

const NAV_ICONS: Record<Role, typeof Flame[]> = {CUSTOMER: [
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  User
],
  DELIVERY_PARTNER:  [LayoutDashboard, Truck],
  ADMIN:             [Activity, UserPlus, Users],
};

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    showSuccess('Logged out');
    navigate('/login');
  }

  const navItems   = role ? (NAV[role]       ?? []) : [];
  const navIcons   = role ? (NAV_ICONS[role] ?? []) : [];

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0">
          <Flame size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-gray-900 text-sm block truncate">GasCylinder</span>
          {role && (
            <p className="text-xs text-gray-400 capitalize truncate">
              {role === 'DELIVERY_PARTNER' ? 'Delivery Partner'
               : role === 'ADMIN' ? 'Admin'
               : 'Customer'}
            </p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label }, i) => {
          const Icon = navIcons[i] ?? Flame;
          return (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 hover:bg-brand-50 hover:text-brand-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-white' : 'text-gray-400'} />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 space-y-1">
        <div className="px-3 py-2.5 rounded-xl bg-brand-50 border border-brand-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.phone}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}