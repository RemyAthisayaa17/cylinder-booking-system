import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationRead,
} from "../services/notification";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.log("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(
    (n) => !n.isRead
  ).length;

  const unreadNotifications = notifications.filter(
    (n) => !n.isRead
  );

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    loadNotifications();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors duration-150 focus:outline-none"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-purple-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-purple-900">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-gray-200/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
              Notifications
            </h3>

            {unreadCount > 0 && (
              <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
            {unreadNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
                <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <Bell size={18} className="text-purple-400" />
                </div>

                <p className="text-sm font-medium text-gray-700">
                  You're all caught up
                </p>

                <p className="text-xs text-gray-400">
                  No notifications right now
                </p>
              </div>
            ) : (
              unreadNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleRead(n.id)}
                  className="relative px-4 py-3 cursor-pointer transition-colors duration-150 hover:bg-purple-50/60 bg-purple-50/40"
                >
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-purple-600" />

                  <div className="pl-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-snug font-semibold text-gray-900">
                        {n.title}
                      </p>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}