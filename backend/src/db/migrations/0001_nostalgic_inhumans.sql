ALTER TABLE "data_sources" ADD COLUMN "provider_code" "provider_code" DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "provider_account_ref" varchar(255);--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "consent_reference" varchar(255);--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "betting_data" ADD COLUMN "external_bet_id" varchar(120);--> statement-breakpoint
ALTER TABLE "betting_data" ADD COLUMN "provider_reference" varchar(120);--> statement-breakpoint
ALTER TABLE "betting_data" ADD COLUMN "settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "betting_data" ADD COLUMN "raw_payload" varchar(4000);--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD COLUMN "external_transaction_id" varchar(120);--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD COLUMN "provider_reference" varchar(120);--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD COLUMN "transaction_status" "transaction_status" DEFAULT 'successful' NOT NULL;--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD COLUMN "currency" varchar(3) DEFAULT 'NGN' NOT NULL;--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD COLUMN "channel" varchar(50);--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD COLUMN "counterparty_name" varchar(255);--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD COLUMN "counterparty_account_ref" varchar(255);--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD COLUMN "raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL;