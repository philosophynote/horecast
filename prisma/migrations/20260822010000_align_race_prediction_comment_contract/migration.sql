-- RacePredictionComment is empty in production at the time of this migration,
-- but keep the conversion safe for existing text-array values and NULLs.
ALTER TABLE public."RacePredictionComment"
  ALTER COLUMN "warnings" DROP DEFAULT,
  ALTER COLUMN "warnings" TYPE JSONB
    USING COALESCE(to_jsonb("warnings"), '[]'::JSONB),
  ALTER COLUMN "warnings" SET DEFAULT '[]'::JSONB,
  ALTER COLUMN "warnings" SET NOT NULL;

-- The predictor always supplies generated_at. The default also keeps direct
-- server-side inserts valid when the timestamp is omitted.
UPDATE public."RacePredictionComment"
SET "generated_at" = COALESCE("generated_at", "created_at", CURRENT_TIMESTAMP)
WHERE "generated_at" IS NULL;

ALTER TABLE public."RacePredictionComment"
  ALTER COLUMN "generated_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "generated_at" SET NOT NULL;

-- No policies are added intentionally. Browser roles are denied by default;
-- Prisma's server-side database role and Supabase service_role retain access.
ALTER TABLE public."RacePredictionComment" ENABLE ROW LEVEL SECURITY;
