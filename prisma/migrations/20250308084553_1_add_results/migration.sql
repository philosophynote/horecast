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

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
