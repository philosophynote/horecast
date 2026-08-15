-- CreateTable
CREATE TABLE "RacePredictionComment" (
    "id" SERIAL NOT NULL,
    "netkeiba_race_id" VARCHAR NOT NULL,
    "provider" VARCHAR NOT NULL,
    "model_id" VARCHAR,
    "comment" TEXT NOT NULL,
    "caveat" TEXT,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logic_version" VARCHAR,
    "prompt_version" VARCHAR NOT NULL DEFAULT '',
    "is_partial" BOOLEAN NOT NULL DEFAULT false,
    "source_generated_at" TIMESTAMPTZ(6),
    "generated_at" TIMESTAMPTZ(6),
    "openai_batch_id" VARCHAR,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RacePredictionComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "race_prediction_comment_race_provider_prompt_key" ON "RacePredictionComment"("netkeiba_race_id", "provider", "prompt_version");

-- AddForeignKey
ALTER TABLE "RacePredictionComment" ADD CONSTRAINT "fk_race_prediction_comment_netkeiba_race_id" FOREIGN KEY ("netkeiba_race_id") REFERENCES "Race"("netkeiba_race_id") ON DELETE CASCADE ON UPDATE NO ACTION;
