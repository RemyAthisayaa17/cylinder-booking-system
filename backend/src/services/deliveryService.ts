import prisma from "../config/db";
import {
  OrderStatus,
  DeliveryStatus,
  PartnerStatus,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";
import { AppError } from "../utils/AppError";
import { generateInvoice } from "./invoiceService";
import { sendArrivalSMS } from "./smsService";

/**
 * ASSIGN DELIVERY PARTNER
 */
export const assignDeliveryPartner = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status === OrderStatus.ASSIGNED) {
    return { message: "Partner already assigned", orderId, status: order.status };
  }

  if (order.status !== OrderStatus.CONFIRMED) {
    throw new AppError("Order must be CONFIRMED before assigning partner", 409);
  }

  const partners = await prisma.deliveryPartner.findMany({
    where: { currentStatus: PartnerStatus.AVAILABLE },
    orderBy: { totalDeliveries: "asc" },
  });

  if (partners.length === 0) {
    throw new AppError("No delivery partner available", 409);
  }

  const zoneMatched = partners.filter(
    (p) => p.serviceZone === String(order.customer.areaType)
  );

  const pool = zoneMatched.length > 0 ? zoneMatched : partners;
  const partner = pool[0];

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      partnerId: partner.id,
      status: OrderStatus.ASSIGNED,
    },
  });

  await prisma.deliveryPartner.update({
    where: { id: partner.id },
    data: {
      currentStatus: PartnerStatus.ON_DELIVERY,
      totalDeliveries: { increment: 1 },
    },
  });

  await prisma.deliveryTracking.upsert({
    where: { orderId },
    update: { partnerId: partner.id, status: DeliveryStatus.ASSIGNED },
    create: { orderId, partnerId: partner.id, status: DeliveryStatus.ASSIGNED },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "AUTO_ASSIGN",
      fromStatus: OrderStatus.CONFIRMED,
      toStatus: OrderStatus.ASSIGNED,
      message: `[AUTO-ASSIGN] ${partner.name} assigned`,
    },
  });

  return {
    message: "Partner assigned successfully",
    orderId,
    partnerId: partner.id,
    partnerName: partner.name,
    status: updatedOrder.status,
  };
};

/**
 * START DELIVERY
 */
export const startDelivery = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== OrderStatus.ASSIGNED) {
    throw new AppError("Order must be ASSIGNED to start delivery", 409);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.OUT_FOR_DELIVERY },
  });

  await prisma.deliveryTracking.upsert({
    where: { orderId },
    update: { status: DeliveryStatus.OUT_FOR_DELIVERY },
    create: {
      orderId,
      partnerId: order.partnerId!,
      status: DeliveryStatus.OUT_FOR_DELIVERY,
    },
  });

  return {
    message: "Delivery started",
    orderId,
    status: updatedOrder.status,
  };
};

/**
 * MARK PARTNER ARRIVED + SMS
 */
export const markPartnerArrived = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
    throw new AppError("Order is not out for delivery", 409);
  }

  const smsResult = await sendArrivalSMS(order.customer.phone, order.id);

  return {
    orderId,
    smsMode: smsResult.mode,
    message: "Arrival notification sent successfully",
  };
};

/**
 * COMPLETE DELIVERY (UPLOAD PROOF → DELIVERED + INVOICE GENERATION)
 */
export const completeDelivery = async (data: {
  orderId: string;
  beforePhoto: string;
  afterPhoto: string;
  signaturePhoto: string;
}) => {
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status === OrderStatus.DELIVERED) {
    return { message: "Already delivered", orderId: order.id };
  }

  if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
    throw new AppError("Delivery not in progress", 409);
  }

  if (!data.beforePhoto || !data.afterPhoto || !data.signaturePhoto) {
    throw new AppError("All delivery proof photos are required", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.deliveryTracking.update({
      where: { orderId: data.orderId },
      data: {
        status: DeliveryStatus.DELIVERED,
        beforePhoto: data.beforePhoto,
        afterPhoto: data.afterPhoto,
        signaturePhoto: data.signaturePhoto,
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: data.orderId },
      data: { status: OrderStatus.DELIVERED },
    });

    if (order.partnerId) {
      await tx.deliveryPartner.update({
        where: { id: order.partnerId },
        data: { currentStatus: PartnerStatus.AVAILABLE },
      });
    }

    return updatedOrder;
  });

  // 🔥 INVOICE GENERATION (FIXED MISSING PART)
  try {
    await generateInvoice(result.id);
  } catch (err) {
    console.log("INVOICE GENERATION FAILED:", err);
  }

  return {
    message: "Proof uploaded. Delivery marked completed.",
    orderId: result.id,
    status: result.status,
  };
};

/**
 * COLLECT CASH PAYMENT (AFTER DELIVERY ONLY)
 */
export const collectCashPayment = async (
  orderId: string,
  partnerId: string
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentMethod !== PaymentMethod.CASH) {
    throw new AppError("Not a cash order", 400);
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new AppError(
      "Upload delivery proof before collecting cash",
      409
    );
  }

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    return {
      message: "Already collected",
      orderId,
    };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.SUCCESS,
      amountPaid: order.amountDue,
    },
  });

  await prisma.payment.upsert({
    where: { orderId },
    update: { status: PaymentStatus.SUCCESS },
    create: {
      orderId,
      amount: order.amountDue,
      method: PaymentMethod.CASH,
      status: PaymentStatus.SUCCESS,
      transactionId: `CASH_${Date.now()}`,
      retryCount: 0,
    },
  });
await prisma.auditLog.create({
  data: {
    orderId,
    action: "CASH_COLLECTED",
    fromStatus: OrderStatus.DELIVERED,
    toStatus: OrderStatus.DELIVERED,
    message: `Cash collected by ${partnerId}`,
  },
});

try {
  await generateInvoice(orderId);
} catch (err) {
  console.error("INVOICE GENERATION FAILED:", err);
}

  return {
    message: "Cash collected successfully",
    orderId,
    collectedBy: partnerId,
  };
};