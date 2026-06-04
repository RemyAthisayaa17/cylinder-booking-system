import prisma from "../config/db";
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  PartnerStatus,
  DeliveryStatus,
} from "@prisma/client";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────────────────────
// INTERNAL: AUTO-ASSIGN PARTNER
// ─────────────────────────────────────────────────────────────
const autoAssignPartner = async (
  orderId:          string,
  customerAreaType: string
): Promise<{ assigned: boolean; partnerId?: string; partnerName?: string }> => {
  const allAvailable = await prisma.deliveryPartner.findMany({
    where:   { currentStatus: PartnerStatus.AVAILABLE },
    orderBy: { totalDeliveries: "asc" },
  });

  if (allAvailable.length === 0) return { assigned: false };

  const zoneMatched = allAvailable.filter(
    (p) => p.serviceZone === customerAreaType
  );
  const pool    = zoneMatched.length > 0 ? zoneMatched : allAvailable;
  const partner = pool[0];

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data:  { partnerId: partner.id, status: OrderStatus.ASSIGNED },
    }),
    prisma.deliveryPartner.update({
      where: { id: partner.id },
      data: {
        currentStatus:   PartnerStatus.ON_DELIVERY,
        totalDeliveries: { increment: 1 },
      },
    }),
    prisma.deliveryTracking.upsert({
      where:  { orderId },
      update: { partnerId: partner.id, status: DeliveryStatus.ASSIGNED },
      create: { orderId, partnerId: partner.id, status: DeliveryStatus.ASSIGNED },
    }),
    prisma.auditLog.create({
      data: {
        orderId,
        action:     "AUTO_ASSIGN",
        fromStatus: OrderStatus.CONFIRMED,
        toStatus:   OrderStatus.ASSIGNED,
        message:    `[AUTO-ASSIGN] Partner ${partner.name} (${partner.phone}) → Order ${orderId}`,
      },
    }),
  ]);

  return { assigned: true, partnerId: partner.id, partnerName: partner.name };
};


const runPostPaymentOrchestration = async (orderId: string) => {
  const order = await prisma.order.update({
    where:   { id: orderId },
    data:    { status: OrderStatus.CONFIRMED },
    include: { customer: true },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action:     "PAYMENT_SUCCESS",
      fromStatus: OrderStatus.PLACED,
      toStatus:   OrderStatus.CONFIRMED,
      message:    "Payment successful. Order confirmed.",
    },
  });

  const assignment = await autoAssignPartner(
    orderId,
    String(order.customer.areaType)
  );

  return { ...assignment };
};


const handleUpiPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    return {
      message:       "Already paid",
      orderId:       order.id,
      status:        order.status,
      paymentStatus: order.paymentStatus,
    };
  }

  // ── MOCK GATEWAY: succeeds ~85% of the time, fails ~15% ──
 //const paymentSuccess = Math.random() < 0.85;
 const paymentSuccess = false;

  if (!paymentSuccess) {
    await prisma.payment.upsert({
      where:  { orderId },
      update: { status: PaymentStatus.FAILED, method: PaymentMethod.UPI },
      create: {
        orderId,
        amount:        order.amountDue,
        method:        PaymentMethod.UPI,
        status:        PaymentStatus.FAILED,
        transactionId: `TXN_FAIL_${Date.now()}`,
        retryCount:    0,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data:  { paymentStatus: PaymentStatus.FAILED },
    });

    throw new AppError("UPI Payment failed. Please retry.", 400);
  }

  const payment = await prisma.payment.upsert({
    where:  { orderId },
    update: { status: PaymentStatus.SUCCESS, method: PaymentMethod.UPI },
    create: {
      orderId,
      amount:        order.amountDue,
      method:        PaymentMethod.UPI,
      status:        PaymentStatus.SUCCESS,
      transactionId: `TXN_${Date.now()}`,
      retryCount:    0,
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.SUCCESS,
      amountPaid:    order.amountDue,
      paymentMethod: PaymentMethod.UPI,
    },
  });

  // CONFIRMED → partner assigned; invoice deferred to delivery
  await runPostPaymentOrchestration(orderId);

  const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });

  return {
    message:       "UPI payment successful. Invoice will be generated on delivery.",
    orderId,
    paymentId:     payment.id,
    status:        finalOrder?.status        ?? OrderStatus.CONFIRMED,
    paymentStatus: finalOrder?.paymentStatus ?? PaymentStatus.SUCCESS,
  };
};


const handleCashPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    return {
      message:       "Payment already completed",
      orderId:       order.id,
      paymentStatus: order.paymentStatus,
      status:        order.status,
    };
  }

  await prisma.payment.upsert({
    where:  { orderId },
    update: { method: PaymentMethod.CASH, status: PaymentStatus.PENDING },
    create: {
      orderId,
      amount:        order.amountDue,
      method:        PaymentMethod.CASH,
      status:        PaymentStatus.PENDING,
      transactionId: `CASH_${Date.now()}`,
      retryCount:    0,
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: PaymentMethod.CASH,
    },
  });

  const updatedOrder = await prisma.order.update({
    where:   { id: orderId },
    data:    { status: OrderStatus.CONFIRMED },
    include: { customer: true },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action:     "CASH_INTENT",
      fromStatus: OrderStatus.PLACED,
      toStatus:   OrderStatus.CONFIRMED,
      message:    "Cash payment selected. Collect on delivery.",
    },
  });

  await autoAssignPartner(orderId, String(updatedOrder.customer.areaType));

  const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });

  return {
    message:       "Cash payment selected. Amount will be collected on delivery.",
    orderId,
    paymentStatus: finalOrder?.paymentStatus ?? PaymentStatus.PENDING,
    status:        finalOrder?.status        ?? OrderStatus.CONFIRMED,
  };
};

// ─────────────────────────────────────────────────────────────
// PUBLIC: processPayment
// ─────────────────────────────────────────────────────────────
export const processPayment = async (data: {
  orderId: string;
  method:  PaymentMethod;
}) => {
  const order = await prisma.order.findUnique({
    where:   { id: data.orderId },
    include: { payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
    throw new AppError("Order is already completed or cancelled", 409);
  }

if (
  data.method === PaymentMethod.UPI &&
  order.paymentStatus === PaymentStatus.SUCCESS
) {
  throw new AppError("Payment already completed", 409);
}

if (
  data.method === PaymentMethod.UPI &&
  order.payment &&
  order.payment.retryCount >= 3
) {
  throw new AppError(
    "Maximum retry limit reached. Please pay using Cash On Delivery.",
    409
  );
}
  if (data.method === PaymentMethod.CASH) {
    return handleCashPayment(data.orderId);
  }

  return handleUpiPayment(data.orderId);
};

// ─────────────────────────────────────────────────────────────
// PUBLIC: retryPayment — UPI only, max 3 retries
// ─────────────────────────────────────────────────────────────
export const retryPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { payment: true },
  });

  if (!order)         throw new AppError("Order not found", 404);
  if (!order.payment) throw new AppError("No payment record found", 404);
if (order.payment.retryCount >= 3) {
  throw new AppError(
    "Maximum retry limit reached. Please pay using Cash On Delivery.",
    409
  );
}
  await prisma.payment.update({
    where: { orderId },
    data:  { retryCount: { increment: 1 } },
  });

  return handleUpiPayment(orderId);
};