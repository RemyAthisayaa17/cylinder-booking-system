import { Request, Response } from "express";
import path from "path";
import fs from "fs";

import {
  generateInvoice,
  getInvoice,
} from "../services/invoiceService";
import { sendInvoiceEmail } from "../services/emailService";
import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../config/db";

// ================= SAFE PARAM =================
const getSafeStringParam = (value: string | string[] | undefined): string => {
  if (!value) throw new AppError("Missing orderId", 400);

  if (Array.isArray(value)) {
    if (value.length === 0) throw new AppError("Invalid orderId", 400);
    return value[0];
  }

  return value;
};

// ================= GENERATE INVOICE =================
export const generateInvoiceController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.body;

    if (!orderId) {
      throw new AppError("Missing required field: orderId", 400);
    }

    const data = await generateInvoice(orderId);

    return successResponse({
      res,
      code: 200,
      msg: "success",
      data,
    });
  }
);

// ================= GET INVOICE =================
export const getInvoiceController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const orderId = getSafeStringParam(req.params.orderId);

    const data = await getInvoice(orderId);

    // ownership check
    if (
      req.user?.role === "CUSTOMER" &&
      data.customerId !== req.user.id
    ) {
      throw new AppError("Access denied", 403);
    }

    return successResponse({
      res,
      code: 200,
      msg: "success",
      data,
    });
  }
);

// ================= DOWNLOAD INVOICE PDF =================
export const downloadInvoiceController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;

    if (!orderId) {
      throw new AppError("Missing orderId", 400);
    }

    const invoice = await prisma.invoice.findUnique({
      where: { orderId: String(orderId) },
    });

    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    // ownership check
    if (
      req.user?.role === "CUSTOMER" &&
      invoice.customerId !== req.user.id
    ) {
      throw new AppError("Access denied", 403);
    }

    const filePath = path.join(
      process.cwd(),
      "uploads",
      "invoices",
      `${invoice.id}.pdf`
    );

    if (!fs.existsSync(filePath)) {
      throw new AppError(
        "Invoice PDF not found. Generate invoice first.",
        404
      );
    }

    return res.download(
      filePath,
      `invoice-${invoice.orderId}.pdf`
    );
  }
);

export const emailInvoiceController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { orderId: String(orderId) },
      include: { customer: true },
    });

    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    // ownership check
    if (
      req.user?.role === "CUSTOMER" &&
      invoice.customerId !== req.user.id
    ) {
      throw new AppError("Access denied", 403);
    }

    const result = await sendInvoiceEmail(
      invoice.customer.email,
      invoice.id,
      invoice.orderId
    );

    return successResponse({
      res,
      code: 200,
      msg: result.message,
      data: null,
    });
  }
);