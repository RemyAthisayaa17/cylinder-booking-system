import prisma from "../config/db";
import {
  CylinderType,
  CustomerType,
  PaymentMethod,
  OrderStatus,
  AreaType,
  PartnerStatus,
 DeliveryStatus
} from "@prisma/client";


import { AppError } from "../utils/AppError";
import { geocodeAddress } from "../utils/geoCode";
import { releasePartner, assignPendingOrders } from "./assignmentService";

const round2 = (n: number): number => Math.round(n * 100) / 100;


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


  const coords = await geocodeAddress(data.deliveryAddress);

  console.log('[orderService] geocode result for new order:', {
    address: data.deliveryAddress,
    coords,
  });

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
    order.status !== OrderStatus.CONFIRMED &&
    order.status !== OrderStatus.ASSIGNED
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

  if (order.partnerId) {
    await prisma.deliveryTracking.updateMany({
      where: { orderId },
      data: { status: DeliveryStatus.CANCELLED},
    });

    await releasePartner(order.partnerId);

    await prisma.auditLog.create({
      data: {
        orderId,
        action: "PARTNER_RELEASED",
        fromStatus: order.status,
        toStatus: OrderStatus.CANCELLED,
        message: `Partner ${order.partnerId} released due to order cancellation`,
      },
    });

    assignPendingOrders().catch((err) =>
      console.error(
        "[cancelOrder] assignPendingOrders sweep failed:",
        err
      )
    );
  }

  let refundMessage = "";

  if (
    order.paymentMethod === PaymentMethod.UPI &&
    order.paymentStatus === "SUCCESS" &&
    order.payment
  ) {
    refundMessage =
      "Refund will be processed within 24-48 hours";

    const now = new Date();
    
  //  const refundEligibleAt = new Date(
   //   now.getTime() +48*60* 60 * 1000
    const refundEligibleAt = new Date(
      now.getTime() + 60 * 1000
    );

    console.log("================================");
    console.log("REFUND DEBUG");
    console.log("ORDER:", orderId);
    console.log("NOW:", now.toISOString());
    console.log("ELIGIBLE:", refundEligibleAt.toISOString());
    console.log(
      "DIFF MINUTES:",
      (refundEligibleAt.getTime() - now.getTime()) / (1000 * 60)
    );
    console.log("================================");

    await prisma.payment.update({
      where: { orderId },
      data: {
        refundStatus: "PENDING",
        refundInitiatedAt: now,
        refundEligibleAt,
        refundCompletedAt: null,
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

export const processPendingRefunds = async () => {
  const now = new Date();

  try {
    const pendingRefunds = await prisma.payment.findMany({
      where: {
        refundStatus: "PENDING",
        refundEligibleAt: {
          lte: now,
        },
      },
    });

    if (pendingRefunds.length === 0) {
      return {
        processed: 0,
        results: [],
      };
    }

    const results: Array<{
      paymentId: string;
      orderId: string;
      status: string;
    }> = [];

    for (const payment of pendingRefunds) {
      try {
        const updated = await prisma.payment.updateMany({
          where: {
            id: payment.id,
            refundStatus: "PENDING",
          },
          data: {
            refundStatus: "COMPLETED",
            refundCompletedAt: new Date(),
          },
        });

        if (updated.count === 0) continue;

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
  } catch (err) {
    return {
      processed: 0,
      results: [],
    };
  }
};