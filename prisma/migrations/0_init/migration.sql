-- CreateTable
CREATE TABLE "Entry" (
    "id" SERIAL NOT NULL,
    "race_id" INTEGER NOT NULL,
    "horse_master_id" INTEGER NOT NULL,
    "bracket_number" INTEGER NOT NULL,
    "horse_number" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "jockey_master_id" INTEGER NOT NULL,
    "jockey_weight" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorseMaster" (
    "id" SERIAL NOT NULL,
    "netkeiba_horse_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorseMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JockeyMaster" (
    "id" SERIAL NOT NULL,
    "netkeiba_jockey_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JockeyMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Predict" (
    "id" SERIAL NOT NULL,
    "netkeiba_race_id" VARCHAR NOT NULL DEFAULT '',
    "horse_number" SMALLINT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" SERIAL NOT NULL,
    "netkeiba_race_id" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "course_type" TEXT NOT NULL,
    "turn" TEXT,
    "distance" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "race_time" TIMESTAMP(6),

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" SERIAL NOT NULL,
    "race_id" INTEGER NOT NULL,
    "rank" TEXT NOT NULL,
    "frame_number" INTEGER NOT NULL,
    "horse_number" INTEGER NOT NULL,
    "horse_name" TEXT NOT NULL,
    "sex_name" TEXT NOT NULL,
    "favorite" INTEGER,
    "odds" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" SERIAL NOT NULL,
    "race_id" INTEGER NOT NULL,
    "bet_type" TEXT NOT NULL,
    "numbers" TEXT NOT NULL,
    "payout" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendedBet" (
    "id" SERIAL NOT NULL,
    "race_id" INTEGER NOT NULL,
    "bet_type" TEXT NOT NULL,
    "numbers" TEXT NOT NULL,
    "payout" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "bet" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "RecommendedBet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "horse_id" ON "Entry"("horse_master_id");

-- CreateIndex
CREATE INDEX "jockey_id" ON "Entry"("jockey_master_id");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_race_id_horse_master_id_key" ON "Entry"("race_id", "horse_master_id");

-- CreateIndex
CREATE UNIQUE INDEX "HorseMaster_netkeiba_horse_id_key" ON "HorseMaster"("netkeiba_horse_id");

-- CreateIndex
CREATE UNIQUE INDEX "JockeyMaster_netkeiba_jockey_id_key" ON "JockeyMaster"("netkeiba_jockey_id");

-- CreateIndex
CREATE UNIQUE INDEX "Race_netkeiba_race_id_key" ON "Race"("netkeiba_race_id");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_horse_master_id_fkey" FOREIGN KEY ("horse_master_id") REFERENCES "HorseMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_jockey_master_id_fkey" FOREIGN KEY ("jockey_master_id") REFERENCES "JockeyMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Predict" ADD CONSTRAINT "fk_netkeiba_race_id" FOREIGN KEY ("netkeiba_race_id") REFERENCES "Race"("netkeiba_race_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedBet" ADD CONSTRAINT "RecommendedBet_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

