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

  // Frontend-only filter: dropdown shows unread items only.
  // Read notifications stay in `notifications` state (and in the database)
  // for history/audit purposes — they're just not rendered here.
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    loadNotifications();
  };

  return (
    <div className="relative">
      {/* UI-only: refined bell button with smoother hover/focus state and purple-tinted active ring */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-gray-600 hover:text-purple-600 hover:bg-purple-50 active:bg-purple-100 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />

        {/* UI-only: badge restyled to match purple theme with a subtle ring for separation from the bell icon */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        // UI-only: wider panel, softer shadow/border, rounded-2xl corners, and responsive width clamp for small screens
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-gray-200/60 z-50 overflow-hidden">
          {/* UI-only: header redesigned with clearer hierarchy, unread count pill, and subtle bottom border */}
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

          {/* UI-only: scroll container with slimmer, theme-colored scrollbar and divided rows instead of per-row borders */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
            {unreadNotifications.length === 0 ? (
              // UI-only: improved empty state with icon, primary message, and supporting copy
              // Shown once all notifications are read (existing "No notifications" behavior, restyled)
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
              // Frontend-only: iterate over unread notifications only.
              // Once handleRead() succeeds and state refreshes, the item is
              // no longer in this filtered list and disappears from view.
              unreadNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleRead(n.id)}
                  className="relative px-4 py-3 cursor-pointer transition-colors duration-150 hover:bg-purple-50/60 bg-purple-50/40"
                >
                  {/* UI-only: subtle unread indicator dot (all rendered items are unread now) */}
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