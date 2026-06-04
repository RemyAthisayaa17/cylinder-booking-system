// src/services/orderService.ts
import prisma from "../config/db";
import {
  CylinderType,
  CustomerType,
  PaymentMethod,
  OrderStatus,
  AreaType,
} from "@prisma/client";

import { AppError } from "../utils/AppError";
import { geocodeAddress } from "../utils/geoCode";

const round2 = (n: number): number =>
  Math.round(n * 100) / 100;

// ─────────────────────────────────────────────────────────────
// CUSTOMER TYPE ↔ CYLINDER TYPE VALIDATION
// ─────────────────────────────────────────────────────────────
const validateCylinderTypeForCustomer = (
  customerType: CustomerType,
  cylinderType: CylinderType
): void => {
  if (
    customerType === "DOMESTIC" &&
    cylinderType !== CylinderType.KG_14_2
  ) {
    throw new AppError(
      "Domestic customers can only order 14.2kg cylinders",
      400
    );
  }

  if (
    customerType === "COMMERCIAL" &&
    cylinderType === CylinderType.KG_14_2
  ) {
    throw new AppError(
      "Commercial customers cannot order domestic cylinders",
      400
    );
  }
};

// ─────────────────────────────────────────────────────────────
// DOMESTIC COOLDOWN CHECK
// ─────────────────────────────────────────────────────────────
const validateDomesticBookingEligibility = async (
  customerId: string
): Promise<void> => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const lastDelivered = await prisma.order.findFirst({
    where: {
      customerId,
      status: OrderStatus.DELIVERED,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!lastDelivered) return;

  const requiredDays =
    customer.areaType === AreaType.URBAN ? 25 : 45;

  const daysPassed = Math.floor(
    (Date.now() - new Date(lastDelivered.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysPassed < requiredDays) {
    const nextAllowed = new Date(lastDelivered.updatedAt);
    nextAllowed.setDate(nextAllowed.getDate() + requiredDays);

    const dd = String(nextAllowed.getDate()).padStart(2, "0");
    const mm = String(nextAllowed.getMonth() + 1).padStart(2, "0");
    const yyyy = nextAllowed.getFullYear();

    throw new AppError(
      `Not eligible, try on ${dd}/${mm}/${yyyy}`,
      409
    );
  }
};

// ─────────────────────────────────────────────────────────────
// SUBSIDY
// ─────────────────────────────────────────────────────────────
const calculateSubsidy = (
  customerType: string,
  cylinderType: CylinderType,
  areaType: AreaType,
  subsidyEligible: boolean
): number => {
  if (
    customerType !== "DOMESTIC" ||
    cylinderType !== CylinderType.KG_14_2 ||
    !subsidyEligible
  ) {
    return 0;
  }

  return areaType === AreaType.URBAN ? 100 : 200;
};

// ─────────────────────────────────────────────────────────────
// CREATE ORDER
// ─────────────────────────────────────────────────────────────
export const createOrder = async (data: {
  customerId: string;
  cylinderType: CylinderType;
  quantity: number;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
}) => {
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  validateCylinderTypeForCustomer(
    customer.customerType,
    data.cylinderType
  );

  if (customer.customerType === "DOMESTIC") {
    await validateDomesticBookingEligibility(customer.id);
  }

  const pricing = await prisma.pricing.findFirst({
    where: {
      cylinderType: data.cylinderType,
      region: customer.areaType,
    },
    orderBy: {
      effectiveDate: "desc",
    },
  });

  if (!pricing) {
    throw new AppError("Pricing not found", 404);
  }

  const base = round2(pricing.basePrice * data.quantity);
  const delivery = round2(pricing.deliveryCharge);
  const tax = round2((base * pricing.taxPercentage) / 100);
  const subsidy = calculateSubsidy(
    customer.customerType,
    data.cylinderType,
    customer.areaType,
    customer.subsidyEligible
  );
  const total = round2(base + delivery + tax - subsidy);

  // Geocode delivery address — non-blocking; order creation continues on failure
  const coords = await geocodeAddress(data.deliveryAddress);

  if (!coords) {
    console.warn(
      `[orderService] Geocoding failed for address: ${data.deliveryAddress}`
    );
  }

  const order = await prisma.order.create({
    data: {
      customerId: data.customerId,
      cylinderType: data.cylinderType,
      quantity: data.quantity,
      deliveryAddress: data.deliveryAddress,
      paymentMethod: data.paymentMethod,
      amountDue: total,
      amountPaid: 0,
      status: OrderStatus.PLACED,
      paymentStatus: "PENDING",
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      orderId: order.id,
      action: "ORDER_PLACED",
      fromStatus: null,
      toStatus: OrderStatus.PLACED,
      message: `Order placed by customer ${data.customerId}`,
    },
  });

  if (!coords) {
    await prisma.auditLog.create({
      data: {
        orderId: order.id,
        action: "GEO_FAILED",
        message: "Geocoding failed for delivery address",
      },
    });
  }

  return {
    orderId: order.id,
    status: order.status,
    amount: total,
  };
};

// ─────────────────────────────────────────────────────────────
// GET ORDER
// ─────────────────────────────────────────────────────────────
export const getOrderById = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      payment: true,
      invoice: true,
      deliveryTracking: true,
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

// ─────────────────────────────────────────────────────────────
// CUSTOMER ORDERS
// ─────────────────────────────────────────────────────────────
export const getOrdersByCustomer = async (customerId: string) => {
  return prisma.order.findMany({
    where: { customerId },
    include: {
      invoice: {
        select: { id: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// ─────────────────────────────────────────────────────────────
// ELIGIBILITY CHECK
// ─────────────────────────────────────────────────────────────
export const checkCustomerEligibility = async (customerId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  if (customer.customerType === "COMMERCIAL") {
    return {
      eligible: true,
      message: "Commercial customers can order anytime",
    };
  }

  const lastDelivered = await prisma.order.findFirst({
    where: {
      customerId,
      status: OrderStatus.DELIVERED,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!lastDelivered) {
    return {
      eligible: true,
      message: "Eligible to place a new order",
    };
  }

  const requiredDays =
    customer.areaType === AreaType.URBAN ? 25 : 45;

  const daysPassed = Math.floor(
    (Date.now() - new Date(lastDelivered.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysPassed < requiredDays) {
    const nextAllowed = new Date(lastDelivered.updatedAt);
    nextAllowed.setDate(nextAllowed.getDate() + requiredDays);

    const isoDate = nextAllowed.toISOString().split("T")[0];
    const dd = String(nextAllowed.getDate()).padStart(2, "0");
    const mm = String(nextAllowed.getMonth() + 1).padStart(2, "0");
    const yyyy = nextAllowed.getFullYear();

    return {
      eligible: false,
      nextEligibleDate: isoDate,
      message: `Not eligible, try on ${dd}/${mm}/${yyyy}`,
    };
  }

  return {
    eligible: true,
    message: "Eligible to place a new order",
  };
};

// ─────────────────────────────────────────────────────────────
// CANCEL ORDER
// ─────────────────────────────────────────────────────────────
export const cancelOrder = async (
  orderId: string,
  customerId: string
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.customerId !== customerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (
    order.status !== OrderStatus.PLACED &&
    order.status !== OrderStatus.CONFIRMED
  ) {
    throw new AppError(
      "Order cannot be cancelled after dispatch",
      409
    );
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED },
  });

  let refundMessage = "";

  if (
    order.paymentMethod === PaymentMethod.UPI &&
    order.paymentStatus === "SUCCESS" &&
    order.payment
  ) {
    refundMessage = "Refund will be processed within 24-48 hours";

    const now = new Date();
    const refundEligibleAt = new Date(now.getTime() + 1 * 60 * 1000);

    await prisma.payment.update({
      where: { orderId },
      data: {
        refundStatus: "PENDING",
        refundInitiatedAt: now,
        refundEligibleAt: refundEligibleAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        orderId,
        action: "REFUND_INITIATED",
        fromStatus: "SUCCESS",
        toStatus: "REFUND_PENDING",
        message: refundMessage,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "ORDER_CANCELLED",
      fromStatus: order.status,
      toStatus: OrderStatus.CANCELLED,
      message: refundMessage || "Order cancelled successfully",
    },
  });

  return {
    orderId,
    status: OrderStatus.CANCELLED,
    refundMessage,
  };
};

// ─────────────────────────────────────────────────────────────
// PROCESS PENDING REFUNDS (called by cron every minute)
// ─────────────────────────────────────────────────────────────
export const processPendingRefunds = async () => {
  const now = new Date();

  // Fetch only payments that are genuinely eligible:
  //   - refundStatus is still PENDING (not yet completed)
  //   - refundEligibleAt has passed
  const pendingRefunds = await prisma.payment.findMany({
    where: {
      refundStatus: "PENDING",
      refundEligibleAt: {
        lte: now,
      },
    },
  });

  console.log("Pending refunds found:", pendingRefunds.length);

  if (pendingRefunds.length === 0) {
    console.log("No refunds to process right now.");
    return { processed: 0, results: [] };
  }

  const results: Array<{
    paymentId: string;
    orderId: string;
    status: string;
  }> = [];

  for (const payment of pendingRefunds) {
    try {
      console.log("Processing refund for:", payment.orderId);
      const updated = await prisma.payment.updateMany({
        where: {
          id: payment.id,
          refundStatus: "PENDING", // atomic check — prevents double-processing
        },
        data: {
          refundStatus: "COMPLETED",
          refundCompletedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        console.log(
          "Refund already processed by another tick, skipping:",
          payment.orderId
        );
        continue;
      }

      await prisma.auditLog.create({
        data: {
          orderId: payment.orderId,
          action: "REFUND_COMPLETED",
          fromStatus: "REFUND_PENDING",
          toStatus: "REFUND_COMPLETED",
          message: `Refund of ₹${payment.amount} processed successfully`,
        },
      });

      results.push({
        paymentId: payment.id,
        orderId: payment.orderId,
        status: "SUCCESS",
      });
    } catch (err) {
      console.error("Refund failed for:", payment.orderId, err);

      results.push({
        paymentId: payment.id,
        orderId: payment.orderId,
        status: "ERROR",
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
};