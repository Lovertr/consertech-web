import type { MetadataRoute } from "next";
import { getPublishedArticles, SITE_URL } from "@/lib/articles";
import { vehicles } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/solution`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/vehicles`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/fleet-management`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/downloads`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/academy`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...vehicles.map((v) => ({ url: `${SITE_URL}/vehicles/${v.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
  const articles = await getPublishedArticles();
  return [
    ...staticPages,
    ...articles.map((a) => ({ url: `${SITE_URL}/blog/${a.slug}`, lastModified: new Date(a.updated_at), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
