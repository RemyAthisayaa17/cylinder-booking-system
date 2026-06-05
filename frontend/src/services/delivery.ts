import http from '../api/http';
import type { ApiResponse, DeliveryActionData, Order } from '../types';

/**
 * ASSIGN DELIVERY PARTNER
 * POST /api/delivery/assign
 */
export const assignPartner = (orderId: string) =>
  http
    .post<ApiResponse<DeliveryActionData>>(
      '/api/delivery/assign',
      { orderId }
    )
    .then((r) => r.data);

/**
 * START DELIVERY
 * POST /api/delivery/start
 */
export const startDelivery = (orderId: string) =>
  http
    .post<ApiResponse<DeliveryActionData>>(
      '/api/delivery/start',
      { orderId }
    )
    .then((r) => r.data);

/**
 * ARRIVED AT CUSTOMER LOCATION
 * PATCH /api/delivery/:orderId/arrived
 * Updates DeliveryTracking.status → ARRIVED.
 * Does NOT change Order.status.
 */
export const arrivedAtCustomer = (orderId: string) =>
  http
    .patch<ApiResponse<DeliveryActionData>>(
      `/api/delivery/${orderId}/arrived`
    )
    .then((r) => r.data);

/**
 * COMPLETE DELIVERY
 * POST /api/delivery/complete
 * multipart/form-data
 *
 * Backend expects:
 * - orderId
 * - beforePhoto
 * - afterPhoto
 * - signaturePhoto
 *
 * Pre-conditions (enforced server-side):
 * - DeliveryTracking.status = ARRIVED
 * - All 3 photos present
 * - paymentStatus = SUCCESS
 */
export const completeDelivery = (
  orderId:        string,
  beforePhoto:    File,
  afterPhoto:     File,
  signaturePhoto: File
) => {
  const formData = new FormData();

  formData.append('orderId',        orderId);
  formData.append('beforePhoto',    beforePhoto);
  formData.append('afterPhoto',     afterPhoto);
  formData.append('signaturePhoto', signaturePhoto);

  return http
    .post<ApiResponse<DeliveryActionData>>(
      '/api/delivery/complete',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    .then((r) => r.data);
};

/**
 * GET MY ASSIGNED ORDERS
 * GET /api/delivery/my-orders
 */
export const getMyOrders = () =>
  http
    .get<ApiResponse<Order[]>>('/api/delivery/my-orders')
    .then((r) => r.data);