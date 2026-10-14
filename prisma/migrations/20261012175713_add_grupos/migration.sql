-- CreateEnum
CREATE TYPE "TipoGrupo" AS ENUM ('proyecto', 'compartido', 'meta');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "grupoId" TEXT,
ADD COLUMN     "seccionId" TEXT;

-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL,
    "creadorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoGrupo" NOT NULL DEFAULT 'proyecto',
    "color" TEXT NOT NULL DEFAULT '#6fbee4',
    "descripcion" TEXT,
    "archivadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeccionGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeccionGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Grupo_creadorId_archivadoEn_idx" ON "Grupo"("creadorId", "archivadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "SeccionGrupo_grupoId_nombre_key" ON "SeccionGrupo"("grupoId", "nombre");

-- CreateIndex
CREATE INDEX "Expense_grupoId_idx" ON "Expense"("grupoId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "SeccionGrupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeccionGrupo" ADD CONSTRAINT "SeccionGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
