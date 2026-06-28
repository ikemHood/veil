CREATE TABLE IF NOT EXISTS "veil_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"wallet_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "veil_profile" ADD CONSTRAINT "veil_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "veil_profile_user_id_idx" ON "veil_profile" USING btree ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "veil_profile_handle_idx" ON "veil_profile" USING btree ("handle");
CREATE INDEX IF NOT EXISTS "veil_profile_wallet_address_idx" ON "veil_profile" USING btree ("wallet_address");
