import api from "../api/http";

export const getNotifications = async () => {
  const res = await api.get("/api/notifications");
  return res.data.data;
};

export const markNotificationRead = async (id: string) => {
  const res = await api.patch(`/api/notifications/${id}/read`);
  return res.data.data;
};