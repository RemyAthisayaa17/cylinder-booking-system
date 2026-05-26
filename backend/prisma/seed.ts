import { PrismaClient, CustomerType, AreaType, CylinderType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Customers ─────────────────────────────────────────────────────────────
  const domesticUrbanCustomer = await prisma.customer.create({
    data: {
      name:            "Ravi Kumar",
      phone:           "9000000001",
      password:        "hashed_password",
      address:         "T Nagar",
      city:            "Chennai",
      state:           "Tamil Nadu",
      customerType:    CustomerType.DOMESTIC,
      areaType:        AreaType.URBAN,
      subsidyEligible: true,
    },
  });

  const domesticRuralCustomer = await prisma.customer.create({
    data: {
      name:            "Murugan S",
      phone:           "9000000003",
      password:        "hashed_password",
      address:         "Kancheepuram Village",
      city:            "Kancheepuram",
      state:           "Tamil Nadu",
      customerType:    CustomerType.DOMESTIC,
      areaType:        AreaType.RURAL,
      subsidyEligible: true,
    },
  });

  const commercialCustomer = await prisma.customer.create({
    data: {
      name:            "ABC Industries",
      phone:           "9000000002",
      password:        "hashed_password",
      address:         "Guindy Industrial Estate",
      city:            "Chennai",
      state:           "Tamil Nadu",
      customerType:    CustomerType.COMMERCIAL,
      areaType:        AreaType.URBAN,
      subsidyEligible: false,
    },
  });

  // ── Delivery Partners ─────────────────────────────────────────────────────
  // serviceZone MUST match customer.areaType values ("URBAN" / "RURAL")
  // so zone-matching in paymentService.autoAssignPartner works correctly.
  await prisma.deliveryPartner.createMany({
    data: [
      {
        name:           "Arun Logistics",
        phone:          "8000000001",
        serviceZone:    "URBAN",  // matches AreaType.URBAN
        rating:         4.7,
        currentStatus:  "AVAILABLE",
      },
      {
        name:           "Kumar Delivery Hub",
        phone:          "8000000002",
        serviceZone:    "URBAN",  // matches AreaType.URBAN
        rating:         4.5,
        currentStatus:  "AVAILABLE",
      },
      {
        name:           "Rural Express",
        phone:          "8000000003",
        serviceZone:    "RURAL",  // matches AreaType.RURAL
        rating:         4.3,
        currentStatus:  "AVAILABLE",
      },
    ],
  });

  // ── Pricing ───────────────────────────────────────────────────────────────
  // PRD §4 pricing rules:
  //   DOMESTIC 14.2kg: base ₹913, delivery ₹0, tax 0%, subsidy via calculateSubsidy()
  //   COMMERCIAL 19kg: base ₹3071.50, delivery ₹100, tax 21%
  //   COMMERCIAL 47.5kg: base ₹7674.50, delivery ₹200, tax 21%
  //
  // Pricing.region is a plain String column — use literal "URBAN" / "RURAL".
  // Both regions must have rows so no customer gets a 404.
  await prisma.pricing.createMany({
    data: [
      // ── URBAN pricing ──────────────────────────────────────────────────
      {
        cylinderType:   CylinderType.KG_14_2,
        region:         "URBAN",
        basePrice:      913,
        deliveryCharge: 0,
        taxPercentage:  0,
        effectiveDate:  new Date(),
      },
      {
        cylinderType:   CylinderType.KG_19,
        region:         "URBAN",
        basePrice:      3071.5,
        deliveryCharge: 100,
        taxPercentage:  21,
        effectiveDate:  new Date(),
      },
      {
        cylinderType:   CylinderType.KG_47_5,
        region:         "URBAN",
        basePrice:      7674.5,
        deliveryCharge: 200,
        taxPercentage:  21,
        effectiveDate:  new Date(),
      },
      // ── RURAL pricing ──────────────────────────────────────────────────
      {
        cylinderType:   CylinderType.KG_14_2,
        region:         "RURAL",
        basePrice:      913,
        deliveryCharge: 0,
        taxPercentage:  0,
        effectiveDate:  new Date(),
      },
      {
        cylinderType:   CylinderType.KG_19,
        region:         "RURAL",
        basePrice:      3071.5,
        deliveryCharge: 100,
        taxPercentage:  21,
        effectiveDate:  new Date(),
      },
      {
        cylinderType:   CylinderType.KG_47_5,
        region:         "RURAL",
        basePrice:      7674.5,
        deliveryCharge: 200,
        taxPercentage:  21,
        effectiveDate:  new Date(),
      },
    ],
  });

  console.log("✅ Seeding completed successfully");

  console.log("📌 DOMESTIC URBAN CUSTOMER ID:", domesticUrbanCustomer.id);
  console.log("📌 DOMESTIC RURAL CUSTOMER ID:", domesticRuralCustomer.id);
  console.log("📌 COMMERCIAL CUSTOMER ID:    ", commercialCustomer.id);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });