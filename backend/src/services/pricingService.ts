import prisma from "../config/db";
import { CylinderType } from "@prisma/client";
import { AppError } from "../utils/AppError";


const round2 = (n: number): number => Math.round(n * 100) / 100;

export const calculatePrice = async (
  customerId:   string,
  cylinderType: CylinderType,
  quantity:     number
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

 
  const regionStr = String(customer.areaType);
  const pricing = await prisma.pricing.findFirst({
    where: {
      cylinderType,
      region: customer.areaType,
    },
    orderBy: {
      effectiveDate: "desc", // always use the latest effective pricing row
    },
  });

  if (!pricing) {
    throw new AppError("Pricing not found for this region and cylinder type", 404);
  }

  // Base calculation
  const base     = round2(pricing.basePrice * quantity);
  const delivery = round2(pricing.deliveryCharge);
  const tax      = round2((base * pricing.taxPercentage) / 100);

  
  let subsidy = 0;
  if (
    customer.customerType === "DOMESTIC" &&
    cylinderType          === CylinderType.KG_14_2 &&
    customer.subsidyEligible
  ) {
    subsidy = customer.areaType === "URBAN" ? 100 : 200;
  }

  const total = round2(base + delivery + tax - subsidy);

  return {
    breakdown: {
      base,
      delivery,
      tax,
      subsidy,
      total,
    },
  };
};