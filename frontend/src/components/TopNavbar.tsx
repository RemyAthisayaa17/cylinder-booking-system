import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function TopNavbar() {
  const { user, role } = useAuth();

  if (role === 'ADMIN') return null;

  const initial = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <div className="w-full bg-gradient-to-r from-purple-950 to-purple-800 shadow-md">
      <div className="flex items-center justify-end h-16 px-6 gap-4">
        <NotificationBell />

        <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white font-semibold shadow-sm">
          {initial}
        </div>
      </div>
    </div>
  );
}