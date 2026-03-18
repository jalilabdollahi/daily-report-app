CREATE INDEX IF NOT EXISTS "tasks_user_id_date_idx" ON "tasks"("user_id", "date");

CREATE INDEX IF NOT EXISTS "tasks_ticket_title_idx" ON "tasks"("ticket_title");
