import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { listProducts } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const staticRoutes = ["", "/cakes", "/how-it-works", "/about", "/contact"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await listProducts({ includeUnavailable: false });
    productRoutes = products.map((p) => ({
      url: `${base}/cakes/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB not reachable at build time — ship the static routes only.
  }

  return [...staticRoutes, ...productRoutes];
}
