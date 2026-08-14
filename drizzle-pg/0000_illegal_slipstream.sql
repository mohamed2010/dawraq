CREATE TYPE "public"."app_theme" AS ENUM('light', 'dark', 'pink', 'purple');--> statement-breakpoint
CREATE TYPE "public"."mood" AS ENUM('very_low', 'low', 'neutral', 'good', 'great', 'irritable', 'anxious');--> statement-breakpoint
CREATE TYPE "public"."pregnancy_status" AS ENUM('not_pregnant', 'pregnant', 'not_sure');--> statement-breakpoint
CREATE TYPE "public"."relationship_status" AS ENUM('single', 'married');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "cycle_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"start_date" varchar(10) NOT NULL,
	"end_date" varchar(10),
	"symptoms_json" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"entry_date" varchar(10) NOT NULL,
	"mood" "mood" NOT NULL,
	"pain_level" integer DEFAULT 0 NOT NULL,
	"symptoms_json" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"average_cycle_length" integer DEFAULT 28 NOT NULL,
	"typical_bleeding_days" integer DEFAULT 5 NOT NULL,
	"relationship_status" "relationship_status" DEFAULT 'single' NOT NULL,
	"pregnancy_status" "pregnancy_status" DEFAULT 'not_pregnant' NOT NULL,
	"theme" "app_theme" DEFAULT 'pink' NOT NULL,
	"stealth_mode" boolean DEFAULT false NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "cycle_records" ADD CONSTRAINT "cycle_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cycle_records_user_start_idx" ON "cycle_records" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_entries_user_date_unique" ON "daily_entries" USING btree ("user_id","entry_date");