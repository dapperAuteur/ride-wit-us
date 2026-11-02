CREATE TABLE "outbound_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"receiver" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_status" integer,
	"last_reason" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbound_events_receiver_event_key" UNIQUE("receiver","event_id"),
	CONSTRAINT "outbound_events_status_known" CHECK ("outbound_events"."status" IN ('pending', 'sent', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "outbound_events" ADD CONSTRAINT "outbound_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbound_events_due_idx" ON "outbound_events" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "outbound_events_user_idx" ON "outbound_events" USING btree ("user_id");