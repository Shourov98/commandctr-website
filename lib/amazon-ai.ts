/** Amazon UK form constraints. Seller SKUs are deliberately excluded from identity matching. */
export type AmazonComparisonInput = {
  model?: string; sku?: string; brand?: string; size?: string;
  size_system?: "US" | "UK" | "EU" | "INT"; color?: string; quantity: number;
  condition: string; country: "GB"; currency: "GBP"; match_mode: "exact";
  include_cross_market: false; price_basis: "item";
};

export function productFact(attributes: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = attributes[key]?.trim();
    if (!value) continue;
    try {
      const parsed: unknown = JSON.parse(value);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      if (typeof first === "object" && first !== null && "value" in first) return String(first.value ?? "").trim();
      if (typeof first === "string" || typeof first === "number") return String(first);
    } catch { /* A plain merchant-entered value is already usable. */ }
    if (!value.startsWith("[") && !value.startsWith("{")) return value;
  }
  return "";
}

export function amazonComparisonOptions(core: Record<string, string>, amazon: Record<string, string>,
                                        condition: string): AmazonComparisonInput {
  const fact = (...keys: string[]) => productFact(amazon, ...keys) || productFact(core, ...keys);
  const size = fact("size", "shoe_size");
  const system = fact("size_system").toUpperCase();
  if (size && !["US", "UK", "EU", "INT"].includes(system)) throw new Error("Choose the size system before researching prices.");
  const quantity = Number(fact("item_package_quantity", "pack_count") || "1");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("Enter a valid pack quantity.");
  const conditions: Record<string, string> = {new_new:"new", used_like_new:"used_like_new",
    used_very_good:"used_good", used_good:"used_good", used_acceptable:"used_fair",
    refurbished_refurbished:"refurbished"};
  if (condition === "used_very_good") throw new Error("Use verified-ASIN pricing for the Very Good subcondition.");
  const model = fact("model_number", "model_no", "model");
  const sku = fact("manufacturer_part_number", "mpn", "style_code");
  if (!model && !sku) throw new Error("Provide the real model number or manufacturer part number, or verify an existing ASIN, before researching prices.");
  return {model:model || undefined, sku:sku || undefined, brand:fact("brand", "brand_name") || undefined,
    size:size || undefined, size_system:size ? system as AmazonComparisonInput["size_system"] : undefined,
    color:fact("color", "colour") || undefined, quantity, condition:conditions[condition] || "unknown",
    country:"GB", currency:"GBP", match_mode:"exact", include_cross_market:false, price_basis:"item"};
}

export function canApplyAmazonPrice(pricing: {
  marketplace?: string; currency?: string; source_mode?: string; comparable_count?: number;
  recommendation_basis?: string; recommended_price?: number | null;
} | null | undefined): boolean {
  return Boolean(pricing && pricing.marketplace === "amazon" && pricing.currency === "GBP" &&
    ["amazon_sp_api", "openai_web_search", "gemini_search"].includes(pricing.source_mode || "") &&
    pricing.recommendation_basis === "active_asking" && (pricing.comparable_count || 0) >= 2 &&
    typeof pricing.recommended_price === "number" && Number.isFinite(pricing.recommended_price) && pricing.recommended_price > 0);
}

export function productImageUrl(path: string, productId?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return `/api/product-ai/image?url=${encodeURIComponent(path)}`;
  if (productId) return `/api/product-ai/products/${encodeURIComponent(productId)}/image?path=${encodeURIComponent(path)}`;
  return `/api/product-ai/image?path=${encodeURIComponent(path)}`;
}
