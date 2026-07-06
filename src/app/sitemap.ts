import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://mail.annex-consultancy.com";
  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
