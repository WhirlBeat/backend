-- AlterTable
ALTER TABLE "ScoreTiming" ADD COLUMN     "mods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
