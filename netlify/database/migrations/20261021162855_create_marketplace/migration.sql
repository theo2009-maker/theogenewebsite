CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"seller_id" text NOT NULL,
	"seller_name" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"price" integer NOT NULL,
	"image" text NOT NULL,
	"location" text NOT NULL,
	"phone" text NOT NULL,
	"recipient_name" text NOT NULL,
	"network" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"listing_id" uuid NOT NULL,
	"buyer_id" text NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listings_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id");