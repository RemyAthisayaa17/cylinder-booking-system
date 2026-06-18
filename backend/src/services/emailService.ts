import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { AppError } from "../utils/AppError";

// ── Create transporter once (IMPORTANT OPTIMIZATION) ──
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

    await transporter.sendMail({
      from: `"Gas Delivery System" <${process.env.SMTP_USER}>`,
      to,
      subject: `Invoice #${invoiceId} for Order ${orderId}`,
      text: "Your invoice is attached with this email.",

      // ── PROFESSIONAL EMAIL BODY ──
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color:#4f46e5;">Invoice Generated Successfully</h2>
          
          <p>Dear Customer,</p>

          <p>Your order has been completed and invoice is attached below.</p>

          <table style="margin-top:10px; border-collapse: collapse;">
            <tr>
              <td style="padding:5px 10px;"><b>Invoice ID:</b></td>
              <td>${invoiceId}</td>
            </tr>
            <tr>
              <td style="padding:5px 10px;"><b>Order ID:</b></td>
              <td>${orderId}</td>
            </tr>
          </table>

          <p style="margin-top:15px;">
            Thank you for choosing our service 🙏
          </p>

          <hr />

          <p style="font-size:12px; color:gray;">
            This is an automated email. Please do not reply.
          </p>
        </div>
      `,

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

export const sendPartnerAssignmentEmail = async (
  to: string,
  partnerName: string,
  order: any
) => {
  try {
    await transporter.sendMail({
      from: `"Gas Delivery System" <${process.env.SMTP_USER}>`,
      to,
      subject: `New Delivery Assigned - Order #${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color:#16a34a;">New Delivery Assigned 🚚</h2>

          <p>Hi <b>${partnerName}</b>,</p>

          <p>You have been assigned a new delivery order.</p>

          <h3>Order Details</h3>

          <ul>
            <li><b>Order ID:</b> ${order.id}</li>
            <li><b>Customer:</b> ${order.customer?.name || "N/A"}</li>
            <li><b>Address:</b> ${order.deliveryAddress}</li>
            <li><b>Quantity:</b> ${order.quantity}</li>
            <li><b>Status:</b> ASSIGNED</li>
          </ul>

          <p>Please proceed with delivery as soon as possible.</p>

          <hr />
          <p style="font-size:12px; color:gray;">
            Automated notification from Gas Delivery System
          </p>
        </div>
      `,
    });

    return {
      message: "Partner assignment email sent successfully",
    };
  } catch (err) {
    console.error("[EMAIL ERROR]", err);
    return {
      message: "Failed to send partner email",
    };
  }
};