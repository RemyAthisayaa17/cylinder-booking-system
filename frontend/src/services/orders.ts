import http from '../api/http';
import type { ApiResponse, CreateOrderData, Order, CylinderType, PaymentMethod } from '../types';

// POST /api/orders  (requires JWT)
export const createOrder = (payload: {
  cylinderType: CylinderType;
  quantity: number;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
}) =>
  http.post<ApiResponse<CreateOrderData>>('/api/orders', payload).then(r => r.data);

// GET /api/orders/:orderId
export const getOrder = (orderId: string) =>
  http.get<ApiResponse<Order>>(`/api/orders/${orderId}`).then(r => r.data);

// GET /api/orders/my-orders — all orders for logged-in customer
export const getMyOrders = () =>
  http.get<ApiResponse<Order[]>>('/api/orders/my-orders').then(r => r.data);

// GET /api/orders/eligibility
export interface EligibilityResult {
  eligible: boolean;
  nextEligibleDate?: string;
  message: string;
}
export const getEligibility = () =>
  http.get<ApiResponse<EligibilityResult>>('/api/orders/eligibility').then(r => r.data);

// PATCH /api/orders/:orderId/cancel
export const cancelOrder = (orderId: string) =>
  http.patch<ApiResponse<{
    orderId: string;
    status: string;
    refundMessage?: string;
  }>>(`/api/orders/${orderId}/cancel`)
    .then(r => r.data);