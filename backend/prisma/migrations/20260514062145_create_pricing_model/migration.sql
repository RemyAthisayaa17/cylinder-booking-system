-- CreateTable
CREATE TABLE "Pricing" (
    "id" TEXT NOT NULL,
    "cylinderType" "CylinderType" NOT NULL,
    "region" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "deliveryCharge" DOUBLE PRECISION NOT NULL,
    "taxPercentage" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pricing_pkey" PRIMARY KEY ("id")
);
