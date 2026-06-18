import prisma from "../config/db";
import {
  CylinderType,
  OrderStatus,
  AreaType,
} from "@prisma/client";
import { AppError } from "../utils/AppError";
import { generateInvoicePdf } from "./invoicePdfService";
import { sendInvoiceEmail } from "./emailService";


const round2 = (n: number): number => Math.round(n * 100) / 100;

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


export const generateInvoice = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, payment: true, invoice: true },
  });

  if (!order) throw new AppError("Order not found", 404);

 
  if (order.invoice) {
    return {
      message: "Invoice already exists",
      invoiceId: order.invoice.id,
      orderId: order.id,
      totalAmount: order.invoice.totalAmount,
    };
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new AppError(
      "Invoice can only be generated after delivery completion",
      409
    );
  }

  const pricing = await prisma.pricing.findFirst({
    where: {
      cylinderType: order.cylinderType,
      region: order.customer.areaType,
    },
    orderBy: { effectiveDate: "desc" },
  });

  let cylinderPrice = 0;
  let deliveryCharge = 0;
  let tax = 0;
  let subsidy = 0;
  let totalAmount = 0;

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
    totalAmount = order.amountDue;
  }


  try {
 const invoice = await prisma.invoice.upsert({
  where: { orderId },
  update: {},
  create: {
    orderId: order.id,
    customerId: order.customerId,
    cylinderPrice,
    deliveryCharge,
    tax,
    subsidy,
    totalAmount,
  },
});

await generateInvoicePdf({
  invoiceId: invoice.id,
  orderId: order.id,
  customerName: order.customer.name,
  customerEmail: order.customer.email,
  cylinderPrice: invoice.cylinderPrice,
  deliveryCharge: invoice.deliveryCharge,
  tax: invoice.tax,
  subsidy: invoice.subsidy,
  totalAmount: invoice.totalAmount,
  createdAt: invoice.createdAt,
});
try {
  await sendInvoiceEmail(
    order.customer.email,
    invoice.id,
    order.id
  );
} catch (err) {
  console.error(
    `[EMAIL] Failed to send invoice email for order ${order.id}:`,
    err
  );
}
   
    const isNew =
      Math.abs(new Date(invoice.createdAt).getTime() - Date.now()) < 5000;

    if (isNew) {
      await prisma.auditLog.create({
        data: {
          orderId,
          action: "INVOICE_GENERATED",
          fromStatus: OrderStatus.DELIVERED,
          toStatus: OrderStatus.DELIVERED,
          message: `Invoice generated: ₹${invoice.totalAmount}`,
        },
      }).catch(() => {/* audit failure must not block invoice response */});
    }

    return {
      message: isNew ? "Invoice generated successfully" : "Invoice already exists",
      invoiceId: invoice.id,
      orderId: order.id,
      totalAmount: invoice.totalAmount,
    };
  } catch (err: unknown) {
    // P2002 = unique constraint → concurrent request already created it
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2002") {
      const existing = await prisma.invoice.findUnique({ where: { orderId } });
      if (existing) {
        return {
          message: "Invoice already exists",
          invoiceId: existing.id,
          orderId,
          totalAmount: existing.totalAmount,
        };
      }
    }
    throw err;
  }
};


export const getInvoice = async (orderId: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { orderId },
    include: { customer: true, order: true },
  });

  if (!invoice) throw new AppError("Invoice not found", 404);

  return invoice;
};

export const getInvoiceByOrderId = getInvoice;