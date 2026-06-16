import prisma from "../config/db";
import { AppError } from "../utils/AppError";
import { blockAdminPhone } from "../utils/roleGuards";
import { assignPendingOrders } from "./assignmentService";

export const createPartnerService = async (data: {
  name: string;
  phone: string;
  serviceZone: string;
}) => {
  
  blockAdminPhone(data.phone, "partner creation");

  const existingPartner = await prisma.deliveryPartner.findUnique({
    where: { phone: data.phone },
  });
  if (existingPartner) throw new AppError("Partner already exists", 409);

  const existingCustomer = await prisma.customer.findUnique({
    where: { phone: data.phone },
  });

  if (existingCustomer)
    throw new AppError("Phone already registered ", 409);

  const partner = await prisma.deliveryPartner.create({ data });


  assignPendingOrders().catch((err) =>
    console.error("[adminService] assignPendingOrders after create failed:", err)
  );

  return partner;
};

export const getPartnersService = async () => {
  const partners = await prisma.deliveryPartner.findMany({
    orderBy: { createdAt: "desc" },
    include: { orders: { select: { status: true } } },
  });

  return partners.map(({ orders, ...partner }) => {
    const completedDeliveries = orders.filter(
      (o: { status: string }) => o.status === "DELIVERED"
    ).length;
    const pendingDeliveries = orders.filter(
      (o: { status: string }) => o.status === "ASSIGNED" || o.status === "OUT_FOR_DELIVERY"
    ).length;

    return { ...partner, completedDeliveries, pendingDeliveries };
  });
};

export const updatePartnerService = async (
  id: string,
  data: { name: string; phone: string; serviceZone: string }
) => {
  const partner = await prisma.deliveryPartner.findUnique({ where: { id } });
  if (!partner) throw new AppError("Partner not found", 404);

  blockAdminPhone(data.phone, "partner update");

  if (data.phone !== partner.phone) {
  const phoneInUse = await prisma.deliveryPartner.findUnique({
    where: { phone: data.phone },
  });

  if (phoneInUse) {
    throw new AppError("Phone already in use", 409);
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: { phone: data.phone },
  });

  if (existingCustomer) {
    throw new AppError("Phone already registered", 409);
  }
}

  if (data.phone !== partner.phone) {
    const phoneInUse = await prisma.deliveryPartner.findUnique({ where: { phone: data.phone } });
    if (phoneInUse) throw new AppError("Phone already in use", 409);
  }

  return prisma.deliveryPartner.update({
    where: { id },
    data: { name: data.name, phone: data.phone, serviceZone: data.serviceZone },
  });
};

export const deletePartnerService = async (id: string) => {
  const partner = await prisma.deliveryPartner.findUnique({ where: { id } });
  if (!partner) throw new AppError("Partner not found", 404);

  try {
    await prisma.deliveryPartner.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === "P2003") {
      throw new AppError("Cannot delete partner with existing orders", 409);
    }
    throw err;
  }

  return { id };
};

export const getAutoAssignmentLogService = async () => {
  const logs = await prisma.auditLog.findMany({
    where: { action: "AUTO_ASSIGN" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: {
        include: {
          customer: { select: { name: true } },
          partner: { select: { name: true } },
        },
      },
    },
  });

  return logs.map((log) => ({
    orderId: log.orderId,
    customerName: log.order.customer?.name ?? "Unknown",
    partnerName: log.order.partner?.name ?? "Unknown",
    assignedAt: log.createdAt,
    status: log.order.status,
  }));
};