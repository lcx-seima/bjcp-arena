CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "nickname" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "roles" INTEGER NOT NULL,
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  "auth_version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "users_roles_idx" ON "users"("roles");
CREATE INDEX "users_disabled_idx" ON "users"("disabled");
