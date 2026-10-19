-- CreateEnum
CREATE TYPE "EstadoMiembro" AS ENUM ('pendiente', 'aceptado');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "gastoGrupalId" TEXT;

-- CreateTable
CREATE TABLE "MiembroGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitadoPorId" TEXT NOT NULL,
    "estado" "EstadoMiembro" NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidoEn" TIMESTAMP(3),

    CONSTRAINT "MiembroGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoGrupal" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "seccionId" TEXT,
    "pagadorId" TEXT NOT NULL,
    "cargadoPorId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" "Currency" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "usdRate" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GastoGrupal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParteGasto" (
    "id" TEXT NOT NULL,
    "gastoGrupalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ParteGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "deId" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" "Currency" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiembroGrupo_userId_estado_idx" ON "MiembroGrupo"("userId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "MiembroGrupo_grupoId_userId_key" ON "MiembroGrupo"("grupoId", "userId");

-- CreateIndex
CREATE INDEX "GastoGrupal_grupoId_fecha_idx" ON "GastoGrupal"("grupoId", "fecha");

-- CreateIndex
CREATE INDEX "ParteGasto_userId_idx" ON "ParteGasto"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParteGasto_gastoGrupalId_userId_key" ON "ParteGasto"("gastoGrupalId", "userId");

-- CreateIndex
CREATE INDEX "PagoGrupo_grupoId_idx" ON "PagoGrupo"("grupoId");

-- CreateIndex
CREATE INDEX "Expense_gastoGrupalId_idx" ON "Expense"("gastoGrupalId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_gastoGrupalId_fkey" FOREIGN KEY ("gastoGrupalId") REFERENCES "GastoGrupal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroGrupo" ADD CONSTRAINT "MiembroGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroGrupo" ADD CONSTRAINT "MiembroGrupo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroGrupo" ADD CONSTRAINT "MiembroGrupo_invitadoPorId_fkey" FOREIGN KEY ("invitadoPorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoGrupal" ADD CONSTRAINT "GastoGrupal_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoGrupal" ADD CONSTRAINT "GastoGrupal_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "SeccionGrupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoGrupal" ADD CONSTRAINT "GastoGrupal_pagadorId_fkey" FOREIGN KEY ("pagadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoGrupal" ADD CONSTRAINT "GastoGrupal_cargadoPorId_fkey" FOREIGN KEY ("cargadoPorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteGasto" ADD CONSTRAINT "ParteGasto_gastoGrupalId_fkey" FOREIGN KEY ("gastoGrupalId") REFERENCES "GastoGrupal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteGasto" ADD CONSTRAINT "ParteGasto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoGrupo" ADD CONSTRAINT "PagoGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoGrupo" ADD CONSTRAINT "PagoGrupo_deId_fkey" FOREIGN KEY ("deId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoGrupo" ADD CONSTRAINT "PagoGrupo_aId_fkey" FOREIGN KEY ("aId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoGrupo" ADD CONSTRAINT "PagoGrupo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Los gastos que ya estaban en un grupo pasan al modelo nuevo: cada uno es un
-- gasto del grupo pagado por su dueño, con una sola parte (la suya, por el
-- total). El gasto personal queda como esa parte.
INSERT INTO "GastoGrupal" ("id", "grupoId", "seccionId", "pagadorId", "cargadoPorId", "monto", "moneda", "fecha", "descripcion", "usdRate", "createdAt")
SELECT 'gg_' || e."id", e."grupoId", e."seccionId", e."userId", e."userId", e."amount", e."currency", e."date", e."description", e."usdRate", e."createdAt"
FROM "Expense" e
WHERE e."grupoId" IS NOT NULL;

INSERT INTO "ParteGasto" ("id", "gastoGrupalId", "userId", "monto")
SELECT 'pg_' || e."id", 'gg_' || e."id", e."userId", e."amount"
FROM "Expense" e
WHERE e."grupoId" IS NOT NULL;

UPDATE "Expense" SET "gastoGrupalId" = 'gg_' || "id" WHERE "grupoId" IS NOT NULL;
