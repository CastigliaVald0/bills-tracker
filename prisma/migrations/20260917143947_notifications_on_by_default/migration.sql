-- AlterTable
ALTER TABLE "User" ALTER COLUMN "notifyMonthlyEmail" SET DEFAULT true,
ALTER COLUMN "notifyMonthlyPush" SET DEFAULT true;

-- Los avisos pasan a venir activados por defecto, también para los usuarios que
-- ya existían. Quien no los quiera los desactiva desde Mi cuenta.
UPDATE "User" SET "notifyMonthlyEmail" = true, "notifyMonthlyPush" = true;
