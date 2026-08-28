/**
 * Seed the database with categories, a starter cake catalogue and the admin user.
 * Run with:  npm run db:seed   (uses .env.local)
 * Safe to re-run — it upserts by slug/email.
 */
import { getDb } from "./index";
import { adminUsers, categories, products } from "./schema";
import { hashPassword } from "../lib/password";
import { slugify } from "../lib/utils";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const CATEGORIES = [
  { name: "Celebration Cakes", description: "Show-stopping cakes for birthdays, anniversaries and milestones.", sortOrder: 1 },
  { name: "Wedding Cakes", description: "Tiered and sculpted cakes for the big day.", sortOrder: 2 },
  { name: "Cupcakes & Minis", description: "Boxes of individually decorated cupcakes and mini cakes.", sortOrder: 3 },
  { name: "Everyday Treats", description: "Loaf cakes, brownies and slices for any day of the week.", sortOrder: 4 },
  { name: "Dessert Tables", description: "Curated spreads of cakes, tarts and sweets for events.", sortOrder: 5 },
];

type SeedProduct = {
  name: string;
  category: string;
  priceLkr: number;
  short: string;
  description: string;
  image: string;
  serves: string;
  flavour: string;
  leadTimeDays: number;
  featured?: boolean;
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Belgian Chocolate Fudge Cake",
    category: "Celebration Cakes",
    priceLkr: 6500,
    short: "Three layers of dark chocolate sponge with silky fudge ganache.",
    description:
      "Our best-selling celebration cake. Deep, not-too-sweet Belgian chocolate sponge layered with a whipped dark chocolate ganache and finished with a mirror-glaze drip. Comes with a piped border and space for a short message.",
    image: img("photo-1578985545062-69928b1d9587"),
    serves: "Serves 12–16 · 8 inch round",
    flavour: "Dark chocolate, cocoa, vanilla",
    leadTimeDays: 2,
    featured: true,
  },
  {
    name: "Classic Red Velvet",
    category: "Celebration Cakes",
    priceLkr: 6200,
    short: "Velvety cocoa sponge with tangy cream-cheese frosting.",
    description:
      "A Southern classic done properly — soft red cocoa crumb with a real cream-cheese frosting that is rich without being cloying. Finished with velvet crumb on the sides.",
    image: img("photo-1586788680434-30d324b2d46f"),
    serves: "Serves 10–14 · 7 inch round",
    flavour: "Cocoa, buttermilk, cream cheese",
    leadTimeDays: 2,
    featured: true,
  },
  {
    name: "Vanilla Bean Funfetti",
    category: "Celebration Cakes",
    priceLkr: 5800,
    short: "Buttery vanilla sponge packed with rainbow sprinkles.",
    description:
      "Madagascan vanilla bean sponge shot through with sprinkles, layered with vanilla Swiss meringue buttercream. The crowd-pleaser for kids' parties.",
    image: img("photo-1464349095431-e9a21285b5f3"),
    serves: "Serves 10–14 · 7 inch round",
    flavour: "Vanilla bean, white chocolate",
    leadTimeDays: 2,
  },
  {
    name: "Salted Caramel Drip Cake",
    category: "Celebration Cakes",
    priceLkr: 7200,
    short: "Brown-butter sponge, caramel buttercream, salted caramel drip.",
    description:
      "Brown-butter sponge brushed with caramel syrup, filled with caramel buttercream and a molten salted caramel core, then finished with a caramel drip and shards of honeycomb.",
    image: img("photo-1621303837174-89787a7d4729"),
    serves: "Serves 12–16 · 8 inch round",
    flavour: "Salted caramel, brown butter, honeycomb",
    leadTimeDays: 3,
    featured: true,
  },
  {
    name: "Fresh Strawberry & Cream",
    category: "Celebration Cakes",
    priceLkr: 6800,
    short: "Light sponge layered with fresh strawberries and Chantilly cream.",
    description:
      "A lighter option — vanilla chiffon sponge, macerated local strawberries and lightly sweetened Chantilly cream. Best enjoyed the day it is collected.",
    image: img("photo-1565958011703-44f9829ba187"),
    serves: "Serves 10–12 · 7 inch round",
    flavour: "Strawberry, fresh cream, vanilla",
    leadTimeDays: 2,
  },
  {
    name: "Three-Tier Ivory Wedding Cake",
    category: "Wedding Cakes",
    priceLkr: 42000,
    short: "Elegant buttercream tiers with sugar florals. Flavours to taste.",
    description:
      "A three-tier (6\"/8\"/10\") semi-naked or smooth buttercream cake serving around 80 guests. Choose up to three flavours across the tiers. Includes a complimentary tasting box and delivery within Colombo. Book at least three weeks ahead.",
    image: img("photo-1535254973040-607b474cb50d"),
    serves: "Serves ~80 · three tiers",
    flavour: "Choice of vanilla, chocolate, lemon, red velvet",
    leadTimeDays: 21,
    featured: true,
  },
  {
    name: "Single-Tier Semi-Naked Cake",
    category: "Wedding Cakes",
    priceLkr: 12500,
    short: "Rustic semi-naked finish with fresh flowers for intimate weddings.",
    description:
      "Perfect for registry weddings and small receptions. One 8\" tier with a semi-naked buttercream finish, dressed with seasonal fresh flowers.",
    image: img("photo-1519657337289-077653f724ed"),
    serves: "Serves 16–20 · 8 inch round",
    flavour: "Choice of vanilla, chocolate or lemon",
    leadTimeDays: 7,
  },
  {
    name: "Box of 12 Signature Cupcakes",
    category: "Cupcakes & Minis",
    priceLkr: 4200,
    short: "A dozen swirled cupcakes across four flavours.",
    description:
      "Twelve cupcakes — three each of chocolate, vanilla, red velvet and salted caramel — with a tall buttercream swirl and a sugar decoration. Presented in a windowed gift box.",
    image: img("photo-1535141192574-5d4897c12636"),
    serves: "12 cupcakes",
    flavour: "Chocolate, vanilla, red velvet, salted caramel",
    leadTimeDays: 2,
    featured: true,
  },
  {
    name: "Box of 6 Mini Celebration Cakes",
    category: "Cupcakes & Minis",
    priceLkr: 5400,
    short: "Six 3-inch cakes, individually decorated — great for gifting.",
    description:
      "Six perfectly formed 3\" cakes, each iced and decorated individually. Choose one flavour for the box or a mixed selection.",
    image: img("photo-1607478900766-efe13248b125"),
    serves: "6 mini cakes",
    flavour: "Vanilla, chocolate or lemon",
    leadTimeDays: 3,
  },
  {
    name: "Classic Carrot Loaf",
    category: "Everyday Treats",
    priceLkr: 2600,
    short: "Spiced carrot loaf with walnuts and cream-cheese glaze.",
    description:
      "A generous loaf of moist carrot cake with cinnamon, nutmeg and toasted walnuts, finished with a cream-cheese glaze. Keeps well for three days.",
    image: img("photo-1602351447937-745cb720612f"),
    serves: "Serves 8–10 · loaf",
    flavour: "Carrot, cinnamon, walnut, cream cheese",
    leadTimeDays: 1,
  },
  {
    name: "Fudgy Brownie Slab (16 pieces)",
    category: "Everyday Treats",
    priceLkr: 3200,
    short: "Dense, fudgy brownies with a crackly top. Cut into 16.",
    description:
      "Proper fudge-centre brownies made with 70% dark chocolate and a hit of espresso, baked as a slab and cut into sixteen squares.",
    image: img("photo-1606313564200-e75d5e30476c"),
    serves: "16 pieces",
    flavour: "Dark chocolate, espresso",
    leadTimeDays: 1,
  },
  {
    name: "New York Baked Cheesecake",
    category: "Everyday Treats",
    priceLkr: 5200,
    short: "Dense, creamy baked cheesecake on a biscuit base.",
    description:
      "A tall, dense baked cheesecake with a lemon note and a buttery digestive base. Served plain or with a berry compote on the side.",
    image: img("photo-1533134242443-d4fd215305ad"),
    serves: "Serves 10–12 · 8 inch round",
    flavour: "Cream cheese, lemon, vanilla",
    leadTimeDays: 2,
  },
  {
    name: "Grazing Dessert Table (30 guests)",
    category: "Dessert Tables",
    priceLkr: 28000,
    short: "A styled spread: feature cake, tarts, cupcakes, cookies and cake pops.",
    description:
      "We design and style a dessert table for your event — one feature cake, mini tarts, cupcakes, decorated cookies, cake pops and macarons, scaled for around 30 guests. Includes setup within Colombo and hire of stands and props.",
    image: img("photo-1464347744102-11db6282f854"),
    serves: "~30 guests",
    flavour: "Assorted — customised to your palette",
    leadTimeDays: 14,
    featured: true,
  },
  {
    name: "Afternoon Tea Dessert Box",
    category: "Dessert Tables",
    priceLkr: 6900,
    short: "A sharing box of scones, mini cakes, tarts and macarons for four.",
    description:
      "A grazing box for four — buttermilk scones with jam and cream, mini Victoria sponges, lemon tarts, chocolate éclairs and a row of macarons.",
    image: img("photo-1571115177098-24ec42ed204d"),
    serves: "Serves 4",
    flavour: "Assorted",
    leadTimeDays: 3,
  },
];

async function main() {
  const db = getDb();
  console.log("→ Seeding categories…");
  const catIdBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const slug = slugify(c.name);
    const [row] = await db
      .insert(categories)
      .values({ name: c.name, slug, description: c.description, sortOrder: c.sortOrder })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: c.name, description: c.description, sortOrder: c.sortOrder },
      })
      .returning({ id: categories.id, slug: categories.slug });
    catIdBySlug.set(row.slug, row.id);
  }

  console.log("→ Seeding products…");
  let order = 0;
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const categoryId = catIdBySlug.get(slugify(p.category)) ?? null;
    await db
      .insert(products)
      .values({
        name: p.name,
        slug,
        shortDescription: p.short,
        description: p.description,
        priceCents: Math.round(p.priceLkr * 100),
        imageUrl: p.image,
        gallery: [],
        categoryId,
        servesText: p.serves,
        flavourNotes: p.flavour,
        leadTimeDays: p.leadTimeDays,
        isAvailable: true,
        isFeatured: p.featured ?? false,
        sortOrder: order++,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: p.name,
          shortDescription: p.short,
          description: p.description,
          priceCents: Math.round(p.priceLkr * 100),
          imageUrl: p.image,
          categoryId,
          servesText: p.serves,
          flavourNotes: p.flavour,
          leadTimeDays: p.leadTimeDays,
          isFeatured: p.featured ?? false,
          updatedAt: new Date(),
        },
      });
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    console.log(`→ Upserting admin user (${email})…`);
    await db
      .insert(adminUsers)
      .values({ email, passwordHash: hashPassword(password) })
      .onConflictDoUpdate({
        target: adminUsers.email,
        set: { passwordHash: hashPassword(password) },
      });
  } else {
    console.warn("! ADMIN_EMAIL / ADMIN_PASSWORD not set — skipped admin user.");
  }

  console.log(`✔ Seed complete: ${CATEGORIES.length} categories, ${PRODUCTS.length} products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
