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

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  brand:       "#7C3AED",   // purple-700
  brandLight:  "#F5F3FF",   // purple-50
  brandMid:    "#EDE9FE",   // purple-100
  white:       "#FFFFFF",
  dark:        "#111827",   // gray-900
  mid:         "#374151",   // gray-700
  muted:       "#6B7280",   // gray-500
  faint:       "#9CA3AF",   // gray-400
  rule:        "#E5E7EB",   // gray-200
  pageBg:      "#F9FAFB",   // gray-50
  totalBg:     "#F3F4F6",   // gray-100
  green:       "#059669",   // emerald-600
};

// ── Formatting helpers ────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});
const money = (n: number) => fmt.format(n);

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

// ── Page geometry ─────────────────────────────────────────────────────────────
const PAGE_W    = 595.28;   // A4 width  (pt)
const PAGE_H    = 841.89;   // A4 height (pt)
const MARGIN    = 48;
const COL_W     = PAGE_W - MARGIN * 2;
const MID_X     = MARGIN + COL_W / 2;

export const generateInvoicePdf = async (data: InvoiceInput): Promise<string> => {
  try {
    // ── Ensure output directory ───────────────────────────────────────────────
    const dir = path.join(process.cwd(), "uploads", "invoices");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${data.invoiceId}.pdf`);

    // ── Create document ───────────────────────────────────────────────────────
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title:    `Invoice ${data.invoiceId}`,
        Author:   "GasCylinder Booking",
        Subject:  `Invoice for Order ${data.orderId}`,
        Creator:  "GasCylinder Billing System",
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. PAGE BACKGROUND
    // ═══════════════════════════════════════════════════════════════════════════
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.pageBg);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. HEADER — brand band
    // ═══════════════════════════════════════════════════════════════════════════
    const HEADER_H = 110;

    // Brand band background
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.brand);

    // Subtle decorative circle (top-right)
    doc
      .circle(PAGE_W - 40, -10, 90)
      .fillOpacity(0.08)
      .fill(C.white);
    doc.fillOpacity(1);

    // Company name
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(C.white)
      .text("GasCylinder Booking", MARGIN, 30, { lineBreak: false });

    // Tagline
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("rgba(255,255,255,0.65)")
      .text("LPG Cylinder Delivery Service", MARGIN, 54, { lineBreak: false });

    // "INVOICE" label — right side
    doc
      .font("Helvetica-Bold")
      .fontSize(26)
      .fillColor(C.white)
      .text("INVOICE", MARGIN, 28, {
        width: COL_W,
        align: "right",
        lineBreak: false,
      });

    // Invoice ID — smaller, below label
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("rgba(255,255,255,0.70)")
      .text(`#${data.invoiceId.slice(0, 10).toUpperCase()}`, MARGIN, 60, {
        width: COL_W,
        align: "right",
        lineBreak: false,
      });

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. TWO-COLUMN INFO STRIP
    // ═══════════════════════════════════════════════════════════════════════════
    const INFO_Y  = HEADER_H;
    const INFO_H  = 88;

    // White card
    doc.rect(MARGIN, INFO_Y + 12, COL_W, INFO_H).fill(C.white);

    // ── Left: Customer Details ────────────────────────────────────────────────
    const leftX = MARGIN + 20;
    let   ly    = INFO_Y + 24;

    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor(C.brand)
      .text("BILL TO", leftX, ly, { lineBreak: false });

    ly += 13;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(C.dark)
      .text(data.customerName, leftX, ly, { lineBreak: false });

    ly += 15;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(C.muted)
      .text(data.customerEmail, leftX, ly, { lineBreak: false });

    // ── Right: Invoice Metadata ───────────────────────────────────────────────
    const rightX = MID_X + 20;
    let   ry     = INFO_Y + 24;

    const metaRow = (label: string, value: string) => {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.faint)
        .text(label, rightX, ry, { continued: false, lineBreak: false });

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(C.mid)
        .text(value, rightX + 80, ry, { lineBreak: false });

      ry += 14;
    };

    ry += 3; // small nudge down to align baseline with label
    metaRow("Order ID",    `#${data.orderId.slice(0, 10).toUpperCase()}`);
    metaRow("Invoice Date", fmtDate(data.createdAt));
    metaRow("Payment",      "Completed");

    // ── Vertical divider between columns ─────────────────────────────────────
    doc
      .moveTo(MID_X, INFO_Y + 20)
      .lineTo(MID_X, INFO_Y + INFO_H - 4)
      .strokeColor(C.rule)
      .lineWidth(0.5)
      .stroke();

    // ── Bottom border of info strip ───────────────────────────────────────────
    doc
      .moveTo(MARGIN, INFO_Y + INFO_H + 12)
      .lineTo(MARGIN + COL_W, INFO_Y + INFO_H + 12)
      .strokeColor(C.rule)
      .lineWidth(0.5)
      .stroke();

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. BILLING TABLE
    // ═══════════════════════════════════════════════════════════════════════════
    const TABLE_Y    = INFO_Y + INFO_H + 28;
    const TABLE_INNER = COL_W;
    const COL_DESC   = MARGIN;
    const COL_AMT    = MARGIN + TABLE_INNER;   // right-align text here

    // Table background
    doc.rect(MARGIN, TABLE_Y, TABLE_INNER, 200).fill(C.white);

    // ── Table header row ──────────────────────────────────────────────────────
    const TH_H = 28;
    doc.rect(MARGIN, TABLE_Y, TABLE_INNER, TH_H).fill(C.brandMid);

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(C.brand)
      .text("DESCRIPTION", COL_DESC + 16, TABLE_Y + 10, { lineBreak: false });

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(C.brand)
      .text("AMOUNT", 0, TABLE_Y + 10, {
        width: COL_AMT - 16,
        align: "right",
        lineBreak: false,
      });

    // ── Table rows ────────────────────────────────────────────────────────────
    const rows: { label: string; amount: number; negative?: boolean }[] = [
      { label: "Cylinder Price",   amount: data.cylinderPrice  },
      { label: "Delivery Charge",  amount: data.deliveryCharge },
      { label: "Tax (GST)",        amount: data.tax            },
      ...(data.subsidy > 0
        ? [{ label: "Subsidy Discount", amount: data.subsidy, negative: true }]
        : []),
    ];

    let rowY = TABLE_Y + TH_H;
    const ROW_H = 30;

    rows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? C.white : C.pageBg;
      doc.rect(MARGIN, rowY, TABLE_INNER, ROW_H).fill(bg);

      // Description
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor(C.mid)
        .text(row.label, COL_DESC + 16, rowY + 11, { lineBreak: false });

      // Amount
      const amtText  = row.negative ? `- ${money(row.amount)}` : money(row.amount);
      const amtColor = row.negative ? C.green : C.dark;

      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(amtColor)
        .text(amtText, 0, rowY + 11, {
          width: COL_AMT - 16,
          align: "right",
          lineBreak: false,
        });

      // Bottom rule
      doc
        .moveTo(MARGIN + 16, rowY + ROW_H)
        .lineTo(MARGIN + TABLE_INNER - 16, rowY + ROW_H)
        .strokeColor(C.rule)
        .lineWidth(0.4)
        .stroke();

      rowY += ROW_H;
    });

    // ── Table outer border ────────────────────────────────────────────────────
    const TABLE_CONTENT_H = TH_H + rows.length * ROW_H;
    doc
      .rect(MARGIN, TABLE_Y, TABLE_INNER, TABLE_CONTENT_H)
      .strokeColor(C.rule)
      .lineWidth(0.6)
      .stroke();

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. TOTAL HIGHLIGHT CARD
    // ═══════════════════════════════════════════════════════════════════════════
    const TOTAL_Y  = TABLE_Y + TABLE_CONTENT_H + 20;
    const CARD_W   = 220;
    const CARD_H   = 60;
    const CARD_X   = MARGIN + TABLE_INNER - CARD_W;

    // Card background
    doc.rect(CARD_X, TOTAL_Y, CARD_W, CARD_H).fill(C.brandLight);

    // Top accent bar on card
    doc.rect(CARD_X, TOTAL_Y, CARD_W, 3).fill(C.brand);

    // Label
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(C.brand)
      .text("TOTAL AMOUNT PAYABLE", CARD_X + 14, TOTAL_Y + 14, {
        lineBreak: false,
      });

    // Amount
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(C.dark)
      .text(money(data.totalAmount), CARD_X, TOTAL_Y + 28, {
        width: CARD_W - 14,
        align: "right",
        lineBreak: false,
      });

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. "PAID" STAMP  (optional visual — always shown for delivered orders)
    // ═══════════════════════════════════════════════════════════════════════════
    const STAMP_X = MARGIN + 14;
    const STAMP_Y = TOTAL_Y + 6;
    const STAMP_W = 68;
    const STAMP_H = 26;

    doc
      .rect(STAMP_X, STAMP_Y, STAMP_W, STAMP_H)
      .strokeColor(C.green)
      .lineWidth(1.8)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(C.green)
      .text("PAID", STAMP_X, STAMP_Y + 7, {
        width: STAMP_W,
        align: "center",
        lineBreak: false,
      });

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. NOTES / TERMS STRIP
    // ═══════════════════════════════════════════════════════════════════════════
    const NOTES_Y = TOTAL_Y + CARD_H + 28;

    doc
      .moveTo(MARGIN, NOTES_Y)
      .lineTo(MARGIN + COL_W, NOTES_Y)
      .strokeColor(C.rule)
      .lineWidth(0.5)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(C.faint)
      .text("NOTES", MARGIN, NOTES_Y + 10, { lineBreak: false });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(C.faint)
      .text(
        "This is a system-generated invoice and does not require a signature. " +
        "For queries, contact support with the Invoice ID above.",
        MARGIN,
        NOTES_Y + 22,
        { width: COL_W * 0.65, lineBreak: true }
      );

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. FOOTER
    // ═══════════════════════════════════════════════════════════════════════════
    const FOOTER_Y = PAGE_H - 52;

    doc.rect(0, FOOTER_Y, PAGE_W, 52).fill(C.brand);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("rgba(255,255,255,0.75)")
      .text(
        "Thank you for choosing GasCylinder Booking  ·  We appreciate your trust",
        0,
        FOOTER_Y + 12,
        { width: PAGE_W, align: "center", lineBreak: false }
      );

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("rgba(255,255,255,0.45)")
      .text(
        "This invoice was auto-generated and is valid without a physical signature.",
        0,
        FOOTER_Y + 30,
        { width: PAGE_W, align: "center", lineBreak: false }
      );

    // ── Finalize ──────────────────────────────────────────────────────────────
    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    return filePath;
  } catch (err) {
    throw new AppError("Failed to generate invoice PDF", 500);
  }
};