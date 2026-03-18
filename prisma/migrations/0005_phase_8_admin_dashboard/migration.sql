ALTER TABLE "tasks"
ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "tasks_flagged_idx" ON "tasks"("flagged");

CREATE TABLE "app_config" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,

  CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "app_config"
ADD CONSTRAINT "app_config_updated_by_fkey"
FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
