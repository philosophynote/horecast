-- CreateTable
CREATE TABLE "RecommendedBet" (
    "id" SERIAL NOT NULL,
    "race_id" INTEGER NOT NULL,
    "bet_type" TEXT NOT NULL,
    "numbers" TEXT NOT NULL,
    "payout" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RecommendedBet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecommendedBet" ADD CONSTRAINT "RecommendedBet_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
