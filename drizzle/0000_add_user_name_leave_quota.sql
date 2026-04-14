CREATE TYPE "public"."absence_status" AS ENUM('en_attente', 'approuvee', 'refusee');--> statement-breakpoint
CREATE TYPE "public"."absence_type" AS ENUM('conges_payes', 'teletravail', 'maladie', 'sans_solde');--> statement-breakpoint
CREATE TYPE "public"."reject_reason_code" AS ENUM('chevauchement', 'effectif_insuffisant', 'delai_non_respecte', 'autre');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('collaborateur', 'validateur', 'support', 'admin');--> statement-breakpoint
CREATE TABLE "absence_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "absence_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "absence_status" DEFAULT 'en_attente' NOT NULL,
	"processed_by_user_id" uuid,
	"processed_at" timestamp with time zone,
	"reject_reason_code" "reject_reason_code",
	"reject_comment" text,
	"half_day" boolean DEFAULT false NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" varchar(7) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"pole" text,
	"external_source_id" text,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"start_time" time,
	"duration" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"image_url" text,
	"poste" text,
	"leave_quota" numeric(5, 2) DEFAULT '25' NOT NULL,
	"roles" "user_role"[] DEFAULT '{"collaborateur"}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_processed_by_user_id_users_id_fk" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absence_requests_user_status_idx" ON "absence_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_external_source_id_idx" ON "projects" USING btree ("external_source_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_date_idx" ON "time_entries" USING btree ("user_id","work_date");