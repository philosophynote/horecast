-- horecast-predictor が生成する Horecast タイム指数を保存する。
-- Race に存在しない過去レースも保存するため netkeiba_race_id に外部キーは張らない。
-- CreateTable
CREATE TABLE "HorseTimeIndex" (
    "id" SERIAL NOT NULL,
    "netkeiba_race_id" VARCHAR NOT NULL,
    "horse_number" SMALLINT NOT NULL,
    "horse_name" TEXT NOT NULL,
    "race_date" DATE NOT NULL,
    "racecourse" VARCHAR NOT NULL,
    "surface" VARCHAR NOT NULL,
    "distance" INTEGER NOT NULL,
    "class_name" VARCHAR NOT NULL,
    "going" VARCHAR NOT NULL,
    "time_seconds" DECIMAL(6,1),
    "baseline_seconds" DECIMAL(7,2),
    "baseline_sample_size" INTEGER NOT NULL DEFAULT 0,
    "baseline_confidence" VARCHAR NOT NULL,
    "baseline_version" VARCHAR NOT NULL,
    "horecast_time_index_raw" DECIMAL(7,1),
    "unavailable_reason" VARCHAR,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorseTimeIndex_pkey" PRIMARY KEY ("id")
);

-- predictor の upsert が使う競合キー。UNIQUE制約として作り、ON CONFLICT で参照できるようにする。
ALTER TABLE "HorseTimeIndex"
ADD CONSTRAINT "horse_time_index_race_horse_version_key"
UNIQUE ("netkeiba_race_id", "horse_number", "baseline_version");

-- CreateIndex
CREATE INDEX "HorseTimeIndex_race_date_idx" ON "HorseTimeIndex"("race_date");
CREATE INDEX "HorseTimeIndex_racecourse_idx" ON "HorseTimeIndex"("racecourse");
CREATE INDEX "HorseTimeIndex_netkeiba_race_id_idx" ON "HorseTimeIndex"("netkeiba_race_id");

-- race_indicator が馬履歴と結合できた直近最大5走の指数。既存行は空配列で読める。
-- AlterTable
ALTER TABLE "HorseIndicator"
ADD COLUMN "time_index_recent" JSONB NOT NULL DEFAULT '[]';
