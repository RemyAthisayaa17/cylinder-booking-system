import http from '../api/http';
import type { ApiResponse, GenerateInvoiceData, Invoice } from '../types';


export const generateInvoice = (orderId: string) =>
  http.post<ApiResponse<GenerateInvoiceData>>('/api/invoices/generate', { orderId })
    .then(r => r.data);


export const getInvoice = (orderId: string) =>
  http.get<ApiResponse<Invoice>>(`/api/invoices/${orderId}`)
    .then(r => r.data);

export const downloadInvoice = async (orderId: string) => {
  const response = await http.get(
    `/api/invoices/${orderId}/download`,
    {
      responseType: "blob",
    }
  );

  const blob = new Blob([response.data], {
    type: "application/pdf",
  });

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = `invoice-${orderId}.pdf`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
};