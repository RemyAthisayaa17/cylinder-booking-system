import prisma from "../config/db";
import { AppError } from "../utils/AppError";

export const checkEligibility = async (customerId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  // COMMERCIAL = always eligible
  if (customer.customerType === "COMMERCIAL") {
    return {
      eligible: true,
      reason: "Commercial customer has no booking restrictions"
    };
  }

  // DOMESTIC RULE
  const lastOrder = await prisma.order.findFirst({
    where: {
      customerId,
      status: "DELIVERED"
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  // If no previous orders → eligible
  if (!lastOrder) {
    return {
      eligible: true,
      reason: "First time booking allowed"
    };
  }

  const lastDeliveryDate = new Date(lastOrder.updatedAt);
  const now = new Date();

  const diffTime = now.getTime() - lastDeliveryDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  const requiredDays = customer.areaType === "URBAN" ? 25 : 45;

  if (diffDays < requiredDays) {
    const remainingDays = Math.ceil(requiredDays - diffDays);

    return {
      eligible: false,
      reason: `Not eligible. Try again after ${remainingDays} days`
    };
  }

  return {
    eligible: true,
    reason: "Eligible for booking"
  };
};
