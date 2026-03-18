-- AlterTable
ALTER TABLE "public"."tasks"
ADD COLUMN "deleted_at" TIMESTAMP(3),
ALTER COLUMN "story_point" DROP NOT NULL;
