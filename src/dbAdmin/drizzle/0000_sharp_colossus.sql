CREATE TABLE IF NOT EXISTS "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"msg" text,
	"created" timestamp DEFAULT now()
);
