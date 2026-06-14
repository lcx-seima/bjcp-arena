ALTER TABLE "users" ADD COLUMN "judge_type" TEXT;

CREATE TABLE "competitions" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "beer_entries" (
  "id" SERIAL PRIMARY KEY,
  "competition_id" INTEGER NOT NULL,
  "entry_number" INTEGER NOT NULL,
  "real_name" TEXT NOT NULL,
  "producer" TEXT NOT NULL,
  "bjcp_category_code" TEXT NOT NULL,
  "bjcp_category_name" TEXT NOT NULL,
  "bjcp_subcategory_code" TEXT NOT NULL,
  "bjcp_subcategory_name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "beer_entries_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT
);

CREATE TABLE "scores" (
  "id" SERIAL PRIMARY KEY,
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
  "public_overall_preference_score" INTEGER,
  "public_aroma_body_foam_score" INTEGER,
  "public_entry_acceptance_score" INTEGER,
  "public_willing_to_drink_score" INTEGER,
  "public_comment" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scores_beer_id_fkey" FOREIGN KEY ("beer_id") REFERENCES "beer_entries"("id") ON DELETE RESTRICT,
  CONSTRAINT "scores_judge_user_id_fkey" FOREIGN KEY ("judge_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX "competitions_status_idx" ON "competitions"("status");
CREATE UNIQUE INDEX "beer_entries_competition_entry_number_key" ON "beer_entries"("competition_id", "entry_number");
CREATE INDEX "beer_entries_competition_status_idx" ON "beer_entries"("competition_id", "status");
CREATE UNIQUE INDEX "scores_beer_judge_user_key" ON "scores"("beer_id", "judge_user_id");
CREATE INDEX "scores_beer_judge_type_idx" ON "scores"("beer_id", "judge_type_snapshot");
