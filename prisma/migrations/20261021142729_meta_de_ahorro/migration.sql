-- AlterTable
ALTER TABLE "Grupo" ADD COLUMN     "metaMonto" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "AporteMeta" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AporteMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AporteMeta_grupoId_fecha_idx" ON "AporteMeta"("grupoId", "fecha");

-- AddForeignKey
ALTER TABLE "AporteMeta" ADD CONSTRAINT "AporteMeta_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AporteMeta" ADD CONSTRAINT "AporteMeta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AporteMeta" ADD CONSTRAINT "AporteMeta_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
