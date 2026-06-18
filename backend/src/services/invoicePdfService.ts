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
    doc.fontSize(22).font("Helvetica-Bold").text("INVOICE", { align: "center" });

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("gray").text("GAS DELIVERY SYSTEM", { align: "center" });
    doc.fillColor("black");

    doc.moveDown(1);

    doc.fontSize(12).text(`Invoice ID: ${data.invoiceId}`);
    doc.text(`Order ID: ${data.orderId}`);
    doc.text(`Date: ${data.createdAt.toDateString()}`);

    doc.moveDown(0.8);
    doc
      .strokeColor("#e5e7eb")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(0.8);

    // ================= CUSTOMER =================
    doc.fontSize(13).font("Helvetica-Bold").text("Customer Details");
    doc.moveDown(0.3);
    doc.font("Helvetica");

    doc.fontSize(12).text(`Name: ${data.customerName}`);
    doc.text(`Email: ${data.customerEmail}`);

    doc.moveDown(0.8);
    doc
      .strokeColor("#e5e7eb")
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(0.8);

    // ================= BILLING =================
    doc.fontSize(13).font("Helvetica-Bold").text("Billing Details");
    doc.moveDown(0.3);
    doc.font("Helvetica");

    doc.fontSize(12).text(`Cylinder Price      : ₹${data.cylinderPrice}`);
    doc.text(`Delivery Charge     : ₹${data.deliveryCharge}`);
    doc.text(`Tax                 : ₹${data.tax}`);
    doc.text(`Subsidy             : -₹${data.subsidy}`);

    doc.moveDown(0.8);
    doc
      .strokeColor("#e5e7eb")
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(1);

    // ================= TOTAL =================
    doc.fontSize(16).font("Helvetica-Bold").text(
      `TOTAL AMOUNT: ₹${data.totalAmount}`,
      { align: "right" }
    );

    doc.moveDown(2);

    // ================= FOOTER =================
    doc.fontSize(10).fillColor("gray").text(
      "Thank you for choosing our service. We appreciate your trust.",
      { align: "center" }
    );

    doc.fillColor("black");

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