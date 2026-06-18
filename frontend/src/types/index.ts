// ── Enums ────────────────────────────────────────────────────────────────────
export type Role           = 'CUSTOMER' | 'DELIVERY_PARTNER' | 'ADMIN';
export type CustomerType   = 'DOMESTIC' | 'COMMERCIAL';
export type AreaType       = 'URBAN' | 'RURAL';
export type CylinderType   = 'KG_14_2' | 'KG_19' | 'KG_47_5';
export type PaymentMethod  = 'UPI' | 'CASH';
export type PaymentStatus  = 'PENDING' | 'SUCCESS' | 'FAILED';
export type OrderStatus    = 'PLACED' | 'CONFIRMED' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type DeliveryStatus = 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
export type PartnerStatus  = 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY';
export type RefundStatus   = 'NOT_REQUIRED' | 'PENDING' | 'COMPLETED';

// ── API envelope: { code, msg, data, error } ─────────────────────────────────
export interface ApiResponse<T = unknown> {
  code:  number;
  msg:   string;
  data:  T;
  error: unknown;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface RegisterPayload {
  name:             string;
  phone:            string;
  email:            string;
  address:          string;
  city:             string;
  state:            string;
  customerType:     CustomerType;
  areaType:         AreaType;
  subsidyEligible?: boolean;
}

// POST /api/auth/register → data
export interface RegisterData { customerId: string; phone: string; }

// POST /api/auth/send-otp → data  (OTP not returned — out-of-band)
export interface SendOtpData  { message: string; phone: string; }

// POST /api/auth/verify-otp → data   (RBAC: role + customer)
export interface VerifyOtpData {
  message:  string;
  token:    string;
  role:     'CUSTOMER';
  customer: { id: string; name: string; phone: string };
}

// POST /api/auth/partner-login
export interface PartnerLoginData {
  message: string;
  token:   string;
  role:    'DELIVERY_PARTNER';
  partner: {
    id:            string;
    name:          string;
    phone:         string;
    currentStatus: PartnerStatus;
    serviceZone:   string;
    rating:        number;
  };
}

// POST /api/auth/admin-login → data  (RBAC: role + admin)
// Fixed admin phone 
export interface AdminLoginData {
  message: string;
  token:   string;
  role:    'ADMIN';
  admin:   { id: string; name: string; phone: string };
}

// Stored in AuthContext / localStorage
export interface AuthUser {
  id:    string;
  name:  string;
  phone: string;
  role:  Role;
}

// ── Order ─────────────────────────────────────────────────────────────────────
// POST /api/orders 
export interface CreateOrderData {
  orderId: string;
  status:  OrderStatus;
  amount:  number;
}


export interface Order {
  id:               string;
  customerId:       string;
  customer:         Customer | null;
  partnerId:        string | null;
  cylinderType:     CylinderType;
  quantity:         number;
  deliveryAddress:  string;
  latitude:         number | null;
  longitude:        number | null;
  status:           OrderStatus;
  paymentMethod:    PaymentMethod | null;
  paymentStatus:    PaymentStatus;
  amountDue:        number;
  amountPaid:       number;
  payment:          Payment | null;
  invoice:          InvoiceSummary | null;
  deliveryTracking: DeliveryTracking | null;
  createdAt:        string;
  updatedAt:        string;
}

export interface Customer {
  id:              string;
  name:            string;
  phone:           string;
  address:         string;
  city:            string;
  state:           string;
  customerType:    CustomerType;
  areaType:        AreaType;
  subsidyEligible: boolean;
}

export interface Payment {
  id:                string;
  orderId:           string;
  method:            PaymentMethod;
  status:            PaymentStatus;
  amount:            number;
  transactionId:     string | null;
  retryCount:        number;
  refundStatus:      RefundStatus;
  refundInitiatedAt: string | null;
  refundCompletedAt: string | null;
  createdAt:         string;
  updatedAt:         string;
}

export interface DeliveryTracking {
  id: string;
  orderId: string;
  partnerId: string;
  status: DeliveryStatus;
  createdAt: string;
  updatedAt: string;

  beforePhoto?: string | null;
  afterPhoto?: string | null;
  signaturePhoto?: string | null;
}
// invoice nested on Order (summary, no nested relations)
export interface InvoiceSummary {
  id:             string;
  orderId:        string;
  customerId:     string;
  cylinderPrice:  number;
  deliveryCharge: number;
  subsidy:        number;
  tax:            number;
  totalAmount:    number;
  createdAt:      string;
}

// ── Payments ──────────────────────────────────────────────────────────────────
export interface ProcessPaymentData {
  message:       string;
  orderId:       string;
  paymentId?:    string;
  status:        OrderStatus;
  paymentStatus?: PaymentStatus;
}

export interface CashPaymentData {
  message:       string;
  orderId:       string;
  paymentStatus: PaymentStatus;
  status:        OrderStatus;
}

// ── Delivery ──────────────────────────────────────────────────────────────────
export interface DeliveryActionData {
  message:    string;
  orderId:    string;
  status:     OrderStatus;
  partnerId?: string;
}

// ── Invoice ───────────────────────────────────────────────────────────────────
// POST /api/invoices/generate → data
export interface GenerateInvoiceData {
  message:     string;
  invoiceId:   string;
  orderId:     string;
  totalAmount: number;
}

// GET /api/invoices/:orderId 
export interface Invoice {
  id:             string;
  orderId:        string;
  customerId:     string;
  customer:       Customer;
  order:          Order;

  cylinderPrice:  number;
  deliveryCharge: number;
  subsidy:        number;
  tax:            number;
  totalAmount:    number;
  createdAt:      string;
}

// ── localStorage order cache ──────────────────────────────────────────────────

export interface CachedOrder {
  orderId:         string;
  status:          OrderStatus;
  amount:          number;
  cylinderType:    CylinderType;
  quantity:        number;
  deliveryAddress: string;
  paymentMethod:   PaymentMethod;
  paymentStatus:   PaymentStatus;
  createdAt:       string;
}