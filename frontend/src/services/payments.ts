import http from '../api/http';

export const processPayment = async (
  orderId: string,
  method: 'UPI'
) => {
  const res = await http.post('/api/payments/process', {
    orderId,
    method,
  });

  return res.data;
};

export const cashPayment = async (
  orderId: string
) => {
  const res = await http.post('/api/payments/cash', {
    orderId,
  });

  return res.data;
};

export const retryPayment = async (
  orderId: string
) => {
  const res = await http.post('/api/payments/retry', {
    orderId,
  });

  return res.data;
};
export const getPaymentState = async (orderId: string) => {
  const res = await http.get(`/api/payments/state/${orderId}`);
  return res.data;
};
