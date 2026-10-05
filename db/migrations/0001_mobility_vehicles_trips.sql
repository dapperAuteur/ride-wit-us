ALTER TYPE "public"."vehicle_ownership" ADD VALUE 'shared';--> statement-breakpoint
ALTER TYPE "public"."trip_purpose" ADD VALUE 'personal';--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "trip_status" DEFAULT 'planned' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"packing_notes" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journeys_end_after_start" CHECK ("journeys"."end_date" IS NULL OR "journeys"."end_date" >= "journeys"."start_date")
);
--> statement-breakpoint
CREATE TABLE "lodging_stays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journey_id" uuid NOT NULL,
	"place_id" uuid,
	"name" text NOT NULL,
	"address" text,
	"check_in_date" date NOT NULL,
	"check_out_date" date NOT NULL,
	"confirmation_number" text,
	"room_type" text,
	"cost_amount" numeric(12, 2),
	"cost_currency" char(3),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lodging_stays_checkout_after_checkin" CHECK ("lodging_stays"."check_out_date" >= "lodging_stays"."check_in_date"),
	CONSTRAINT "lodging_stays_cost_currency_paired" CHECK (("lodging_stays"."cost_amount" IS NULL) = ("lodging_stays"."cost_currency" IS NULL) AND ("lodging_stays"."cost_currency" IS NULL OR "lodging_stays"."cost_currency" ~ '^[A-Z]{3}$'))
);
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "journey_id" uuid;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "leg_order" integer;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "depart_tz" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "arrive_tz" text;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lodging_stays" ADD CONSTRAINT "lodging_stays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lodging_stays" ADD CONSTRAINT "lodging_stays_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lodging_stays" ADD CONSTRAINT "lodging_stays_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journeys_user_date_idx" ON "journeys" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "lodging_stays_journey_idx" ON "lodging_stays" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "lodging_stays_user_idx" ON "lodging_stays" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trips_journey_idx" ON "trips" USING btree ("journey_id");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_arrive_after_depart" CHECK ("trips"."arrived_at" IS NULL OR "trips"."departed_at" IS NULL OR "trips"."arrived_at" >= "trips"."departed_at");