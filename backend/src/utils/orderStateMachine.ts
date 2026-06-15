import { OrderStatus as PrismaOrderStatus } from "@prisma/client";
import { AppError } from "./AppError";


export type OrderStatus = PrismaOrderStatus;

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["CONFIRMED", "CANCELLED"],

  CONFIRMED: ["ASSIGNED", "CANCELLED"],

  ASSIGNED: ["OUT_FOR_DELIVERY", "CANCELLED"],

  OUT_FOR_DELIVERY: ["DELIVERED"],

  DELIVERED: [],

  CANCELLED: []
};


export const canTransition = (
  from: OrderStatus,
  to: OrderStatus
): boolean => {
  const allowed = allowedTransitions[from];

  if (!allowed) return false;

  return allowed.includes(to);
};


export const validateTransition = (
  from: OrderStatus,
  to: OrderStatus
): void => {
  if (!canTransition(from, to)) {
    throw new AppError(
      `Invalid status transition: ${from} → ${to}`,
      409
    );
  }
};
