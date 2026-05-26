
import prisma from "../config/db";
import { OrderStatus } from "@prisma/client";
import { validateTransition } from "../utils/orderStateMachine";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────────────────────
// UPDATE ORDER STATUS (state-machine enforced)
// ─────────────────────────────────────────────────────────────
export const updateOrderStatus = async (
  orderId:   string,
  newStatus: OrderStatus
) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found", 404);

  validateTransition(order.status, newStatus);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data:  { status: newStatus },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action:     "STATUS_CHANGE",
      fromStatus: order.status,
      toStatus:   newStatus,
      message:    `${order.status} → ${newStatus}`,
    },
  });

  return updated;
};

// ─────────────────────────────────────────────────────────────
// START DELIVERY  (ASSIGNED → OUT_FOR_DELIVERY)
// ─────────────────────────────────────────────────────────────
export const startDelivery = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== OrderStatus.ASSIGNED) {
    throw new AppError("Order must be ASSIGNED to start delivery", 409);
  }

  return updateOrderStatus(orderId, OrderStatus.OUT_FOR_DELIVERY);
};

// ─────────────────────────────────────────────────────────────
// COMPLETE DELIVERY  (OUT_FOR_DELIVERY → DELIVERED)

// ─────────────────────────────────────────────────────────────
export const completeDelivery = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found", 404);

  return updateOrderStatus(orderId, OrderStatus.DELIVERED);
};

// ─────────────────────────────────────────────────────────────
// MANUAL ASSIGN (admin override)
// ─────────────────────────────────────────────────────────────
export const assignOrderToDeliveryPartner = async (
  orderId:   string,
  partnerId: string
) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found", 404);

  if (order.partnerId) throw new AppError("Partner already assigned", 409);

  await prisma.order.update({
    where: { id: orderId },
    data:  { partnerId },
  });

  return updateOrderStatus(orderId, OrderStatus.ASSIGNED);
};