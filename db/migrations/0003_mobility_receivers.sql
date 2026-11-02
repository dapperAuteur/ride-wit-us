CREATE TABLE "calendar_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"all_day" boolean,
	"time_zone" text,
	"title" text,
	"location" text,
	"calendar_label" text,
	"status" text,
	"trip_token" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_activities_user_event_key" UNIQUE("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "envelope_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"envelope_id" text NOT NULL,
	"link_type" text,
	"link_id" text,
	"link_source" text,
	"label" text NOT NULL,
	"goal_kind" text,
	"balance" numeric(14, 2) NOT NULL,
	"target_amount" numeric(14, 2),
	"target_date" date,
	"currency" char(3) NOT NULL,
	"status" text,
	"as_of" timestamp with time zone,
	"deep_link" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "envelope_balances_user_event_key" UNIQUE("user_id","event_id"),
	CONSTRAINT "envelope_balances_currency_format" CHECK ("envelope_balances"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "finance_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"matched" boolean NOT NULL,
	"transaction_amount" numeric(14, 2),
	"transaction_currency" char(3),
	"transaction_date" date,
	"deep_link" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_matches_user_event_key" UNIQUE("user_id","event_id"),
	CONSTRAINT "finance_matches_currency_format" CHECK ("finance_matches"."transaction_currency" IS NULL OR "finance_matches"."transaction_currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "calendar_activities" ADD CONSTRAINT "calendar_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_balances" ADD CONSTRAINT "envelope_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_matches" ADD CONSTRAINT "finance_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_activities_user_starts_idx" ON "calendar_activities" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "envelope_balances_user_link_idx" ON "envelope_balances" USING btree ("user_id","link_type","link_id");--> statement-breakpoint
CREATE INDEX "finance_matches_user_source_idx" ON "finance_matches" USING btree ("user_id","source_type","source_id");