/*
  Warnings:

  - You are about to drop the `ScoreMultipleTiming` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScoreOneTiming` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ScoreMultipleTiming";

-- DropTable
DROP TABLE "ScoreOneTiming";

-- CreateTable
CREATE TABLE "ScoreTiming" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreTiming_pkey" PRIMARY KEY ("id")
);
