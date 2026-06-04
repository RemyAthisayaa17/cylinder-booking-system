import http from '../api/http';
import type { ApiResponse, GenerateInvoiceData, Invoice } from '../types';

// POST /api/invoices/generate  Body: { orderId }
// Response data: { message, invoiceId, orderId, totalAmount }  ← NOT full Invoice
export const generateInvoice = (orderId: string) =>
  http.post<ApiResponse<GenerateInvoiceData>>('/api/invoices/generate', { orderId })
    .then(r => r.data);

// GET /api/invoices/:orderId
// Response data: full Invoice with includes { customer, order }
export const getInvoice = (orderId: string) =>
  http.get<ApiResponse<Invoice>>(`/api/invoices/${orderId}`)
    .then(r => r.data);

    