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
	"user_id" varchar(36) NOT NULL,
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
	"user_id" varchar(36) NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_name" varchar(100) NOT NULL,
	"connection_method" "connection_method" NOT NULL,
	"access_token" varchar(2048),
	"refresh_token" varchar(2048),
	"token_expires_at" timestamp with time zone,
	"data_file_path" varchar(500),
	"data_hash" varchar(64),
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone,
	"status" "data_source_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "betting_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"data_source_id" varchar(36) NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"bet_amount" integer NOT NULL,
	"odds" numeric(10, 2) NOT NULL,
	"outcome" varchar(20) NOT NULL,
	"payout_amount" integer,
	"bet_type" varchar(50),
	"league" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_money_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"data_source_id" varchar(36) NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer,
	"recipient" varchar(255),
	"merchant_category" varchar(100),
	"description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" varchar(36),
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
	"user_id" varchar(36) NOT NULL,
	"job_id" varchar(36) NOT NULL,
	"match_score" numeric(5, 2) NOT NULL,
	"explanation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skill_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"job_id" varchar(36) NOT NULL,
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
	"user_id" varchar(36) NOT NULL,
	"job_id" varchar(36),
	"job_application_id" varchar(36),
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
	"loan_id" varchar(36) NOT NULL,
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
	"user_id" varchar(36) NOT NULL,
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
	"user_id" varchar(36) NOT NULL,
	"data_source_id" varchar(36),
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
	"user_id" varchar(36) NOT NULL,
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
	"user_id" varchar(36) NOT NULL,
	"score_id" varchar(36),
	"loan_id" varchar(36),
	"job_application_id" varchar(36),
	"event_type" varchar(100) NOT NULL,
	"feature_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observed_outcome" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
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
	"actor_user_id" varchar(36),
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
	"user_id" varchar(36) NOT NULL,
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
ALTER TABLE "mobile_money_transactions" ADD CONSTRAINT "mobile_money_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD CONSTRAINT "mobile_money_transactions_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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