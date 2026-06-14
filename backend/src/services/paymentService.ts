import prisma from "../config/db";
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  PartnerStatus,
  DeliveryStatus,
} from "@prisma/client";
import { generateInvoice } from "./invoiceService";
import { AppError } from "../utils/AppError";
import { assignBestPartner } from "./assignmentService";


const runPostPaymentOrchestration = async (orderId: string) => {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CONFIRMED },
    include: { customer: true },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "PAYMENT_SUCCESS",
      fromStatus: OrderStatus.PLACED,
      toStatus: OrderStatus.CONFIRMED,
      message: "Payment successful. Order confirmed.",
    },
  });

  const assignment = await assignBestPartner(orderId);

  return { ...assignment };
};


const convertOrderToCash = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  await prisma.payment.upsert({
    where: { orderId },
    update: {
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
    },
    create: {
      orderId,
      amount: order.amountDue,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
      transactionId: `CASH_CONVERTED_${Date.now()}`,
      retryCount: 0,
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PENDING,
      amountPaid: 0,
    },
  });

  const confirmedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CONFIRMED },
    include: { customer: true },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "UPI_CONVERTED_TO_CASH",
      fromStatus: OrderStatus.PLACED,
      toStatus: OrderStatus.CONFIRMED,
      message:
        "Maximum UPI retry limit reached. Order converted to Cash on Delivery.",
    },
  });

  const assignment = await assignBestPartner(orderId);

  const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });

  return {
    message:
      "Maximum retry limit reached. Please pay cash during delivery.",
    orderId,
    paymentStatus: PaymentStatus.PENDING,
    status: finalOrder?.status ?? OrderStatus.ASSIGNED,
    cashOnDelivery: true,
    convertedToCash: true,
    ...assignment,
  };
};


const handleUpiPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    return {
      message: "Already paid",
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
    };
  }

  // MOCK GATEWAY
  const paymentSuccess = Math.random() < 0.85;
  // const paymentSuccess = false;

  if (!paymentSuccess) {
    await prisma.payment.upsert({
      where: { orderId },
      update: {
        status: PaymentStatus.FAILED,
        method: PaymentMethod.UPI,
        retryCount: { increment: 0 },
      },
      create: {
        orderId,
        amount: order.amountDue,
        method: PaymentMethod.UPI,
        status: PaymentStatus.FAILED,
        transactionId: `TXN_FAIL_${Date.now()}`,
        retryCount: 0,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.FAILED },
    });

    throw new AppError("UPI Payment failed. Please retry.", 400);
  }

  const payment = await prisma.payment.upsert({
    where: { orderId },
    update: { status: PaymentStatus.SUCCESS, method: PaymentMethod.UPI },
    create: {
      orderId,
      amount: order.amountDue,
      method: PaymentMethod.UPI,
      status: PaymentStatus.SUCCESS,
      transactionId: `TXN_${Date.now()}`,
      retryCount: 0,
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.SUCCESS,
      amountPaid: order.amountDue,
      paymentMethod: PaymentMethod.UPI,
    },
  });

  await runPostPaymentOrchestration(orderId);

  const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });

  return {
    message: "UPI payment successful. Invoice will be generated on delivery.",
    orderId,
    paymentId: payment.id,
    status: finalOrder?.status ?? OrderStatus.CONFIRMED,
    paymentStatus: finalOrder?.paymentStatus ?? PaymentStatus.SUCCESS,
  };
};


const handleCashPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    return {
      message: "Payment already completed",
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      status: order.status,
    };
  }

  await prisma.payment.upsert({
    where: { orderId },
    update: {
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
    },
    create: {
      orderId,
      amount: order.amountDue,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
      transactionId: `CASH_COD_${Date.now()}`,
      retryCount: 0,
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PENDING,
      amountPaid: 0,
    },
  });

  const confirmedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CONFIRMED },
    include: { customer: true },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "CASH_INTENT",
      fromStatus: OrderStatus.PLACED,
      toStatus: OrderStatus.CONFIRMED,
      message:
        "Cash on delivery selected. Order confirmed. Awaiting partner assignment.",
    },
  });

  const assignment = await assignBestPartner(orderId);

  const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });

  return {
    message: "Cash on delivery selected. Delivery partner assigned.",
    orderId,
    paymentStatus: PaymentStatus.PENDING,
    status: finalOrder?.status ?? OrderStatus.ASSIGNED,
    cashOnDelivery: true,
    ...assignment,
  };
};


export const processPayment = async (data: {
  orderId: string;
  method: PaymentMethod;
}) => {
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (
    order.status === OrderStatus.DELIVERED ||
    order.status === OrderStatus.CANCELLED
  ) {
    throw new AppError("Order is already completed or cancelled", 409);
  }

  if (
    data.method === PaymentMethod.UPI &&
    order.paymentStatus === PaymentStatus.SUCCESS
  ) {
    throw new AppError("Payment already completed", 409);
  }

  if (
    data.method === PaymentMethod.UPI &&
    order.payment &&
    order.payment.retryCount >= 3
  ) {
    return convertOrderToCash(data.orderId);
  }

  if (data.method === PaymentMethod.CASH) {
    return handleCashPayment(data.orderId);
  }

  return handleUpiPayment(data.orderId);
};


export const retryPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (
    order.status === OrderStatus.DELIVERED ||
    order.status === OrderStatus.CANCELLED
  ) {
    throw new AppError("Order is already completed or cancelled", 409);
  }

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    throw new AppError("Payment already completed", 409);
  }

  let payment = order.payment;

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.amountDue,
        method: PaymentMethod.UPI,
        status: PaymentStatus.FAILED,
        transactionId: `TXN_INIT_${Date.now()}`,
        retryCount: 0,
      },
    });
  }

  if (payment.retryCount >= 3) {
    return convertOrderToCash(orderId);
  }

  const updatedPayment = await prisma.payment.update({
    where: { orderId },
    data: { retryCount: { increment: 1 } },
  });

  try {
    const result = await handleUpiPayment(orderId);
    return {
      ...result,
      retryCount: updatedPayment.retryCount,
    };
  } catch (err: any) {
    const latestPayment = await prisma.payment.findUnique({
      where: { orderId },
    });
    const currentRetryCount =
      latestPayment?.retryCount ?? updatedPayment.retryCount;

    if (currentRetryCount >= 3) {
      return convertOrderToCash(orderId);
    }

    throw err;
  }
};


export const collectCashPayment = async (
  orderId: string,
  partnerId: string
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentMethod !== PaymentMethod.CASH) {
    throw new AppError("Order is not a cash payment", 400);
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new AppError(
      "Cash can only be collected after delivery is completed",
      409
    );
  }

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    const existingInvoice = await prisma.invoice.findUnique({
      where: { orderId },
    });
    if (!existingInvoice) {
      try {
        await generateInvoice(orderId);
      } catch (e) {
        console.error("[collectCashPayment] Invoice generation failed:", e);
      }
    }
    return {
      message: "Cash already collected",
      orderId: order.id,
      paymentStatus: order.paymentStatus,
    };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.SUCCESS,
      amountPaid: order.amountDue,
    },
  });

  await prisma.payment.upsert({
    where: { orderId },
    update: {
      status: PaymentStatus.SUCCESS,
      transactionId: `CASH_COLLECTED_${partnerId}_${Date.now()}`,
    },
    create: {
      orderId,
      amount: order.amountDue,
      method: PaymentMethod.CASH,
      status: PaymentStatus.SUCCESS,
      transactionId: `CASH_COLLECTED_${partnerId}_${Date.now()}`,
      retryCount: 0,
    },
  });

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "CASH_COLLECTED",
      fromStatus: OrderStatus.DELIVERED,
      toStatus: OrderStatus.DELIVERED,
      message: `Cash ₹${order.amountDue} collected by partner ${partnerId}.`,
    },
  });

  try {
    await generateInvoice(orderId);
  } catch (error) {
    console.error("[collectCashPayment] INVOICE GENERATION FAILED:", error);
    await prisma.auditLog.create({
      data: {
        orderId,
        action: "INVOICE_GENERATION_FAILED",
        message: `Invoice generation failed after cash collection: ${String(error)}`,
      },
    });
  }

  return {
    message: "Cash payment collected successfully.",
    orderId,
    paymentStatus: PaymentStatus.SUCCESS,
    collectedBy: partnerId,
    collectedAt: new Date().toISOString(),
  };
};