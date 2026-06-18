import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { AppError } from "../utils/AppError";

type InvoiceInput = {
  invoiceId: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  cylinderPrice: number;
  deliveryCharge: number;
  tax: number;
  subsidy: number;
  totalAmount: number;
  createdAt: Date;
};

export const generateInvoicePdf = async (data: InvoiceInput) => {
  try {
    // 1. Ensure folder exists
    const dir = path.join(process.cwd(), "uploads", "invoices");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 2. File path
    const filePath = path.join(dir, `${data.invoiceId}.pdf`);

    // 3. Create PDF
    const doc = new PDFDocument({ margin: 50 });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ================= HEADER =================
    doc.fontSize(20).text("INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice ID: ${data.invoiceId}`);
    doc.text(`Order ID: ${data.orderId}`);
    doc.text(`Date: ${data.createdAt.toDateString()}`);
    doc.moveDown();

    // ================= CUSTOMER =================
    doc.fontSize(14).text("Customer Details");
    doc.fontSize(12).text(`Name: ${data.customerName}`);
    doc.text(`Email: ${data.customerEmail}`);
    doc.moveDown();

    // ================= BILLING =================
    doc.fontSize(14).text("Billing Details");
    doc.fontSize(12).text(`Cylinder Price: ₹${data.cylinderPrice}`);
    doc.text(`Delivery Charge: ₹${data.deliveryCharge}`);
    doc.text(`Tax: ₹${data.tax}`);
    doc.text(`Subsidy: -₹${data.subsidy}`);
    doc.moveDown();

    // ================= TOTAL =================
    doc.fontSize(16).text(`TOTAL AMOUNT: ₹${data.totalAmount}`, {
      underline: true,
    });

    doc.moveDown();
    doc.fontSize(10).text("Thank you for your order!", {
      align: "center",
    });

    doc.end();

    // 4. Wait for file to finish writing
    await new Promise<void>((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    return filePath;
  } catch (err) {
    throw new AppError("Failed to generate invoice PDF", 500);
  }
};