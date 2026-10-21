import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
export const listings = pgTable('listings', {
 id: uuid().defaultRandom().primaryKey(), sellerId: text('seller_id').notNull(), sellerName: text('seller_name').notNull(),
 title: text().notNull(), description: text().notNull(), category: text().notNull(), condition: text().notNull(), price: integer().notNull(),
 image: text().notNull(), location: text().notNull(), phone: text().notNull(), recipientName: text('recipient_name').notNull(), network: text().notNull(),
 status: text().notNull().default('pending'), createdAt: timestamp('created_at').defaultNow().notNull()
});
export const orders = pgTable('orders', {
 id: uuid().defaultRandom().primaryKey(), listingId: uuid('listing_id').notNull().references(()=>listings.id), buyerId: text('buyer_id').notNull(),
 buyerName: text('buyer_name').notNull(), buyerPhone: text('buyer_phone').notNull(), amount: integer().notNull(),
 status: text().notNull().default('awaiting_payment'), reference: text(), createdAt: timestamp('created_at').defaultNow().notNull()
});
