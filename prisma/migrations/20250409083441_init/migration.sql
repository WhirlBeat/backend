-- CreateTable
CREATE TABLE "ScoreOneTiming" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreOneTiming_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreMultipleTiming" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreMultipleTiming_pkey" PRIMARY KEY ("id")
);
