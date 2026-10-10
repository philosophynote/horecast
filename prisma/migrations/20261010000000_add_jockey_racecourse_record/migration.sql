-- horecast-predictor が集計する騎手成績（騎手 × 期間 × 競馬場 × 芝ダ × 距離帯）を保存する。
-- racecourse / surface は Race.track / Race.course_type と同じ表記で、画面がレースの値をそのまま検索キーに使う。
-- 率（勝率・連対率・複勝率）は保存せず、画面側が rides と各着数から計算する。
-- CreateTable
CREATE TABLE "JockeyRacecourseRecord" (
    "id" SERIAL NOT NULL,
    "jockey_name" VARCHAR NOT NULL,
    "jockey_master_id" INTEGER,
    "period" VARCHAR NOT NULL,
    "racecourse" VARCHAR NOT NULL,
    "surface" VARCHAR NOT NULL,
    "distance_band" VARCHAR NOT NULL,
    "rides" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "seconds" INTEGER NOT NULL,
    "thirds" INTEGER NOT NULL,
    "first_race_date" DATE NOT NULL,
    "last_race_date" DATE NOT NULL,
    "source_version" VARCHAR NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JockeyRacecourseRecord_pkey" PRIMARY KEY ("id")
);

-- predictor の upsert が使う競合キー。UNIQUE制約として作り、ON CONFLICT で参照できるようにする。
ALTER TABLE "JockeyRacecourseRecord"
ADD CONSTRAINT "jockey_racecourse_record_key"
UNIQUE ("jockey_name", "period", "racecourse", "surface", "distance_band");

-- CreateIndex
CREATE INDEX "JockeyRacecourseRecord_jockey_master_id_idx" ON "JockeyRacecourseRecord"("jockey_master_id");
CREATE INDEX "JockeyRacecourseRecord_jockey_name_idx" ON "JockeyRacecourseRecord"("jockey_name");
CREATE INDEX "JockeyRacecourseRecord_jockey_master_id_period_idx" ON "JockeyRacecourseRecord"("jockey_master_id", "period");

-- 騎手名から JockeyMaster へ対応付けられなかった行は null のまま残す。マスタ削除時も集計行は残す。
-- AddForeignKey
ALTER TABLE "JockeyRacecourseRecord"
ADD CONSTRAINT "JockeyRacecourseRecord_jockey_master_id_fkey"
FOREIGN KEY ("jockey_master_id") REFERENCES "JockeyMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS は HorseTimeIndex と同じ扱い: 有効にし、anon・authenticated 向けのポリシーは作らない。
-- Horecast は Server Component から Prisma 経由で読み、predictor は service_role で書き込む。
ALTER TABLE public."JockeyRacecourseRecord" ENABLE ROW LEVEL SECURITY;

-- predictor（service_role）が投入できるよう GRANT をマイグレーションに含める（規約）。
-- HorseTimeIndex では GRANT が無く初回投入が 42501 permission denied になった。
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."JockeyRacecourseRecord" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public."JockeyRacecourseRecord_id_seq" TO service_role;
