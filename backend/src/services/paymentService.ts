import prisma from "../config/db";
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  PartnerStatus,
  DeliveryStatus,
} from "@prisma/client";
import { generateInvoice } from "./invoiceService";
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

// ─────────────────────────────────────────────────────────────
// INTERNAL: POST-PAYMENT ORCHESTRATION (UPI only)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// INTERNAL: UPI PAYMENT (unchanged)
// ─────────────────────────────────────────────────────────────
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

  // MOCK GATEWAY: always fails for testing retry flow
  const paymentSuccess = Math.random() < 0.85;
  //const paymentSuccess = false;

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

// ─────────────────────────────────────────────────────────────
// INTERNAL: CASH PAYMENT
// Records COD intent, confirms order, assigns partner.
// paymentStatus stays PENDING — settled at delivery stage.
// ─────────────────────────────────────────────────────────────
const handleCashPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    return {
      message:       "Payment already completed",
      orderId:       order.id,
      paymentStatus: order.paymentStatus,
      status:        order.status,
    };
  }

  // Step 1: record cash intent — payment stays PENDING, amountPaid stays 0
  await prisma.payment.upsert({
    where:  { orderId },
    update: {
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
    },
    create: {
      orderId,
      amount:        order.amountDue,
      method:        PaymentMethod.CASH,
      status:        PaymentStatus.PENDING,
      transactionId: `CASH_COD_${Date.now()}`,
      retryCount:    0,
    },
  });

  // Step 2: set paymentMethod on order, keep paymentStatus PENDING, amountPaid = 0
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PENDING,
      amountPaid:    0,
    },
  });

  // Step 3: confirm order (PLACED → CONFIRMED)
  const confirmedOrder = await prisma.order.update({
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
      message:    "Cash on delivery selected. Order confirmed. Awaiting partner assignment.",
    },
  });

  // Step 4: assign partner → order moves CONFIRMED → ASSIGNED
  const assignment = await autoAssignPartner(
    orderId,
    String(confirmedOrder.customer.areaType)
  );

  const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });

  return {
    message:       "Cash on delivery selected. Delivery partner assigned.",
    orderId,
    paymentStatus: PaymentStatus.PENDING,
    status:        finalOrder?.status ?? OrderStatus.ASSIGNED,
    cashOnDelivery: true,
    ...assignment,
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

  if (
    order.status === OrderStatus.DELIVERED ||
    order.status === OrderStatus.CANCELLED
  ) {
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
// PUBLIC: retryPayment — UPI only, max 3 retries (unchanged)
// ─────────────────────────────────────────────────────────────
export const retryPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (
    order.status === OrderStatus.DELIVERED ||
    order.status === OrderStatus.CANCELLED
  ) {
    throw new AppError("Order is already completed or cancelled", 409);
  }

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    throw new AppError("Payment already completed", 409);
  }

  let payment = order.payment;

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        amount:        order.amountDue,
        method:        PaymentMethod.UPI,
        status:        PaymentStatus.FAILED,
        transactionId: `TXN_INIT_${Date.now()}`,
        retryCount:    0,
      },
    });
  }

  if (payment.retryCount >= 3) {
    throw new AppError(
      "Maximum retry limit reached. Please pay using Cash On Delivery.",
      409
    );
  }

  const updatedPayment = await prisma.payment.update({
    where: { orderId },
    data:  { retryCount: { increment: 1 } },
  });

  try {
    const result = await handleUpiPayment(orderId);
    return {
      ...result,
      retryCount: updatedPayment.retryCount,
    };
  } catch (err: any) {
    const latestPayment = await prisma.payment.findUnique({ where: { orderId } });
    const currentRetryCount = latestPayment?.retryCount ?? updatedPayment.retryCount;

    if (currentRetryCount >= 3) {
      throw new AppError(
        "Maximum retry limit reached. Please pay using Cash On Delivery.",
        409
      );
    }

    throw err;
  }
};

// ─────────────────────────────────────────────────────────────
// PUBLIC: collectCashPayment — delivery partner confirms cash collected
// Can ONLY be called when order.status === DELIVERED
// ─────────────────────────────────────────────────────────────
export const collectCashPayment = async (
  orderId:   string,
  partnerId: string
) => {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentMethod !== PaymentMethod.CASH) {
    throw new AppError("Order is not a cash payment", 400);
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new AppError(
      "Cash can only be collected after delivery is completed",
      409
    );
  }

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    return {
      message:       "Cash already collected",
      orderId:       order.id,
      paymentStatus: order.paymentStatus,
    };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.SUCCESS,
      amountPaid:    order.amountDue,
    },
  });

  await prisma.payment.upsert({
    where:  { orderId },
    update: {
      status:        PaymentStatus.SUCCESS,
      transactionId: `CASH_COLLECTED_${partnerId}_${Date.now()}`,
    },
    create: {
      orderId,
      amount:        order.amountDue,
      method:        PaymentMethod.CASH,
      status:        PaymentStatus.SUCCESS,
      transactionId: `CASH_COLLECTED_${partnerId}_${Date.now()}`,
      retryCount:    0,
    },
  });

 await prisma.auditLog.create({
  data: {
    orderId,
    action: "CASH_COLLECTED",
    fromStatus: OrderStatus.DELIVERED,
    toStatus: OrderStatus.DELIVERED,
    message: `Cash ₹${order.amountDue} collected by partner ${partnerId}.`,
  },
});

try {
  await generateInvoice(orderId);
} catch (error) {
  console.error("INVOICE GENERATION FAILED:", error);
}

return {
  message: "Cash payment collected successfully.",
  orderId,
  paymentStatus: PaymentStatus.SUCCESS,
  collectedBy: partnerId,
  collectedAt: new Date().toISOString(),
};
};