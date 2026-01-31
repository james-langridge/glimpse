import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "CCBot",
          "Google-Extended",
          "anthropic-ai",
          "Claude-Web",
          "Bytespider",
          "Diffbot",
          "Applebot-Extended",
          "FacebookBot",
          "PerplexityBot",
          "Amazonbot",
          "Omgili",
          "cohere-ai",
        ],
        disallow: "/",
      },
    ],
  };
}
