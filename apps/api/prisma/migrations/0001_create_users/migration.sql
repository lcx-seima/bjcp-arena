CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "nickname" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "roles" INTEGER NOT NULL,
  "judge_type" TEXT,
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  "auth_version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "competitions" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ongoing',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "beer_entries" (
  "id" SERIAL PRIMARY KEY,
  "competition_id" INTEGER NOT NULL,
  "entry_code" TEXT NOT NULL,
  "entry_number" INTEGER NOT NULL,
  "bjcp_category_code" TEXT NOT NULL,
  "bjcp_category_name" TEXT NOT NULL,
  "bjcp_subcategory_code" TEXT NOT NULL,
  "bjcp_subcategory_name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "brewery" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "beer_entries_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT
);

CREATE TABLE "competition_rounds" (
  "id" SERIAL PRIMARY KEY,
  "competition_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ongoing',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "competition_rounds_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT
);

CREATE TABLE "round_beers" (
  "id" SERIAL PRIMARY KEY,
  "competition_id" INTEGER NOT NULL,
  "round_id" INTEGER NOT NULL,
  "beer_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "round_beers_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT,
  CONSTRAINT "round_beers_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "competition_rounds"("id") ON DELETE CASCADE,
  CONSTRAINT "round_beers_beer_id_fkey" FOREIGN KEY ("beer_id") REFERENCES "beer_entries"("id") ON DELETE RESTRICT
);

CREATE TABLE "scores" (
  "id" SERIAL PRIMARY KEY,
  "competition_id" INTEGER NOT NULL,
  "round_id" INTEGER NOT NULL,
  "beer_id" INTEGER NOT NULL,
  "judge_user_id" INTEGER NOT NULL,
  "judge_type_snapshot" TEXT NOT NULL,
  "judge_nickname_snapshot" TEXT NOT NULL,
  "professional_aroma_score" INTEGER,
  "professional_aroma_comment" TEXT,
  "professional_appearance_score" INTEGER,
  "professional_appearance_comment" TEXT,
  "professional_flavor_score" INTEGER,
  "professional_flavor_comment" TEXT,
  "professional_mouthfeel_score" INTEGER,
  "professional_mouthfeel_comment" TEXT,
  "professional_overall_score" INTEGER,
  "professional_overall_comment" TEXT,
  "professional_total_score" INTEGER,
  "professional_grade" TEXT,
  "amateur_drinkability_score" INTEGER,
  "amateur_balance_score" INTEGER,
  "amateur_flavor_acceptance_score" INTEGER,
  "amateur_repeat_intention_score" INTEGER,
  "amateur_total_score" INTEGER,
  "amateur_comment" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scores_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT,
  CONSTRAINT "scores_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "competition_rounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "scores_beer_id_fkey" FOREIGN KEY ("beer_id") REFERENCES "beer_entries"("id") ON DELETE RESTRICT,
  CONSTRAINT "scores_judge_user_id_fkey" FOREIGN KEY ("judge_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX "users_roles_idx" ON "users"("roles");
CREATE INDEX "users_disabled_idx" ON "users"("disabled");
CREATE INDEX "competitions_status_idx" ON "competitions"("status");
CREATE UNIQUE INDEX "beer_entries_competition_entry_code_key" ON "beer_entries"("competition_id", "entry_code");
CREATE UNIQUE INDEX "beer_entries_competition_entry_number_key" ON "beer_entries"("competition_id", "entry_number");
CREATE INDEX "beer_entries_competition_idx" ON "beer_entries"("competition_id");
CREATE INDEX "competition_rounds_competition_status_idx" ON "competition_rounds"("competition_id", "status");
CREATE UNIQUE INDEX "round_beers_round_beer_key" ON "round_beers"("round_id", "beer_id");
CREATE INDEX "round_beers_competition_round_idx" ON "round_beers"("competition_id", "round_id");
CREATE INDEX "scores_round_beer_deleted_idx" ON "scores"("round_id", "beer_id", "deleted_at");
CREATE INDEX "scores_round_judge_deleted_idx" ON "scores"("round_id", "judge_user_id", "deleted_at");
