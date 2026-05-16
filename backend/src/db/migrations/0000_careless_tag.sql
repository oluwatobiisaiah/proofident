DO $$ BEGIN
 CREATE TYPE "public"."source_type" AS ENUM('betting', 'mobile_money', 'telco', 'self_declared');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."connection_method" AS ENUM('oauth', 'manual_upload', 'seeded_demo');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."data_source_status" AS ENUM('active', 'expired', 'disconnected', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."provider_code" AS ENUM('sportybet', 'bet9ja', '1xbet', 'nairabet', 'opay', 'palmpay', 'moniepoint', 'kuda', 'sterling', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."score_range" AS ENUM('prime', 'near_prime', 'subprime', 'deep_subprime');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."confidence_level" AS ENUM('low', 'medium', 'high');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."loan_status" AS ENUM('pending', 'approved', 'disbursed', 'active', 'overdue', 'defaulted', 'completed', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."repayment_status" AS ENUM('pending', 'paid', 'late', 'missed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ingestion_status" AS ENUM('uploaded', 'validating', 'parsed', 'rejected', 'ready_for_scoring', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."risk_severity" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."risk_status" AS ENUM('open', 'reviewing', 'resolved', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'successful', 'failed', 'reversed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."betting_upload_kind" AS ENUM('screenshot', 'csv');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."upload_storage_provider" AS ENUM('cloudinary');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."upload_lifecycle_status" AS ENUM('initiated', 'uploaded', 'processing', 'processed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."extraction_job_status" AS ENUM('queued', 'processing', 'review_required', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."staged_record_status" AS ENUM('pending_review', 'confirmed', 'rejected', 'imported');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."review_action" AS ENUM('confirm', 'edit', 'reject', 'bulk_confirm');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"bvn" varchar(255),
	"bvn_verified" boolean DEFAULT false NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"date_of_birth" date,
	"state" varchar(50),
	"occupation" varchar(100),
	"monthly_income" integer,
	"squad_virtual_account" varchar(20),
	"squad_customer_id" varchar(100),
	"password_hash" varchar(255),
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"otp_code" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"score_range" "score_range" NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"confidence_level" "confidence_level" NOT NULL,
	"completeness_tier" varchar(20) DEFAULT 'tier_3' NOT NULL,
	"inferred_occupation" varchar(100),
	"occupation_confidence" numeric(3, 2),
	"transferable_traits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supporting_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_sources_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"positive_factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"negative_factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"improvement_suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_loan_limit" integer,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_name" varchar(100) NOT NULL,
	"provider_code" "provider_code" DEFAULT 'other',
	"connection_method" "connection_method" NOT NULL,
	"access_token" varchar(2048),
	"refresh_token" varchar(2048),
	"provider_account_ref" varchar(255),
	"consent_reference" varchar(255),
	"token_expires_at" timestamp with time zone,
	"data_file_path" varchar(500),
	"data_hash" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone,
	"status" "data_source_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "betting_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_source_id" uuid NOT NULL,
	"external_bet_id" varchar(120),
	"provider_reference" varchar(120),
	"transaction_date" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"bet_amount" integer NOT NULL,
	"odds" numeric(10, 2) NOT NULL,
	"outcome" varchar(20) NOT NULL,
	"payout_amount" integer,
	"bet_type" varchar(50),
	"league" varchar(100),
	"raw_payload" varchar(4000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "betting_upload_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_source_id" uuid NOT NULL,
	"ingestion_session_id" uuid NOT NULL,
	"kind" "betting_upload_kind" NOT NULL,
	"storage_provider" "upload_storage_provider" DEFAULT 'cloudinary' NOT NULL,
	"lifecycle_status" "upload_lifecycle_status" DEFAULT 'initiated' NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"public_url" varchar(2048) NOT NULL,
	"storage_object_key" varchar(255) NOT NULL,
	"checksum_sha256" varchar(64),
	"file_size_bytes" integer NOT NULL,
	"upload_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "betting_extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_source_id" uuid NOT NULL,
	"ingestion_session_id" uuid NOT NULL,
	"status" "extraction_job_status" DEFAULT 'queued' NOT NULL,
	"parser_code" varchar(100) NOT NULL,
	"ocr_provider" varchar(100),
	"source_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"average_confidence" numeric(5, 4),
	"extracted_record_count" integer DEFAULT 0 NOT NULL,
	"accepted_record_count" integer DEFAULT 0 NOT NULL,
	"rejected_record_count" integer DEFAULT 0 NOT NULL,
	"review_required_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"processing_started_at" timestamp with time zone,
	"processing_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "betting_staged_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_source_id" uuid NOT NULL,
	"ingestion_session_id" uuid NOT NULL,
	"upload_file_id" uuid,
	"extraction_job_id" uuid,
	"status" "staged_record_status" DEFAULT 'pending_review' NOT NULL,
	"row_fingerprint" varchar(128) NOT NULL,
	"external_bet_id" varchar(120),
	"provider_reference" varchar(120),
	"transaction_date" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"bet_amount" integer,
	"odds" numeric(10, 2),
	"outcome" varchar(20),
	"payout_amount" integer,
	"bet_type" varchar(50),
	"league" varchar(100),
	"event_name" varchar(255),
	"extraction_confidence" numeric(5, 4),
	"parser_code" varchar(100) NOT NULL,
	"validation_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_extraction_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewer_notes" varchar(500),
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "betting_record_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staged_record_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" "review_action" NOT NULL,
	"previous_status" varchar(30),
	"next_status" varchar(30) NOT NULL,
	"patch" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_money_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_source_id" uuid NOT NULL,
	"external_transaction_id" varchar(120),
	"provider_reference" varchar(120),
	"transaction_date" timestamp with time zone NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"transaction_status" "transaction_status" DEFAULT 'successful' NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"channel" varchar(50),
	"recipient" varchar(255),
	"counterparty_name" varchar(255),
	"counterparty_account_ref" varchar(255),
	"merchant_category" varchar(100),
	"description" varchar(500),
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid,
	"title" varchar(255) NOT NULL,
	"employer" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"location_state" varchar(100) NOT NULL,
	"location_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"startup_costs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"minimum_income" integer NOT NULL,
	"maximum_income" integer,
	"match_criteria_weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"match_score" numeric(5, 2) NOT NULL,
	"explanation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skill_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"needs_loan" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo_url" varchar(500),
	"squad_account_number" varchar(20),
	"bank_code" varchar(10),
	"account_name" varchar(255),
	"api_key" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"job_application_id" uuid,
	"amount" integer NOT NULL,
	"interest_rate_bps" integer NOT NULL,
	"term_months" integer NOT NULL,
	"monthly_repayment" integer NOT NULL,
	"purpose" varchar(255) NOT NULL,
	"disbursement_destination" varchar(255) NOT NULL,
	"disbursement_reference" varchar(100),
	"decision_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "loan_status" DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"disbursed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"amount" integer NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"squad_reference" varchar(100),
	"status" "repayment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"employer_name" varchar(255),
	"amount" integer NOT NULL,
	"source_reference" varchar(100),
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squad_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(100) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_source_id" uuid,
	"source_type" "source_type" NOT NULL,
	"ingestion_method" "connection_method" NOT NULL,
	"status" "ingestion_status" DEFAULT 'uploaded' NOT NULL,
	"record_count" integer,
	"accepted_count" integer,
	"rejected_count" integer,
	"validation_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" varchar(50) NOT NULL,
	"flag_type" varchar(100) NOT NULL,
	"severity" "risk_severity" NOT NULL,
	"status" "risk_status" DEFAULT 'open' NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "model_feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"score_id" uuid,
	"loan_id" uuid,
	"job_application_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"feature_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observed_outcome" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent" varchar(500),
	"ip_address" varchar(100),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"scope" varchar(255) NOT NULL,
	"request_method" varchar(10) NOT NULL,
	"request_path" varchar(255) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"response_status" varchar(10),
	"response_body" jsonb,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(120) NOT NULL,
	"resource_type" varchar(80) NOT NULL,
	"resource_id" varchar(120),
	"status" varchar(30) NOT NULL,
	"ip_address" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bvn_verification_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bvn_hash" varchar(64) NOT NULL,
	"provider" varchar(50) DEFAULT 'mono' NOT NULL,
	"provider_session_id" varchar(120) NOT NULL,
	"challenge_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_scores" ADD CONSTRAINT "credit_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_data" ADD CONSTRAINT "betting_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_data" ADD CONSTRAINT "betting_data_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_upload_files" ADD CONSTRAINT "betting_upload_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_upload_files" ADD CONSTRAINT "betting_upload_files_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_upload_files" ADD CONSTRAINT "betting_upload_files_ingestion_session_id_ingestion_sessions_id_fk" FOREIGN KEY ("ingestion_session_id") REFERENCES "public"."ingestion_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_extraction_jobs" ADD CONSTRAINT "betting_extraction_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_extraction_jobs" ADD CONSTRAINT "betting_extraction_jobs_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_extraction_jobs" ADD CONSTRAINT "betting_extraction_jobs_ingestion_session_id_ingestion_sessions_id_fk" FOREIGN KEY ("ingestion_session_id") REFERENCES "public"."ingestion_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_staged_records" ADD CONSTRAINT "betting_staged_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_staged_records" ADD CONSTRAINT "betting_staged_records_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_staged_records" ADD CONSTRAINT "betting_staged_records_ingestion_session_id_ingestion_sessions_id_fk" FOREIGN KEY ("ingestion_session_id") REFERENCES "public"."ingestion_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_staged_records" ADD CONSTRAINT "betting_staged_records_upload_file_id_betting_upload_files_id_fk" FOREIGN KEY ("upload_file_id") REFERENCES "public"."betting_upload_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_staged_records" ADD CONSTRAINT "betting_staged_records_extraction_job_id_betting_extraction_jobs_id_fk" FOREIGN KEY ("extraction_job_id") REFERENCES "public"."betting_extraction_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_record_reviews" ADD CONSTRAINT "betting_record_reviews_staged_record_id_betting_staged_records_id_fk" FOREIGN KEY ("staged_record_id") REFERENCES "public"."betting_staged_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betting_record_reviews" ADD CONSTRAINT "betting_record_reviews_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD CONSTRAINT "mobile_money_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD CONSTRAINT "mobile_money_transactions_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_job_application_id_job_applications_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_sessions" ADD CONSTRAINT "ingestion_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_sessions" ADD CONSTRAINT "ingestion_sessions_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_feedback_events" ADD CONSTRAINT "model_feedback_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_feedback_events" ADD CONSTRAINT "model_feedback_events_score_id_credit_scores_id_fk" FOREIGN KEY ("score_id") REFERENCES "public"."credit_scores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_feedback_events" ADD CONSTRAINT "model_feedback_events_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_feedback_events" ADD CONSTRAINT "model_feedback_events_job_application_id_job_applications_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bvn_verification_sessions" ADD CONSTRAINT "bvn_verification_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_bvn_unique" ON "users" USING btree ("bvn");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_squad_virtual_account_unique" ON "users" USING btree ("squad_virtual_account");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "otp_verifications_phone_created_at_idx" ON "otp_verifications" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "otp_verifications_expires_at_idx" ON "otp_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "credit_scores_user_generated_at_idx" ON "credit_scores" USING btree ("user_id","generated_at");--> statement-breakpoint
CREATE INDEX "credit_scores_score_idx" ON "credit_scores" USING btree ("score");--> statement-breakpoint
CREATE INDEX "credit_scores_expires_at_idx" ON "credit_scores" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "data_sources_user_source_type_idx" ON "data_sources" USING btree ("user_id","source_type");--> statement-breakpoint
CREATE INDEX "data_sources_status_idx" ON "data_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "betting_data_user_transaction_date_idx" ON "betting_data" USING btree ("user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "betting_data_transaction_date_idx" ON "betting_data" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "betting_upload_files_session_order_idx" ON "betting_upload_files" USING btree ("ingestion_session_id","upload_order");--> statement-breakpoint
CREATE INDEX "betting_upload_files_session_kind_idx" ON "betting_upload_files" USING btree ("ingestion_session_id","kind");--> statement-breakpoint
CREATE INDEX "betting_upload_files_storage_object_idx" ON "betting_upload_files" USING btree ("storage_object_key");--> statement-breakpoint
CREATE INDEX "betting_extraction_jobs_session_status_idx" ON "betting_extraction_jobs" USING btree ("ingestion_session_id","status");--> statement-breakpoint
CREATE INDEX "betting_extraction_jobs_user_created_idx" ON "betting_extraction_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "betting_staged_records_session_status_idx" ON "betting_staged_records" USING btree ("ingestion_session_id","status");--> statement-breakpoint
CREATE INDEX "betting_staged_records_job_idx" ON "betting_staged_records" USING btree ("extraction_job_id");--> statement-breakpoint
CREATE INDEX "betting_staged_records_user_date_idx" ON "betting_staged_records" USING btree ("user_id","transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX "betting_staged_records_session_fingerprint_idx" ON "betting_staged_records" USING btree ("ingestion_session_id","row_fingerprint");--> statement-breakpoint
CREATE INDEX "betting_record_reviews_staged_record_created_idx" ON "betting_record_reviews" USING btree ("staged_record_id","created_at");--> statement-breakpoint
CREATE INDEX "mobile_money_transactions_user_transaction_date_idx" ON "mobile_money_transactions" USING btree ("user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "mobile_money_transactions_transaction_date_idx" ON "mobile_money_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "jobs_category_idx" ON "jobs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_matches_user_match_score_idx" ON "job_matches" USING btree ("user_id","match_score");--> statement-breakpoint
CREATE INDEX "job_applications_user_status_idx" ON "job_applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "employers_name_unique" ON "employers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "loans_user_status_idx" ON "loans" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "loan_repayments_loan_due_date_idx" ON "loan_repayments" USING btree ("loan_id","due_date");--> statement-breakpoint
CREATE INDEX "income_records_user_received_at_idx" ON "income_records" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "squad_webhooks_event_id_unique" ON "squad_webhooks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "squad_webhooks_event_id_idx" ON "squad_webhooks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "squad_webhooks_processed_idx" ON "squad_webhooks" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "ingestion_sessions_user_status_idx" ON "ingestion_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "risk_flags_user_status_idx" ON "risk_flags" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "model_feedback_events_user_event_type_idx" ON "model_feedback_events" USING btree ("user_id","event_type");--> statement-breakpoint
CREATE INDEX "refresh_sessions_user_expires_idx" ON "refresh_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_key_scope_unique" ON "idempotency_keys" USING btree ("idempotency_key","scope");--> statement-breakpoint
CREATE INDEX "idempotency_keys_pending_idx" ON "idempotency_keys" USING btree ("scope","completed_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_created_idx" ON "audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "bvn_verification_sessions_user_created_idx" ON "bvn_verification_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "bvn_verification_sessions_provider_session_idx" ON "bvn_verification_sessions" USING btree ("provider_session_id");