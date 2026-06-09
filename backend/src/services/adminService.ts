import prisma from "../config/db";
import { AppError } from "../utils/AppError";
import { blockAdminPhone } from "../utils/roleGuards";

export const createPartnerService = async (data: {
  name: string;
  phone: string;
  serviceZone: string;
}) => {
    blockAdminPhone(data.phone, "partner creation");
  const existingPartner = await prisma.deliveryPartner.findUnique({ where: { phone: data.phone } });
  if (existingPartner) throw new AppError("Partner already exists", 409);

  const existingCustomer = await prisma.customer.findUnique({ where: { phone: data.phone } });
  if (existingCustomer) throw new AppError("Phone already registered as customer", 409);

  return prisma.deliveryPartner.create({ data });
};

export const getPartnersService = async () => {
  return prisma.deliveryPartner.findMany({ orderBy: { createdAt: "desc" } });
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

  return logs.map(log => ({
    orderId: log.orderId,
    customerName: log.order.customer?.name ?? "Unknown",
    partnerName: log.order.partner?.name ?? "Unknown",
    assignedAt: log.createdAt,
    status: log.order.status,
  }));
};