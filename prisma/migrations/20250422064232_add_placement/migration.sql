/*
  Warnings:

  - Added the required column `placement` to the `ScoreTiming` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ScoreTiming" ADD COLUMN     "placement" INTEGER NOT NULL;
