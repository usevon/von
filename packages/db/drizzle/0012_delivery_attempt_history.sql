CREATE TABLE IF NOT EXISTS "delivery_attempt" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL,
  "delivery_id" uuid NOT NULL,
  "event_id" uuid NOT NULL,
  "endpoint_id" uuid NOT NULL,
  "attempt_number" integer NOT NULL,
  "outcome" text NOT NULL,
  "is_final" boolean DEFAULT false NOT NULL,
  "http_status" integer,
  "error" text,
  "duration_ms" integer NOT NULL,
  "started_at" timestamp NOT NULL,
  "finished_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "delivery_attempt_delivery_number_unique" UNIQUE("delivery_id", "attempt_number")
);
--> statement-breakpoint
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_endpoint_id_endpoint_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoint"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_attempt_delivery_number_idx" ON "delivery_attempt" ("delivery_id", "attempt_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_attempt_org_created_id_idx" ON "delivery_attempt" ("organization_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_attempt_endpoint_created_id_idx" ON "delivery_attempt" ("endpoint_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_attempt_outcome_created_idx" ON "delivery_attempt" ("outcome", "created_at");
