-- CreateEnum
CREATE TYPE "EstadoAmistad" AS ENUM ('pendiente', 'aceptada', 'rechazada');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "codigoAmigo" TEXT,
                   ADD COLUMN "buscablePorNombre" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_codigoAmigo_key" ON "User"("codigoAmigo");

-- CreateTable
CREATE TABLE "Amistad" (
    "id" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "estado" "EstadoAmistad" NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidaEn" TIMESTAMP(3),

    CONSTRAINT "Amistad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amistad_solicitanteId_destinatarioId_key" ON "Amistad"("solicitanteId", "destinatarioId");
CREATE INDEX "Amistad_destinatarioId_estado_idx" ON "Amistad"("destinatarioId", "estado");
CREATE INDEX "Amistad_solicitanteId_estado_idx" ON "Amistad"("solicitanteId", "estado");

-- AddForeignKey
ALTER TABLE "Amistad" ADD CONSTRAINT "Amistad_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Amistad" ADD CONSTRAINT "Amistad_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
