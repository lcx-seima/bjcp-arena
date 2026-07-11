CREATE UNIQUE INDEX "scores_active_round_beer_judge_key"
ON "scores"("round_id", "beer_id", "judge_user_id")
WHERE "deleted_at" IS NULL;
