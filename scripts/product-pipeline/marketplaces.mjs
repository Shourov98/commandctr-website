export const MARKETPLACE_IMAGE_PROFILES = {
  amazon: {
    outputName: "amazon-main.png",
    size: "1024x1024",
    background: "opaque",
    requiresTransparencyBase: true,
    validation: {
      expectedWidth: 1024,
      expectedHeight: 1024,
      alphaRequired: false,
    },
    prefix:
      "Create a production-grade Amazon main product image. Pure white background (#FFFFFF). Single product only. No props, no text, no logos, no watermarks. Product centered and large in frame while preserving full visibility.",
  },
  ebay: {
    outputName: "ebay-main.png",
    size: "1024x1024",
    background: "opaque",
    requiresTransparencyBase: true,
    validation: {
      expectedWidth: 1024,
      expectedHeight: 1024,
      alphaRequired: false,
    },
    prefix:
      "Create a clean eBay-ready main image. Use a neutral white studio background. Single product only. No text or extra props. Keep edges crisp and the product proportionally accurate.",
  },
  etsy: {
    outputName: "etsy-lifestyle.png",
    size: "1024x1024",
    background: "opaque",
    requiresTransparencyBase: false,
    validation: {
      expectedWidth: 1024,
      expectedHeight: 1024,
      alphaRequired: false,
    },
    prefix:
      "Create a polished Etsy lifestyle image. The product should remain the hero. Use a tasteful scene aligned to the product story, with realistic lighting and premium handmade-marketplace presentation.",
  },
  tiktok_shop: {
    outputName: "tiktok-shop.png",
    size: "1024x1536",
    background: "opaque",
    requiresTransparencyBase: false,
    validation: {
      expectedWidth: 1024,
      expectedHeight: 1536,
      alphaRequired: false,
    },
    prefix:
      "Create a vertical TikTok Shop image with strong product focus. Use a conversion-oriented, modern social-commerce look. Keep the product sharp, bold, and visually dominant with no text overlay.",
  },
  shopify: {
    outputName: "shopify-hero.png",
    size: "1536x1024",
    background: "opaque",
    requiresTransparencyBase: false,
    validation: {
      expectedWidth: 1536,
      expectedHeight: 1024,
      alphaRequired: false,
    },
    prefix:
      "Create a premium Shopify hero image. Use a clean branded background with subtle depth and lighting. The product should appear aspirational, realistic, and suitable for a storefront hero panel.",
  },
};
