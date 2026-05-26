import type { CylinderType, OrderStatus, PaymentStatus, DeliveryStatus } from '../types';

export const cylinderLabel: Record<CylinderType, string> = {
  KG_14_2:  '14.2 kg — Domestic',
  KG_19:    '19 kg — Commercial',
  KG_47_5:  '47.5 kg — Industrial',
};

export const statusBadge: Record<OrderStatus, { label: string; cls: string }> = {
  PLACED:            { label: 'Placed',            cls: 'bg-blue-50 text-blue-700'   },
  CONFIRMED:         { label: 'Confirmed',          cls: 'bg-brand-50 text-brand-700' },
  ASSIGNED:          { label: 'Assigned',           cls: 'bg-orange-50 text-orange-700'},
  OUT_FOR_DELIVERY:  { label: 'Out for Delivery',   cls: 'bg-yellow-50 text-yellow-700'},
  DELIVERED:         { label: 'Delivered',          cls: 'bg-green-50 text-green-700' },
  CANCELLED:         { label: 'Cancelled',          cls: 'bg-red-50 text-red-700'     },
};

export const payBadge: Record<PaymentStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700' },
  SUCCESS: { label: 'Paid',    cls: 'bg-green-50 text-green-700'   },
  FAILED:  { label: 'Failed',  cls: 'bg-red-50 text-red-700'       },
};

export const deliveryBadge: Record<DeliveryStatus, { label: string; cls: string }> = {
  ASSIGNED:         { label: 'Assigned',         cls: 'bg-orange-50 text-orange-700' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', cls: 'bg-blue-50 text-blue-700'     },
  DELIVERED:        { label: 'Delivered',        cls: 'bg-green-50 text-green-700'   },
};

export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

export const saveOrder = (o: import('../types').CachedOrder) => {
  const list: import('../types').CachedOrder[] =
    JSON.parse(localStorage.getItem('orders') ?? '[]');
  const exists = list.findIndex(x => x.orderId === o.orderId);
  if (exists >= 0) list[exists] = o; else list.unshift(o);
  localStorage.setItem('orders', JSON.stringify(list));
};

export const loadOrders = (): import('../types').CachedOrder[] =>
  JSON.parse(localStorage.getItem('orders') ?? '[]');

export const updateCachedOrder = (
  orderId: string,
  patch: Partial<import('../types').CachedOrder>
) => {
  const list = loadOrders();
  const updated = list.map(o => o.orderId === orderId ? { ...o, ...patch } : o);
  localStorage.setItem('orders', JSON.stringify(updated));
};
