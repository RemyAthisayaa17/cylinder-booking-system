import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * POST /api/admin/partners
 * Creates a delivery partner (admin only).
 */
export const createPartner = async (data: {
  name: string;
  phone: string;
  serviceZone: string;
}) => {
  const res = await api.post('/admin/partners', data);
  return res.data;
};

/**
 * GET /api/admin/partners
 * Returns all delivery partners.
 * Each record: { id, name, phone, serviceZone, currentStatus, totalDeliveries, ... }
 */
export const getPartners = async () => {
  const res = await api.get('/admin/partners');
  return res.data;
};

/**
 * GET /api/admin/assignments
 * Returns auto-assignment audit log.
 * Each record: { orderId, customerName, partnerName, assignedAt, status }
 */
export const getAutoAssignmentLog = async () => {
  const res = await api.get('/admin/assignments');
  return res.data;
};