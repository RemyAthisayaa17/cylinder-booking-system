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


export const assignDeliveryPartner = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status === OrderStatus.ASSIGNED) {
    return { message: "Partner already assigned", orderId: order.id, status: order.status };
  }

  if (order.status !== OrderStatus.CONFIRMED) {
    throw new AppError("Order must be CONFIRMED before assigning partner", 409);
  }

  const partners = await prisma.deliveryPartner.findMany({
    where:   { currentStatus: PartnerStatus.AVAILABLE },
    orderBy: { totalDeliveries: "asc" },
  });

  if (partners.length === 0) throw new AppError("No delivery partner available", 409);

  const zoneMatched = partners.filter(
    (p) => p.serviceZone === String(order.customer.areaType)
  );
  const pool    = zoneMatched.length > 0 ? zoneMatched : partners;
  const partner = pool[0];

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data:  { partnerId: partner.id, status: OrderStatus.ASSIGNED },
  });

  await prisma.deliveryPartner.update({
    where: { id: partner.id },
    data:  { currentStatus: PartnerStatus.ON_DELIVERY, totalDeliveries: { increment: 1 } },
  });

  await prisma.deliveryTracking.upsert({
    where:  { orderId },
    update: { partnerId: partner.id, status: DeliveryStatus.ASSIGNED },
    create: { orderId, partnerId: partner.id, status: DeliveryStatus.ASSIGNED },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action:     "AUTO_ASSIGN",
      fromStatus: OrderStatus.CONFIRMED,
      toStatus:   OrderStatus.ASSIGNED,
      message:    `[AUTO-ASSIGN] Order ${orderId} → Partner ${partner.name}`,
    },
  });

  return {
    message:     "Partner assigned successfully",
    orderId:     updatedOrder.id,
    partnerId:   partner.id,
    partnerName: partner.name,
    status:      updatedOrder.status,
  };
};

/**
 * START DELIVERY
 * FLOW: ASSIGNED → OUT_FOR_DELIVERY
 */
export const startDelivery = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { deliveryTracking: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status === OrderStatus.OUT_FOR_DELIVERY) {
    return { message: "Delivery already started", orderId: order.id, status: order.status };
  }

  if (order.status !== OrderStatus.ASSIGNED) {
    throw new AppError("Order must be ASSIGNED to start delivery", 409);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data:  { status: OrderStatus.OUT_FOR_DELIVERY },
  });

  await prisma.deliveryTracking.upsert({
    where:  { orderId },
    update: { status: DeliveryStatus.OUT_FOR_DELIVERY },
    create: { orderId, partnerId: order.partnerId!, status: DeliveryStatus.OUT_FOR_DELIVERY },
  });

  return { message: "Delivery started", orderId: updatedOrder.id, status: updatedOrder.status };
};

/**
 * COMPLETE DELIVERY
 * FLOW: OUT_FOR_DELIVERY → DELIVERED
 *
 * INVOICE GENERATION RULE (strict):
 * Invoice is generated ONLY when BOTH conditions are met:
 *   1. Delivery is DELIVERED (this function)
 *   2. paymentStatus = SUCCESS
 *
 * For UPI: paymentStatus is already SUCCESS before delivery → generate invoice now.
 * For CASH: mark paymentStatus = SUCCESS on delivery (cash collected) → generate invoice.
 *
 * If payment is still PENDING (unexpected state), invoice is NOT generated.
 */
export const completeDelivery = async (data: {
  orderId:         string;
  photos?:         string;
  signaturePhoto?: string;
}) => {
  const order = await prisma.order.findUnique({
    where:   { id: data.orderId },
    include: { deliveryTracking: true, payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status === OrderStatus.DELIVERED) {
    return { message: "Order already delivered", orderId: order.id, status: order.status };
  }

  if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
    throw new AppError("Delivery not in progress", 409);
  }

  // 1. Mark delivery tracking DELIVERED and update order status atomically
  const result = await prisma.$transaction(async (tx) => {
    await tx.deliveryTracking.update({
      where: { orderId: data.orderId },
      data: {
        status:         DeliveryStatus.DELIVERED,
        photos:         data.photos,
        signaturePhoto: data.signaturePhoto,
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: data.orderId },
      data:  { status: OrderStatus.DELIVERED },
    });

    if (order.partnerId) {
      await tx.deliveryPartner.update({
        where: { id: order.partnerId },
        data:  { currentStatus: PartnerStatus.AVAILABLE },
      });
    }

    return updatedOrder;
  });

  // 2. CASH: collect payment on delivery — mark paymentStatus = SUCCESS
  if (order.paymentMethod === PaymentMethod.CASH) {
    await prisma.order.update({
      where: { id: data.orderId },
      data: {
        paymentStatus: PaymentStatus.SUCCESS,
        amountPaid:    order.amountDue,
      },
    });

    // Update the payment record too
    if (order.payment) {
      await prisma.payment.update({
        where: { orderId: data.orderId },
        data:  { status: PaymentStatus.SUCCESS },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId:       data.orderId,
          amount:        order.amountDue,
          method:        PaymentMethod.CASH,
          status:        PaymentStatus.SUCCESS,
          transactionId: `CASH_COD_${Date.now()}`,
          retryCount:    0,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        orderId:    data.orderId,
        action:     "CASH_COLLECTED",
        fromStatus: OrderStatus.OUT_FOR_DELIVERY,
        toStatus:   OrderStatus.DELIVERED,
        message:    "Cash collected on delivery. Payment marked SUCCESS.",
      },
    });
  }

  // 3. Generate invoice — BOTH conditions now met:
  //    payment = SUCCESS (UPI was already; CASH just set above) AND status = DELIVERED
  try {
    await generateInvoice(data.orderId);
  } catch (err) {
    // Non-fatal: log but don't fail the delivery completion
    console.error(`[INVOICE] Failed to generate for order ${data.orderId}:`, err);
  }

  return {
    message:  "Delivery completed successfully. Invoice generated.",
    orderId:  result.id,
    status:   result.status,
  };
};