ALTER TABLE "beer_entries"
  DROP CONSTRAINT "beer_entries_competition_id_fkey",
  ADD CONSTRAINT "beer_entries_competition_id_fkey"
    FOREIGN KEY ("competition_id")
    REFERENCES "competitions"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "competition_rounds"
  DROP CONSTRAINT "competition_rounds_competition_id_fkey",
  ADD CONSTRAINT "competition_rounds_competition_id_fkey"
    FOREIGN KEY ("competition_id")
    REFERENCES "competitions"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "round_beers"
  DROP CONSTRAINT "round_beers_competition_id_fkey",
  DROP CONSTRAINT "round_beers_round_id_fkey",
  DROP CONSTRAINT "round_beers_beer_id_fkey",
  ADD CONSTRAINT "round_beers_competition_id_fkey"
    FOREIGN KEY ("competition_id")
    REFERENCES "competitions"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "round_beers_round_id_fkey"
    FOREIGN KEY ("round_id")
    REFERENCES "competition_rounds"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  ADD CONSTRAINT "round_beers_beer_id_fkey"
    FOREIGN KEY ("beer_id")
    REFERENCES "beer_entries"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "scores"
  DROP CONSTRAINT "scores_competition_id_fkey",
  DROP CONSTRAINT "scores_round_id_fkey",
  DROP CONSTRAINT "scores_beer_id_fkey",
  DROP CONSTRAINT "scores_judge_user_id_fkey",
  ADD CONSTRAINT "scores_competition_id_fkey"
    FOREIGN KEY ("competition_id")
    REFERENCES "competitions"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "scores_round_id_fkey"
    FOREIGN KEY ("round_id")
    REFERENCES "competition_rounds"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "scores_beer_id_fkey"
    FOREIGN KEY ("beer_id")
    REFERENCES "beer_entries"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "scores_judge_user_id_fkey"
    FOREIGN KEY ("judge_user_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
