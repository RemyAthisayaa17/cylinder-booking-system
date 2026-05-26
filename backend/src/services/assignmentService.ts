import prisma from "../config/db";
import { PartnerStatus, OrderStatus } from "@prisma/client";
import { AppError } from "../utils/AppError";

/**
 * AUTO ASSIGN BEST DELIVERY PARTNER
 */
export const assignBestPartner = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true }
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.status !== OrderStatus.CONFIRMED) {
    throw new AppError(
      "Order must be CONFIRMED before assignment",
      409
    );
  }

  /**
   * STEP 1: FIND AVAILABLE PARTNERS
   */
  const partners = await prisma.deliveryPartner.findMany({
    where: {
      currentStatus: PartnerStatus.AVAILABLE,
      serviceZone: order.customer.city
    },
    orderBy: [
      { rating: "desc" },
      { totalDeliveries: "asc" }
    ]
  });

  if (!partners.length) {
    throw new AppError(
      "No delivery partner available",
      404
    );
  }

  /**
   * STEP 2: PICK BEST MATCH
   */
  const selectedPartner = partners[0];

  /**
   * STEP 3: ASSIGN TO ORDER
   */
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      partnerId: selectedPartner.id,
      status: OrderStatus.ASSIGNED
    }
  });

  /**
   * STEP 4: UPDATE PARTNER STATUS
   */
  await prisma.deliveryPartner.update({
    where: { id: selectedPartner.id },
    data: {
      currentStatus: PartnerStatus.ON_DELIVERY,
      totalDeliveries: {
        increment: 1
      }
    }
  });

  return {
    message: "Partner assigned successfully",
    orderId: updatedOrder.id,
    partner: {
      id: selectedPartner.id,
      name: selectedPartner.name,
      phone: selectedPartner.phone
    },
    status: updatedOrder.status
  };
};

/**
 * MANUAL REASSIGN (FALLBACK)
 */
export const reassignPartner = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  // reset old partner if exists
  if (order.partnerId) {
    await prisma.deliveryPartner.update({
      where: { id: order.partnerId },
      data: {
        currentStatus: PartnerStatus.AVAILABLE
      }
    });
  }

  return assignBestPartner(orderId);
};