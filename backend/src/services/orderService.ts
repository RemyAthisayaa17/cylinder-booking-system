import prisma from "../config/db";
import { CylinderType, CustomerType, PaymentMethod, OrderStatus, AreaType } from "@prisma/client";
import { AppError } from "../utils/AppError";

const round2 = (n: number): number => Math.round(n * 100) / 100;

// ─────────────────────────────────────────────────────────────
// CUSTOMER TYPE ↔ CYLINDER TYPE VALIDATION
// ─────────────────────────────────────────────────────────────
const validateCylinderTypeForCustomer = (
  customerType: CustomerType,
  cylinderType: CylinderType
): void => {
  if (customerType === "DOMESTIC" && cylinderType !== CylinderType.KG_14_2) {
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
  if (!customer) throw new AppError("Customer not found", 404);

  const lastDelivered = await prisma.order.findFirst({
    where: { customerId, status: OrderStatus.DELIVERED },
    orderBy: { updatedAt: "desc" },
  });

  if (!lastDelivered) return;

  const requiredDays = customer.areaType === AreaType.URBAN ? 25 : 45;

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

  if (!customer) throw new AppError("Customer not found", 404);

  validateCylinderTypeForCustomer(customer.customerType, data.cylinderType);

  if (customer.customerType === "DOMESTIC") {
    await validateDomesticBookingEligibility(customer.id);
  }

  const pricing = await prisma.pricing.findFirst({
    where: {
      cylinderType: data.cylinderType,
      region: customer.areaType,
    },
    orderBy: { effectiveDate: "desc" },
  });

  if (!pricing) throw new AppError("Pricing not found", 404);

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

  if (!order) throw new AppError("Order not found", 404);

  return order;
};

// ─────────────────────────────────────────────────────────────
// CUSTOMER ORDERS
// ─────────────────────────────────────────────────────────────
export const getOrdersByCustomer = async (customerId: string) => {
  return prisma.order.findMany({
    where: { customerId },
    include: { invoice: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });
};

// ─────────────────────────────────────────────────────────────
// ELIGIBILITY CHECK
// ─────────────────────────────────────────────────────────────
export const checkCustomerEligibility = async (customerId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new AppError("Customer not found", 404);

  if (customer.customerType === "COMMERCIAL") {
    return {
      eligible: true,
      message: "Commercial customers can order anytime",
    };
  }

  const lastDelivered = await prisma.order.findFirst({
    where: { customerId, status: OrderStatus.DELIVERED },
    orderBy: { updatedAt: "desc" },
  });

  if (!lastDelivered) {
    return { eligible: true, message: "Eligible to place a new order" };
  }

  const requiredDays = customer.areaType === AreaType.URBAN ? 25 : 45;

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

  return { eligible: true, message: "Eligible to place a new order" };
};

// ─────────────────────────────────────────────────────────────
// CANCEL ORDER
// ─────────────────────────────────────────────────────────────
export const cancelOrder = async (
  orderId: string,
  customerId: string
) => {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      payment: true,
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  // ownership check
  if (order.customerId !== customerId) {
    throw new AppError("Unauthorized", 403);
  }

  // PRD RULE
  if (
    order.status !== OrderStatus.PLACED &&
    order.status !== OrderStatus.CONFIRMED
  ) {
    throw new AppError(
      "Order cannot be cancelled after dispatch",
      409
    );
  }

  // cancel order
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.CANCELLED,
    },
  });

  // refund lifecycle for UPI paid orders
  let refundMessage = "";

  if (
    order.paymentMethod === PaymentMethod.UPI &&
    order.paymentStatus === "SUCCESS" &&
    order.payment
  ) {
    refundMessage = "Refund will be processed within 24-48 hours";

    // set refundStatus = PENDING and stamp refundInitiatedAt
    await prisma.payment.update({
      where: { orderId },
      data: {
        refundStatus:      "PENDING",
        refundInitiatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        orderId,
        action:     "REFUND_INITIATED",
        fromStatus: "SUCCESS",
        toStatus:   "REFUND_PENDING",
        message:    refundMessage,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      orderId,
      action:     "ORDER_CANCELLED",
      fromStatus: order.status,
      toStatus:   OrderStatus.CANCELLED,
      message:    refundMessage || "Order cancelled successfully",
    },
  });

  return {
    orderId,
    status:        OrderStatus.CANCELLED,
    refundMessage,
  };
};