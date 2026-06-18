import prisma from "../config/db";
import { PartnerStatus, OrderStatus, DeliveryStatus } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { createPartnerNotification } from "./notificationService";
import { sendPartnerAssignmentEmail } from "../services/emailService";

async function executeAssignment(
  order: any,
  partnerId: string,
  partnerName: string,
  partnerEmail: string
): Promise<void> {
  if (!order) throw new AppError("Order not found", 404);

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        partnerId,
        status: OrderStatus.ASSIGNED,
      },
    }),

    prisma.deliveryPartner.update({
      where: { id: partnerId },
      data: {
        currentStatus: PartnerStatus.ON_DELIVERY,
        totalDeliveries: { increment: 1 },
      },
    }),

    prisma.deliveryTracking.upsert({
      where: { orderId: order.id },
      update: { partnerId, status: DeliveryStatus.ASSIGNED },
      create: {
        orderId: order.id,
        partnerId,
        status: DeliveryStatus.ASSIGNED,
      },
    }),

    prisma.auditLog.create({
      data: {
        orderId: order.id,
        action: "AUTO_ASSIGN",
        fromStatus: OrderStatus.CONFIRMED,
        toStatus: OrderStatus.ASSIGNED,
        message: `[AUTO-ASSIGN] Partner ${partnerName} → Order ${order.id}`,
      },
    }),
  ]);

  // notification
  try {
    await createPartnerNotification(
      partnerId,
      "New Order Assigned",
      `You have been assigned a new order.\n\nOrder ID: #${order.id}\n`
    );
  } catch (err) {
    console.error(`[assignmentService] notification failed:`, err);
  }

  // email to partner
  try {
    await sendPartnerAssignmentEmail(
      partnerEmail,
      partnerName,
      {
        id: order.id,
        customer: {
          name: order.customer.name,
        },
        deliveryAddress: order.deliveryAddress,
        quantity: order.quantity,
      }
    );
  } catch (err) {
    console.error(`[assignmentService] email failed:`, err);
  }
}

export const assignBestPartner = async (
  orderId: string
): Promise<{ assigned: boolean; partnerId?: string; partnerName?: string }> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== OrderStatus.CONFIRMED) {
    throw new AppError("Order must be CONFIRMED before assignment", 409);
  }

  if (order.partnerId) {
    return {
      assigned: true,
      partnerId: order.partnerId,
    };
  }

  const availablePartners = await prisma.deliveryPartner.findMany({
    where: {
      currentStatus: PartnerStatus.AVAILABLE,
      serviceZone: String(order.customer.areaType),
    },
    orderBy: {
      totalDeliveries: "asc",
    },
  });

  if (availablePartners.length === 0) {
    return { assigned: false };
  }

  const partner = availablePartners[0];

  await executeAssignment(
    order,
    partner.id,
    partner.name,
    partner.email
  );

  return {
    assigned: true,
    partnerId: partner.id,
    partnerName: partner.name,
  };
};

export const assignPendingOrders = async (): Promise<{
  processed: number;
  results: Array<{ orderId: string; partnerId: string; partnerName: string }>;
}> => {
  const pendingOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.CONFIRMED,
      partnerId: null,
    },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
  });

  if (pendingOrders.length === 0) {
    return { processed: 0, results: [] };
  }

  const results: Array<{
    orderId: string;
    partnerId: string;
    partnerName: string;
  }> = [];

  for (const order of pendingOrders) {
    const availablePartners = await prisma.deliveryPartner.findMany({
      where: {
        currentStatus: PartnerStatus.AVAILABLE,
        serviceZone: String(order.customer.areaType),
      },
      orderBy: {
        totalDeliveries: "asc",
      },
    });

    if (availablePartners.length === 0) continue;

    const partner = availablePartners[0];

    try {
      await executeAssignment(
        order,
        partner.id,
        partner.name,
        partner.email
      );

      results.push({
        orderId: order.id,
        partnerId: partner.id,
        partnerName: partner.name,
      });
    } catch (err) {
      console.error(`[assignPendingOrders] Failed for ${order.id}:`, err);
    }
  }

  return { processed: results.length, results };
};

export const releasePartner = async (partnerId: string): Promise<void> => {
  await prisma.deliveryPartner.update({
    where: { id: partnerId },
    data: { currentStatus: PartnerStatus.AVAILABLE },
  });

  await assignPendingOrders();
};

export const reassignPartner = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) throw new AppError("Order not found", 404);

  if (order.partnerId) {
    await releasePartner(order.partnerId);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        partnerId: null,
        status: OrderStatus.CONFIRMED,
      },
    });
  }

  return assignBestPartner(orderId);
};