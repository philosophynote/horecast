-- CreateTable
CREATE TABLE "HorseIndicator" (
    "id" SERIAL NOT NULL,
    "netkeiba_race_id" VARCHAR NOT NULL,
    "horse_number" SMALLINT NOT NULL,
    "horse_id" VARCHAR,
    "horse_name" TEXT,
    "base_ability" DOUBLE PRECISION,
    "condition_fit" DOUBLE PRECISION,
    "pace_fit" DOUBLE PRECISION,
    "freshness" DOUBLE PRECISION,
    "history_count" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "positive_factors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expected_pace" VARCHAR,
    "logic_version" VARCHAR,
    "is_partial" BOOLEAN NOT NULL DEFAULT false,
    "generated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorseIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "horse_indicator_race_horse_number_key" ON "HorseIndicator"("netkeiba_race_id", "horse_number");

-- AddForeignKey
ALTER TABLE "HorseIndicator" ADD CONSTRAINT "fk_horse_indicator_netkeiba_race_id" FOREIGN KEY ("netkeiba_race_id") REFERENCES "Race"("netkeiba_race_id") ON DELETE CASCADE ON UPDATE NO ACTION;
