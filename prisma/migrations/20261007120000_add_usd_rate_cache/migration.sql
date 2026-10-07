-- CreateTable
CREATE TABLE "UsdRateCache" (
    "id" TEXT NOT NULL DEFAULT 'actual',
    "source" TEXT NOT NULL,
    "compra" DECIMAL(12,4) NOT NULL,
    "venta" DECIMAL(12,4) NOT NULL,
    "date" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsdRateCache_pkey" PRIMARY KEY ("id")
);
