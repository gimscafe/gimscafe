import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "in_kitchen",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
]);

export const fulfillmentTypeEnum = pgEnum("fulfillment_type", [
  "delivery",
  "pickup",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "payhere",
  "bank_transfer",
  "cash_on_collection",
]);

/* --------------------------------------------------------------- categories */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ----------------------------------------------------------------- products */

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    shortDescription: varchar("short_description", { length: 280 }),
    description: text("description"),
    /** price in cents (LKR * 100) */
    priceCents: integer("price_cents").notNull(),
    /** what this cake costs us to make, in cents. 0 = not costed yet. */
    costCents: integer("cost_cents").notNull().default(0),
    imageUrl: text("image_url"),
    /** extra gallery images */
    gallery: jsonb("gallery").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    /** "Serves 10–12", "6 inch round", etc. */
    servesText: varchar("serves_text", { length: 120 }),
    flavourNotes: text("flavour_notes"),
    /** how many days notice this cake needs */
    leadTimeDays: integer("lead_time_days").notNull().default(2),
    isAvailable: boolean("is_available").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_available_idx").on(t.isAvailable),
  ],
);

/* ------------------------------------------------------------------- orders */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 16 }).notNull().unique(),
    status: orderStatusEnum("status").notNull().default("pending_payment"),

    // customer (guest checkout — no account)
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    customerEmail: varchar("customer_email", { length: 200 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 40 }).notNull(),

    // fulfilment
    fulfillmentType: fulfillmentTypeEnum("fulfillment_type").notNull(),
    fulfillmentDate: varchar("fulfillment_date", { length: 10 }).notNull(), // YYYY-MM-DD
    fulfillmentTime: varchar("fulfillment_time", { length: 40 }),
    deliveryAddress: text("delivery_address"),
    deliveryCity: varchar("delivery_city", { length: 120 }),
    notes: text("notes"),

    // money (all in cents)
    subtotalCents: integer("subtotal_cents").notNull(),
    deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("LKR"),

    // payment
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("payhere"),
    paymentRef: varchar("payment_ref", { length: 120 }),
    paymentStatusCode: varchar("payment_status_code", { length: 8 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    // snapshot of the product at purchase time
    productName: varchar("product_name", { length: 200 }).notNull(),
    productSlug: varchar("product_slug", { length: 200 }),
    unitPriceCents: integer("unit_price_cents").notNull(),
    /** snapshot of the product cost at purchase time — margins stay historically correct */
    unitCostCents: integer("unit_cost_cents").notNull().default(0),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    cakeMessage: varchar("cake_message", { length: 200 }),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/* -------------------------------------------------------------- admin users */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------- payment events */

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    provider: varchar("provider", { length: 40 }).notNull().default("payhere"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    statusCode: varchar("status_code", { length: 8 }),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payment_events_uniq")
      .on(t.orderId, t.statusCode, t.provider),
  ],
);

/* -------------------------------------------------------------- site visits */

/**
 * First-party, cookie-less-ish traffic log written by the client beacon at
 * /api/track. `visitorId` lives in localStorage (unique visitors), `sessionId`
 * in sessionStorage (sessions). One row per page view.
 */
export const siteVisits = pgTable(
  "site_visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitorId: varchar("visitor_id", { length: 36 }).notNull(),
    sessionId: varchar("session_id", { length: 36 }).notNull(),
    path: varchar("path", { length: 300 }).notNull(),
    referrerHost: varchar("referrer_host", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("site_visits_created_idx").on(t.createdAt),
    index("site_visits_visitor_idx").on(t.visitorId),
  ],
);

/* -------------------------------------------------------------- kpi inputs */

/**
 * Figures the storefront cannot know, entered by staff for one calendar month.
 * Everything is nullable-by-default (0) so a KPI can report "needs input"
 * rather than quietly showing a wrong number.
 */
export const kpiInputs = pgTable("kpi_inputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** YYYY-MM */
  period: varchar("period", { length: 7 }).notNull().unique(),
  /** walk-in / phone / wholesale revenue for the month, in cents */
  offlineRevenueCents: integer("offline_revenue_cents").notNull().default(0),
  /** ad spend + promotions attributable to acquiring customers, in cents */
  marketingCostCents: integer("marketing_cost_cents").notNull().default(0),
  /** total spend on the digital channel (hosting, site, ads, tooling), in cents */
  digitalInvestmentCents: integer("digital_investment_cents").notNull().default(0),
  /** payment gateway fee, in basis points (330 = 3.30%) */
  gatewayFeeBps: integer("gateway_fee_bps").notNull().default(330),
  /** how long an average customer keeps buying, in months — drives CLV */
  customerLifespanMonths: integer("customer_lifespan_months").notNull().default(36),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------- relations */

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

/* -------------------------------------------------------------------- types */

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type AdminUser = typeof adminUsers.$inferSelect;
export type SiteVisit = typeof siteVisits.$inferSelect;
export type KpiInputs = typeof kpiInputs.$inferSelect;
