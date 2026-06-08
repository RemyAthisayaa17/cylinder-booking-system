import http from '../api/http';
import type { ApiResponse, DeliveryActionData, Order } from '../types';

export const assignPartner = (orderId: string) =>
  http
    .post<ApiResponse<DeliveryActionData>>('/api/delivery/assign', { orderId })
    .then((r) => r.data);

export const startDelivery = (orderId: string) =>
  http
    .post<ApiResponse<DeliveryActionData>>('/api/delivery/start', { orderId })
    .then((r) => r.data);

export const completeDelivery = (
  orderId: string,
  beforePhoto: File,
  afterPhoto: File,
  signaturePhoto: File
) => {
  const formData = new FormData();
  formData.append('orderId', orderId);
  formData.append('beforePhoto', beforePhoto);
  formData.append('afterPhoto', afterPhoto);
  formData.append('signaturePhoto', signaturePhoto);

  // Do NOT set Content-Type here. The http interceptor deletes it for FormData
  // so axios can auto-set multipart/form-data with the correct boundary.
  return http
    .post<ApiResponse<DeliveryActionData>>('/api/delivery/complete', formData)
    .then((r) => r.data);
};

export const markArrived = (orderId: string) =>
  http
    .post<ApiResponse<DeliveryActionData>>('/api/delivery/arrived', { orderId })
    .then((r) => r.data);

export const getMyOrders = () =>
  http
    .get<ApiResponse<Order[]>>('/api/delivery/my-orders')
    .then((r) => r.data);