CREATE TYPE "public"."unit_system" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TYPE "public"."user_access" AS ENUM('owner', 'member', 'waitlisted');--> statement-breakpoint
CREATE TYPE "public"."trip_mode" AS ENUM('bike', 'ebike', 'scooter', 'walk', 'run', 'car', 'motorcycle', 'bus', 'train', 'plane', 'ferry', 'rideshare', 'taxi', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_energy" AS ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid', 'human');--> statement-breakpoint
CREATE TYPE "public"."vehicle_kind" AS ENUM('car', 'bike', 'ebike', 'motorcycle', 'scooter', 'shoes', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_ownership" AS ENUM('owned', 'rental', 'borrowed');--> statement-breakpoint
CREATE TYPE "public"."place_kind" AS ENUM('home', 'work', 'gym', 'venue', 'other');--> statement-breakpoint
CREATE TYPE "public"."assist_level" AS ENUM('none', 'low', 'high');--> statement-breakpoint
CREATE TYPE "public"."calories_source" AS ENUM('device', 'manual');--> statement-breakpoint
CREATE TYPE "public"."distance_source" AS ENUM('manual', 'route', 'device', 'import');--> statement-breakpoint
CREATE TYPE "public"."record_source" AS ENUM('manual', 'csv_import', 'garmin_csv', 'calendar', 'scan', 'migration', 'demo_seed');--> statement-breakpoint
CREATE TYPE "public"."trip_category" AS ENUM('travel', 'fitness');--> statement-breakpoint
CREATE TYPE "public"."trip_purpose" AS ENUM('commute', 'leisure', 'work', 'errand', 'exercise', 'other');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('waiting', 'invited', 'declined');--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"unit_system" "unit_system" DEFAULT 'imperial' NOT NULL,
	"home_currency" char(3),
	"time_zone" text,
	"default_vehicle_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_home_currency_format" CHECK ("user_settings"."home_currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"witus_sub" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"access" "user_access" DEFAULT 'waitlisted' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "users_witus_sub_unique" UNIQUE("witus_sub")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "vehicle_kind" NOT NULL,
	"nickname" text NOT NULL,
	"make" text,
	"model" text,
	"year" integer,
	"color" text,
	"ownership" "vehicle_ownership" DEFAULT 'owned' NOT NULL,
	"energy" "vehicle_energy",
	"default_trip_mode" "trip_mode",
	"odometer_offset_m" numeric(14, 3),
	"purchase_price" numeric(12, 2),
	"purchase_currency" char(3),
	"purchase_date" date,
	"expected_life_years" numeric(5, 2),
	"expected_life_m" numeric(14, 3),
	"salvage_value" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_purchase_currency_paired" CHECK (("vehicles"."purchase_price" IS NULL AND "vehicles"."salvage_value" IS NULL) OR "vehicles"."purchase_currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "vehicles_year_range" CHECK ("vehicles"."year" IS NULL OR "vehicles"."year" BETWEEN 1885 AND 2100)
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"kind" "place_kind" DEFAULT 'other' NOT NULL,
	"address" text,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_user_label_key" UNIQUE("user_id","label")
);
--> statement-breakpoint
CREATE TABLE "vendor_refs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"centos_contact_id" uuid NOT NULL,
	"centos_location_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_refs_user_contact_location_key" UNIQUE NULLS NOT DISTINCT("user_id","centos_contact_id","centos_location_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"mode" "trip_mode" NOT NULL,
	"status" "trip_status" DEFAULT 'completed' NOT NULL,
	"category" "trip_category" DEFAULT 'travel' NOT NULL,
	"purpose" "trip_purpose",
	"tax_category" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"departed_at" timestamp with time zone,
	"arrived_at" timestamp with time zone,
	"origin_place_id" uuid,
	"destination_place_id" uuid,
	"origin_label" text,
	"destination_label" text,
	"is_round_trip" boolean DEFAULT false NOT NULL,
	"distance_m" numeric(14, 3),
	"distance_source" "distance_source",
	"duration_s" integer,
	"moving_time_s" integer,
	"assist_level" "assist_level",
	"calories_kcal" integer,
	"calories_source" "calories_source",
	"co2_kg" numeric(10, 3),
	"cost_amount" numeric(12, 2),
	"cost_currency" char(3),
	"budget_amount" numeric(12, 2),
	"budget_currency" char(3),
	"vendor_ref_id" uuid,
	"carrier_name" text,
	"flight_number" text,
	"confirmation_number" text,
	"booking_reference" text,
	"booking_url" text,
	"seat_assignment" text,
	"terminal" text,
	"gate" text,
	"check_in_at" timestamp with time zone,
	"check_out_at" timestamp with time zone,
	"accommodation_name" text,
	"accommodation_address" text,
	"room_type" text,
	"pickup_address" text,
	"pickup_at" timestamp with time zone,
	"return_address" text,
	"return_at" timestamp with time zone,
	"loyalty_program" text,
	"loyalty_number" text,
	"packing_notes" text,
	"notes" text,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_user_source_external_key" UNIQUE("user_id","source","external_id"),
	CONSTRAINT "trips_cost_currency_paired" CHECK (("trips"."cost_amount" IS NULL) = ("trips"."cost_currency" IS NULL) AND ("trips"."cost_currency" IS NULL OR "trips"."cost_currency" ~ '^[A-Z]{3}$')),
	CONSTRAINT "trips_budget_currency_paired" CHECK (("trips"."budget_amount" IS NULL) = ("trips"."budget_currency" IS NULL) AND ("trips"."budget_currency" IS NULL OR "trips"."budget_currency" ~ '^[A-Z]{3}$')),
	CONSTRAINT "trips_end_after_start" CHECK ("trips"."end_date" IS NULL OR "trips"."end_date" >= "trips"."start_date"),
	CONSTRAINT "trips_distance_nonnegative" CHECK ("trips"."distance_m" IS NULL OR "trips"."distance_m" >= 0),
	CONSTRAINT "trips_assist_ebike_only" CHECK ("trips"."assist_level" IS NULL OR "trips"."mode" = 'ebike'),
	CONSTRAINT "trips_calories_source_paired" CHECK (("trips"."calories_kcal" IS NULL) = ("trips"."calories_source" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"note" text,
	"status" "waitlist_status" DEFAULT 'waiting' NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_refs" ADD CONSTRAINT "vendor_refs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_origin_place_id_places_id_fk" FOREIGN KEY ("origin_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_destination_place_id_places_id_fk" FOREIGN KEY ("destination_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vendor_ref_id_vendor_refs_id_fk" FOREIGN KEY ("vendor_ref_id") REFERENCES "public"."vendor_refs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicles_user_idx" ON "vehicles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "places_user_idx" ON "places" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendor_refs_user_idx" ON "vendor_refs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trips_user_date_idx" ON "trips" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "trips_vehicle_idx" ON "trips" USING btree ("vehicle_id");