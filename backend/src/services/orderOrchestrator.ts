import prisma from "../config/db";
import { OrderStatus } from "@prisma/client";
import { validateTransition } from "../utils/orderStateMachine";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────
// SINGLE SOURCE: ORDER STATUS UPDATER ONLY
// ─────────────────────────────────────────────
export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new AppError("Order not found", 404);

  // enforce valid transitions
  validateTransition(order.status, newStatus);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "STATUS_CHANGE",
      fromStatus: order.status,
      toStatus: newStatus,
      message: `${order.status} → ${newStatus}`,
    },
  });

  return updated;
};