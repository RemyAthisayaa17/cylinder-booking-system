import prisma from "../config/db";
import {
  OrderStatus,
  DeliveryStatus,
  PartnerStatus,
} from "@prisma/client";
import { AppError } from "../utils/AppError";
import { generateInvoice } from "./invoiceService";
import { sendArrivalSMS } from "./smsService";
import { assignBestPartner, assignPendingOrders } from "./assignmentService";


export const assignDeliveryPartner = async (orderId: string) => {
  return assignBestPartner(orderId);
};


export const startDelivery = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { deliveryTracking: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== OrderStatus.ASSIGNED) {
    throw new AppError("Order must be ASSIGNED before starting delivery", 409);
  }

  const partnerId = order.deliveryTracking?.partnerId ?? order.partnerId ?? "";

  if (!partnerId) {
    throw new AppError("No partner assigned to this order", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.OUT_FOR_DELIVERY },
    });

    await tx.deliveryTracking.upsert({
      where: { orderId },
      update: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      create: {
        orderId,
        partnerId,
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
    });

    await tx.auditLog.create({
      data: {
        orderId,
        action: "DELIVERY_STARTED",
        fromStatus: OrderStatus.ASSIGNED,
        toStatus: OrderStatus.OUT_FOR_DELIVERY,
        message: "Partner started delivery",
      },
    });

    return updatedOrder;
  });

  return {
    message: "Delivery started",
    orderId: result.id,
    status: result.status,
  };
};


export const completeDelivery = async (data: {
  orderId: string;
  beforePhoto: string;
  afterPhoto: string;
  signaturePhoto: string;
}) => {
  if (
    !data.beforePhoto?.trim() ||
    !data.afterPhoto?.trim() ||
    !data.signaturePhoto?.trim()
  ) {
    throw new AppError("All delivery proof photos are required", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { deliveryTracking: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status === OrderStatus.DELIVERED) {
    await ensureInvoiceExists(order.id);
    return {
      message: "Already delivered",
      orderId: order.id,
      status: order.status,
    };
  }

  if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
    throw new AppError("Delivery not in progress", 409);
  }

  const trackingPartnerId =
    order.deliveryTracking?.partnerId ?? order.partnerId ?? "";

  if (!trackingPartnerId) {
    throw new AppError("No partner assigned to this order", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.deliveryTracking.upsert({
      where: { orderId: data.orderId },
      update: {
        status: DeliveryStatus.DELIVERED,
        beforePhoto: data.beforePhoto,
        afterPhoto: data.afterPhoto,
        signaturePhoto: data.signaturePhoto,
      },
      create: {
        orderId: data.orderId,
        partnerId: trackingPartnerId,
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

    await tx.auditLog.create({
      data: {
        orderId: data.orderId,
        action: "DELIVERY_COMPLETED",
        fromStatus: OrderStatus.OUT_FOR_DELIVERY,
        toStatus: OrderStatus.DELIVERED,
        message: "Delivery completed with proof photos uploaded",
      },
    });

    return updatedOrder;
  });

  // BUG #1 FIX: Partner is now AVAILABLE — sweep pending CONFIRMED orders.
  assignPendingOrders().catch((err) =>
    console.error(
      "[completeDelivery] assignPendingOrders sweep failed:",
      err
    )
  );

  await ensureInvoiceExists(result.id);

  return {
    message: "Delivery completed successfully",
    orderId: result.id,
    status: result.status,
  };
};


const ensureInvoiceExists = async (orderId: string): Promise<void> => {
  try {
    await generateInvoice(orderId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("already exists") ||
      message.includes("already generated")
    ) {
      return;
    }
    console.error(
      `[INVOICE] Failed to generate invoice for order ${orderId}:`,
      message
    );
  }
};


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