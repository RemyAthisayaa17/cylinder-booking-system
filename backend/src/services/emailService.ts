import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { AppError } from "../utils/AppError";

export const sendInvoiceEmail = async (
  to: string,
  invoiceId: string,
  orderId: string
) => {
  try {
    const filePath = path.join(
      process.cwd(),
      "uploads",
      "invoices",
      `${invoiceId}.pdf`
    );

    if (!fs.existsSync(filePath)) {
      throw new AppError("Invoice PDF not found", 404);
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Cylinder System" <${process.env.SMTP_USER}>`,
      to,
      subject: `Invoice for Order ${orderId}`,
      text: "Please find your invoice attached.",
      attachments: [
        {
          filename: `invoice-${orderId}.pdf`,
          path: filePath,
        },
      ],
    });

    return {
      message: "Invoice email sent successfully",
    };
  } catch (err) {
    throw new AppError("Failed to send invoice email", 500);
  }
};