import prisma from "../config/db";
import { PartnerStatus, OrderStatus, DeliveryStatus } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { createPartnerNotification } from "./notificationService";


async function executeAssignment(
  orderId: string,
  partnerId: string,
  partnerName: string,
  customerName: string,
  deliveryAddress: string
): Promise<void> {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { partnerId, status: OrderStatus.ASSIGNED },
    }),
    prisma.deliveryPartner.update({
      where: { id: partnerId },
      data: {
        currentStatus: PartnerStatus.ON_DELIVERY,
        totalDeliveries: { increment: 1 },
      },
    }),
    prisma.deliveryTracking.upsert({
      where: { orderId },
      update: { partnerId, status: DeliveryStatus.ASSIGNED },
      create: { orderId, partnerId, status: DeliveryStatus.ASSIGNED },
    }),
    prisma.auditLog.create({
      data: {
        orderId,
        action: "AUTO_ASSIGN",
        fromStatus: OrderStatus.CONFIRMED,
        toStatus: OrderStatus.ASSIGNED,
        message: `[AUTO-ASSIGN] Partner ${partnerName} → Order ${orderId}`,
      },
    }),
  ]);

  try {
    await createPartnerNotification(
      partnerId,
      "New Order Assigned",
      `You have been assigned a new order.\n\nOrder ID: #${orderId}\n`
    );
  } catch (err) {
    console.error(
      `[assignmentService] Failed to create partner notification for order ${orderId}:`,
      err
    );
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
  
    return { assigned: true, partnerId: order.partnerId };
  }

const customerAreaType = String(order.customer.areaType);

const availablePartners = await prisma.deliveryPartner.findMany({
  where: {
    currentStatus: PartnerStatus.AVAILABLE,
    serviceZone: customerAreaType, 
  },
  orderBy: {
    totalDeliveries: "asc",
  },
});

if (availablePartners.length === 0) {
  return { assigned: false };
}

const partner = availablePartners[0];
  await executeAssignment(orderId, partner.id, partner.name, order.customer.name, order.deliveryAddress);

  return { assigned: true, partnerId: partner.id, partnerName: partner.name };
};


export const assignPendingOrders = async (): Promise<{
  processed: number;
  results: Array<{ orderId: string; partnerId: string; partnerName: string }>;
}> => {
  // Fetch all unassigned CONFIRMED orders, oldest first (FIFO)
  const pendingOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.CONFIRMED,
      partnerId: null,
    },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
  });

  if (pendingOrders.length === 0) return { processed: 0, results: [] };

  const results: Array<{
    orderId: string;
    partnerId: string;
    partnerName: string;
  }> = [];

  for (const order of pendingOrders) {
  
const customerAreaType = String(order.customer.areaType);

const availablePartners = await prisma.deliveryPartner.findMany({
  where: {
    currentStatus: PartnerStatus.AVAILABLE,
    serviceZone: customerAreaType,
  },
  orderBy: {
    totalDeliveries: "asc",
  },
});

if (availablePartners.length === 0) continue;

const partner = availablePartners[0];



    try {
      await executeAssignment(order.id, partner.id, partner.name, order.customer.name, order.deliveryAddress);
      results.push({
        orderId: order.id,
        partnerId: partner.id,
        partnerName: partner.name,
      });
    } catch (err) {
      // Log but continue — one failed assignment must not abort the sweep
      console.error(
        `[assignPendingOrders] Failed to assign order ${order.id}:`,
        err
      );
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

  // Release existing partner if any
  if (order.partnerId) {
    await releasePartner(order.partnerId);
    await prisma.order.update({
      where: { id: orderId },
      data: { partnerId: null, status: OrderStatus.CONFIRMED },
    });
  }

  return assignBestPartner(orderId);
};