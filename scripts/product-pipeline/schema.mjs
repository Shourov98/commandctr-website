export const SUPPORTED_MARKETPLACES = ["amazon", "ebay", "etsy", "tiktok_shop", "shopify"];

const stringField = (description, maxLength) => ({
  type: "string",
  description,
  minLength: 1,
  ...(maxLength ? { maxLength } : {}),
});

const stringArrayField = (description, minItems, maxItems, maxLength) => ({
  type: "array",
  description,
  minItems,
  maxItems,
  items: stringField(description, maxLength),
});

const marketplaceCopySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "highlights", "search_terms", "background_strategy"],
  properties: {
    title: stringField("Marketplace-optimized title.", 220),
    description: stringField("Marketplace-optimized product description.", 4000),
    highlights: stringArrayField("Highlights or bullets for the marketplace.", 3, 6, 240),
    search_terms: stringArrayField("Relevant marketplace search terms.", 5, 20, 60),
    background_strategy: stringField("How the image background should look for this marketplace.", 240),
  },
};

export const PRODUCT_PACKAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug",
    "brand",
    "canonical_title",
    "short_title",
    "one_line_value_prop",
    "product_summary",
    "long_description",
    "bullet_points",
    "materials",
    "care_instructions",
    "specifications",
    "tags",
    "seo",
    "pricing",
    "compliance",
    "marketplaces",
    "image_prompts",
  ],
  properties: {
    slug: stringField("Stable slug for the product.", 80),
    brand: stringField("Brand name.", 120),
    canonical_title: stringField("Primary product title.", 180),
    short_title: stringField("Shorter title for UI or cards.", 120),
    one_line_value_prop: stringField("One-line value proposition.", 180),
    product_summary: stringField("Short summary paragraph.", 500),
    long_description: stringField("Long product description.", 6000),
    bullet_points: stringArrayField("Primary merchandising bullets.", 5, 8, 240),
    materials: stringArrayField("Materials list.", 1, 8, 120),
    care_instructions: stringArrayField("Care or handling instructions.", 1, 6, 180),
    specifications: {
      type: "array",
      minItems: 2,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "value"],
        properties: {
          name: stringField("Specification name.", 80),
          value: stringField("Specification value.", 180),
        },
      },
    },
    tags: stringArrayField("Reusable commerce tags.", 5, 20, 40),
    seo: {
      type: "object",
      additionalProperties: false,
      required: ["meta_title", "meta_description", "keywords"],
      properties: {
        meta_title: stringField("SEO meta title.", 70),
        meta_description: stringField("SEO meta description.", 180),
        keywords: stringArrayField("SEO keywords.", 5, 20, 50),
      },
    },
    pricing: {
      type: "object",
      additionalProperties: false,
      required: ["currency", "list_price", "compare_at_price"],
      properties: {
        currency: stringField("ISO currency code.", 8),
        list_price: {
          type: "number",
          minimum: 0,
        },
        compare_at_price: {
          type: "number",
          minimum: 0,
        },
      },
    },
    compliance: {
      type: "object",
      additionalProperties: false,
      required: ["approved_claims", "blocked_claims", "editor_notes"],
      properties: {
        approved_claims: stringArrayField("Claims that are safe to use.", 1, 10, 180),
        blocked_claims: stringArrayField("Claims to avoid.", 1, 10, 180),
        editor_notes: stringArrayField("Human review notes.", 2, 10, 240),
      },
    },
    marketplaces: {
      type: "object",
      additionalProperties: false,
      required: SUPPORTED_MARKETPLACES,
      properties: {
        amazon: marketplaceCopySchema,
        ebay: marketplaceCopySchema,
        etsy: marketplaceCopySchema,
        tiktok_shop: marketplaceCopySchema,
        shopify: marketplaceCopySchema,
      },
    },
    image_prompts: {
      type: "object",
      additionalProperties: false,
      required: ["base_cutout", ...SUPPORTED_MARKETPLACES],
      properties: {
        base_cutout: stringField("Prompt for extracting or generating a transparent base product image.", 800),
        amazon: stringField("Prompt for Amazon image generation/edit.", 800),
        ebay: stringField("Prompt for eBay image generation/edit.", 800),
        etsy: stringField("Prompt for Etsy image generation/edit.", 800),
        tiktok_shop: stringField("Prompt for TikTok Shop image generation/edit.", 800),
        shopify: stringField("Prompt for Shopify image generation/edit.", 800),
      },
    },
  },
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

export function validateProductBrief(brief) {
  const errors = [];

  assert(brief && typeof brief === "object", "Brief must be an object.", errors);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  assert(isNonEmptyString(brief.productName), "brief.productName is required.", errors);
  assert(isNonEmptyString(brief.brand), "brief.brand is required.", errors);
  assert(isNonEmptyString(brief.category), "brief.category is required.", errors);
  assert(Array.isArray(brief.features) && brief.features.length >= 3, "brief.features must contain at least 3 items.", errors);
  assert(Array.isArray(brief.marketplaces) && brief.marketplaces.length >= 1, "brief.marketplaces must contain at least 1 marketplace.", errors);

  if (Array.isArray(brief.marketplaces)) {
    for (const marketplace of brief.marketplaces) {
      assert(SUPPORTED_MARKETPLACES.includes(marketplace), `Unsupported marketplace "${marketplace}".`, errors);
    }
  }

  if (brief.price != null) {
    assert(typeof brief.price === "number" && brief.price >= 0, "brief.price must be a positive number when provided.", errors);
  }

  if (brief.currency != null) {
    assert(isNonEmptyString(brief.currency), "brief.currency must be a non-empty string when provided.", errors);
  }

  return { ok: errors.length === 0, errors };
}

export function validateProductPackage(productPackage) {
  const errors = [];

  assert(productPackage && typeof productPackage === "object", "Generated package must be an object.", errors);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const requiredStrings = [
    "slug",
    "brand",
    "canonical_title",
    "short_title",
    "one_line_value_prop",
    "product_summary",
    "long_description",
  ];

  for (const key of requiredStrings) {
    assert(isNonEmptyString(productPackage[key]), `productPackage.${key} must be a non-empty string.`, errors);
  }

  assert(Array.isArray(productPackage.bullet_points) && productPackage.bullet_points.length >= 5, "productPackage.bullet_points must contain at least 5 items.", errors);
  assert(Array.isArray(productPackage.materials) && productPackage.materials.length >= 1, "productPackage.materials must contain at least 1 item.", errors);
  assert(Array.isArray(productPackage.care_instructions) && productPackage.care_instructions.length >= 1, "productPackage.care_instructions must contain at least 1 item.", errors);
  assert(Array.isArray(productPackage.specifications) && productPackage.specifications.length >= 2, "productPackage.specifications must contain at least 2 items.", errors);
  assert(Array.isArray(productPackage.tags) && productPackage.tags.length >= 5, "productPackage.tags must contain at least 5 items.", errors);

  assert(productPackage.seo && typeof productPackage.seo === "object", "productPackage.seo must be an object.", errors);
  if (productPackage.seo && typeof productPackage.seo === "object") {
    assert(isNonEmptyString(productPackage.seo.meta_title), "productPackage.seo.meta_title is required.", errors);
    assert(isNonEmptyString(productPackage.seo.meta_description), "productPackage.seo.meta_description is required.", errors);
    assert(Array.isArray(productPackage.seo.keywords) && productPackage.seo.keywords.length >= 5, "productPackage.seo.keywords must contain at least 5 items.", errors);
  }

  assert(productPackage.pricing && typeof productPackage.pricing === "object", "productPackage.pricing must be an object.", errors);
  if (productPackage.pricing && typeof productPackage.pricing === "object") {
    assert(isNonEmptyString(productPackage.pricing.currency), "productPackage.pricing.currency is required.", errors);
    assert(typeof productPackage.pricing.list_price === "number", "productPackage.pricing.list_price must be a number.", errors);
    assert(typeof productPackage.pricing.compare_at_price === "number", "productPackage.pricing.compare_at_price must be a number.", errors);
  }

  assert(productPackage.compliance && typeof productPackage.compliance === "object", "productPackage.compliance must be an object.", errors);
  if (productPackage.compliance && typeof productPackage.compliance === "object") {
    assert(Array.isArray(productPackage.compliance.approved_claims) && productPackage.compliance.approved_claims.length >= 1, "productPackage.compliance.approved_claims must contain at least 1 item.", errors);
    assert(Array.isArray(productPackage.compliance.blocked_claims) && productPackage.compliance.blocked_claims.length >= 1, "productPackage.compliance.blocked_claims must contain at least 1 item.", errors);
    assert(Array.isArray(productPackage.compliance.editor_notes) && productPackage.compliance.editor_notes.length >= 2, "productPackage.compliance.editor_notes must contain at least 2 items.", errors);
  }

  assert(productPackage.marketplaces && typeof productPackage.marketplaces === "object", "productPackage.marketplaces must be an object.", errors);
  if (productPackage.marketplaces && typeof productPackage.marketplaces === "object") {
    for (const marketplace of SUPPORTED_MARKETPLACES) {
      const data = productPackage.marketplaces[marketplace];
      assert(data && typeof data === "object", `productPackage.marketplaces.${marketplace} must be an object.`, errors);
      if (!data || typeof data !== "object") {
        continue;
      }
      assert(isNonEmptyString(data.title), `productPackage.marketplaces.${marketplace}.title is required.`, errors);
      assert(isNonEmptyString(data.description), `productPackage.marketplaces.${marketplace}.description is required.`, errors);
      assert(Array.isArray(data.highlights) && data.highlights.length >= 3, `productPackage.marketplaces.${marketplace}.highlights must contain at least 3 items.`, errors);
      assert(Array.isArray(data.search_terms) && data.search_terms.length >= 5, `productPackage.marketplaces.${marketplace}.search_terms must contain at least 5 items.`, errors);
      assert(isNonEmptyString(data.background_strategy), `productPackage.marketplaces.${marketplace}.background_strategy is required.`, errors);
    }
  }

  assert(productPackage.image_prompts && typeof productPackage.image_prompts === "object", "productPackage.image_prompts must be an object.", errors);
  if (productPackage.image_prompts && typeof productPackage.image_prompts === "object") {
    assert(isNonEmptyString(productPackage.image_prompts.base_cutout), "productPackage.image_prompts.base_cutout is required.", errors);
    for (const marketplace of SUPPORTED_MARKETPLACES) {
      assert(isNonEmptyString(productPackage.image_prompts[marketplace]), `productPackage.image_prompts.${marketplace} is required.`, errors);
    }
  }

  return { ok: errors.length === 0, errors };
}
