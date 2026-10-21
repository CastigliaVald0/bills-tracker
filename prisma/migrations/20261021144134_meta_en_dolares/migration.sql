-- AlterTable
ALTER TABLE "AporteMeta" ADD COLUMN     "moneda" "Currency" NOT NULL DEFAULT 'UYU';

-- AlterTable
ALTER TABLE "Grupo" ADD COLUMN     "metaMoneda" "Currency" NOT NULL DEFAULT 'UYU';
