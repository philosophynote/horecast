-- Align HorseIndicator with the JSON payload written by horecast-predictor.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'HorseIndicator'
          AND column_name = 'freshness'
          AND data_type <> 'jsonb'
    ) THEN
        ALTER TABLE "HorseIndicator"
        ALTER COLUMN "freshness" TYPE JSONB
        USING NULL::JSONB;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'HorseIndicator'
          AND column_name = 'positive_factors'
          AND data_type <> 'jsonb'
    ) THEN
        ALTER TABLE "HorseIndicator"
        ALTER COLUMN "positive_factors" DROP DEFAULT,
        ALTER COLUMN "positive_factors" TYPE JSONB USING '[]'::JSONB;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'HorseIndicator'
          AND column_name = 'risks'
          AND data_type <> 'jsonb'
    ) THEN
        ALTER TABLE "HorseIndicator"
        ALTER COLUMN "risks" DROP DEFAULT,
        ALTER COLUMN "risks" TYPE JSONB USING '[]'::JSONB;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'HorseIndicator'
          AND column_name = 'warnings'
          AND data_type <> 'jsonb'
    ) THEN
        ALTER TABLE "HorseIndicator"
        ALTER COLUMN "warnings" DROP DEFAULT,
        ALTER COLUMN "warnings" TYPE JSONB USING '[]'::JSONB;
    END IF;
END $$;

ALTER TABLE "HorseIndicator"
ALTER COLUMN "positive_factors" SET DEFAULT '[]'::JSONB,
ALTER COLUMN "risks" SET DEFAULT '[]'::JSONB,
ALTER COLUMN "warnings" SET DEFAULT '[]'::JSONB;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'horse_indicator_race_horse_number_key'
          AND conrelid = 'public."HorseIndicator"'::regclass
          AND contype = 'u'
    ) THEN
        ALTER TABLE "HorseIndicator"
        ADD CONSTRAINT "horse_indicator_race_horse_number_key"
        UNIQUE USING INDEX "horse_indicator_race_horse_number_key";
    END IF;
END $$;
