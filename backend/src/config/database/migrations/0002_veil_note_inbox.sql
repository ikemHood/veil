CREATE TABLE IF NOT EXISTS "veil_note_inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_wallet_address" text NOT NULL,
	"sender_wallet_address" text,
	"wrapper_contract_id" text NOT NULL,
	"commitment" text NOT NULL,
	"tx_hash" text,
	"note_json" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "veil_note_inbox_commitment_idx" ON "veil_note_inbox" USING btree ("wrapper_contract_id", "recipient_wallet_address", "commitment");
CREATE INDEX IF NOT EXISTS "veil_note_inbox_recipient_idx" ON "veil_note_inbox" USING btree ("recipient_wallet_address");
