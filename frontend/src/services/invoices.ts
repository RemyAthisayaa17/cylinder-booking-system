import http from '../api/http';
import type { ApiResponse, GenerateInvoiceData, Invoice } from '../types';


export const generateInvoice = (orderId: string) =>
  http.post<ApiResponse<GenerateInvoiceData>>('/api/invoices/generate', { orderId })
    .then(r => r.data);


export const getInvoice = (orderId: string) =>
  http.get<ApiResponse<Invoice>>(`/api/invoices/${orderId}`)
    .then(r => r.data);

    