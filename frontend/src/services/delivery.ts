import http from '../api/http';
import type { ApiResponse, DeliveryActionData, Order } from '../types';

// POST /api/delivery/assign  Body: { orderId }
export const assignPartner = (orderId: string) =>
  http.post<ApiResponse<DeliveryActionData>>('/api/delivery/assign', { orderId }).then(r => r.data);

// POST /api/delivery/start   Body: { orderId }
export const startDelivery = (orderId: string) =>
  http.post<ApiResponse<DeliveryActionData>>('/api/delivery/start', { orderId }).then(r => r.data);

// POST /api/delivery/complete Body: { orderId }
export const completeDelivery = (orderId: string) =>
  http.post<ApiResponse<DeliveryActionData>>('/api/delivery/complete', { orderId }).then(r => r.data);

// GET /api/delivery/my-orders  (RBAC: DELIVERY_PARTNER — JWT used server-side)
export const getMyOrders = () =>
  http.get<ApiResponse<Order[]>>('/api/delivery/my-orders').then(r => r.data);
