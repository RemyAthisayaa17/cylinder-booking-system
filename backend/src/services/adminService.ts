import prisma from "../config/db";
import { AppError } from "../utils/AppError";
import { blockAdminPhone } from "../utils/roleGuards";
import { assignPendingOrders } from "./assignmentService";

// Order statuses that block partner deletion
const ACTIVE_ORDER_STATUSES = ["ASSIGNED", "OUT_FOR_DELIVERY"] as const;

export const createPartnerService = async (data: {
  name: string;
  phone: string;
  email: string;
  serviceZone: string;
}) => {
  blockAdminPhone(data.phone, "partner creation");

  // 1. PHONE CHECKS
  const existingPartner = await prisma.deliveryPartner.findUnique({
    where: { phone: data.phone },
  });
  if (existingPartner) throw new AppError("Partner already exists", 409);

  const existingCustomer = await prisma.customer.findUnique({
    where: { phone: data.phone },
  });
  if (existingCustomer)
    throw new AppError("Phone already registered", 409);

  // 2. EMAIL CHECKS (BEFORE CREATE)
  const existingCustomerEmail = await prisma.customer.findUnique({
    where: { email: data.email },
  });
  if (existingCustomerEmail) {
    throw new AppError("Email already registered as customer", 409);
  }

  const existingPartnerEmail = await prisma.deliveryPartner.findUnique({
    where: { email: data.email },
  });
  if (existingPartnerEmail) {
    throw new AppError("Email already registered", 409);
  }

  // 3. CREATE ONLY AFTER VALIDATION
  const partner = await prisma.deliveryPartner.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      serviceZone: data.serviceZone,
    },
  });

  // 4. TRIGGER ASSIGNMENT
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
      (o: { status: string }) =>
        o.status === "ASSIGNED" || o.status === "OUT_FOR_DELIVERY"
    ).length;

    return { ...partner, completedDeliveries, pendingDeliveries };
  });
};

export const updatePartnerService = async (
  id: string,
  data: { name: string; phone: string; email: string; serviceZone: string }
) => {
  const partner = await prisma.deliveryPartner.findUnique({ where: { id } });
  if (!partner) throw new AppError("Partner not found", 404);

  blockAdminPhone(data.phone, "partner update");

  // PHONE CHECKS (only when phone is actually changing)
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

  // EMAIL CHECKS (only when email is actually changing)
  if (data.email !== partner.email) {
    const existingCustomerEmail = await prisma.customer.findUnique({
      where: { email: data.email },
    });
    if (existingCustomerEmail) {
      throw new AppError("Email already registered as customer", 409);
    }

    const existingPartnerEmail = await prisma.deliveryPartner.findUnique({
      where: { email: data.email },
    });
    if (existingPartnerEmail) {
      throw new AppError("Email already registered", 409);
    }
  }

  return prisma.deliveryPartner.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      serviceZone: data.serviceZone,
    },
  });
};

export const deletePartnerService = async (id: string) => {
  // 1. Confirm partner exists
  const partner = await prisma.deliveryPartner.findUnique({
    where: { id },
    include: {
      orders: {
        select: { id: true, status: true },
      },
    },
  });

  if (!partner) throw new AppError("Partner not found", 404);

  // 2. Check for any active / in-progress orders
  //    Race-condition safe: we re-query inside a transaction below before
  //    actually deleting, but this early check gives a fast, clear error.
  const activeOrders = partner.orders.filter((o) =>
    (ACTIVE_ORDER_STATUSES as readonly string[]).includes(o.status)
  );

  if (activeOrders.length > 0) {
    throw new AppError(
      "Delivery partner cannot be deleted while they have active or in-progress deliveries.",
      409
    );
  }

  // 3. Re-validate inside a transaction to guard against race conditions
  //    (another request could have assigned an order between the check above
  //    and the delete below).
  await prisma.$transaction(async (tx) => {
    const activeCount = await tx.order.count({
      where: {
        partnerId: id,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
    });

    if (activeCount > 0) {
      throw new AppError(
        "Delivery partner cannot be deleted while they have active or in-progress deliveries.",
        409
      );
    }

    await tx.deliveryPartner.delete({ where: { id } });
  });

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