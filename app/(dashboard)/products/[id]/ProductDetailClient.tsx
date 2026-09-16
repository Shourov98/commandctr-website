"use client";

import { Box, Eye, Loader2, PencilLine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { productsApi, type ProductListItem } from "@/lib/products";

type MarketKey = "amazon" | "ebay" | "etsy" | "tiktok" | "shopify";

type ApiImageVariant = {
  marketplace: string;
  absolute_path: string;
  relative_path: string;
  validation: { passed: boolean; expected_background: string; errors: string[] };
};

type ApiRecord = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  run_id: string;
  product: {
    core: {
      normalized_title: string;
      category: string;
      product_type: string;
      product_summary: string;
      features: string[];
      attributes: Record<string, string>;
      source_title: string;
    };
    amazon: {
      title: string;
      bullet_points: string[];
      description: string;
      backend_search_terms?: string[];
      structured_attributes?: Record<string, string>;
    };
    ebay: {
      title: string;
      condition: string;
      listing_notes: string;
      item_specifics: Record<string, string>;
    };
    etsy: {
      title: string;
      description: string;
      tags: string[];
      materials: string[];
    };
    tiktok: {
      title: string;
      social_description: string;
      hashtags: string[];
    };
    shopify: {
      title: string;
      body_html: string;
      product_type: string;
      seo_title: string;
      seo_description: string;
      tags: string[];
    };
    images: {
      source: ApiImageVariant;
      transparent_cutout: ApiImageVariant | null;
      amazon: ApiImageVariant;
      ebay: ApiImageVariant;
      etsy: ApiImageVariant;
      tiktok: ApiImageVariant;
      shopify: ApiImageVariant;
    };
  };
  variants: Record<MarketKey, Array<{ id: string; name: string; value: string; variant_type: "size" | "color"; created_at: string }>>;
};

type DetailState =
  | { kind: "loading" }
  | { kind: "product_ai"; record: ApiRecord }
  | { kind: "shopify"; product: ProductListItem }
  | { kind: "error"; message: string };

const marketLabels: Record<MarketKey, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  etsy: "Etsy",
  tiktok: "TikTok Shop",
  shopify: "Shopify",
};

function isComingSoonMarket(market: MarketKey) {
  return market === "ebay" || market === "etsy";
}

function imageUrlFor(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path;
}

export default function ProductDetailClient({ id, sourceHint }: { id: string; sourceHint?: string }) {
  const [state, setState] = useState<DetailState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    async function load() {
      setState({ kind: "loading" });

      const shouldTryProductAiFirst = sourceHint !== "shopify";

      if (shouldTryProductAiFirst) {
        try {
          const response = await fetch(`/api/product-ai/products/${id}`, { cache: "no-store" });
          if (response.ok) {
            const record = (await response.json()) as ApiRecord;
            if (active) {
              setState({ kind: "product_ai", record });
            }
            return;
          }
        } catch {
          // fall through to Shopify lookup
        }
      }

      try {
        const products = await productsApi.getProducts();
        const product = products.find((item) => item._id === id || item.id === id || item.shopifyProductId === id);
        if (product) {
          if (active) {
            setState({ kind: "shopify", product });
          }
          return;
        }
      } catch {
        // no-op, handled below
      }

      if (active) {
        setState({ kind: "error", message: "Could not find product details for this record." });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id, sourceHint]);

  const imageCards = useMemo(() => {
    if (state.kind !== "product_ai") {
      return [];
    }

    const images = state.record.product.images;
    return [
      { key: "source", label: "Source Upload", image: images.source },
      { key: "transparent_cutout", label: "Transparent Cutout", image: images.transparent_cutout },
      { key: "amazon", label: "Amazon", image: images.amazon },
      // Restore active eBay/Etsy image labels when those channels go live again.
      // { key: "ebay", label: "eBay", image: images.ebay },
      // { key: "etsy", label: "Etsy", image: images.etsy },
      { key: "ebay", label: "eBay Coming Soon", image: images.ebay },
      { key: "etsy", label: "Etsy Coming Soon", image: images.etsy },
      { key: "tiktok", label: "TikTok Shop", image: images.tiktok },
      { key: "shopify", label: "Shopify", image: images.shopify },
    ];
  }, [state]);

  if (state.kind === "loading") {
    return (
      <section className="px-4 py-5 md:px-8 md:py-8">
        <div className="rounded-2xl border border-[#dbe2ee] bg-white p-8 text-sm text-[#546884]">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading product details...
          </div>
        </div>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="px-4 py-5 md:px-8 md:py-8">
        <div className="rounded-2xl border border-[#dbe2ee] bg-white p-8 text-sm text-[#546884]">
          {state.message}
        </div>
      </section>
    );
  }

  if (state.kind === "shopify") {
    const { product } = state;
    return (
      <section className="px-4 py-5 md:px-8 md:py-8">
        <div className="space-y-5">
          <header className="rounded-2xl border border-[#2b3a5f] bg-[#1a2545] px-5 py-5 text-white">
            <p className="text-xs font-semibold text-[#aab8d6]">Products &gt; View Product</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{product.title}</h1>
                <p className="mt-1 text-sm text-[#8ea0bf]">Shopify-backed product details.</p>
              </div>
              <div className="flex gap-3">
                <Link className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#51658f] bg-white/5 px-4 text-sm font-semibold text-white" href="/products">
                  <Eye className="h-4 w-4" /> Back to Products
                </Link>
              </div>
            </div>
          </header>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_360px]">
            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <h2 className="text-lg font-semibold text-[#1f2c44]">Product Details</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ReadOnlyField label="Title" value={product.title} />
                <ReadOnlyField label="Vendor / Brand" value={product.vendor || "--"} />
                <ReadOnlyField label="Product Type" value={product.productType || "--"} />
                <ReadOnlyField label="Status" value={product.status || "--"} />
                <ReadOnlyField label="Shopify Product ID" value={product.shopifyProductId || "--"} />
                <ReadOnlyField label="Tags" value={product.tags?.join(", ") || "--"} />
              </div>
              <div className="mt-4">
                <ReadOnlyText label="Description" value={product.description || "No description available."} />
              </div>
            </article>

            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <h2 className="text-lg font-semibold text-[#1f2c44]">Media</h2>
              <div className="mt-4 flex h-72 items-center justify-center overflow-hidden rounded-2xl border border-[#dbe2ee] bg-[#f8fbff]">
                {product.featuredImage ? (
                  <Image alt={product.title} className="h-full w-full object-contain" height={320} src={product.featuredImage} unoptimized width={320} />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#8ea0bf]">
                    <Box className="h-6 w-6" />
                    <p className="text-sm">No image available.</p>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>
    );
  }

  const { record } = state;
  const core = record.product.core;
  const shopify = record.product.shopify;
  const marketplaceBlocks = [
    {
      label: "Amazon",
      fields: [
        ["Title", record.product.amazon.title],
        ["Description", record.product.amazon.description],
        ["Bullet Points", record.product.amazon.bullet_points.join("\n") || "--"],
      ],
    },
    // Restore active eBay content when eBay goes live again.
    // {
    //   label: "eBay",
    //   fields: [
    //     ["Title", record.product.ebay.title],
    //     ["Condition", record.product.ebay.condition],
    //     ["Listing Notes", record.product.ebay.listing_notes],
    //   ],
    // },
    {
      label: "eBay Coming Soon",
      fields: [["Status", "Coming Soon"]],
    },
    // Restore active Etsy content when Etsy goes live again.
    // {
    //   label: "Etsy",
    //   fields: [
    //     ["Title", record.product.etsy.title],
    //     ["Description", record.product.etsy.description],
    //     ["Tags", record.product.etsy.tags.join(", ") || "--"],
    //   ],
    // },
    {
      label: "Etsy Coming Soon",
      fields: [["Status", "Coming Soon"]],
    },
    {
      label: "TikTok Shop",
      fields: [
        ["Title", record.product.tiktok.title],
        ["Social Description", record.product.tiktok.social_description],
        ["Hashtags", record.product.tiktok.hashtags.join(" ") || "--"],
      ],
    },
    {
      label: "Shopify",
      fields: [
        ["Title", shopify.title],
        ["Product Type", shopify.product_type],
        ["SEO Title", shopify.seo_title],
        ["SEO Description", shopify.seo_description],
        ["Tags", shopify.tags.join(", ") || "--"],
      ],
    },
  ];

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-5">
        <header className="rounded-2xl border border-[#2b3a5f] bg-[#1a2545] px-5 py-5 text-white">
          <p className="text-xs font-semibold text-[#aab8d6]">Products &gt; View Product</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{core.normalized_title}</h1>
              <p className="mt-1 text-sm text-[#8ea0bf]">Full Product AI record view with core data, marketplaces, images, and variants.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-[#51658f] bg-white/5 px-3 py-2 text-xs font-semibold text-[#dce7fb]">
                Status: {record.status}
              </span>
              <Link className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#51658f] bg-white/5 px-4 text-sm font-semibold text-white" href={`/products/add?productId=${record.id}`}>
                <PencilLine className="h-4 w-4" /> Edit Product
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <div className="space-y-5">
            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <h2 className="text-lg font-semibold text-[#1f2c44]">Core Product Data</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ReadOnlyField label="Normalized Title" value={core.normalized_title} />
                <ReadOnlyField label="Category" value={core.category} />
                <ReadOnlyField label="Product Type" value={core.product_type} />
                <ReadOnlyField label="Source Title" value={core.source_title} />
              </div>
              <div className="mt-4">
                <ReadOnlyText label="Product Summary" value={core.product_summary} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ReadOnlyText label="Features" value={core.features.join("\n") || "--"} />
                <ReadOnlyText label="Structured Attributes" value={Object.entries(core.attributes).map(([key, value]) => `${key}: ${value}`).join("\n") || "--"} />
              </div>
            </article>

            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <h2 className="text-lg font-semibold text-[#1f2c44]">Marketplace Content</h2>
              <div className="mt-5 space-y-4">
                {marketplaceBlocks.map((block) => (
                  <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4" key={block.label}>
                    <p className="text-sm font-semibold text-[#20314d]">{block.label}</p>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      {block.fields.map(([label, value]) => (
                        <ReadOnlyText key={`${block.label}-${label}`} label={label} value={value || "--"} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <h2 className="text-lg font-semibold text-[#1f2c44]">Variants</h2>
              <div className="mt-5 space-y-4">
                {(Object.keys(record.variants) as MarketKey[]).map((market) => (
                  <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4" key={market}>
                    <p className="text-sm font-semibold text-[#20314d]">{marketLabels[market]}</p>
                    {isComingSoonMarket(market) ? (
                      <>
                        {/* Restore generated variant display for eBay/Etsy when those channels go live again. */}
                        <p className="mt-3 text-sm font-semibold text-[#35bfc8]">Coming Soon</p>
                      </>
                    ) : record.variants[market]?.length ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {record.variants[market].map((variant) => (
                          <div className="rounded-xl border border-[#d5dcea] bg-white px-4 py-3" key={variant.id}>
                            <p className="text-sm font-semibold text-[#31415e]">{variant.name}</p>
                            <p className="mt-1 text-xs text-[#8ea0bf]">
                              {variant.variant_type} • {variant.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[#8ea0bf]">No variants.</p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className="space-y-5">
            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <h2 className="text-lg font-semibold text-[#1f2c44]">Record Info</h2>
              <div className="mt-5 space-y-3">
                <ReadOnlyField label="Product ID" value={record.id} />
                <ReadOnlyField label="Run ID" value={record.run_id} />
                <ReadOnlyField label="Created" value={record.created_at} />
                <ReadOnlyField label="Updated" value={record.updated_at} />
              </div>
            </article>

            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <h2 className="text-lg font-semibold text-[#1f2c44]">Generated Images</h2>
              <div className="mt-4 space-y-4">
                {imageCards.map((item) => {
                  const src = imageUrlFor(item.image?.absolute_path || item.image?.relative_path);
                  return (
                    <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4" key={item.key}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#20314d]">{item.label}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.image?.validation.passed ? "bg-[#def7ea] text-[#2ba66d]" : "bg-[#fff2d6] text-[#f4a632]"}`}>
                          {item.image?.validation.passed ? "Ready" : "Review"}
                        </span>
                      </div>
                      <div className="mt-3 flex h-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d3dbe8] bg-white">
                        {src ? (
                          <Image alt={item.label} className="h-full w-full object-contain" height={220} src={src} unoptimized width={220} />
                        ) : (
                          <p className="px-6 text-center text-sm text-[#8ea0bf]">No generated image.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">{label}</p>
      <p className="mt-3 break-words rounded-xl border border-[#d4ddec] bg-white px-3 py-3 text-sm text-[#31415e]">{value}</p>
    </div>
  );
}

function ReadOnlyText({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">{label}</p>
      <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-[#d4ddec] bg-white px-3 py-3 text-sm leading-6 text-[#31415e]">{value}</pre>
    </div>
  );
}
