-- Speed up adjacent-race navigation.
CREATE INDEX "Race_race_time_idx" ON "Race"("race_time");

-- Speed up relation lookups used by the race detail page.
CREATE INDEX "Predict_netkeiba_race_id_idx" ON "Predict"("netkeiba_race_id");
CREATE INDEX "Result_race_id_idx" ON "Result"("race_id");
CREATE INDEX "Payout_race_id_idx" ON "Payout"("race_id");
CREATE INDEX "RecommendedBet_race_id_idx" ON "RecommendedBet"("race_id");
