import prisma from "../config/db";
import { CylinderType, PaymentStatus, OrderStatus, AreaType } from "@prisma/client";
import { AppError } from "../utils/AppError";

const round2 = (n: number): number => Math.round(n * 100) / 100;

// ─────────────────────────────────────────────────────────────
// SUBSIDY CALCULATION
// DOMESTIC + KG_14_2 + subsidyEligible only
// URBAN → ₹100, RURAL → ₹200
// COMMERCIAL → always ₹0
// ─────────────────────────────────────────────────────────────
const resolveSubsidy = (
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
// GENERATE INVOICE 
// ─────────────────────────────────────────────────────────────
export const generateInvoice = async (
  orderId: string
): Promise<{
  message: string;
  invoiceId: string;
  orderId: string;
  totalAmount: number;
}> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, payment: true, invoice: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentStatus !== PaymentStatus.SUCCESS) {
    throw new AppError(
      "Invoice can only be generated after successful payment",
      409
    );
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new AppError(
      "Invoice can only be generated after delivery is completed",
      409
    );
  }

  if (order.invoice) {
    return {
      message: "Invoice already exists",
      invoiceId: order.invoice.id,
      orderId: order.id,
      totalAmount: order.invoice.totalAmount,
    };
  }

  const pricing = await prisma.pricing.findFirst({
    where: {
      cylinderType: order.cylinderType,
      region: order.customer.areaType,
    },
    orderBy: { effectiveDate: "desc" },
  });

  let cylinderPrice: number;
  let deliveryCharge: number;
  let tax: number;
  let subsidy: number;
  let totalAmount: number;

  if (pricing) {
    cylinderPrice = round2(pricing.basePrice * order.quantity);
    deliveryCharge = round2(pricing.deliveryCharge);
    tax = round2((cylinderPrice * pricing.taxPercentage) / 100);

    subsidy = resolveSubsidy(
      order.customer.customerType,
      order.cylinderType,
      order.customer.areaType,
      order.customer.subsidyEligible
    );

    totalAmount = round2(cylinderPrice + deliveryCharge + tax - subsidy);
  } else {
    cylinderPrice = order.amountDue;
    deliveryCharge = 0;
    tax = 0;
    subsidy = 0;
    totalAmount = order.amountDue;
  }

  const invoice = await prisma.invoice.create({
    data: {
      orderId: order.id,
      customerId: order.customerId,
      cylinderPrice,
      deliveryCharge,
      tax,
      subsidy,
      totalAmount,
    },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "INVOICE_GENERATED",
      fromStatus: OrderStatus.DELIVERED,
      toStatus: OrderStatus.DELIVERED,
      message: `Invoice ${invoice.id} generated after payment + delivery.`,
    },
  });

  return {
    message: "Invoice generated successfully",
    invoiceId: invoice.id,
    orderId: order.id,
    totalAmount: invoice.totalAmount,
  };
};

// ─────────────────────────────────────────────────────────────
// GET INVOICE
// ─────────────────────────────────────────────────────────────
export const getInvoice = async (orderId: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { orderId },
    include: { customer: true, order: true },
  });

  if (!invoice) throw new AppError("Invoice not found", 404);

  return invoice;
};

export const getInvoiceByOrderId = getInvoice;