CREATE TABLE "ping_results" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ping_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slot_start" timestamp with time zone,
	"trigger" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"target_url" text NOT NULL,
	"method" text NOT NULL,
	"request_payload" jsonb NOT NULL,
	"status_code" integer,
	"ok" boolean NOT NULL,
	"response_time_ms" integer NOT NULL,
	"response_size_bytes" integer,
	"response_headers" jsonb,
	"response_body" jsonb,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ping_results_slot_start_key" ON "ping_results" USING btree ("slot_start");--> statement-breakpoint
CREATE INDEX "ping_results_requested_at_idx" ON "ping_results" USING btree ("requested_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ping_results_ok_requested_at_idx" ON "ping_results" USING btree ("ok","requested_at");