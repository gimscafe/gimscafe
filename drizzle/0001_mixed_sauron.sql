CREATE TABLE "kpi_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" varchar(7) NOT NULL,
	"offline_revenue_cents" integer DEFAULT 0 NOT NULL,
	"marketing_cost_cents" integer DEFAULT 0 NOT NULL,
	"digital_investment_cents" integer DEFAULT 0 NOT NULL,
	"gateway_fee_bps" integer DEFAULT 330 NOT NULL,
	"customer_lifespan_months" integer DEFAULT 36 NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_inputs_period_unique" UNIQUE("period")
);
--> statement-breakpoint
CREATE TABLE "site_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" varchar(36) NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"path" varchar(300) NOT NULL,
	"referrer_host" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_cost_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "site_visits_created_idx" ON "site_visits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "site_visits_visitor_idx" ON "site_visits" USING btree ("visitor_id");