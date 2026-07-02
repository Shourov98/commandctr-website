"use client";

import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Sparkles,
  Tags,
  Upload,
  Download,
  Trash2,
  Filter,
  Scissors,
  ShoppingBag,
  Store,
  Music,
  Gift,
  Code,
  List,
  GripVertical,
  X,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

import { ApiClientError, authStorage } from "@/lib/auth";
import { ebayApi } from "@/lib/ebay";
import { prepareProductAiImageUpload } from "@/lib/product-ai-upload";
import { productsApi, type ProductCreatePayload, type ProductListItem } from "@/lib/products";
import { shopifyProductsApi } from "@/lib/shopify-products";

type MarketKey = "amazon" | "ebay" | "etsy" | "tiktok" | "shopify";

type ApiImageValidation = {
  passed: boolean;
  width: number | null;
  height: number | null;
  format: string | null;
  has_alpha: boolean | null;
  file_size_bytes: number;
  expected_width: number | null;
  expected_height: number | null;
  expected_background: string;
  errors: string[];
  mime_type: string;
};

type ApiImageVariant = {
  marketplace: string;
  relative_path: string;
  absolute_path: string;
  prompt: string;
  generation_mode: string;
  mime_type: string;
  validation: ApiImageValidation;
};

type ApiGeneratedImages = {
  source: ApiImageVariant;
  transparent_cutout: ApiImageVariant | null;
  amazon: ApiImageVariant;
  ebay: ApiImageVariant;
  etsy: ApiImageVariant;
  tiktok: ApiImageVariant;
  shopify: ApiImageVariant;
};

type ApiCore = {
  normalized_title: string;
  category: string;
  product_type: string;
  product_summary: string;
  features: string[];
  attributes: Record<string, string>;
  source_title: string;
  vision_confidence: number;
};

type ExtendedApiCore = ApiCore & {
  brand?: string;
};

type ApiAmazon = {
  title: string;
  bullet_points: string[];
  description: string;
  backend_search_terms: string[];
  structured_attributes: Record<string, string>;
};

type ApiEbay = {
  title: string;
  item_specifics: Record<string, string>;
  condition: string;
  marketplace_id: string;
  currency: string;
  category_id: string;
  description_override: string;
  listing_notes: string;
};

type ApiTiktok = {
  title: string;
  social_description: string;
  hashtags: string[];
};

type ApiShopifyVariant = {
  title: string;
  price: string;
  sku: string;
  inventoryQuantity: number;
  trackInventory: boolean;
  barcode: string;
  compareAtPrice: string;
  weight: string;
  weightUnit: string;
};

type ApiShopifyOption = {
  name: string;
  values: string[];
};

type ApiShopify = {
  title: string;
  body_html: string;
  tags: string[];
  product_type: string;
  seo_title: string;
  seo_description: string;
  compare_at_price?: string;
  cost_per_item?: string;
  charge_tax?: boolean;
  barcode?: string;
  inventory_tracked?: boolean;
  continue_selling_out_of_stock?: boolean;
  stock_locations?: Array<{
    name: string;
    available: number;
    on_hand?: number;
    unavailable?: number;
    committed?: number;
  }>;
  physical_product?: boolean;
  weight?: string;
  weight_unit?: string;
  country_of_origin?: string;
  hs_code?: string;
  collections?: string[];
  theme_template?: string;
  seo_handle?: string;
  category?: string;
  metafields?: Record<string, string>;
  has_variants?: boolean;
  options?: ApiShopifyOption[];
  variants?: ApiShopifyVariant[];
};

type ApiEtsy = {
  title: string;
  description: string;
  tags: string[];
  materials: string[];
  occasion: string;
  seo_keywords: string[];
};

type ApiResearchEvidence = {
  source: string;
  title: string;
  url?: string | null;
  price?: number | null;
  list_price?: number | null;
  sale_price?: number | null;
  discount_percent?: number | null;
  currency: string;
  relevance_score?: number;
};

type ApiMarketplaceResearch = {
  marketplace: string;
  source_mode: string;
  search_queries: string[];
  keyword_signals: string[];
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  regular_price_avg: number | null;
  sale_price_avg: number | null;
  discount_percent_avg: number | null;
  similar_listings: ApiResearchEvidence[];
};

type ApiMarketResearchBundle = {
  amazon: ApiMarketplaceResearch;
  ebay: ApiMarketplaceResearch;
  etsy: ApiMarketplaceResearch;
  tiktok: ApiMarketplaceResearch;
  shopify: ApiMarketplaceResearch;
};

type ApiSeoInsights = {
  primary_keywords: string[];
  secondary_keywords: string[];
  title_terms: string[];
  marketplace_keywords: Record<string, string[]>;
};

type ApiIntelligence = {
  research: ApiMarketResearchBundle;
  seo: ApiSeoInsights;
  validation?: unknown;
};

type ApiProduct = {
  core: ApiCore;
  amazon: ApiAmazon;
  ebay: ApiEbay;
  etsy: ApiEtsy;
  tiktok: ApiTiktok;
  shopify: ApiShopify;
  images: ApiGeneratedImages;
  intelligence?: ApiIntelligence | null;
};

type ApiVariant = {
  id: string;
  marketplace: MarketKey;
  variant_type: "size" | "color";
  name: string;
  value: string;
  image: ApiImageVariant | null;
  created_at: string;
};

type ApiRecord = {
  id: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  run_id: string;
  product: ApiProduct;
  variants: Record<MarketKey, ApiVariant[]>;
};

type ImportApiRecord = {
  id: string;
  status: string;
  linked_product_id?: string | null;
  product: ApiProduct;
  variants: Record<MarketKey, ApiVariant[]>;
};

type ImportPreviewFallback = {
  id: string;
  normalized_title: string;
  category: string;
  product_type: string;
  preview_image_path: string;
};

type ApiSuggestedPriceRange = {
  minimum: number;
  maximum: number;
  recommended: number;
  currency: string;
  source: string;
};

type ApiMarketplacePricingSnapshot = {
  marketplace: MarketKey;
  source_mode: string;
  search_queries: string[];
  comparable_count: number;
  recommended_price: number | null;
  currency: string;
  suggested_price_range: ApiSuggestedPriceRange | null;
  market_signal: string;
  analysis_summary: string;
  similar_listings: Array<{
    source: string;
    title: string;
    url?: string | null;
    price?: number | null;
    currency: string;
  }>;
};

type ApiProductPricingSnapshot = {
  product_id: string;
  generated_at: string;
  markets: ApiMarketplacePricingSnapshot[];
};

type ApiDynamicPricingQueryResponse = {
  query: string;
  generated_at: string;
  markets: ApiMarketplacePricingSnapshot[];
};

type MarketActionState = Record<MarketKey, boolean>;
type PublishTarget = "commandctr" | MarketKey;
type PublishActionState = Record<PublishTarget, boolean>;
type PublishStatus = "DRAFT" | "ACTIVE";
type ImageCardKey = "source" | "transparent_cutout" | MarketKey;
type SavedDraftSnapshot = {
  draft: ApiProduct;
  variantsByMarket: Record<MarketKey, ApiVariant[]>;
  productId: string | null;
  backendProductId: string | null;
  ebayListingId?: string | null;
  ebayListingStatus?: string | null;
  shopifyProductId: string | null;
  sourceTitle: string;
  publishVendor: string;
  publishDescription: string;
  publishPrice: string;
  publishSku: string;
  publishStatus: PublishStatus;
  publishStock: string;
  publishOnOnlineStore: boolean;
  publishTrackInventory: boolean;
  savedAt: string;
};

type LocalDraftSeed = {
  title: string;
  imagePath: string;
  imageMimeType: string;
};

type ImageCardConfig = {
  key: ImageCardKey;
  label: string;
  image: ApiImageVariant | null;
  note: string;
};

type PublishFieldErrors = {
  title: boolean;
  price: boolean;
};

type DraftSaveState = "idle" | "saving" | "saved";
type ShopifyUploadMode = "active" | "draft";

const AmazonLogo = ({ className, mode = "light" }: { className?: string; mode?: "light" | "dark" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M19 8h-3V6a4 4 0 0 0-8 0v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM10 6a2 2 0 0 1 4 0v2h-4V6z" fill={mode === "dark" ? "#FFFFFF" : "#232F3E"} />
    <path d="M7 14.5c2.5 2 7.5 2 10 0" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" />
    <path d="M15.5 14l2.5 1-1 2" fill="#FF9900" />
  </svg>
);

const EbayLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="24" height="24" rx="5" fill="#f5f7fa" />
    <path d="M6 14.5c0 1.2.8 1.8 1.8 1.8.6 0 1.2-.2 1.6-.5l.4.8c-.6.4-1.4.7-2.2.7-1.8 0-3-1-3-3 0-2 1.2-3 2.8-3 1.8 0 2.4 1.3 2.4 2.7v.5H6zm2.2-.8c0-.9-.4-1.4-1.2-1.4-.8 0-1.3.5-1.4 1.4h2.6z" fill="#e53238" />
    <path d="M12 9.5v2.8c-.4-.5-1-.8-1.7-.8-1.5 0-2.5 1.1-2.5 2.8s1 2.8 2.5 2.8c.7 0 1.3-.3 1.7-.8v.7h1.2V9.5H12zm-.2 4.7c0 1-.6 1.6-1.3 1.6-.8 0-1.3-.6-1.3-1.6s.5-1.6 1.3-1.6c.7 0 1.3.6 1.3 1.6z" fill="#0064d2" />
    <path d="M18 12.8c-.4-.7-1.1-1-1.9-1-1.4 0-2.4 1-2.4 2.5s1 2.5 2.4 2.5c.8 0 1.5-.3 1.9-1v1h1.2v-4.5h-1.2v.5zm-.2 1.8c0 .8-.5 1.3-1.2 1.3-.7 0-1.2-.5-1.2-1.3s.5-1.3 1.2-1.3c.7 0 1.2.5 1.2 1.3z" fill="#f5af02" />
    <path d="M22 11.5l-1.6 4-1.2-4h-1.3l2 5.5-1.5 3.5h1.3L23.3 11.5H22z" fill="#86b817" />
  </svg>
);

const EtsyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="24" height="24" rx="5" fill="#F1641E" />
    <path d="M8 7h8v2.2h-1.8v-.7H10.6v3.7h3.9v1.5h-3.9v4.2H16v-.7h1.5v2.4H8V7z" fill="#FFFFFF" />
  </svg>
);

const TikTokLogo = ({ className, mode = "light" }: { className?: string; mode?: "light" | "dark" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12.5 5.5v9.5c0 1.9-1.5 3.5-3.5 3.5S5.5 16.9 5.5 15c0-1.9 1.5-3.5 3.5-3.5.3 0 .6.1.9.2V8.9c-.3-.1-.6-.1-.9-.1-3.6 0-6.5 2.9-6.5 6.5S5.4 21.8 9 21.8s6.5-2.9 6.5-6.5V9.5c1.4 1 3.1 1.5 5 1.5V8c-1.9 0-3.5-.8-4.5-2.2l-3.5-.3z" fill="#25F4EE" />
    <path d="M11.5 4.5V14c0 1.9-1.5 3.5-3.5 3.5S4.5 15.9 4.5 14c0-1.9 1.5-3.5 3.5-3.5.3 0 .6.1.9.2V7.9c-.3-.1-.6-.1-.9-.1-3.6 0-6.5 2.9-6.5 6.5S4.4 20.8 8 20.8s6.5-2.9 6.5-6.5V8.5c1.4 1 3.1 1.5 5 1.5V7c-1.9 0-3.5-.8-4.5-2.2l-3.5-.3z" fill="#FE2C55" />
    <path d="M12 5v9.5c0 1.9-1.5 3.5-3.5 3.5S5 16.4 5 14.5s1.5-3.5 3.5-3.5.6.1.9.2V8.4c-.3-.1-.6-.1-.9-.1-3.6 0-6.5 2.9-6.5 6.5S4.9 21.3 8.5 21.3s6.5-2.9 6.5-6.5V9c1.4 1 3.1 1.5 5 1.5V7.5c-1.9 0-3.5-.8-4.5-2.2L12 5z" fill={mode === "dark" ? "#FFFFFF" : "#000000"} />
  </svg>
);

const ShopifyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M19 8h-3V6a4 4 0 0 0-8 0v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM10 6a2 2 0 0 1 4 0v2h-4V6z" fill="#5e8e3e" />
    <path d="M18.5 9h-13c-.8 0-1.5.7-1.5 1.5V20c0 .8.7 1.5 1.5 1.5h13c.8 0 1.5-.7 1.5-1.5V10.5c0-.8-.7-1.5-1.5-1.5z" fill="#95bf47" />
    <path d="M11 12.5c-1.2 0-2 .6-2 1.5s.8 1.5 2 1.5 2 .5 2 1.5c0 .9-.8 1.5-2 1.5-1.2 0-2-.6-2-1.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const filterOptions = [
  { key: "all", label: "All Channels", icon: Boxes },
  { key: "source", label: "Source Upload", icon: Upload },
  { key: "transparent_cutout", label: "Transparent Cutout", icon: Scissors },
  { key: "amazon", label: "Amazon Main", icon: AmazonLogo },
  { key: "ebay", label: "eBay Main", icon: EbayLogo },
  { key: "etsy", label: "Etsy Hero", icon: EtsyLogo },
  { key: "tiktok", label: "TikTok Shop", icon: TikTokLogo },
  { key: "shopify", label: "Shopify Composition", icon: ShopifyLogo },
];

const marketOrder: MarketKey[] = ["amazon", "ebay", "etsy", "tiktok", "shopify"];

const marketLabels: Record<MarketKey, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  etsy: "Etsy",
  tiktok: "TikTok Shop",
  shopify: "Shopify",
};

const marketIcons: Record<MarketKey, React.ComponentType<{ className?: string; mode?: "light" | "dark" }>> = {
  amazon: AmazonLogo,
  ebay: EbayLogo,
  etsy: EtsyLogo,
  tiktok: TikTokLogo,
  shopify: ShopifyLogo,
};

const marketTabStyles: Record<
  MarketKey,
  {
    active: string;
    inactive: string;
  }
> = {
  amazon: {
    active: "bg-[#fffbf0] border-[#ff9900] text-[#7a4b00] shadow-[0_3px_12px_-3px_rgba(255,153,0,0.25)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#fffdf7] hover:border-[#ff9900]/40 hover:text-slate-900 border",
  },
  ebay: {
    active: "bg-[#f0f6ff] border-[#0064d2] text-[#004b9e] shadow-[0_3px_12px_-3px_rgba(0,100,210,0.2)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#f4f8ff] hover:border-[#0064d2]/40 hover:text-slate-900 border",
  },
  etsy: {
    active: "bg-[#fff5f0] border-[#F1641E] text-[#b33d00] shadow-[0_3px_12px_-3px_rgba(241,100,30,0.25)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#fffcf7] hover:border-[#F1641E]/40 hover:text-slate-900 border",
  },
  tiktok: {
    active: "bg-[#0d0d0d] border-[#222] text-white shadow-[0_3px_12px_-3px_rgba(0,0,0,0.4)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#fafafa] hover:border-black/30 hover:text-slate-900 border",
  },
  shopify: {
    active: "bg-[#f4faf0] border-[#95bf47] text-[#3b591b] shadow-[0_3px_12px_-3px_rgba(149,191,71,0.25)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fdf6] hover:border-[#95bf47]/40 hover:text-slate-900 border",
  },
};

const publishTabStyles: Record<
  PublishTarget,
  {
    active: string;
    inactive: string;
  }
> = {
  commandctr: {
    active: "bg-[#f0f9ff] border-[#0284c7] text-[#0369a1] shadow-[0_3px_12px_-3px_rgba(2,132,199,0.25)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#f0f9ff] hover:border-[#0284c7]/40 hover:text-slate-900 border",
  },
  amazon: {
    active: "bg-[#fffbf0] border-[#ff9900] text-[#7a4b00] shadow-[0_3px_12px_-3px_rgba(255,153,0,0.25)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#fffdf7] hover:border-[#ff9900]/40 hover:text-slate-900 border",
  },
  ebay: {
    active: "bg-[#f0f6ff] border-[#0064d2] text-[#004b9e] shadow-[0_3px_12px_-3px_rgba(0,100,210,0.2)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#f4f8ff] hover:border-[#0064d2]/40 hover:text-slate-900 border",
  },
  etsy: {
    active: "bg-[#fff5f0] border-[#F1641E] text-[#b33d00] shadow-[0_3px_12px_-3px_rgba(241,100,30,0.25)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#fffcf7] hover:border-[#F1641E]/40 hover:text-slate-900 border",
  },
  tiktok: {
    active: "bg-[#0d0d0d] border-[#222] text-white shadow-[0_3px_12px_-3px_rgba(0,0,0,0.4)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#fafafa] hover:border-black/30 hover:text-slate-900 border",
  },
  shopify: {
    active: "bg-[#f4faf0] border-[#95bf47] text-[#3b591b] shadow-[0_3px_12px_-3px_rgba(149,191,71,0.25)] border",
    inactive: "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fdf6] hover:border-[#95bf47]/40 hover:text-slate-900 border",
  },
};

const dropdownSelectedStyles: Record<string, string> = {
  all: "bg-[#edf5ff] text-[#1b2748]",
  source: "bg-[#f1f5f9] text-slate-700",
  transparent_cutout: "bg-[#f1f5f9] text-slate-700",
  amazon: "bg-[#fffbf0] text-[#7a4b00] border-l-2 border-[#ff9900]",
  ebay: "bg-[#f0f6ff] text-[#004b9e] border-l-2 border-[#0064d2]",
  etsy: "bg-[#fff5f0] text-[#b33d00] border-l-2 border-[#F1641E]",
  tiktok: "bg-[#f4fafc] text-black border-l-2 border-[#25F4EE]",
  shopify: "bg-[#f4faf0] text-[#3b591b] border-l-2 border-[#95bf47]",
};

const dropdownTriggerStyles: Record<string, string> = {
  all: "border-[#d4ddec] bg-[#f8fbff] text-[#31415e]",
  source: "border-[#cbd5e1] bg-[#f8fafc] text-slate-700",
  transparent_cutout: "border-[#cbd5e1] bg-[#f8fafc] text-slate-700",
  amazon: "border-[#ffd5b4] bg-[#fffbf0] text-[#7a4b00] shadow-[0_2px_8px_-3px_rgba(255,153,0,0.15)]",
  ebay: "border-[#b3d4ff] bg-[#f0f6ff] text-[#004b9e] shadow-[0_2px_8px_-3px_rgba(0,100,210,0.15)]",
  etsy: "border-[#ffcab0] bg-[#fff5f0] text-[#b33d00] shadow-[0_2px_8px_-3px_rgba(241,100,30,0.15)]",
  tiktok: "border-[#b2f5f1] bg-[#f4fafc] text-black shadow-[0_2px_8px_-3px_rgba(37,244,238,0.15)]",
  shopify: "border-[#cbe8ba] bg-[#f4faf0] text-[#3b591b] shadow-[0_2px_8px_-3px_rgba(149,191,71,0.15)]",
};


const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </svg>
);

const DragHandleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
    <circle cx="9" cy="5" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="19" r="1" fill="currentColor" />
    <circle cx="15" cy="5" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="19" r="1" fill="currentColor" />
  </svg>
);

const RECOMMENDED_OPTIONS = [
  { name: "Color", defaults: ["Black", "White", "Red", "Blue", "Green", "Yellow", "Grey", "Brown", "Pink", "Purple"] },
  { name: "Size", defaults: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "0", "0.5", "1"] },
  { name: "Footwear material", defaults: ["Leather", "Suede", "Canvas", "Mesh", "Synthetic", "Rubber"] },
  { name: "Age group", defaults: ["0-6 months", "6-12 months", "1-2 years", "Adults", "All ages", "Babies", "Kids", "Newborn", "Teens", "Toddlers"] },
  { name: "Care instructions", defaults: ["Machine wash", "Hand wash", "Dry clean only", "Tumble dry low", "Do not iron"] },
  { name: "Closure type", defaults: ["Lace-up", "Slip-on", "Velcro", "Zipper", "Buckle"] },
  { name: "Heel height type", defaults: ["Flat", "Low heel", "Mid heel", "High heel"] },
  { name: "Occasion style", defaults: ["Casual", "Formal", "Sports", "Party", "Workwear"] },
  { name: "Shoe features", defaults: ["Lightweight", "Waterproof", "Cushioned", "Breathable", "Slip-resistant"] },
  { name: "Shoe fit", defaults: ["Regular fit", "Wide fit", "Narrow fit"] },
  { name: "Target gender", defaults: ["Unisex", "Male", "Female", "Kids unisex"] },
  { name: "Toe style", defaults: ["Round toe", "Pointed toe", "Square toe", "Open toe"] },
];

// ---------------------------------------------------------------------------
// Shopify category metafield schemas
// ---------------------------------------------------------------------------
// Each entry maps a Shopify category prefix (case-insensitive) to the
// list of metafields the form should render for products in that
// category. The category strings are matched against the *start* of
// ``draft.shopify.category`` (the value the LLM suggested or the user
// typed). When no prefix matches, ``getMetafieldSchema`` falls back to
// a small generic schema so the form is never empty.
//
// The schemas are intentionally hand-curated for the most common
// verticals; new verticals can be added without changing the rendering
// code. The dropdown options are taken from the Shopify Product
// taxonomy for the corresponding category.
//
// IMPORTANT: the ``key`` is what we send to the backend as the
// ``metafields[key]`` field and is also the key the LLM is told to
// return in its ``metafields`` JSON list.

type MetafieldDef = {
  key: string;
  label: string;
  type: "select" | "text";
  options?: string[];
  help?: string;
  colorDot?: boolean;
};

type MetafieldSchema = {
  id: string;          // stable id used by the picker
  title: string;       // friendly title shown to the user
  description: string; // sub-line under the heading
  fields: MetafieldDef[];
};

const SHOPIFY_METAFIELD_SCHEMAS: Record<string, MetafieldSchema> = {
  "Beauty & Personal Care > Hair Care > Hair Masks": {
    id: "beauty-hair-mask",
    title: "Beauty — Hair Mask",
    description: "Shopify metafields for hair masks and deep conditioners.",
    fields: [
      { key: "hair_type", label: "Hair Type", type: "select", options: ["All hair types", "Dry", "Oily", "Curly", "Straight", "Wavy", "Color-treated", "Damaged", "Fine", "Thick"] },
      { key: "hair_concern", label: "Hair Concern", type: "select", options: ["Frizz", "Damage", "Dryness", "Breakage", "Dullness", "Volume", "Scalp care"] },
      { key: "key_ingredient", label: "Key Ingredient", type: "text", help: "e.g. Argan oil, Keratin, Coconut oil" },
      { key: "formulation", label: "Formulation", type: "select", options: ["Cream", "Oil", "Mask", "Bal", "Conditioner", "Serum"] },
      { key: "scent", label: "Scent", type: "text", help: "e.g. Coconut, Vanilla, Unscented" },
      { key: "free_from", label: "Free From", type: "text", help: "e.g. Sulfates, Parabens, Silicones" },
      { key: "volume_ml", label: "Volume (ml)", type: "text" },
    ],
  },
  "Beauty & Personal Care > Hair Care > Shampoos": {
    id: "beauty-shampoo",
    title: "Beauty — Shampoo",
    description: "Shopify metafields for shampoos and cleansers.",
    fields: [
      { key: "hair_type", label: "Hair Type", type: "select", options: ["All hair types", "Dry", "Oily", "Curly", "Straight", "Wavy", "Color-treated", "Damaged", "Fine", "Thick"] },
      { key: "hair_concern", label: "Hair Concern", type: "select", options: ["Frizz", "Damage", "Dryness", "Breakage", "Dandruff", "Oily scalp"] },
      { key: "key_ingredient", label: "Key Ingredient", type: "text" },
      { key: "scent", label: "Scent", type: "text" },
      { key: "volume_ml", label: "Volume (ml)", type: "text" },
    ],
  },
  "Beauty & Personal Care > Skin Care": {
    id: "beauty-skincare",
    title: "Beauty — Skin Care",
    description: "Shopify metafields for face and body care.",
    fields: [
      { key: "skin_type", label: "Skin Type", type: "select", options: ["All skin types", "Dry", "Oily", "Combination", "Sensitive", "Normal", "Mature"] },
      { key: "skin_concern", label: "Skin Concern", type: "select", options: ["Acne", "Dryness", "Oiliness", "Sensitivity", "Aging", "Dark spots", "Redness"] },
      { key: "key_ingredient", label: "Key Ingredient", type: "text" },
      { key: "formulation", label: "Formulation", type: "select", options: ["Cream", "Lotion", "Gel", "Serum", "Oil", "Balm", "Mist", "Mask"] },
      { key: "spf", label: "SPF", type: "text" },
      { key: "volume_ml", label: "Volume (ml)", type: "text" },
    ],
  },
  "Apparel & Accessories > Shoes": {
    id: "shoes",
    title: "Apparel — Shoes",
    description: "Shopify metafields for shoes, sneakers, and boots.",
    fields: [
      { key: "color", label: "Color", type: "select", options: ["Red", "Blue", "Black", "White", "Burgundy", "Grey", "Brown", "Green", "Pink", "Yellow"], colorDot: true },
      { key: "age_group", label: "Age Group", type: "select", options: ["Adults", "Kids", "Toddler", "Infant"] },
      { key: "closure_type", label: "Closure Type", type: "select", options: ["Lace-up", "Slip-on", "Velcro", "Zipper", "Buckle"] },
      { key: "heel_height_type", label: "Heel Height", type: "select", options: ["Flat", "Low heel", "Mid heel", "High heel"] },
      { key: "occasion_style", label: "Occasion", type: "select", options: ["Casual", "Dress", "Athletic", "Formal"] },
      { key: "target_gender", label: "Target Gender", type: "select", options: ["Unisex", "Male", "Female"] },
      { key: "toe_style", label: "Toe Style", type: "select", options: ["Round", "Pointed", "Square", "Open"] },
      { key: "shoe_size", label: "Shoe Size", type: "text", help: "e.g. US 9, EU 42, UK 8" },
      { key: "shoe_fit", label: "Shoe Fit", type: "select", options: ["Regular fit", "Wide fit", "Narrow fit"] },
      { key: "footwear_material", label: "Footwear Material", type: "text" },
      { key: "care_instructions", label: "Care Instructions", type: "text" },
      { key: "shoe_features", label: "Shoe Features", type: "text" },
    ],
  },
  "Apparel & Accessories": {
    id: "apparel",
    title: "Apparel & Accessories",
    description: "Shopify metafields for clothing and accessories.",
    fields: [
      { key: "color", label: "Color", type: "select", options: ["Red", "Blue", "Black", "White", "Burgundy", "Grey", "Brown", "Green", "Pink", "Yellow"], colorDot: true },
      { key: "size", label: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "One size"] },
      { key: "age_group", label: "Age Group", type: "select", options: ["Adults", "Kids", "Toddler", "Infant"] },
      { key: "target_gender", label: "Target Gender", type: "select", options: ["Unisex", "Male", "Female"] },
      { key: "occasion_style", label: "Occasion", type: "select", options: ["Casual", "Formal", "Sports", "Party", "Workwear"] },
      { key: "material", label: "Material", type: "text" },
      { key: "care_instructions", label: "Care Instructions", type: "text" },
      { key: "country_of_origin", label: "Country of Origin", type: "text" },
    ],
  },
  "Electronics": {
    id: "electronics",
    title: "Electronics",
    description: "Shopify metafields for electronics and gadgets.",
    fields: [
      { key: "color", label: "Color", type: "select", options: ["Black", "White", "Silver", "Grey", "Blue", "Red"], colorDot: true },
      { key: "brand", label: "Brand", type: "text" },
      { key: "model_number", label: "Model Number", type: "text" },
      { key: "connectivity", label: "Connectivity", type: "select", options: ["Bluetooth", "Wi-Fi", "USB-C", "USB-A", "3.5mm", "Wired", "Wireless"] },
      { key: "power_source", label: "Power Source", type: "select", options: ["Battery", "Rechargeable battery", "AC adapter", "Solar", "USB"] },
      { key: "battery_life_hours", label: "Battery Life (hours)", type: "text" },
      { key: "warranty_months", label: "Warranty (months)", type: "text" },
      { key: "compatibility", label: "Compatibility", type: "text" },
    ],
  },
  "Home & Kitchen": {
    id: "home-kitchen",
    title: "Home & Kitchen",
    description: "Shopify metafields for home goods and kitchenware.",
    fields: [
      { key: "color", label: "Color", type: "select", options: ["Black", "White", "Silver", "Grey", "Beige", "Blue", "Red", "Green"], colorDot: true },
      { key: "material", label: "Material", type: "text" },
      { key: "capacity", label: "Capacity", type: "text" },
      { key: "capacity_unit", label: "Capacity Unit", type: "select", options: ["ml", "L", "oz", "cups", "kg", "lb", "g"] },
      { key: "dimensions_cm", label: "Dimensions (cm)", type: "text" },
      { key: "weight_g", label: "Weight (g)", type: "text" },
      { key: "dishwasher_safe", label: "Dishwasher Safe", type: "select", options: ["Yes", "No"] },
      { key: "microwave_safe", label: "Microwave Safe", type: "select", options: ["Yes", "No"] },
      { key: "care_instructions", label: "Care Instructions", type: "text" },
    ],
  },
  "Sports & Outdoors": {
    id: "sports",
    title: "Sports & Outdoors",
    description: "Shopify metafields for sports equipment and outdoor gear.",
    fields: [
      { key: "color", label: "Color", type: "select", options: ["Black", "White", "Red", "Blue", "Green", "Yellow", "Grey", "Orange", "Pink"], colorDot: true },
      { key: "material", label: "Material", type: "text" },
      { key: "size", label: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "2XL", "One size"] },
      { key: "activity", label: "Activity", type: "select", options: ["Yoga", "Running", "Cycling", "Hiking", "Swimming", "Gym", "Camping", "Climbing"] },
      { key: "weight_capacity_kg", label: "Weight Capacity (kg)", type: "text" },
      { key: "water_resistance", label: "Water Resistance", type: "select", options: ["None", "Splash-resistant", "Water-resistant", "Waterproof"] },
      { key: "care_instructions", label: "Care Instructions", type: "text" },
    ],
  },
  "Toys & Games": {
    id: "toys",
    title: "Toys & Games",
    description: "Shopify metafields for toys, games, and puzzles.",
    fields: [
      { key: "age_group", label: "Age Group", type: "select", options: ["0-2 years", "3-5 years", "6-8 years", "9-12 years", "13+ years", "Adults"] },
      { key: "target_gender", label: "Target Gender", type: "select", options: ["Unisex", "Male", "Female"] },
      { key: "material", label: "Material", type: "text" },
      { key: "piece_count", label: "Piece Count", type: "text" },
      { key: "battery_required", label: "Battery Required", type: "select", options: ["Yes", "No"] },
      { key: "safety_warning", label: "Safety Warning", type: "text" },
    ],
  },
  "Pet Supplies": {
    id: "pet",
    title: "Pet Supplies",
    description: "Shopify metafields for pet food, toys, and accessories.",
    fields: [
      { key: "pet_type", label: "Pet Type", type: "select", options: ["Dog", "Cat", "Bird", "Fish", "Small animal", "Reptile"] },
      { key: "pet_size", label: "Pet Size", type: "select", options: ["X-Small", "Small", "Medium", "Large", "X-Large"] },
      { key: "life_stage", label: "Life Stage", type: "select", options: ["Puppy/Kitten", "Adult", "Senior", "All life stages"] },
      { key: "material", label: "Material", type: "text" },
      { key: "weight_g", label: "Weight (g)", type: "text" },
      { key: "special_diet", label: "Special Diet", type: "text" },
    ],
  },
  "Books": {
    id: "books",
    title: "Books",
    description: "Shopify metafields for books and printed media.",
    fields: [
      { key: "author", label: "Author", type: "text" },
      { key: "isbn", label: "ISBN", type: "text" },
      { key: "format", label: "Format", type: "select", options: ["Paperback", "Hardcover", "eBook", "Audiobook"] },
      { key: "language", label: "Language", type: "select", options: ["English", "Spanish", "French", "German", "Japanese", "Chinese", "Other"] },
      { key: "page_count", label: "Page Count", type: "text" },
      { key: "publisher", label: "Publisher", type: "text" },
    ],
  },
};

// Generic fallback when no Shopify category matches.
const GENERIC_METAFIELD_SCHEMA: MetafieldSchema = {
  id: "generic",
  title: "Category metafields",
  description: "Common attributes for any product. Set the Shopify category above to unlock category-specific fields.",
  fields: [
    { key: "color", label: "Color", type: "text", help: "Comma-separated colors (e.g. Red, Black)" },
    { key: "material", label: "Material", type: "text" },
    { key: "size", label: "Size", type: "text" },
    { key: "brand", label: "Brand", type: "text" },
    { key: "country_of_origin", label: "Country of Origin", type: "text" },
    { key: "care_instructions", label: "Care Instructions", type: "text" },
    { key: "warranty_months", label: "Warranty (months)", type: "text" },
  ],
};

/**
 * Return the metafield schema for the given Shopify category string.
 *
 * Matches the *start* of the category path so a more specific value like
 * "Beauty & Personal Care > Hair Care > Hair Masks" still resolves to
 * the broader "Beauty & Personal Care" schema when no exact entry
 * exists. Falls back to a generic schema when nothing matches.
 */
function getMetafieldSchema(category: string | null | undefined): MetafieldSchema {
  const normalized = (category ?? "").trim().toLowerCase();
  if (!normalized) return GENERIC_METAFIELD_SCHEMA;

  // Try exact-prefix matches from longest to shortest
  const keys = Object.keys(SHOPIFY_METAFIELD_SCHEMAS).sort(
    (a, b) => b.length - a.length,
  );
  for (const key of keys) {
    if (normalized.startsWith(key.toLowerCase())) {
      return SHOPIFY_METAFIELD_SCHEMAS[key];
    }
  }
  return GENERIC_METAFIELD_SCHEMA;
}

/** Build a flat array of metafield keys for a category, used by the LLM
 *  prompt and by the "Add Additional Details" section. */
function getMetafieldKeysForCategory(category: string | null | undefined): string[] {
  return getMetafieldSchema(category).fields.map((f) => f.key);
}

const emptyActionState: MarketActionState = {
  amazon: false,
  ebay: false,
  etsy: false,
  tiktok: false,
  shopify: false,
};

const emptyPublishState: PublishActionState = {
  commandctr: false,
  amazon: false,
  ebay: false,
  etsy: false,
  tiktok: false,
  shopify: false,
};

const publishStatusOptions: PublishStatus[] = ["DRAFT", "ACTIVE"];
const draftStorageKey = "commandctr-add-product-draft";
const emptyPublishFieldErrors: PublishFieldErrors = {
  title: false,
  price: false,
};
const allowedEbayConditions = [
  "NEW",
  "USED",
  "NEW_OTHER",
  "USED_EXCELLENT",
  "USED_GOOD",
  "USED_ACCEPTABLE",
] as const;

type AllowedEbayCondition = (typeof allowedEbayConditions)[number];

const ebayConditionLabels: Record<AllowedEbayCondition, string> = {
  NEW: "New",
  USED: "Used",
  NEW_OTHER: "New Other",
  USED_EXCELLENT: "Used Excellent",
  USED_GOOD: "Used Good",
  USED_ACCEPTABLE: "Used Acceptable",
};

const ebayMarketplaceDefaultCurrency = "GBP";
const ebayMarketplaceDefaultId = "EBAY_GB";
const ebaySandboxListingBaseUrl = "https://www.sandbox.ebay.com/itm/";

const ebaySpecificFieldAliases: Record<string, string[]> = {
  Brand: ["Brand"],
  Colour: ["Colour", "Color"],
  Department: ["Department"],
  Type: ["Type"],
  Style: ["Style"],
  UKShoeSize: ["UK Shoe Size"],
};

const demoColorKeywords = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Green",
  "Grey",
  "Gray",
  "Brown",
  "Pink",
  "Purple",
  "Orange",
  "Yellow",
  "Silver",
  "Gold",
  "Beige",
  "Navy",
];

function normalizeEbayCondition(value?: string | null): AllowedEbayCondition | string {
  const normalized = value?.trim();
  if (!normalized || /^not\s+specified$/i.test(normalized)) {
    return "NEW";
  }

  const canonical = normalized.toUpperCase().replace(/[\s-]+/g, "_");
  switch (canonical) {
    case "NEW":
      return "NEW";
    case "USED":
      return "USED";
    case "NEW_OTHER":
      return "NEW_OTHER";
    case "USED_EXCELLENT":
      return "USED_EXCELLENT";
    case "USED_GOOD":
      return "USED_GOOD";
    case "USED_ACCEPTABLE":
      return "USED_ACCEPTABLE";
    default:
      return canonical;
  }
}

function isAllowedEbayCondition(value: string): value is AllowedEbayCondition {
  return allowedEbayConditions.includes(value as AllowedEbayCondition);
}

function getEbaySpecificFieldValue(
  specifics: Record<string, string>,
  primaryKey: keyof typeof ebaySpecificFieldAliases,
) {
  const aliases = ebaySpecificFieldAliases[primaryKey];
  for (const alias of aliases) {
    const value = specifics[alias]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function setEbaySpecificFieldValue(
  specifics: Record<string, string>,
  primaryKey: keyof typeof ebaySpecificFieldAliases,
  value: string,
) {
  const nextSpecifics = { ...specifics };
  const aliases = ebaySpecificFieldAliases[primaryKey];

  for (const alias of aliases) {
    delete nextSpecifics[alias];
  }

  const trimmedValue = value.trim();
  if (trimmedValue) {
    nextSpecifics[aliases[0]] = trimmedValue;
  }

  return nextSpecifics;
}

function findAttributeValue(attributes: Record<string, string>, aliases: string[]) {
  const entries = Object.entries(attributes ?? {});
  for (const alias of aliases) {
    const directValue = attributes[alias]?.trim();
    if (directValue) {
      return directValue;
    }

    const match = entries.find(([key, value]) => key.trim().toLowerCase() === alias.toLowerCase() && value.trim());
    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

function inferEbayDepartment(text: string) {
  const normalized = text.toLowerCase();
  if (/\b(women|woman|ladies|female|girl)\b/.test(normalized)) {
    return "Women";
  }
  if (/\b(men|man|male|boy)\b/.test(normalized)) {
    return "Men";
  }
  if (/\b(kids|kid|youth|child|children|toddler)\b/.test(normalized)) {
    return "Kids";
  }

  return "Unisex Adults";
}

function inferEbayColour(text: string) {
  const normalized = text.toLowerCase();
  const matches = demoColorKeywords.filter((color) => normalized.includes(color.toLowerCase()));
  if (matches.length === 0) {
    return "Black";
  }

  return matches.filter((value, index, array) => array.indexOf(value) === index).join("/");
}

function inferEbayStyle(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("sneaker")) return "Sneaker";
  if (normalized.includes("running")) return "Running Shoe";
  if (normalized.includes("boot")) return "Boot";
  if (normalized.includes("trainer")) return "Trainer";
  if (normalized.includes("sandal")) return "Sandal";

  return "Sneaker";
}

function inferEbayUkShoeSize(text: string) {
  const normalized = text.toLowerCase();
  const sizeMatch =
    normalized.match(/\b(?:uk\s*)?size\s*([0-9]+(?:\.[0-9])?)\b/)
    || normalized.match(/\buk\s*([0-9]+(?:\.[0-9])?)\b/);

  if (sizeMatch?.[1]) {
    return sizeMatch[1];
  }

  return "10";
}

function withMissingEbayDraftDefaults(draft: ApiProduct, publishVendor: string) {
  const ebayDraft = {
    ...emptyProduct.ebay,
    ...(draft.ebay ?? {}),
    item_specifics: draft.ebay?.item_specifics ?? {},
  };
  const coreTitle = draft.core.normalized_title.trim() || draft.core.source_title.trim();
  const referenceText = [ebayDraft.title, coreTitle, draft.core.product_type, draft.core.category, draft.core.product_summary]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  const brandValue =
    getEbaySpecificFieldValue(ebayDraft.item_specifics, "Brand")
    || publishVendor.trim()
    || findAttributeValue(draft.core.attributes, ["brand", "Brand", "vendor", "Vendor"])
    || "Demo Brand";
  const colourValue =
    getEbaySpecificFieldValue(ebayDraft.item_specifics, "Colour")
    || findAttributeValue(draft.core.attributes, ["Colour", "Color", "colour", "color"])
    || inferEbayColour(referenceText);
  const departmentValue =
    getEbaySpecificFieldValue(ebayDraft.item_specifics, "Department")
    || findAttributeValue(draft.core.attributes, ["Department", "Gender", "gender"])
    || inferEbayDepartment(referenceText);
  const typeValue =
    getEbaySpecificFieldValue(ebayDraft.item_specifics, "Type")
    || draft.core.product_type.trim()
    || draft.core.category.trim()
    || "Athletic";
  const styleValue =
    getEbaySpecificFieldValue(ebayDraft.item_specifics, "Style")
    || findAttributeValue(draft.core.attributes, ["Style"])
    || inferEbayStyle(referenceText);
  const ukShoeSizeValue =
    getEbaySpecificFieldValue(ebayDraft.item_specifics, "UKShoeSize")
    || findAttributeValue(draft.core.attributes, ["UK Shoe Size", "Shoe Size", "Size"])
    || inferEbayUkShoeSize(referenceText);

  let nextSpecifics = ebayDraft.item_specifics;
  let changed = false;

  if (!getEbaySpecificFieldValue(nextSpecifics, "Brand")) {
    nextSpecifics = setEbaySpecificFieldValue(nextSpecifics, "Brand", brandValue);
    changed = true;
  }
  if (!getEbaySpecificFieldValue(nextSpecifics, "Colour")) {
    nextSpecifics = setEbaySpecificFieldValue(nextSpecifics, "Colour", colourValue);
    changed = true;
  }
  if (!getEbaySpecificFieldValue(nextSpecifics, "Department")) {
    nextSpecifics = setEbaySpecificFieldValue(nextSpecifics, "Department", departmentValue);
    changed = true;
  }
  if (!getEbaySpecificFieldValue(nextSpecifics, "Type")) {
    nextSpecifics = setEbaySpecificFieldValue(nextSpecifics, "Type", typeValue);
    changed = true;
  }
  if (!getEbaySpecificFieldValue(nextSpecifics, "Style")) {
    nextSpecifics = setEbaySpecificFieldValue(nextSpecifics, "Style", styleValue);
    changed = true;
  }
  if (!getEbaySpecificFieldValue(nextSpecifics, "UKShoeSize")) {
    nextSpecifics = setEbaySpecificFieldValue(nextSpecifics, "UKShoeSize", ukShoeSizeValue);
    changed = true;
  }

  const nextEbay = {
    ...draft.ebay,
    title: safeTrim(draft.ebay.title) || coreTitle,
    marketplace_id:
      safeTrim(draft.ebay.marketplace_id) || ebayMarketplaceDefaultId,
    currency:
      safeTrim(draft.ebay.currency) || ebayMarketplaceDefaultCurrency,
    item_specifics: nextSpecifics,
  };

  if (nextEbay.title !== ebayDraft.title) {
    changed = true;
  }
  if (nextEbay.marketplace_id !== ebayDraft.marketplace_id) {
    changed = true;
  }
  if (nextEbay.currency !== ebayDraft.currency) {
    changed = true;
  }

  return changed ? { ...draft, ebay: nextEbay } : draft;
}

const emptyProduct: ApiProduct = {
  core: {
    normalized_title: "",
    category: "",
    product_type: "",
    product_summary: "",
    features: [],
    attributes: {},
    source_title: "",
    vision_confidence: 0,
  },
  amazon: {
    title: "",
    bullet_points: [],
    description: "",
    backend_search_terms: [],
    structured_attributes: {},
  },
  ebay: {
    title: "",
    item_specifics: {},
    condition: "NEW",
    marketplace_id: ebayMarketplaceDefaultId,
    currency: ebayMarketplaceDefaultCurrency,
    category_id: "",
    description_override: "",
    listing_notes: "",
  },
  etsy: {
    title: "",
    description: "",
    tags: [],
    materials: [],
    occasion: "",
    seo_keywords: [],
  },
  tiktok: {
    title: "",
    social_description: "",
    hashtags: [],
  },
  shopify: {
    title: "",
    body_html: "",
    tags: [],
    product_type: "",
    seo_title: "",
    seo_description: "",
    compare_at_price: "",
    cost_per_item: "",
    charge_tax: true,
    barcode: "",
    inventory_tracked: true,
    continue_selling_out_of_stock: false,
    stock_locations: [{ name: "Kingston Grove", available: 0, on_hand: 0, unavailable: 0, committed: 0 }],
    physical_product: true,
    weight: "0.0",
    weight_unit: "lb",
    country_of_origin: "",
    hs_code: "",
    collections: [],
    theme_template: "Default product",
    seo_handle: "",
    category: "",
    metafields: {},
    has_variants: false,
    options: [{ name: "Size", values: [] }],
    variants: [],
  },
  images: {
    source: {
      marketplace: "source",
      relative_path: "",
      absolute_path: "",
      prompt: "Original uploaded image saved for audit and downstream editing.",
      generation_mode: "source_passthrough",
      mime_type: "image/jpeg",
      validation: {
        passed: false,
        width: null,
        height: null,
        format: null,
        has_alpha: false,
        file_size_bytes: 0,
        expected_width: null,
        expected_height: null,
        expected_background: "source",
        errors: ["No source image uploaded yet."],
        mime_type: "image/jpeg",
      },
    },
    transparent_cutout: {
      marketplace: "transparent_cutout",
      relative_path: "",
      absolute_path: "",
      prompt: "Background removed for editing.",
      generation_mode: "edited",
      mime_type: "image/png",
      validation: {
        passed: false,
        width: null,
        height: null,
        format: null,
        has_alpha: null,
        file_size_bytes: 0,
        expected_width: 1024,
        expected_height: 1024,
        expected_background: "transparent",
        errors: ["No transparent cutout generated yet."],
        mime_type: "image/png",
      },
    },
    amazon: {
      marketplace: "amazon",
      relative_path: "",
      absolute_path: "",
      prompt: "Amazon image",
      generation_mode: "local_composite_from_cutout",
      mime_type: "image/png",
      validation: {
        passed: false,
        width: null,
        height: null,
        format: null,
        has_alpha: false,
        file_size_bytes: 0,
        expected_width: 1024,
        expected_height: 1024,
        expected_background: "white",
        errors: ["No Amazon image generated yet."],
        mime_type: "image/png",
      },
    },
    ebay: {
      marketplace: "ebay",
      relative_path: "",
      absolute_path: "",
      prompt: "eBay image",
      generation_mode: "local_composite_from_cutout",
      mime_type: "image/png",
      validation: {
        passed: false,
        width: null,
        height: null,
        format: null,
        has_alpha: false,
        file_size_bytes: 0,
        expected_width: 1024,
        expected_height: 1024,
        expected_background: "white",
        errors: ["No eBay image generated yet."],
        mime_type: "image/png",
      },
    },
    etsy: {
      marketplace: "etsy",
      relative_path: "",
      absolute_path: "",
      prompt: "Etsy image",
      generation_mode: "local_composite_from_cutout",
      mime_type: "image/png",
      validation: {
        passed: false,
        width: null,
        height: null,
        format: null,
        has_alpha: false,
        file_size_bytes: 0,
        expected_width: 1200,
        expected_height: 900,
        expected_background: "opaque",
        errors: ["No Etsy image generated yet."],
        mime_type: "image/png",
      },
    },
    tiktok: {
      marketplace: "tiktok",
      relative_path: "",
      absolute_path: "",
      prompt: "TikTok image",
      generation_mode: "edited",
      mime_type: "image/png",
      validation: {
        passed: false,
        width: null,
        height: null,
        format: null,
        has_alpha: false,
        file_size_bytes: 0,
        expected_width: 1024,
        expected_height: 1536,
        expected_background: "opaque",
        errors: ["No TikTok Shop image generated yet."],
        mime_type: "image/png",
      },
    },
    shopify: {
      marketplace: "shopify",
      relative_path: "",
      absolute_path: "",
      prompt: "Shopify image",
      generation_mode: "edited",
      mime_type: "image/png",
      validation: {
        passed: false,
        width: null,
        height: null,
        format: null,
        has_alpha: false,
        file_size_bytes: 0,
        expected_width: 1536,
        expected_height: 1536,
        expected_background: "opaque",
        errors: ["No Shopify image generated yet."],
        mime_type: "image/png",
      },
    },
  },
};

const sampleVariants: Record<MarketKey, ApiVariant[]> = {
  amazon: [],
  ebay: [],
  etsy: [],
  tiktok: [],
  shopify: [],
};

function toLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toAttributes(value: string) {
  return Object.fromEntries(
    value
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf(":");
        if (separatorIndex === -1) {
          return [entry, ""];
        }

        return [entry.slice(0, separatorIndex).trim(), entry.slice(separatorIndex + 1).trim()];
      })
      .filter(([key, fieldValue]) => key || fieldValue),
  );
}

function imageUrlFor(pathValue: string) {
  if (!pathValue) {
    return null;
  }

  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
    return `/api/product-ai/image?url=${encodeURIComponent(pathValue)}`;
  }

  return `/api/product-ai/image?path=${encodeURIComponent(pathValue)}`;
}

async function fetchSourceImageAsFile(pathValue: string, fallbackName = "source.png"): Promise<File | null> {
  if (!pathValue) return null;
  const url = imageUrlFor(pathValue);
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const mime = blob.type || "image/png";
    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
    const baseName = fallbackName.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: mime });
  } catch {
    return null;
  }
}

function isPublicHttpUrl(pathValue: string) {
  return pathValue.startsWith("http://") || pathValue.startsWith("https://");
}

function getEbaySandboxListingUrl(listingId?: string | null) {
  const trimmedListingId = listingId?.trim();
  if (!trimmedListingId) {
    return null;
  }

  return `${ebaySandboxListingBaseUrl}${encodeURIComponent(trimmedListingId)}`;
}

function safeTrim(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function readImportPreviewFallback(recordId: string): ImportPreviewFallback | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("commandctr-import-page");
    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as {
      state?: { rows?: ImportPreviewFallback[] };
      rows?: ImportPreviewFallback[];
    };
    const rows = Array.isArray(payload.state?.rows)
      ? payload.state.rows
      : Array.isArray(payload.rows)
        ? payload.rows
        : [];

    return rows.find((row) => row?.id === recordId) ?? null;
  } catch {
    return null;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyArray<T>(value: T[] | undefined | null): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

function isNonEmptyRecord(value: Record<string, unknown> | undefined | null): boolean {
  if (!value) return false;
  return Object.values(value).some((v) => {
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v).length > 0;
    return v !== null && v !== undefined && v !== "";
  });
}

/**
 * Merge a freshly generated ApiRecord (e.g. from /api/product-ai/products/generate/text)
 * into the existing imported draft. Strategy:
 *   - For each scalar field (title, description, etc.): keep the imported value if
 *     non-empty, otherwise use the new generated value.
 *   - For each array / object field: same rule (keep existing if it already has content,
 *     otherwise replace with the new one).
 *   - For images: preserve imported images (e.g. source, transparent_cutout, marketplace
 *     variants that may already have files) and only fill empty slots from the new
 *     response. This keeps user-uploaded assets intact.
 */
function mergeGeneratedRecordIntoDraft(
  generated: ApiRecord,
  current: ApiProduct,
): ApiProduct {
  // ─── core ───────────────────────────────────────────────────────────
  const genCore = generated.product.core;
  const curCore = current.core;
  const mergedCore: ApiCore = {
    ...curCore,
    normalized_title: isNonEmptyString(curCore.normalized_title)
      ? curCore.normalized_title
      : genCore.normalized_title,
    category: isNonEmptyString(curCore.category) ? curCore.category : genCore.category,
    product_type: isNonEmptyString(curCore.product_type)
      ? curCore.product_type
      : genCore.product_type,
    product_summary: isNonEmptyString(curCore.product_summary)
      ? curCore.product_summary
      : genCore.product_summary,
    features: isNonEmptyArray(curCore.features) ? curCore.features : genCore.features,
    attributes: { ...genCore.attributes, ...curCore.attributes },
    source_title: isNonEmptyString(curCore.source_title)
      ? curCore.source_title
      : genCore.source_title,
    vision_confidence: curCore.vision_confidence || genCore.vision_confidence,
  };

  // ─── amazon ─────────────────────────────────────────────────────────
  const mergedAmazon: ApiAmazon = {
    title: current.amazon.title || generated.product.amazon.title,
    bullet_points: isNonEmptyArray(current.amazon.bullet_points)
      ? current.amazon.bullet_points
      : generated.product.amazon.bullet_points,
    description: current.amazon.description || generated.product.amazon.description,
    backend_search_terms: isNonEmptyArray(current.amazon.backend_search_terms)
      ? current.amazon.backend_search_terms
      : generated.product.amazon.backend_search_terms,
    structured_attributes: isNonEmptyRecord(current.amazon.structured_attributes as Record<string, unknown>)
      ? current.amazon.structured_attributes
      : generated.product.amazon.structured_attributes,
  };

  // ─── ebay ───────────────────────────────────────────────────────────
  const mergedEbay: ApiEbay = {
    title: current.ebay.title || generated.product.ebay.title,
    item_specifics: isNonEmptyRecord(current.ebay.item_specifics as Record<string, unknown>)
      ? current.ebay.item_specifics
      : generated.product.ebay.item_specifics,
    condition: current.ebay.condition || generated.product.ebay.condition,
    marketplace_id: current.ebay.marketplace_id || generated.product.ebay.marketplace_id,
    currency: current.ebay.currency || generated.product.ebay.currency,
    category_id: current.ebay.category_id || generated.product.ebay.category_id,
    description_override:
      current.ebay.description_override || generated.product.ebay.description_override,
    listing_notes: current.ebay.listing_notes || generated.product.ebay.listing_notes,
  };

  // ─── etsy ───────────────────────────────────────────────────────────
  const mergedEtsy: ApiEtsy = {
    title: current.etsy.title || generated.product.etsy.title,
    description: current.etsy.description || generated.product.etsy.description,
    tags: isNonEmptyArray(current.etsy.tags) ? current.etsy.tags : generated.product.etsy.tags,
    materials: isNonEmptyArray(current.etsy.materials)
      ? current.etsy.materials
      : generated.product.etsy.materials,
    occasion: current.etsy.occasion || generated.product.etsy.occasion,
    seo_keywords: isNonEmptyArray(current.etsy.seo_keywords)
      ? current.etsy.seo_keywords
      : generated.product.etsy.seo_keywords,
  };

  // ─── tiktok ─────────────────────────────────────────────────────────
  const mergedTiktok: ApiTiktok = {
    title: current.tiktok.title || generated.product.tiktok.title,
    social_description:
      current.tiktok.social_description || generated.product.tiktok.social_description,
    hashtags: isNonEmptyArray(current.tiktok.hashtags)
      ? current.tiktok.hashtags
      : generated.product.tiktok.hashtags,
  };

  // ─── shopify ────────────────────────────────────────────────────────
  const curShopify = current.shopify;
  const genShopify = generated.product.shopify;
  const mergedShopify: ApiShopify = {
    ...curShopify,
    title: curShopify.title || genShopify.title,
    body_html: curShopify.body_html || genShopify.body_html,
    tags: isNonEmptyArray(curShopify.tags) ? curShopify.tags : genShopify.tags,
    product_type: curShopify.product_type || genShopify.product_type,
    seo_title: curShopify.seo_title || genShopify.seo_title,
    seo_description: curShopify.seo_description || genShopify.seo_description,
    metafields: isNonEmptyRecord(curShopify.metafields as Record<string, unknown>)
      ? { ...genShopify.metafields, ...curShopify.metafields }
      : genShopify.metafields,
    category: curShopify.category || genShopify.category,
    has_variants: curShopify.has_variants || genShopify.has_variants,
  };

  // ─── images: preserve current; only fill empty slots from generated ──
  const imageKeys: ImageCardKey[] = [
    "source",
    "transparent_cutout",
    "amazon",
    "ebay",
    "etsy",
    "tiktok",
    "shopify",
  ];
  const mergedImages: ApiGeneratedImages = { ...current.images };
  imageKeys.forEach((k) => {
    const curImg = current.images[k];
    const genImg = generated.product.images[k];
    if (!curImg?.absolute_path && genImg?.absolute_path) {
      mergedImages[k] = genImg;
    } else if (curImg && !curImg.absolute_path && genImg) {
      // If we have a placeholder but no file, take the generated variant fully
      mergedImages[k] = genImg;
    }
  });

  return {
    core: mergedCore,
    amazon: mergedAmazon,
    ebay: mergedEbay,
    etsy: mergedEtsy,
    tiktok: mergedTiktok,
    shopify: mergedShopify,
    images: mergedImages,
    intelligence: generated.product.intelligence ?? current.intelligence ?? null,
  };
}

/**
 * Convert the ``intelligence.research`` block from a generated ApiRecord into
 * the ApiProductPricingSnapshot shape used by the UI's pricing panels.
 */
function researchToPricingSnapshot(
  generated: ApiRecord,
  productIdFallback: string,
): ApiProductPricingSnapshot | null {
  const intelligence = generated.product.intelligence;
  if (!intelligence?.research) {
    return null;
  }

  const marketKeys: MarketKey[] = ["amazon", "ebay", "etsy", "tiktok", "shopify"];
  const generatedAt = new Date().toISOString();
  const markets = marketKeys
    .map((key): ApiMarketplacePricingSnapshot | null => {
      const research = intelligence.research[key];
      if (!research) return null;

      const priceMin = research.price_min ?? null;
      const priceMax = research.price_max ?? null;
      const priceAvg = research.price_avg ?? null;
      const recommended = priceAvg ?? priceMin ?? priceMax ?? null;
      const currency = research.similar_listings?.[0]?.currency ?? "USD";

      const range =
        priceMin && priceMax
          ? {
              minimum: priceMin,
              maximum: priceMax,
              recommended: recommended ?? (priceMin + priceMax) / 2,
              currency,
              source: "market_research",
            }
          : null;

      const similarListings = (research.similar_listings ?? []).map((listing) => ({
        source: listing.source,
        title: listing.title,
        url: listing.url ?? null,
        price: listing.price ?? listing.sale_price ?? null,
        currency: listing.currency,
      }));

      return {
        marketplace: key,
        source_mode: research.source_mode ?? "heuristic",
        search_queries: research.search_queries ?? [],
        comparable_count: (research.similar_listings ?? []).length,
        recommended_price: recommended,
        currency,
        suggested_price_range: range,
        market_signal: "",
        analysis_summary: "",
        similar_listings: similarListings,
      };
    })
    .filter((m): m is ApiMarketplacePricingSnapshot => m !== null);

  if (markets.length === 0) {
    return null;
  }

  return {
    product_id: generated.id || productIdFallback,
    generated_at: generatedAt,
    markets,
  };
}

function mergeImportRecordFallback(
  record: ImportApiRecord,
  fallback: ImportPreviewFallback | null,
): ImportApiRecord {
  if (!fallback) {
    return record;
  }

  const previewPath = fallback.preview_image_path.trim();

  return {
    ...record,
    product: {
      ...record.product,
      core: {
        ...record.product.core,
        source_title: record.product.core.source_title || fallback.normalized_title,
        normalized_title:
          record.product.core.normalized_title || fallback.normalized_title,
        category: record.product.core.category || fallback.category,
        product_type: record.product.core.product_type || fallback.product_type,
      },
      images: {
        ...record.product.images,
        source:
          record.product.images.source.absolute_path || !previewPath
            ? record.product.images.source
            : {
                ...record.product.images.source,
                absolute_path: previewPath,
                relative_path:
                  record.product.images.source.relative_path || previewPath,
                generation_mode:
                  record.product.images.source.generation_mode ||
                  "source_passthrough",
              },
        shopify:
          record.product.images.shopify.absolute_path || !previewPath
            ? record.product.images.shopify
            : {
                ...record.product.images.shopify,
                absolute_path: previewPath,
                relative_path:
                  record.product.images.shopify.relative_path || previewPath,
              },
      },
    },
  };
}

function cartesianProduct(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, val) => {
      const temp: string[][] = [];
      acc.forEach((x) => {
        val.forEach((y) => {
          temp.push([...x, y]);
        });
      });
      return temp;
    },
    [[]]
  );
}

function isGenerationTimeoutMessage(message: string) {
  return message.includes("timed out") || message.includes("504");
}

function ProductPreview({
  image,
  alt,
  backgroundLabel,
  previewSrc,
}: {
  image: ApiImageVariant | null;
  alt: string;
  backgroundLabel: string;
  previewSrc?: string | null;
}) {
  const src = previewSrc ?? (image ? imageUrlFor(image.absolute_path) : null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasLoadError = Boolean(src && failedSrc === src);

  if (src && !hasLoadError) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#dbe2ee] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={alt}
          className="aspect-[4/3] w-full object-contain bg-white"
          onError={() => setFailedSrc(src)}
          src={src}
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-[#d4ddec] bg-[#f8fbff] p-4 text-center text-xs text-[#667a99]">
      {hasLoadError
        ? "Preview file is not reachable from this local app. This usually happens when the draft was generated on the remote Product AI service and the image only exists on that server."
        : `${backgroundLabel} preview will appear here after generation.`}
    </div>
  );
}

function MarketTabLink({
  market,
  activeMarket,
  productId,
  importRecordId = null,
  isImportMode = false,
  readOnly = false,
}: {
  market: MarketKey;
  activeMarket: MarketKey;
  productId: string | null;
  importRecordId?: string | null;
  isImportMode?: boolean;
  readOnly?: boolean;
}) {
  const active = market === activeMarket;
  const suffix = productId ? `&productId=${productId}` : "";
  const href = isImportMode && importRecordId
    ? `${readOnly ? `/import/view/${importRecordId}` : `/import/${importRecordId}`}?market=${market}`
    : `/products/add?market=${market}${suffix}`;
  const IconComponent = marketIcons[market];
  const styles = marketTabStyles[market];
  return (
    <Link
      className={`group inline-flex items-center gap-2 rounded-full px-4.5 py-2 text-xs font-bold transition-all duration-300 ${
        active ? styles.active : styles.inactive
      }`}
      href={href}
      scroll={false}
    >
      <IconComponent
        className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 shrink-0 ${
          active ? "grayscale-0 opacity-100" : "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
        }`}
        mode={active && market === "tiktok" ? "dark" : "light"}
      />
      <span>{marketLabels[market]}</span>
    </Link>
  );
}

function EditableField({
  label,
  value,
  onChange,
  multiline = false,
  invalid = false,
  helperText,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  invalid?: boolean;
  helperText?: string;
  className?: string;
}) {
  const [manualShowPreview, setManualShowPreview] = useState<boolean | null>(null);
  const showPreview = manualShowPreview !== null ? manualShowPreview : multiline;
  const isStretched = className.includes("h-full");
  const heightClasses = isStretched ? "min-h-20 max-h-[280px] flex-1" : "min-h-20 max-h-56 flex-1";

  return (
    <div
      className={`flex flex-col rounded-xl border bg-[#f8fbff] p-3 transition-all duration-200 ${invalid
          ? "border-[#ef6b6b] bg-[#fff7f7] shadow-[0_4px_12px_rgba(239,107,107,0.05)]"
          : "border-[#dbe2ee] hover:border-[#cbd5e1] focus-within:border-[#2b7cf5] focus-within:bg-white focus-within:shadow-[0_8px_20px_-6px_rgba(43,124,245,0.08)]"
        } ${className}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2]">{label}</span>
        {multiline && (
          <div className="flex bg-white rounded-md p-0.5 border border-[#d4ddec] text-[9px] font-bold shadow-xs">
            <button
              type="button"
              onClick={() => setManualShowPreview(false)}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${!showPreview
                  ? "bg-[#1b2748] text-white shadow-xs"
                  : "text-[#5e718e] hover:bg-[#edf2fb]"
                }`}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setManualShowPreview(true)}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${showPreview
                  ? "bg-[#1b2748] text-white shadow-xs"
                  : "text-[#5e718e] hover:bg-[#edf2fb]"
                }`}
            >
              Visual
            </button>
          </div>
        )}
      </div>
      {helperText && (
        <p className={`mb-1 text-[10px] leading-normal ${invalid ? "text-[#cf4b4b] font-medium" : "text-[#8ea0bf]"}`}>
          {helperText}
        </p>
      )}
      {multiline ? (
        showPreview ? (
          <div className={`flex flex-col rounded-lg border border-[#d4ddec] bg-white overflow-hidden focus-within:border-[#2b7cf5] transition-all ${heightClasses}`}>
            {/* Rich Text Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 bg-slate-50/80 border-b border-[#d4ddec] px-2 py-1 select-none">
              <button
                type="button"
                onClick={() => document.execCommand("bold", false)}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("italic", false)}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("underline", false)}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Underline"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>

              <div className="h-3.5 w-px bg-slate-200 mx-1.5" />

              <button
                type="button"
                onClick={() => document.execCommand("insertUnorderedList", false)}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Bullet List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("insertOrderedList", false)}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>

              <div className="h-3.5 w-px bg-slate-200 mx-1.5" />

              <button
                type="button"
                onClick={() => document.execCommand("justifyLeft", false)}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Align Left"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("justifyCenter", false)}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Align Center"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("justifyRight", false)}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Align Right"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>

              <div className="h-3.5 w-px bg-slate-200 mx-1.5" />

              <button
                type="button"
                onClick={() => {
                  const url = prompt("Enter link URL:");
                  if (url) {
                    document.execCommand("createLink", false, url);
                  }
                }}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer"
                title="Insert Link"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const heading = prompt("Enter Heading level (e.g. h1, h2, h3, p):", "h2");
                  if (heading) {
                    document.execCommand("formatBlock", false, `<${heading}>`);
                  }
                }}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition active:scale-90 cursor-pointer text-[10px] font-bold h-5.5 flex items-center justify-center border border-slate-300 px-1 bg-white hover:bg-slate-50"
                title="Format Heading"
              >
                H
              </button>

              <div className="h-3.5 w-px bg-slate-200 mx-1.5" />

              <button
                type="button"
                onClick={() => document.execCommand("removeFormat", false)}
                className="p-1 rounded text-rose-500 hover:bg-rose-50 transition active:scale-90 cursor-pointer text-[9px] font-bold uppercase tracking-wider px-1.5"
                title="Clear Formatting"
              >
                Clear
              </button>
            </div>

            {/* Editable Content */}
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(event) => {
                onChange(event.currentTarget.innerHTML);
              }}
              className="w-full flex-1 px-3 pt-2.5 pb-4 text-xs text-[#31415e] overflow-y-auto rich-preview-box outline-none bg-white min-h-20"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </div>
        ) : (
          <textarea
            className={`w-full rounded-lg bg-white px-3 pt-2 pb-5 text-xs text-[#31415e] outline-none transition resize-none overflow-y-auto ${heightClasses} ${invalid
                ? "border border-[#ef6b6b] focus:border-[#ef6b6b]"
                : "border border-[#d4ddec] focus:border-[#2b7cf5]"
              }`}
            onChange={(event) => onChange(event.target.value)}
            value={value}
          />
        )
      ) : (
        <input
          className={`h-9 w-full rounded-lg bg-white px-3 text-xs text-[#31415e] outline-none transition ${invalid
              ? "border border-[#ef6b6b] focus:border-[#ef6b6b]"
              : "border border-[#d4ddec] focus:border-[#2b7cf5]"
            }`}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={value}
        />
      )}
    </div>
  );
}

function EditableListField({
  label,
  values,
  onChange,
  helperText,
  renderAsTags = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  helperText: string;
  renderAsTags?: boolean;
}) {
  const [rawMode, setRawMode] = useState(false);
  const [activeDraggableIndex, setActiveDraggableIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [newTagValue, setNewTagValue] = useState("");

  const handleItemChange = (index: number, val: string) => {
    const updated = [...values];
    updated[index] = val;
    onChange(updated);
  };

  const handleAddItem = () => {
    onChange([...values, ""]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = values.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setActiveDraggableIndex(null);
  };

  const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...values];
    const temp = updated[draggedIndex];
    updated[draggedIndex] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);

    setDraggedIndex(targetIndex);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = newTagValue.trim().replace(/^,|,$/g, "");
      if (val) {
        let processedVal = val;
        if (label.toLowerCase().includes("hashtag") && !val.startsWith("#")) {
          processedVal = `#${val}`;
        }
        if (!values.includes(processedVal)) {
          onChange([...values, processedVal]);
        }
      }
      setNewTagValue("");
    }
  };

  const handleTagBlur = () => {
    const val = newTagValue.trim().replace(/^,|,$/g, "");
    if (val) {
      let processedVal = val;
      if (label.toLowerCase().includes("hashtag") && !val.startsWith("#")) {
        processedVal = `#${val}`;
      }
      if (!values.includes(processedVal)) {
        onChange([...values, processedVal]);
      }
    }
    setNewTagValue("");
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4 transition-all duration-200 focus-within:border-[#cbd5e1] focus-within:bg-white focus-within:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between border-b border-[#eef2f6] pb-2.5 mb-2.5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#8093b2]">{label}</span>
          <p className="mt-0.5 text-[11px] text-[#8ea0bf]">{helperText}</p>
        </div>
        <div className="flex bg-white rounded-lg p-0.5 border border-[#d4ddec] text-[10px] font-bold shadow-xs">
          <button
            type="button"
            onClick={() => setRawMode(false)}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${!rawMode
                ? "bg-[#1b2748] text-white shadow-xs"
                : "text-[#5e718e] hover:bg-[#edf2fb]"
              }`}
          >
            <List className="h-3 w-3" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setRawMode(true)}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${rawMode
                ? "bg-[#1b2748] text-white shadow-xs"
                : "text-[#5e718e] hover:bg-[#edf2fb]"
              }`}
          >
            <Code className="h-3 w-3" />
            <span>Raw</span>
          </button>
        </div>
      </div>

      {rawMode ? (
        <textarea
          className="min-h-[144px] flex-1 w-full rounded-xl border border-[#d4ddec] bg-white px-3 pt-3 pb-5 text-sm leading-6 text-[#31415e] outline-none transition focus:border-[#2b7cf5] resize-y overflow-y-auto"
          onChange={(event) => onChange(toLines(event.target.value))}
          value={values.join("\n")}
        />
      ) : renderAsTags ? (
        <div className="flex flex-wrap gap-1.5 items-center p-3 border border-[#d4ddec] rounded-xl bg-white min-h-[90px] max-h-[200px] overflow-y-auto focus-within:border-[#2b7cf5] transition-all">
          {values.map((tag, idx) => (
            <span
              key={idx}
              className="bg-[#edf5ff] text-[#1b2748] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#d2e5ff] hover:bg-[#e0eeff] transition-all"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="w-4 h-4 flex items-center justify-center text-[#5e718e] hover:text-[#ef6b6b] hover:bg-[#fff0f0] rounded-md transition-colors font-bold cursor-pointer"
                title="Remove tag"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder={values.length === 0 ? "Add tag..." : "+ Add tag"}
            value={newTagValue}
            onChange={(e) => setNewTagValue(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={handleTagBlur}
            className="h-7 border border-dashed border-[#cbd5e1] hover:border-[#94a3b8] focus:border-[#2b7cf5] focus:border-solid rounded-lg px-2.5 text-xs text-[#31415e] outline-none transition-all w-24 focus:w-40 bg-slate-50/50 focus:bg-white"
          />
        </div>
      ) : (
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {values.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-[#8ea0bf] bg-white/50 rounded-xl border border-dashed border-[#d4ddec]">
              <p>No list items yet.</p>
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-2 text-xs font-bold text-[#2b7cf5] hover:underline cursor-pointer"
              >
                + Add first item
              </button>
            </div>
          ) : (
            values.map((item, index) => {
              const isDragging = draggedIndex === index;
              return (
                <div
                  key={index}
                  draggable={activeDraggableIndex === index}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={handleDragOver}
                  className={`flex items-center gap-2 transition-all duration-150 rounded-lg p-1 border ${isDragging
                      ? "border-dashed border-[#2b7cf5] bg-[#2b7cf5]/5 opacity-50"
                      : "border-transparent"
                    }`}
                >
                  <div
                    onMouseDown={() => setActiveDraggableIndex(index)}
                    onMouseUp={() => setActiveDraggableIndex(null)}
                    className="flex items-center gap-1 text-[#8ea0bf] hover:text-[#1b2748] cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-[#edf2fb] select-none"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold w-4 text-right">
                      {index + 1}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={item}
                    placeholder={`Item ${index + 1}`}
                    onChange={(e) => handleItemChange(index, e.target.value)}
                    className="flex-1 min-w-0 h-9 rounded-lg border border-[#d4ddec] bg-white px-3 text-sm text-[#31415e] outline-none transition focus:border-[#2b7cf5]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1.5 rounded-md text-[#ef6b6b] hover:bg-[#fff0f0] cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}

          {values.length > 0 && (
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full mt-2 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#cbd5e1] hover:border-[#94a3b8] bg-white text-xs font-semibold text-[#5e718e] hover:text-[#1e293b] transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Item</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditableAttributesField({
  label,
  attributes,
  onChange,
}: {
  label: string;
  attributes: Record<string, string>;
  onChange: (attributes: Record<string, string>) => void;
}) {
  const [rawMode, setRawMode] = useState(false);

  const entries = useMemo(() => {
    return Object.entries(attributes).map(([key, value], index) => ({
      id: `${key}-${index}`,
      origKey: key,
      key,
      value,
    }));
  }, [attributes]);

  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const nextAttr = { ...attributes };
    const value = nextAttr[oldKey] ?? "";
    delete nextAttr[oldKey];
    nextAttr[newKey] = value;
    onChange(nextAttr);
  };

  const handleValueChange = (key: string, value: string) => {
    const nextAttr = { ...attributes };
    nextAttr[key] = value;
    onChange(nextAttr);
  };

  const handleAddAttribute = () => {
    const base = "new_attribute";
    let index = 1;
    while (`${base}_${index}` in attributes) {
      index++;
    }
    const nextAttr = { ...attributes };
    nextAttr[`${base}_${index}`] = "";
    onChange(nextAttr);
  };

  const handleRemoveAttribute = (key: string) => {
    const nextAttr = { ...attributes };
    delete nextAttr[key];
    onChange(nextAttr);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4 transition-all duration-200 focus-within:border-[#cbd5e1] focus-within:bg-white focus-within:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between border-b border-[#eef2f6] pb-2.5 mb-2.5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#8093b2]">{label}</span>
          <p className="mt-0.5 text-[11px] text-[#8ea0bf]">Manage structured key-value attributes.</p>
        </div>
        <div className="flex bg-white rounded-lg p-0.5 border border-[#d4ddec] text-[10px] font-bold shadow-xs">
          <button
            type="button"
            onClick={() => setRawMode(false)}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${!rawMode
                ? "bg-[#1b2748] text-white shadow-xs"
                : "text-[#5e718e] hover:bg-[#edf2fb]"
              }`}
          >
            <List className="h-3 w-3" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setRawMode(true)}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${rawMode
                ? "bg-[#1b2748] text-white shadow-xs"
                : "text-[#5e718e] hover:bg-[#edf2fb]"
              }`}
          >
            <Code className="h-3 w-3" />
            <span>Raw</span>
          </button>
        </div>
      </div>

      {rawMode ? (
        <textarea
          className="min-h-[144px] flex-1 w-full rounded-xl border border-[#d4ddec] bg-white px-3 pt-3 pb-5 text-sm leading-6 text-[#31415e] outline-none transition focus:border-[#2b7cf5] resize-y overflow-y-auto"
          onChange={(event) => onChange(toAttributes(event.target.value))}
          value={Object.entries(attributes)
            .map(([key, fieldValue]) => `${key}: ${fieldValue}`)
            .join("\n")}
        />
      ) : (
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-[#8ea0bf] bg-white/50 rounded-xl border border-dashed border-[#d4ddec]">
              <p>No attributes defined.</p>
              <button
                type="button"
                onClick={handleAddAttribute}
                className="mt-2 text-xs font-bold text-[#2b7cf5] hover:underline cursor-pointer"
              >
                + Add first attribute
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2 px-1 text-[10px] font-bold text-[#8093b2] uppercase tracking-wider select-none">
                <span>Attribute Name</span>
                <span>Value</span>
                <span className="w-8"></span>
              </div>
              {entries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    value={entry.key}
                    placeholder="Name"
                    onChange={(e) => handleKeyChange(entry.origKey, e.target.value)}
                    className="h-9 rounded-lg border border-[#d4ddec] bg-white px-2.5 text-xs font-semibold text-[#1b2748] outline-none transition focus:border-[#2b7cf5] truncate"
                  />
                  <input
                    type="text"
                    value={entry.value}
                    placeholder="Value"
                    onChange={(e) => handleValueChange(entry.key, e.target.value)}
                    className="h-9 rounded-lg border border-[#d4ddec] bg-white px-2.5 text-xs text-[#31415e] outline-none transition focus:border-[#2b7cf5]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(entry.key)}
                    className="p-2 rounded-md text-[#ef6b6b] hover:bg-[#fff0f0] flex items-center justify-center cursor-pointer"
                    title="Delete attribute"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleAddAttribute}
              className="w-full mt-2 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#cbd5e1] hover:border-[#94a3b8] bg-white text-xs font-semibold text-[#5e718e] hover:text-[#1e293b] transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Attribute</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CustomDropdownSelector({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  colorDot = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  colorDot?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-xl border p-3 transition-all duration-200 ${
        isOpen
          ? "border-[#2b7cf5] bg-white shadow-[0_8px_20px_-6px_rgba(43,124,245,0.08)]"
          : "border-[#dbe2ee] bg-[#f8fbff] hover:border-slate-300"
      }`}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1 select-none">
        {label}
      </span>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer py-0.5 select-none"
      >
        <div className="flex items-center gap-2">
          {colorDot && value && (
            <span
              className="h-3.5 w-3.5 rounded-full border border-slate-200 shadow-2xs shrink-0"
              style={{ backgroundColor: value.toLowerCase() }}
            />
          )}
          <span className={`text-xs font-semibold ${value ? "text-[#31415e]" : "text-slate-400"}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 max-h-56 overflow-y-auto">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 font-semibold cursor-pointer border-0 bg-transparent flex items-center justify-between"
            >
              <span>Clear selection</span>
            </button>
          )}
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 flex items-center justify-between transition-all ${
                    isSelected
                      ? "bg-[#edf5ff] text-[#2b7cf5]"
                      : "text-slate-700 hover:bg-slate-50 bg-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {colorDot && (
                      <span
                        className="h-3 w-3 rounded-full border border-slate-200 shrink-0"
                        style={{ backgroundColor: opt.toLowerCase() }}
                      />
                    )}
                    <span>{opt}</span>
                  </div>
                  {isSelected && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5 text-[#2b7cf5]">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getStoredDraftKey() {
  const session = authStorage.load();
  return session?.user?.id ? `${draftStorageKey}:${session.user.id}` : draftStorageKey;
}

function generateMockListingId() {
  return Math.floor(1000000000 + Math.random() * 9000000000);
}

function generateMockASIN() {
  return "B0" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function AddProductEditor({
  activeMarket,
  initialProductId,
  initialImportRecordId = null,
  initialSourceHint,
  localDraftSeed,
  readOnly = false,
}: {
  activeMarket: MarketKey;
  initialProductId: string | null;
  initialImportRecordId?: string | null;
  initialSourceHint: "shopify" | "product_ai" | "commandctr" | null;
  localDraftSeed: LocalDraftSeed | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const productImageUploadInputRef = useRef<HTMLInputElement>(null);
  const lastSavedDraftRef = useRef<string | null>(null);
  const hydratedEbayBackendProductIdRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<ApiProduct>(emptyProduct);
  const [variantsByMarket, setVariantsByMarket] = useState<Record<MarketKey, ApiVariant[]>>(sampleVariants);
  const [productId, setProductId] = useState<string | null>(initialSourceHint === "product_ai" ? initialProductId : null);
  const [backendProductId, setBackendProductId] = useState<string | null>(
    initialSourceHint === "shopify" || initialSourceHint === "commandctr" ? initialProductId : null,
  );
  const [importRecordId, setImportRecordId] = useState<string | null>(initialImportRecordId);
  const [statusMessage, setStatusMessage] = useState("Choose an image and generate a product draft.");
  const [sourceTitle, setSourceTitle] = useState(emptyProduct.core.source_title);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("idle");
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [marketRegenerating, setMarketRegenerating] = useState<MarketActionState>(emptyActionState);
  const [marketImageGenerating, setMarketImageGenerating] = useState<MarketActionState>(emptyActionState);
  const [variantSubmitting, setVariantSubmitting] = useState<MarketActionState>(emptyActionState);
  const [isUploadingSourceImage, setIsUploadingSourceImage] = useState(false);
  const [isRefreshingPricing, setIsRefreshingPricing] = useState(false);
  const [publishSubmitting, setPublishSubmitting] = useState<PublishActionState>(emptyPublishState);
  const [publishVendor, setPublishVendor] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishPrice, setPublishPrice] = useState("");
  const [publishSku, setPublishSku] = useState("");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("ACTIVE");
  const [publishStock, setPublishStock] = useState("0");
  const [publishOnOnlineStore, setPublishOnOnlineStore] = useState(true);
  const [publishTrackInventory, setPublishTrackInventory] = useState(true);
  useEffect(() => {
    setDraft((prev) => withMissingEbayDraftDefaults(prev, publishVendor));
  }, [
    publishVendor,
    draft.core.attributes,
    draft.core.category,
    draft.core.normalized_title,
    draft.core.product_summary,
    draft.core.product_type,
    draft.core.source_title,
    draft.ebay.currency,
    draft.ebay.item_specifics,
    draft.ebay.marketplace_id,
    draft.ebay.title,
  ]);
  const [pricingSnapshot, setPricingSnapshot] = useState<ApiProductPricingSnapshot | null>(null);
  const lastPricingFallbackKeyRef = useRef<string | null>(null);
  const lastAutoPublishPriceRef = useRef("");
  const [selectedPublishShop, setSelectedPublishShop] = useState<PublishTarget>("shopify");
  const [prevActiveMarket, setPrevActiveMarket] = useState<MarketKey>(activeMarket);
  if (activeMarket !== prevActiveMarket) {
    setPrevActiveMarket(activeMarket);
    setSelectedPublishShop(activeMarket);
  }
  const [shopifyProductId, setShopifyProductId] = useState<string | null>(null);
  const [ebayListingId, setEbayListingId] = useState<string | null>(null);
  const [ebayListingStatus, setEbayListingStatus] = useState<string | null>(null);
  const [shopifySubmitMode, setShopifySubmitMode] = useState<ShopifyUploadMode | null>(null);
  const [shopifyPublishMessage, setShopifyPublishMessage] = useState("");
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [publishFieldErrors, setPublishFieldErrors] = useState<PublishFieldErrors>(emptyPublishFieldErrors);
  const [isUploadingToAll, setIsUploadingToAll] = useState(false);
  const [restoredLocalDraftProductId, setRestoredLocalDraftProductId] = useState<string | null | undefined>(undefined);
  const isImportMode = Boolean(importRecordId || initialImportRecordId);
  const currentImportRecordId = importRecordId || initialImportRecordId;
  const [hasInitializedDraftStorage, setHasInitializedDraftStorage] = useState(false);
  const [variantInputs, setVariantInputs] = useState<Record<MarketKey, { size: string; color: string }>>({
    amazon: { size: "", color: "" },
    ebay: { size: "", color: "" },
    etsy: { size: "", color: "" },
    tiktok: { size: "", color: "" },
    shopify: { size: "", color: "" },
  });

  useEffect(() => {
    if (!backendProductId || hydratedEbayBackendProductIdRef.current === backendProductId) {
      return;
    }

    hydratedEbayBackendProductIdRef.current = backendProductId;
    let active = true;

    void productsApi
      .getProductById(backendProductId)
      .then(async (product) => {
        if (!active) {
          return;
        }

        const restoredListingId = product.ebayListingId ?? null;
        const restoredListingStatus = product.ebayStatus ?? null;
        setEbayListingId(restoredListingId);
        setEbayListingStatus(restoredListingStatus);

        if (productId && product.productAiProductId !== productId) {
          await productsApi.updateProduct(backendProductId, { productAiProductId: productId }).catch(() => null);
        }

        if (typeof window !== "undefined") {
          const rawSnapshot = window.localStorage.getItem(getStoredDraftKey());
          if (rawSnapshot) {
            const snapshot = JSON.parse(rawSnapshot) as SavedDraftSnapshot;
            if (snapshot.backendProductId === backendProductId) {
              persistDraftSnapshot({
                ...snapshot,
                ebayListingId: restoredListingId,
                ebayListingStatus: restoredListingStatus,
              });
            }
          }
        }
      })
      .catch(() => {
        hydratedEbayBackendProductIdRef.current = null;
      });

    return () => {
      active = false;
    };
  }, [backendProductId, productId]);

  const [activeUploadCardKey, setActiveUploadCardKey] = useState<ImageCardKey | null>(null);
  const [imageUploadingMap, setImageUploadingMap] = useState<Record<string, boolean>>({});
  const [draggingOverCardKey, setDraggingOverCardKey] = useState<ImageCardKey | null>(null);
  const manualUploadInputRef = useRef<HTMLInputElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const onlineStoreDropdownRef = useRef<HTMLDivElement>(null);
  const [isOnlineStoreDropdownOpen, setIsOnlineStoreDropdownOpen] = useState(false);

  const trackInventoryDropdownRef = useRef<HTMLDivElement>(null);
  const [isTrackInventoryDropdownOpen, setIsTrackInventoryDropdownOpen] = useState(false);

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>("all");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Shopify Options & Variants UX Replication states
  const [editingOptionIndices, setEditingOptionIndices] = useState<Record<number, boolean>>({});
  const [activeOptionNameDropdownIndex, setActiveOptionNameDropdownIndex] = useState<number | null>(null);
  const [activeOptionValuesDropdownIndex, setActiveOptionValuesDropdownIndex] = useState<number | null>(null);
  const [optionNameSearch, setOptionNameSearch] = useState("");
  const [optionValueSearch, setOptionValueSearch] = useState("");

  const [isWeightUnitOpen, setIsWeightUnitOpen] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [groupByValue, setGroupByValue] = useState("all");
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Add stock location custom modal state
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [locationError, setLocationError] = useState("");

  // Shopify high-fidelity UI states
  const [showCompareAtPrice, setShowCompareAtPrice] = useState(false);
  const [showCostPerItem, setShowCostPerItem] = useState(false);
  const [isSeoCollapsed, setIsSeoCollapsed] = useState(true);
  const [shippingPackage, setShippingPackage] = useState("Store default • Sample box - 8.6 × 5.4 × 1.8 in, 0 lb");
  const [isPackageDropdownOpen, setIsPackageDropdownOpen] = useState(false);
  const [isContinueSellingDropdownOpen, setIsContinueSellingDropdownOpen] = useState(false);

  const handleAddLocationSubmit = () => {
    const trimmedName = newLocationName.trim();
    if (!trimmedName) {
      setLocationError("Location name cannot be empty.");
      return;
    }
    const currentLocs = draft.shopify.stock_locations ?? [];
    if (currentLocs.some(l => l.name.toLowerCase() === trimmedName.toLowerCase())) {
      setLocationError("A location with this name already exists.");
      return;
    }
    setDraft((prev) => {
      const current = prev.shopify.stock_locations ?? [];
      return {
        ...prev,
        shopify: {
          ...prev.shopify,
          stock_locations: [...current, { name: trimmedName, available: 0, on_hand: 0 }]
        }
      };
    });
    setIsAddLocationOpen(false);
    setNewLocationName("");
    setLocationError("");
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (onlineStoreDropdownRef.current && !onlineStoreDropdownRef.current.contains(event.target as Node)) {
        setIsOnlineStoreDropdownOpen(false);
      }
      if (trackInventoryDropdownRef.current && !trackInventoryDropdownRef.current.contains(event.target as Node)) {
        setIsTrackInventoryDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      
      const target = event.target as HTMLElement;
      if (!target.closest(".option-name-container")) {
        setActiveOptionNameDropdownIndex(null);
      }
      if (!target.closest(".option-values-container")) {
        setActiveOptionValuesDropdownIndex(null);
      }
      if (!target.closest(".inline-weight-unit-container")) {
        setIsWeightUnitOpen(false);
      }
      if (!target.closest(".country-select-container")) {
        setIsCountryOpen(false);
      }
      if (!target.closest(".shopify-groupby-container")) {
        setIsGroupByOpen(false);
      }
      if (!target.closest(".status-select-container")) {
        setIsStatusOpen(false);
      }
      if (!target.closest(".theme-select-container")) {
        setIsThemeOpen(false);
      }
      if (!target.closest(".package-select-container")) {
        setIsPackageDropdownOpen(false);
      }
      if (!target.closest(".shopify-continue-selling-container")) {
        setIsContinueSellingDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveOptionNameDropdownIndex(null);
        setActiveOptionValuesDropdownIndex(null);
        setIsWeightUnitOpen(false);
        setIsCountryOpen(false);
        setIsGroupByOpen(false);
        setIsStatusOpen(false);
        setIsThemeOpen(false);
        setIsAddLocationOpen(false);
        setIsPackageDropdownOpen(false);
        setIsContinueSellingDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const hasPersistedProduct = Boolean(productId);

  function buildDraftSnapshot(): SavedDraftSnapshot {
    return {
      draft,
      variantsByMarket,
      productId,
      backendProductId,
      ebayListingId,
      ebayListingStatus,
      shopifyProductId,
      sourceTitle,
      publishVendor,
      publishDescription,
      publishPrice,
      publishSku,
      publishStatus,
      publishStock,
      publishOnOnlineStore,
      publishTrackInventory,
      savedAt: new Date().toISOString(),
    };
  }

  const handleUpdateShopifyVariants = (
    options: Array<{ name: string; values: string[] }>,
    currentVariants: ApiShopifyVariant[]
  ) => {
    const validOptions = options.filter((opt) => opt.name.trim() !== "" && opt.values.length > 0);
    if (validOptions.length === 0) {
      return [];
    }
    const combinations = cartesianProduct(validOptions.map((opt) => opt.values));
    return combinations.map((combo) => {
      const title = combo.join(" / ");
      const existing = currentVariants.find((v) => v.title === title);
      if (existing) {
        return existing;
      }
      return {
        title,
        price: publishPrice || "0.00",
        sku: "",
        inventoryQuantity: 0,
        trackInventory: true,
        barcode: "",
        compareAtPrice: "",
        weight: draft.shopify.weight || "0.0",
        weightUnit: draft.shopify.weight_unit || "lb",
      };
    });
  };

  function clearPricingSnapshot() {
    setPricingSnapshot(null);
    setIsRefreshingPricing(false);
  }

  function updatePublishPrice(value: string, source: "manual" | "auto" = "manual") {
    if (source === "manual" && value.trim() !== lastAutoPublishPriceRef.current) {
      lastAutoPublishPriceRef.current = "";
    }
    setPublishPrice(value);
    setDraft((prev) => {
      const nextAttributes = { ...prev.core.attributes };
      if (value.trim()) {
        nextAttributes.price = value.trim();
      } else {
        delete nextAttributes.price;
      }

      return {
        ...prev,
        core: {
          ...prev.core,
          attributes: nextAttributes,
        },
      };
    });
    if (publishFieldErrors.price && value.trim()) {
      setPublishFieldErrors((prev) => ({ ...prev, price: false }));
    }
  }

  function syncPublishPriceFromPricing(pricing: ApiProductPricingSnapshot["markets"][number] | null | undefined) {
    if (!pricing) {
      return false;
    }

    const nextRecommendedPrice =
      typeof pricing.recommended_price === "number"
        ? pricing.recommended_price
        : typeof pricing.suggested_price_range?.recommended === "number"
          ? pricing.suggested_price_range.recommended
          : null;
    if (nextRecommendedPrice === null) {
      return false;
    }

    const nextFormattedPrice = nextRecommendedPrice.toFixed(2);
    const currentTrimmedPrice = publishPrice.trim();
    if (currentTrimmedPrice && currentTrimmedPrice !== lastAutoPublishPriceRef.current) {
      return false;
    }

    lastAutoPublishPriceRef.current = nextFormattedPrice;
    updatePublishPrice(nextFormattedPrice, "auto");
    return true;
  }

  function buildQueryPricingText() {
    const attrs = draft.core.attributes ?? {};
    const pieces = [
      draft.core.normalized_title,
      draft.core.source_title,
      publishPrice.trim() ? `current price ${publishPrice.trim()}` : "",
      publishVendor,
      attrs.brand,
      attrs.model ?? attrs.model_number,
      attrs.color,
      attrs.material,
      attrs.style,
      draft.core.product_type,
      draft.core.category,
      "price",
    ];

    return pieces
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .join(" ")
      .slice(0, 200)
      .trimEnd();
  }

  async function buildQueryPricingImageFile(): Promise<File | null> {
    if (selectedImage) {
      return selectedImage;
    }

    const sourcePath = draft.images.source?.absolute_path || draft.images.source?.relative_path;
    if (!sourcePath) {
      return null;
    }

    const src = imageUrlFor(sourcePath);
    if (!src) {
      return null;
    }

    let response: Response;
    try {
      response = await fetch(src, { cache: "no-store" });
    } catch {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const filename = sourcePath.split(/[\\/]/).pop() || "source-image.bin";
    return new File([blob], filename, {
      type: blob.type || "application/octet-stream",
    });
  }

  async function fetchQueryBasedPricing(marketplace: MarketKey) {
    const queryText = buildQueryPricingText();
    if (!queryText) {
      return null;
    }

    const currentPrice = Number.parseFloat(publishPrice.trim());
    const hasCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0;

    const imageFile = await buildQueryPricingImageFile();
    const response = imageFile
      ? await (async () => {
          const formData = new FormData();
          formData.append("title", queryText);
          formData.append("marketplace", marketplace);
          if (hasCurrentPrice) {
            formData.append("current_price", currentPrice.toFixed(2));
          }
          formData.append("image", imageFile);
          return fetch("/api/product-ai/pricing/query/image", {
            method: "POST",
            body: formData,
          });
        })()
      : await fetch("/api/product-ai/pricing/query/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_name: queryText,
            marketplace,
            ...(hasCurrentPrice ? { current_price: currentPrice } : {}),
          }),
        });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiDynamicPricingQueryResponse;
    return {
      product_id: productId ?? "query",
      generated_at: payload.generated_at,
      markets: payload.markets,
    } satisfies ApiProductPricingSnapshot;
  }

  async function ensureMarketPricingFallback(marketplace: MarketKey) {
    const queryText = buildQueryPricingText();
    const fallbackKey = `${productId ?? "query"}|${marketplace}|${queryText}`;
    if (lastPricingFallbackKeyRef.current === fallbackKey) {
      return null;
    }

    lastPricingFallbackKeyRef.current = fallbackKey;
    const querySnapshot = await fetchQueryBasedPricing(marketplace);
    if (!querySnapshot) {
      return null;
    }

    setPricingSnapshot(querySnapshot);
    return querySnapshot;
  }

  useEffect(() => {
    if (!productId || isLoadingProduct || isRefreshingPricing) {
      return;
    }
    if (publishPrice.trim()) {
      return;
    }
    if (pricingSnapshot !== null) {
      return;
    }

    void analyzeDynamicPricing();
  }, [productId, isLoadingProduct, isRefreshingPricing, pricingSnapshot, publishPrice, activeMarket]);

  useEffect(() => {
    if (isRefreshingPricing || !pricingSnapshot) {
      return;
    }

    const activePricing = pricingSnapshot.markets.find((entry) => entry.marketplace === activeMarket) ?? null;
    if (!syncPublishPriceFromPricing(activePricing)) {
      if (!publishPrice.trim()) {
        void (async () => {
          const querySnapshot = await ensureMarketPricingFallback(activeMarket);
          if (!querySnapshot) {
            return;
          }

          const queryPricing = querySnapshot.markets.find((entry) => entry.marketplace === activeMarket) ?? querySnapshot.markets[0];
          if (queryPricing) {
            syncPublishPriceFromPricing(queryPricing);
          }
        })();
      }
    }
  }, [activeMarket, pricingSnapshot, isRefreshingPricing, publishPrice, productId]);

  function buildComparableDraftSignature(snapshot: SavedDraftSnapshot) {
    return JSON.stringify({
      draft: snapshot.draft,
      variantsByMarket: snapshot.variantsByMarket,
      productId: snapshot.productId,
      backendProductId: snapshot.backendProductId,
      ebayListingId: snapshot.ebayListingId ?? null,
      ebayListingStatus: snapshot.ebayListingStatus ?? null,
      shopifyProductId: snapshot.shopifyProductId,
      sourceTitle: snapshot.sourceTitle,
      publishVendor: snapshot.publishVendor,
      publishDescription: snapshot.publishDescription ?? "",
      publishPrice: snapshot.publishPrice,
      publishSku: snapshot.publishSku,
      publishStatus: snapshot.publishStatus,
      publishStock: snapshot.publishStock,
      publishOnOnlineStore: snapshot.publishOnOnlineStore,
      publishTrackInventory: snapshot.publishTrackInventory,
    });
  }

  function persistDraftSnapshot(snapshot: SavedDraftSnapshot) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(getStoredDraftKey(), JSON.stringify(snapshot));
    lastSavedDraftRef.current = buildComparableDraftSignature(snapshot);
    setHasSavedDraft(true);
  }

  function applySavedDraft(snapshot: SavedDraftSnapshot, message: string) {
    const normalizedShopify: ApiShopify = {
      ...emptyProduct.shopify,
      ...snapshot.draft.shopify,
      metafields: {
        ...emptyProduct.shopify.metafields,
        ...(snapshot.draft.shopify?.metafields ?? {}),
      },
      stock_locations: (snapshot.draft.shopify?.stock_locations ?? emptyProduct.shopify.stock_locations ?? []).map(loc => ({
        name: loc.name,
        available: loc.available ?? 0,
        on_hand: loc.on_hand ?? 0,
        unavailable: loc.unavailable ?? 0,
        committed: loc.committed ?? 0
      })),
      has_variants: snapshot.draft.shopify?.has_variants ?? false,
      options: snapshot.draft.shopify?.options ?? [{ name: "Size", values: [] }],
      variants: snapshot.draft.shopify?.variants ?? [],
    };
    const normalizedDraft = {
      ...snapshot.draft,
      ebay: {
        ...emptyProduct.ebay,
        ...(snapshot.draft.ebay ?? {}),
        condition: normalizeEbayCondition(snapshot.draft.ebay?.condition),
      },
      shopify: normalizedShopify,
    };
    setDraft(normalizedDraft);
    setShowCompareAtPrice(!!normalizedShopify.compare_at_price);
    setShowCostPerItem(!!normalizedShopify.cost_per_item);
    setVariantsByMarket(snapshot.variantsByMarket);
    setProductId(snapshot.productId);
    setBackendProductId(snapshot.backendProductId ?? null);
    setEbayListingId(snapshot.ebayListingId ?? null);
    setEbayListingStatus(snapshot.ebayListingStatus ?? null);
    setShopifyProductId(snapshot.shopifyProductId);
    setSourceTitle(snapshot.sourceTitle);
    setPublishVendor(snapshot.publishVendor);
    setPublishDescription(snapshot.publishDescription ?? "");
    setPublishPrice(snapshot.publishPrice);
    setPublishSku(snapshot.publishSku);
    setPublishStatus(snapshot.publishStatus);
    setPublishStock(snapshot.publishStock ?? "0");
    setPublishOnOnlineStore(snapshot.publishOnOnlineStore ?? true);
    setPublishTrackInventory(snapshot.publishTrackInventory ?? true);
    setShopifyPublishMessage("");
    setHasSavedDraft(true);
    lastSavedDraftRef.current = buildComparableDraftSignature(snapshot);
    setDraftSaveState("saved");
    setPublishFieldErrors(emptyPublishFieldErrors);
    setStatusMessage(message);
  }

  function resetDraftEditor(
    message: string,
    options?: {
      deleteSavedDraft?: boolean;
    },
  ) {
    const shouldDeleteSavedDraft = options?.deleteSavedDraft ?? false;
    if (typeof window !== "undefined" && shouldDeleteSavedDraft) {
      window.localStorage.removeItem(getStoredDraftKey());
    }

    setDraft(emptyProduct);
    setVariantsByMarket(sampleVariants);
    setProductId(null);
    setBackendProductId(null);
    setEbayListingId(null);
    setEbayListingStatus(null);
    setShopifyProductId(null);
    setSourceTitle(emptyProduct.core.source_title);
    clearSelectedImageSelection();
    setPublishVendor("");
    setPublishDescription("");
    setPublishPrice("");
    setPublishSku("");
    setPublishStatus("ACTIVE");
    setPublishStock("0");
    setPublishOnOnlineStore(true);
    setPublishTrackInventory(true);
    setShopifyPublishMessage("");
    clearPricingSnapshot();
    setPublishFieldErrors(emptyPublishFieldErrors);
    setVariantInputs({
      amazon: { size: "", color: "" },
      ebay: { size: "", color: "" },
      etsy: { size: "", color: "" },
      tiktok: { size: "", color: "" },
      shopify: { size: "", color: "" },
    });
    setHasSavedDraft(shouldDeleteSavedDraft ? false : hasSavedDraft);
    setShowCompareAtPrice(false);
    setShowCostPerItem(false);
    setIsSeoCollapsed(true);
    setShippingPackage("Store default • Sample box - 8.6 × 5.4 × 1.8 in, 0 lb");
    setDraftSaveState(shouldDeleteSavedDraft ? "idle" : "saved");
    lastSavedDraftRef.current = shouldDeleteSavedDraft ? null : lastSavedDraftRef.current;
    setRestoredLocalDraftProductId(undefined);
    clearSelectedImageSelection();
    setStatusMessage(message);
    router.replace(
      isImportMode ? "/import" : `/products/add?market=${activeMarket}`,
      { scroll: false },
    );
  }

  function clearSavedDraft() {
    resetDraftEditor("Editor cleared. Saved draft is still available to load again.");
  }

  function loadSavedDraft() {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(getStoredDraftKey());
    if (!raw) {
      setHasSavedDraft(false);
      setStatusMessage("No saved draft was found for this account.");
      return;
    }

    try {
      const snapshot = JSON.parse(raw) as SavedDraftSnapshot;
      applySavedDraft(snapshot, "Saved draft loaded for this account.");
      setRestoredLocalDraftProductId(snapshot.productId);
    } catch {
      window.localStorage.removeItem(getStoredDraftKey());
      setHasSavedDraft(false);
      setStatusMessage("Saved draft data was invalid and has been cleared.");
    }
  }

  const applyLocalDraftSeed = useCallback((seed: LocalDraftSeed) => {
    const trimmedTitle = seed.title.trim();
    const nextDraft: ApiProduct = {
      ...emptyProduct,
      core: {
        ...emptyProduct.core,
        normalized_title: trimmedTitle,
        source_title: trimmedTitle,
      },
      shopify: {
        ...emptyProduct.shopify,
        title: trimmedTitle,
      },
      amazon: {
        ...emptyProduct.amazon,
        title: trimmedTitle,
      },
      ebay: {
        ...emptyProduct.ebay,
        title: trimmedTitle,
      },
      etsy: {
        ...emptyProduct.etsy,
        title: trimmedTitle,
      },
      tiktok: {
        ...emptyProduct.tiktok,
        title: trimmedTitle,
      },
      images: {
        ...emptyProduct.images,
        source: {
          ...emptyProduct.images.source,
          relative_path: seed.imagePath,
          absolute_path: seed.imagePath,
          generation_mode: "manual_upload",
          mime_type: seed.imageMimeType,
          validation: {
            ...emptyProduct.images.source.validation,
            passed: true,
            errors: [],
            mime_type: seed.imageMimeType,
          },
        },
      },
    };

    const snapshot: SavedDraftSnapshot = {
      draft: nextDraft,
      variantsByMarket: sampleVariants,
      productId: null,
      backendProductId: null,
      shopifyProductId: null,
      sourceTitle: trimmedTitle,
      publishVendor: "",
      publishDescription: "",
      publishPrice: "",
      publishSku: "",
      publishStatus: "ACTIVE",
      publishStock: "0",
      publishOnOnlineStore: true,
      publishTrackInventory: true,
      savedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(getStoredDraftKey(), JSON.stringify(snapshot));
    }

    clearSelectedImageSelection();
    lastSavedDraftRef.current = buildComparableDraftSignature(snapshot);
    setDraft(snapshot.draft);
    setVariantsByMarket(snapshot.variantsByMarket);
    setProductId(snapshot.productId);
    setBackendProductId(snapshot.backendProductId ?? null);
    setShopifyProductId(snapshot.shopifyProductId);
    setSourceTitle(snapshot.sourceTitle);
    setPublishVendor(snapshot.publishVendor);
    setPublishDescription(snapshot.publishDescription ?? "");
    setPublishPrice(snapshot.publishPrice);
    setPublishSku(snapshot.publishSku);
    setPublishStatus(snapshot.publishStatus);
    setPublishStock(snapshot.publishStock ?? "0");
    setPublishOnOnlineStore(snapshot.publishOnOnlineStore ?? true);
    setPublishTrackInventory(snapshot.publishTrackInventory ?? true);
    setShopifyPublishMessage("");
    setHasSavedDraft(true);
    setDraftSaveState("saved");
    setPublishFieldErrors(emptyPublishFieldErrors);
    setStatusMessage("The AI backend timed out, so we opened a local draft with your title and source image preserved.");
  }, []);

  useEffect(() => {
    if (isImportMode) {
      setHasInitializedDraftStorage(true);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(getStoredDraftKey());
    if (!raw) {
      window.setTimeout(() => {
        setHasInitializedDraftStorage(true);
      }, 0);
      return;
    }

    try {
      const snapshot = JSON.parse(raw) as SavedDraftSnapshot;
      window.setTimeout(() => {
        setHasSavedDraft(true);
      }, 0);

      const matchesCurrentDraft = !initialProductId || snapshot.productId === initialProductId;
      if (matchesCurrentDraft) {
        window.setTimeout(() => {
          applySavedDraft(snapshot, "Saved draft restored for this account.");
          setRestoredLocalDraftProductId(snapshot.productId);
          setHasInitializedDraftStorage(true);
        }, 0);
      } else {
        window.setTimeout(() => {
          setRestoredLocalDraftProductId(undefined);
          setHasInitializedDraftStorage(true);
        }, 0);
      }
    } catch {
      window.localStorage.removeItem(getStoredDraftKey());
      window.setTimeout(() => {
        setHasSavedDraft(false);
        setRestoredLocalDraftProductId(undefined);
        setHasInitializedDraftStorage(true);
      }, 0);
    }
  }, [initialProductId, isImportMode]);

  useEffect(() => {
    if (isImportMode || !hasInitializedDraftStorage || initialProductId || hasSavedDraft || !localDraftSeed) {
      return;
    }

    window.setTimeout(() => {
      applyLocalDraftSeed(localDraftSeed);
    }, 0);
  }, [applyLocalDraftSeed, hasInitializedDraftStorage, hasSavedDraft, initialProductId, isImportMode, localDraftSeed]);

  useEffect(() => {
    if (initialImportRecordId) {
      let active = true;

      async function loadImportRecord() {
        setIsLoadingProduct(true);
        const recordId = initialImportRecordId;
        if (!recordId) {
          setIsLoadingProduct(false);
          return;
        }
        const previewFallback = readImportPreviewFallback(recordId);

        if (previewFallback) {
          setSourceTitle((current) => current || previewFallback.normalized_title);
          setDraft((prev) => ({
            ...prev,
            core: {
              ...prev.core,
              source_title: prev.core.source_title || previewFallback.normalized_title,
              normalized_title:
                prev.core.normalized_title || previewFallback.normalized_title,
              category: prev.core.category || previewFallback.category,
              product_type: prev.core.product_type || previewFallback.product_type,
            },
            images: {
              ...prev.images,
              source:
                prev.images.source.absolute_path || !previewFallback.preview_image_path
                  ? prev.images.source
                  : {
                      ...prev.images.source,
                      absolute_path: previewFallback.preview_image_path,
                      relative_path:
                        prev.images.source.relative_path ||
                        previewFallback.preview_image_path,
                      generation_mode:
                        prev.images.source.generation_mode || "source_passthrough",
                    },
              shopify:
                prev.images.shopify.absolute_path || !previewFallback.preview_image_path
                  ? prev.images.shopify
                  : {
                      ...prev.images.shopify,
                      absolute_path: previewFallback.preview_image_path,
                      relative_path:
                        prev.images.shopify.relative_path ||
                        previewFallback.preview_image_path,
                    },
            },
          }));
        }

        try {
          const response = await fetch(
            `/api/product-ai/imports/products/${recordId}`,
            { cache: "no-store" },
          );

          if (!response.ok) {
            const errorBody = (await response.json().catch(() => null)) as {
              detail?: string;
            } | null;
            throw new Error(
              errorBody?.detail ?? "Could not load the imported product.",
            );
          }

          const record = mergeImportRecordFallback(
            (await response.json()) as ImportApiRecord,
            previewFallback,
          );
          if (!active) {
            return;
          }

          applyImportRecord(
            record,
            readOnly
              ? "Imported product loaded."
              : `Loaded imported draft ${record.id.slice(0, 8)} for editing.`,
          );
        } catch (error) {
          if (!active) {
            return;
          }

          setStatusMessage(
            error instanceof Error
              ? error.message
              : "Failed to load the imported product.",
          );
        } finally {
          if (active) {
            setIsLoadingProduct(false);
          }
        }
      }

      void loadImportRecord();
      return () => {
        active = false;
      };
    }

    if (!initialProductId) {
      return;
    }

    if (restoredLocalDraftProductId === initialProductId) {
      return;
    }

    let active = true;

    async function loadProduct() {
      const requestedProductId = initialProductId;
      if (!requestedProductId) {
        return;
      }

      setIsLoadingProduct(true);
      try {
        if (initialSourceHint !== "shopify" && initialSourceHint !== "commandctr") {
          const response = await fetch(`/api/product-ai/products/${requestedProductId}`, { cache: "no-store" });
          if (response.ok) {
            const record = (await response.json()) as ApiRecord;
            if (!active) {
              return;
            }

            const backendProducts = await productsApi.getProducts().catch(() => []);
            const linkedProduct =
              backendProducts.find((item) => item.productAiProductId === requestedProductId) ?? null;
            const linkedProductId = linkedProduct?._id ?? linkedProduct?.id ?? null;

            setBackendProductId(linkedProductId);
            setEbayListingId(linkedProduct?.ebayListingId ?? null);
            setEbayListingStatus(linkedProduct?.ebayStatus ?? null);
            setShopifyProductId(null);
            applyRecord(record, `Loaded draft ${record.id.slice(0, 8)} for editing.`);
            return;
          }
        }

        let product: ProductListItem | null = null;
        if (/^[a-f\d]{24}$/i.test(requestedProductId)) {
          try {
            product = await productsApi.getProductById(requestedProductId);
          } catch {
            product = null;
          }
        }
        if (!product) {
          const products = await productsApi.getProducts();
          product =
            products.find(
              (item) =>
                item._id === requestedProductId ||
                item.id === requestedProductId ||
                item.shopifyProductId === requestedProductId,
            ) ?? null;
        }

        if (product) {
          if (!active) {
            return;
          }

          applyPersistedProduct(product, `Loaded saved product for editing.`);
          return;
        }

        throw new Error("Could not load the saved product draft.");
      } catch (error) {
        if (!active) {
          return;
        }

        setStatusMessage(error instanceof Error ? error.message : "Failed to load the product draft.");
      } finally {
        if (active) {
          setIsLoadingProduct(false);
        }
      }
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, [initialImportRecordId, initialProductId, initialSourceHint, readOnly, restoredLocalDraftProductId]);

  useEffect(() => {
    if (isImportMode || typeof window === "undefined") {
      return;
    }

    if (!hasInitializedDraftStorage) {
      return;
    }

    const snapshot: SavedDraftSnapshot = {
      draft,
      variantsByMarket,
      productId,
      backendProductId,
      shopifyProductId,
      sourceTitle,
      publishVendor,
      publishDescription,
      publishPrice,
      publishSku,
      publishStatus,
      publishStock,
      publishOnOnlineStore,
      publishTrackInventory,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(getStoredDraftKey(), JSON.stringify(snapshot));
    window.setTimeout(() => {
      setHasSavedDraft(true);
    }, 0);
  }, [backendProductId, draft, hasInitializedDraftStorage, isImportMode, productId, publishDescription, publishPrice, publishSku, publishStatus, publishVendor, shopifyProductId, sourceTitle, variantsByMarket, publishStock, publishOnOnlineStore, publishTrackInventory]);

  const selectedImagePreviewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage],
  );

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  const currentDraftComparableSignature = useMemo(
    () =>
      buildComparableDraftSignature({
        draft,
        variantsByMarket,
        productId,
        backendProductId,
        ebayListingId,
        ebayListingStatus,
        shopifyProductId,
        sourceTitle,
        publishVendor,
        publishDescription,
        publishPrice,
        publishSku,
        publishStatus,
        publishStock,
        publishOnOnlineStore,
        publishTrackInventory,
        savedAt: "",
      }),
    [backendProductId, draft, ebayListingId, ebayListingStatus, variantsByMarket, productId, shopifyProductId, sourceTitle, publishVendor, publishDescription, publishPrice, publishSku, publishStatus, publishStock, publishOnOnlineStore, publishTrackInventory],
  );

  const isDraftSaved =
    Boolean(lastSavedDraftRef.current) && lastSavedDraftRef.current === currentDraftComparableSignature;
  const effectiveDraftSaveState: DraftSaveState =
    draftSaveState === "saving" ? "saving" : isDraftSaved ? "saved" : "idle";

  useEffect(() => {
    if (!lastSavedDraftRef.current) {
      setDraftSaveState("idle");
      return;
    }

    setDraftSaveState(lastSavedDraftRef.current === currentDraftComparableSignature ? "saved" : "idle");
  }, [currentDraftComparableSignature]);

  const imageCards = useMemo<ImageCardConfig[]>(
    () => [
      { key: "source", label: "Source Upload", image: draft.images.source, note: "Original upload stored for audit and regeneration." },
      { key: "transparent_cutout", label: "Transparent Cutout", image: draft.images.transparent_cutout, note: "Used for white-background and styled marketplace compositions." },
      { key: "amazon", label: "Amazon Main", image: draft.images.amazon, note: "Marketplace-ready main image." },
      { key: "ebay", label: "eBay Main", image: draft.images.ebay, note: "Marketplace-ready main image." },
      { key: "etsy", label: "Etsy Hero", image: draft.images.etsy, note: "Styled Etsy marketplace image." },
      { key: "tiktok", label: "TikTok Hero", image: draft.images.tiktok, note: "Styled vertical marketplace image." },
      { key: "shopify", label: "Shopify Hero", image: draft.images.shopify, note: "Storefront hero image." },
    ],
    [draft.images],
  );
  const shopifyCategorySuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            draft.core.category,
            draft.core.product_type,
            draft.shopify.product_type,
          ]
            .map((value) => value?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).filter((value) => value !== draft.shopify.category?.trim()),
    [draft.core.category, draft.core.product_type, draft.shopify.category, draft.shopify.product_type],
  );

  const hasSourceImage = Boolean(
    draft.images.source?.absolute_path || draft.images.source?.relative_path,
  );

  function buildCoreDraftForSave() {
    const nextAttributes = { ...draft.core.attributes };
    const trimmedPrice = publishPrice.trim();
    const trimmedSku = publishSku.trim();
    const trimmedVendor = publishVendor.trim();

    if (trimmedPrice) {
      nextAttributes.price = trimmedPrice;
    } else {
      delete nextAttributes.price;
    }

    if (trimmedSku) {
      nextAttributes.sku = trimmedSku;
    } else {
      delete nextAttributes.sku;
    }

    if (trimmedVendor) {
      nextAttributes.brand = trimmedVendor;
    } else if (!String(nextAttributes.brand ?? "").trim()) {
      delete nextAttributes.brand;
    }

    return {
      ...draft.core,
      attributes: nextAttributes,
    };
  }

  function applyRecord(record: ApiRecord, message: string) {
    setProductId(record.id);
    const mergedImages = { ...record.product.images };
    const keys: ImageCardKey[] = ["source", "transparent_cutout", "amazon", "ebay", "etsy", "tiktok", "shopify"];
    keys.forEach((k) => {
      if (!mergedImages[k]?.absolute_path && draft.images[k]?.absolute_path) {
        mergedImages[k] = draft.images[k];
      }
    });
    // Ensure the Shopify inventory table always has at least one editable location
    // row. Saved drafts can come back with empty/undefined stock_locations, which
    // renders an empty table with no quantity field to edit. Seed a default
    // location with the known stock so the Available field is always available.
    const recordStockLocations = record.product.shopify.stock_locations ?? [];
    const primaryStock = Math.max(0, record.product.shopify.variants?.[0]?.inventoryQuantity ?? 0);
    const ensuredStockLocations =
      recordStockLocations.length > 0
        ? recordStockLocations
        : [{ name: "Kingston Grove", available: primaryStock, on_hand: primaryStock, unavailable: 0, committed: 0 }];
    const mergedProduct = {
      ...record.product,
      images: mergedImages,
      shopify: {
        ...record.product.shopify,
        stock_locations: ensuredStockLocations,
      },
    };
    setDraft(mergedProduct);
    setVariantsByMarket(record.variants);
    setSourceTitle(record.product.core.source_title);
    setPublishVendor((current) => current || record.product.core.attributes.brand || "");
    setPublishPrice((current) => current || record.product.core.attributes.price || "");
    setPublishDescription((current) => current || record.product.shopify.body_html || record.product.core.product_summary || "");
    setPublishSku((current) => current || record.id.slice(0, 12).toUpperCase());
    clearPricingSnapshot();

    // Set lastSavedDraftRef signature to match this active record apply state!
    const finalVendor = publishVendor || record.product.core.attributes.brand || "";
    const finalPrice = publishPrice || record.product.core.attributes.price || "";
    const finalDescription = publishDescription || record.product.shopify.body_html || record.product.core.product_summary || "";
    const finalSku = publishSku || record.id.slice(0, 12).toUpperCase();

    const savedSnapshot: SavedDraftSnapshot = {
      draft: mergedProduct,
      variantsByMarket: record.variants,
      productId: record.id,
      backendProductId,
      ebayListingId,
      ebayListingStatus,
      shopifyProductId: shopifyProductId,
      sourceTitle: record.product.core.source_title,
      publishVendor: finalVendor,
      publishDescription: finalDescription,
      publishPrice: finalPrice,
      publishSku: finalSku,
      publishStatus: publishStatus,
      publishStock: publishStock,
      publishOnOnlineStore: publishOnOnlineStore,
      publishTrackInventory: publishTrackInventory,
      savedAt: new Date().toISOString(),
    };
    lastSavedDraftRef.current = buildComparableDraftSignature(savedSnapshot);
    setDraftSaveState("saved");
    setStatusMessage(message);
  }

  function applyImportRecord(record: ImportApiRecord, message: string) {
    setImportRecordId(record.id);
    const mergedImages = { ...record.product.images };
    const keys: ImageCardKey[] = ["source", "transparent_cutout", "amazon", "ebay", "etsy", "tiktok", "shopify"];
    keys.forEach((k) => {
      if (!mergedImages[k]?.absolute_path && draft.images[k]?.absolute_path) {
        mergedImages[k] = draft.images[k];
      }
    });
    const mergedProduct = {
      ...record.product,
      images: mergedImages,
    };
    setDraft(mergedProduct);
    setVariantsByMarket(record.variants);
    setSourceTitle(record.product.core.source_title);
    setPublishVendor((current) => current || record.product.core.attributes.brand || "");
    setPublishPrice((current) => current || record.product.core.attributes.price || "");
    setPublishDescription((current) => current || record.product.shopify.body_html || record.product.core.product_summary || "");
    setPublishSku((current) => current || record.id.slice(0, 12).toUpperCase());
    clearPricingSnapshot();
    setDraftSaveState("saved");
    setStatusMessage(message);
  }

  /**
   * Apply a generated ApiRecord on top of the existing imported draft WITHOUT
   * replacing any non-empty imported values. This is the "merge" semantic used
   * by the "Generate Text Only" button in import mode: keep the CSV-imported
   * data the user already has, fill in any empty fields with the new generated
   * values, and surface pricing intelligence (from
   * ``product.intelligence.research``) into the pricing snapshot.
   */
  function applyGeneratedRecordMerging(generated: ApiRecord, message: string) {
    const merged = mergeGeneratedRecordIntoDraft(generated, draft);
    setDraft(merged);
    // Variants from the freshly generated record take priority only if the
    // imported draft had no variants yet (rare, but keeps idempotency).
    const hasAnyVariant = (Object.keys(generated.variants) as MarketKey[]).some(
      (key) => (generated.variants[key] ?? []).length > 0,
    );
    if (hasAnyVariant) {
      setVariantsByMarket((current) => {
        const empty = (Object.keys(current) as MarketKey[]).every(
          (key) => (current[key] ?? []).length === 0,
        );
        return empty ? generated.variants : current;
      });
    }
    setSourceTitle((current) => current || merged.core.source_title);
    setPublishVendor((current) => current || merged.core.attributes.brand || "");
    setPublishPrice((current) => current || merged.core.attributes.price || "");
    setPublishDescription(
      (current) =>
        current ||
        merged.shopify.body_html ||
        merged.core.product_summary ||
        "",
    );
    setPublishSku(
      (current) => current || generated.id.slice(0, 12).toUpperCase(),
    );
    const pricing = researchToPricingSnapshot(generated, generated.id);
    if (pricing) {
      setPricingSnapshot(pricing);
      const activePricing =
        pricing.markets.find((entry) => entry.marketplace === activeMarket) ??
        pricing.markets[0];
      if (activePricing?.recommended_price) {
        syncPublishPriceFromPricing(activePricing);
      }
    }
    setDraftSaveState("saved");
    setStatusMessage(message);
  }

  function applyPersistedProduct(product: ProductListItem, message: string) {
    const primaryVariant = product.variants[0];
    const stock = Math.max(0, primaryVariant?.inventoryQuantity ?? product.totalInventory ?? 0);
    const price = primaryVariant?.price?.trim() ?? "";
    const sku = primaryVariant?.sku?.trim() ?? "";
    const featuredImage = product.featuredImage ?? "";
    const productDocumentId = product._id ?? product.id ?? null;
    const marketplace = (product.marketplace ?? "").toLowerCase();
    const isShopifyProduct = marketplace === "shopify" && Boolean(product.shopifyProductId);
    const imageValue = [featuredImage, ...(product.images ?? []).filter(Boolean)].find(Boolean) ?? "";
    const ebayItemSpecifics = Object.fromEntries(
      Object.entries(product.ebayItemSpecifics ?? {}).map(([key, values]) => [key, Array.isArray(values) ? values.join(", ") : String(values)]),
    );

    const shopifyVariants: ApiShopifyVariant[] = product.variants.map((variant) => ({
      title: variant.title || "Default Title",
      price: variant.price?.trim() || price || "0.00",
      sku: variant.sku?.trim() || "",
      inventoryQuantity: Math.max(0, variant.inventoryQuantity ?? 0),
      trackInventory: true,
      barcode: "",
      compareAtPrice: variant.compareAtPrice?.trim() || "",
      weight: draft.shopify.weight || "0.0",
      weightUnit: draft.shopify.weight_unit || "lb",
    }));

    const nextDraft: ApiProduct = {
      ...emptyProduct,
      core: {
        ...emptyProduct.core,
        normalized_title: product.title,
        category: "",
        product_type: product.productType ?? "",
        product_summary: product.description ?? "",
        features: [],
        attributes: {
          ...(product.vendor ? { brand: product.vendor } : {}),
          ...(price ? { price } : {}),
        },
        source_title: product.title,
        vision_confidence: 0,
      },
      ebay: {
        ...emptyProduct.ebay,
        title: product.title,
        condition: normalizeEbayCondition(product.ebayCondition),
        marketplace_id: product.ebayMarketplaceId ?? ebayMarketplaceDefaultId,
        currency: product.ebayCurrency ?? ebayMarketplaceDefaultCurrency,
        category_id: product.ebayCategoryId ?? "",
        description_override: product.ebayDescriptionOverride ?? "",
        listing_notes: product.ebayListingNotes ?? "",
        item_specifics: ebayItemSpecifics,
      },
      shopify: {
        ...emptyProduct.shopify,
        title: product.title,
        body_html: product.description ?? "",
        product_type: product.productType ?? "",
        seo_title: product.title,
        seo_description: product.description ?? "",
        tags: product.tags ?? [],
        variants: shopifyVariants,
        has_variants: shopifyVariants.length > 1,
        stock_locations: [{ name: "Kingston Grove", available: stock, on_hand: stock, unavailable: 0, committed: 0 }],
      },
      images: {
        ...emptyProduct.images,
        source: {
          ...emptyProduct.images.source,
          relative_path: imageValue,
          absolute_path: imageValue,
          validation: {
            ...emptyProduct.images.source.validation,
            passed: Boolean(imageValue),
            errors: imageValue ? [] : emptyProduct.images.source.validation.errors,
          },
        },
        ebay: {
          ...emptyProduct.images.ebay,
          relative_path: imageValue,
          absolute_path: imageValue,
          validation: {
            ...emptyProduct.images.ebay.validation,
            passed: Boolean(imageValue),
            errors: imageValue ? [] : emptyProduct.images.ebay.validation.errors,
          },
        },
        shopify: {
          ...emptyProduct.images.shopify,
          relative_path: imageValue,
          absolute_path: imageValue,
          validation: {
            ...emptyProduct.images.shopify.validation,
            passed: Boolean(imageValue),
            errors: imageValue ? [] : emptyProduct.images.shopify.validation.errors,
          },
        },
      },
    };

    setDraft(nextDraft);
    setVariantsByMarket(sampleVariants);
    setProductId(null);
    setBackendProductId(productDocumentId);
    setEbayListingId(product.ebayListingId ?? null);
    setEbayListingStatus(product.ebayStatus ?? null);
    setShopifyProductId(isShopifyProduct ? product.shopifyProductId ?? null : null);
    setSourceTitle(product.title);
    setPublishVendor(product.vendor ?? "");
    setPublishDescription(product.ebayDescriptionOverride ?? product.description ?? "");
    setPublishPrice(price);
    setPublishSku(product.ebaySku ?? sku);
    setPublishStatus((product.status?.toUpperCase() as PublishStatus) === "DRAFT" ? "DRAFT" : "ACTIVE");
    setPublishStock(String(stock));
    setPublishOnOnlineStore((product.status?.toUpperCase() ?? "DRAFT") === "ACTIVE");
    setPublishTrackInventory(true);
    setShopifyPublishMessage("");
    clearPricingSnapshot();
    setPublishFieldErrors(emptyPublishFieldErrors);
    setHasSavedDraft(true);
    setStatusMessage(message);
    persistDraftSnapshot({
      draft: nextDraft,
      variantsByMarket: sampleVariants,
      productId: null,
      backendProductId: productDocumentId,
      ebayListingId: product.ebayListingId ?? null,
      ebayListingStatus: product.ebayStatus ?? null,
      shopifyProductId: isShopifyProduct ? product.shopifyProductId ?? null : null,
      sourceTitle: product.title,
      publishVendor: product.vendor ?? "",
      publishDescription: product.ebayDescriptionOverride ?? product.description ?? "",
      publishPrice: price,
      publishSku: product.ebaySku ?? sku,
      publishStatus: (product.status?.toUpperCase() as PublishStatus) === "DRAFT" ? "DRAFT" : "ACTIVE",
      publishStock: String(stock),
      publishOnOnlineStore: (product.status?.toUpperCase() ?? "DRAFT") === "ACTIVE",
      publishTrackInventory: true,
      savedAt: new Date().toISOString(),
    });
  }

  function clearSelectedImageSelection() {
    setSelectedImage(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
    if (productImageUploadInputRef.current) {
      productImageUploadInputRef.current.value = "";
    }
  }

  function getPublishTitle() {
    return (
      draft.shopify.title.trim() ||
      draft.core.normalized_title.trim() ||
      draft.core.source_title.trim()
    );
  }

  function getPublishDescription() {
    return publishDescription.trim() || draft.shopify.body_html.trim() || draft.core.product_summary.trim() || "";
  }

  function getEstimatedPriceRange() {
    const range = pricingSnapshot?.markets.find((entry) => entry.marketplace === activeMarket)?.suggested_price_range ?? null;
    if (!range) {
      return null;
    }

    return range;
  }

  function getCurrencySymbol(currency?: string | null) {
    switch (String(currency ?? "").toUpperCase()) {
      case "GBP":
        return "£";
      case "EUR":
        return "€";
      case "USD":
      default:
        return "$";
    }
  }

  function formatPriceValue(value?: number | null, currency?: string | null) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "N/A";
    }

    return `${getCurrencySymbol(currency)}${value.toFixed(2)}`;
  }

  function getPricingModeLabel(mode: string) {
    if (mode === "live_api") {
      return "Live pricing data";
    }
    if (mode === "cross_market_live_reference") {
      return "Cross-market live reference";
    }
    if (mode === "gemini_search") {
      return "Gemini search price";
    }
    if (mode === "ai_estimate") {
      return "AI estimated price";
    }
    if (mode === "insufficient_data") {
      return "Insufficient pricing data";
    }
    return "Estimated pricing";
  }

  function getPublishVendor() {
    const brand = (draft.core as ExtendedApiCore).brand?.trim() ?? "";
    return publishVendor.trim() || brand || "";
  }

  function getPublishProductType() {
    return (
      draft.shopify.product_type.trim() ||
      draft.core.product_type.trim() ||
      draft.core.category.trim() ||
      ""
    );
  }

  function getPublishCategory() {
    return draft.core.category.trim() || draft.core.product_type.trim() || "";
  }

  function getPublishTags() {
    if (Array.isArray(draft.shopify.tags)) {
      return draft.shopify.tags.map((tag) => tag.trim()).filter(Boolean);
    }

    return [];
  }

  function getPublishImagePath() {
    return draft.images.shopify.absolute_path || draft.images.shopify.relative_path || "";
  }

  function getAllCandidateImagePaths() {
    return [
      draft.images.ebay.absolute_path,
      draft.images.ebay.relative_path,
      draft.images.shopify.absolute_path,
      draft.images.shopify.relative_path,
      draft.images.source.absolute_path,
      draft.images.source.relative_path,
    ]
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  }

  function getPublicPublishImageUrls() {
    return getAllCandidateImagePaths().filter(isPublicHttpUrl);
  }

  function getSanitizedPublishStock() {
    const numericStock = Number.parseInt(publishStock.trim() || "0", 10);
    return Number.isFinite(numericStock) && numericStock >= 0 ? numericStock : 0;
  }

  function getSanitizedPublishPrice() {
    const numericPrice = Number.parseFloat(publishPrice.trim());
    return Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice.toFixed(2) : null;
  }

  function buildEbayItemSpecifics() {
    return Object.fromEntries(
      Object.entries(draft.ebay.item_specifics ?? {})
        .map(([key, value]) => {
          const normalizedValues = value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);

          return [key.trim(), normalizedValues] as const;
        })
        .filter(([key, values]) => key && values.length > 0),
    );
  }

  function buildBackendProductPayloadForEbay(): ProductCreatePayload {
    const sanitizedPrice = getSanitizedPublishPrice();
    const stock = getSanitizedPublishStock();
    const publicImages = getPublicPublishImageUrls();
    const allImagePaths = getAllCandidateImagePaths();
    const title = safeTrim(draft.ebay.title) || getPublishTitle();
    const description =
      safeTrim(draft.ebay.description_override) || getPublishDescription();
    const ebayItemSpecifics = buildEbayItemSpecifics();
    const normalizedCondition = normalizeEbayCondition(draft.ebay.condition);
    const currencyHint =
      safeTrim(draft.ebay.currency) || ebayMarketplaceDefaultCurrency;
    const marketplaceId =
      safeTrim(draft.ebay.marketplace_id) || ebayMarketplaceDefaultId;
    const categoryId = safeTrim(draft.ebay.category_id) || undefined;

    return {
      marketplace: "ebay",
      productAiProductId: productId ?? undefined,
      title,
      description,
      vendor: getPublishVendor() || undefined,
      productType: getPublishProductType() || undefined,
      status: publishStatus,
      tags: getPublishTags(),
      featuredImage: allImagePaths[0],
      images: allImagePaths,
      totalInventory: stock,
      variants: [
        {
          title: "Default Title",
          sku: publishSku.trim() || undefined,
          price: sanitizedPrice ?? undefined,
          inventoryQuantity: stock,
        },
      ],
      ebaySku: publishSku.trim() || undefined,
      ebayCondition: isAllowedEbayCondition(normalizedCondition) ? normalizedCondition : undefined,
      ebayCategoryId: categoryId,
      ebayItemSpecifics: Object.keys(ebayItemSpecifics).length > 0 ? ebayItemSpecifics : undefined,
      ebayListingNotes: safeTrim(draft.ebay.listing_notes) || undefined,
      ebayDescriptionOverride: description || undefined,
      ebayCurrency: currencyHint,
    };
  }

  async function materializeBackendProductForEbay() {
    const payload = buildBackendProductPayloadForEbay();
    const savedProduct = backendProductId
      ? await productsApi.updateProduct(backendProductId, payload)
      : await productsApi.createProduct(payload);
    const savedProductId = savedProduct._id ?? savedProduct.id ?? null;

    if (!savedProductId) {
      throw new Error("Backend product was created without an ID.");
    }

    setBackendProductId(savedProductId);
    persistDraftSnapshot({
      ...buildDraftSnapshot(),
      backendProductId: savedProductId,
    });

    return savedProduct;
  }

  async function pollEbayPublishJob(jobId: string) {
    const maxAttempts = 45;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const job = await ebayApi.getJob(jobId);
      if (job.status === "completed" || job.status === "failed") {
        return job;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }

    throw new Error("Timed out waiting for the eBay Sandbox publish job to finish.");
  }

  async function uploadToEbay(mode: "active" | "draft") {
    const title = safeTrim(draft.ebay.title) || getPublishTitle();
    const trimmedPrice = publishPrice.trim();
    const trimmedSku = publishSku.trim();
    const description = getPublishDescription();
    const publicImages = getPublicPublishImageUrls();
    const normalizedCondition = normalizeEbayCondition(draft.ebay.condition);
    const colourSpecific = getEbaySpecificFieldValue(draft.ebay.item_specifics, "Colour");
    const ukShoeSizeSpecific = getEbaySpecificFieldValue(draft.ebay.item_specifics, "UKShoeSize");

    setShopifyPublishMessage("");
    const nextFieldErrors: PublishFieldErrors = {
      title: !title,
      price: !trimmedPrice,
    };
    setPublishFieldErrors(nextFieldErrors);

    const missingFields: string[] = [];
    if (nextFieldErrors.title) {
      missingFields.push("Product title");
    }
    if (nextFieldErrors.price) {
      missingFields.push("Default price");
    }
    if (!trimmedSku) {
      missingFields.push("SKU");
    }
    if (!description) {
      missingFields.push("Description");
    }
    if (publicImages.length === 0) {
      missingFields.push("Public image URL");
    }
    if (!colourSpecific) {
      missingFields.push("Colour item specific");
    }
    if (!ukShoeSizeSpecific) {
      missingFields.push("UK Shoe Size item specific");
    }

    if (missingFields.length > 0) {
      const message = `Required before eBay Sandbox publish: ${missingFields.join(", ")}.`;
      setShopifyPublishMessage(message);
      setStatusMessage(message);
      return;
    }

    const numericPrice = Number(trimmedPrice);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setPublishFieldErrors((prev) => ({ ...prev, price: true }));
      setShopifyPublishMessage("Default price must be a valid number greater than or equal to 0.");
      setStatusMessage("Price must be a valid number greater than or equal to 0.");
      return;
    }

    if (!isAllowedEbayCondition(normalizedCondition)) {
      const message = `eBay condition must be one of: ${allowedEbayConditions.join(", ")}.`;
      setShopifyPublishMessage(message);
      setStatusMessage(message);
      return;
    }

    if (draft.ebay.condition !== normalizedCondition) {
      setDraft((prev) => ({
        ...prev,
        ebay: {
          ...prev.ebay,
          condition: normalizedCondition,
        },
      }));
    }

    if (mode === "draft") {
      const message = "eBay Sandbox publish currently supports the live publish path only.";
      setShopifyPublishMessage(message);
      setStatusMessage(message);
      return;
    }

    const categoryWarning = " Using default eBay category for sandbox.";

    setShopifySubmitMode(mode);
    setPublishSubmitting((prev) => ({ ...prev, ebay: true }));

    try {
      setShopifyPublishMessage(`Saving product for eBay Sandbox...${categoryWarning}`);
      const savedProduct = await materializeBackendProductForEbay();
      const savedProductId = savedProduct._id ?? savedProduct.id;
      if (!savedProductId) {
        throw new Error("Saved product ID is missing.");
      }

      setShopifyPublishMessage(`Queueing eBay Sandbox publish job...${categoryWarning}`);
      const job = await ebayApi.publishProduct(savedProductId);
      const jobId = job._id;

      setShopifyPublishMessage(`eBay Sandbox publish queued.${categoryWarning}${jobId ? ` Job ID: ${jobId}` : ""}`);

      const completedJob = jobId ? await pollEbayPublishJob(jobId) : job;
      const refreshedProduct = await productsApi.getProductById(savedProductId);
      const listingStatus = await ebayApi.getProductStatus(savedProductId).catch(() => null);
      const listingId = refreshedProduct.ebayListingId ?? listingStatus?.listingId;
      const publishState = refreshedProduct.ebayStatus ?? listingStatus?.status ?? completedJob.status;

      setBackendProductId(savedProductId);
      setEbayListingId(listingId ?? null);
      setEbayListingStatus(publishState ?? null);
      persistDraftSnapshot({
        ...buildDraftSnapshot(),
        backendProductId: savedProductId,
        ebayListingId: listingId ?? null,
        ebayListingStatus: publishState ?? null,
      });

      if (completedJob.status === "failed") {
        const failureMessage =
          completedJob.lastError
          ?? completedJob.result?.error
          ?? "eBay Sandbox publish failed.";
        throw new Error(failureMessage);
      }

      const successMessage = listingId
        ? `Published to eBay Sandbox. Listing ID: ${listingId}. Status: ${publishState}.`
        : `Published to eBay Sandbox. Status: ${publishState}.`;
      setShopifyPublishMessage(successMessage);
      setStatusMessage(successMessage);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : "Could not publish to eBay Sandbox.";
      setShopifyPublishMessage(message);
      setStatusMessage(message);
    } finally {
      setShopifySubmitMode(null);
      setPublishSubmitting((prev) => ({ ...prev, ebay: false }));
    }
  }

  async function uploadToShopify(mode: ShopifyUploadMode) {
    const title = getPublishTitle();
    const trimmedPrice = publishPrice.trim();
    const imagePath = getPublishImagePath().trim();
    setShopifyPublishMessage("");
    const nextFieldErrors: PublishFieldErrors = {
      title: !title,
      price: !trimmedPrice,
    };
    setPublishFieldErrors(nextFieldErrors);
    const missingFields: string[] = [];
    if (nextFieldErrors.title) {
      missingFields.push("Product title");
    }
    if (nextFieldErrors.price) {
      missingFields.push("Default price");
    }
    if (missingFields.length > 0) {
      setShopifyPublishMessage(`Required before Shopify upload: ${missingFields.join(", ")}.`);
      setStatusMessage(`Please fill the required publish fields: ${missingFields.join(", ")}.`);
      return;
    }

    if (!imagePath) {
      const message = "Generated Shopify image is missing. Generate or regenerate Shopify content before uploading.";
      setShopifyPublishMessage(message);
      setStatusMessage(message);
      return;
    }

    const numericPrice = Number(trimmedPrice);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setPublishFieldErrors((prev) => ({ ...prev, price: true }));
      setShopifyPublishMessage("Default price must be a valid number greater than or equal to 0.");
      setStatusMessage("Price must be a valid number greater than or equal to 0.");
      return;
    }

    if (!publishStatusOptions.includes(publishStatus)) {
      setShopifyPublishMessage("Shopify status must be either DRAFT or ACTIVE.");
      setStatusMessage("Status must be either DRAFT or ACTIVE.");
      return;
    }

    const isUpdate = Boolean(shopifyProductId);
    const resolvedStatus: PublishStatus = mode === "draft" ? "DRAFT" : "ACTIVE";

    setShopifySubmitMode(mode);
    setPublishSubmitting((prev) => ({ ...prev, shopify: true }));
    setShopifyPublishMessage(
      mode === "draft"
        ? isUpdate
          ? "Updating draft product on Shopify..."
          : "Uploading draft product to Shopify..."
        : isUpdate
          ? "Updating Shopify product..."
          : "Uploading product to Shopify...",
    );
    try {
      const payload = {
        title,
        description: getPublishDescription(),
        vendor: getPublishVendor() || undefined,
        productType: getPublishProductType() || undefined,
        category: getPublishCategory() || undefined,
        status: resolvedStatus,
        tags: getPublishTags(),
        imagePath,
        publishToOnlineStore: mode === "active" && publishOnOnlineStore,
        compareAtPrice: draft.shopify.compare_at_price || undefined,
        costPerItem: draft.shopify.cost_per_item || undefined,
        chargeTax: draft.shopify.charge_tax,
        barcode: draft.shopify.barcode || undefined,
        weight: draft.shopify.weight ? parseFloat(draft.shopify.weight) : undefined,
        weightUnit: draft.shopify.weight_unit || undefined,
        countryOfOrigin: draft.shopify.country_of_origin || undefined,
        hsCode: draft.shopify.hs_code || undefined,
        collections: draft.shopify.collections || undefined,
        themeTemplate: draft.shopify.theme_template || undefined,
        seoTitle: draft.shopify.seo_title || undefined,
        seoDescription: draft.shopify.seo_description || undefined,
        seoHandle: draft.shopify.seo_handle || undefined,
        metafields: draft.shopify.metafields || undefined,
        variants: draft.shopify.has_variants && draft.shopify.variants && draft.shopify.variants.length > 0
          ? draft.shopify.variants.map((v) => ({
            title: v.title,
            price: parseFloat(v.price || publishPrice || "0").toFixed(2),
            sku: v.sku?.trim() || undefined,
            inventoryQuantity: v.inventoryQuantity || 0,
            trackInventory: v.trackInventory ?? true,
            barcode: v.barcode?.trim() || undefined,
            compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice).toFixed(2) : undefined,
            weight: v.weight ? parseFloat(v.weight) : undefined,
            weightUnit: v.weightUnit || undefined,
          }))
          : [
            {
              title: "Default Title",
              price: numericPrice.toFixed(2),
              sku: publishSku.trim() || undefined,
              inventoryQuantity: Number(publishStock) || 0,
              trackInventory: publishTrackInventory,
              barcode: draft.shopify.barcode?.trim() || undefined,
              compareAtPrice: draft.shopify.compare_at_price ? parseFloat(draft.shopify.compare_at_price).toFixed(2) : undefined,
              weight: draft.shopify.weight ? parseFloat(draft.shopify.weight) : undefined,
              weightUnit: draft.shopify.weight_unit || undefined,
            },
          ],
      };

      let result;

      try {
        result = shopifyProductId
          ? await shopifyProductsApi.updateShopifyProduct(shopifyProductId, payload)
          : await shopifyProductsApi.createShopifyProduct(payload);
      } catch (error) {
        const isMissingExistingProduct =
          shopifyProductId &&
          error instanceof ApiClientError &&
          error.message.toLowerCase().includes("product does not exist");

        if (!isMissingExistingProduct) {
          throw error;
        }

        setShopifyProductId(null);
        persistDraftSnapshot({
          ...buildDraftSnapshot(),
          shopifyProductId: null,
        });

        const message =
          "No Shopify draft was found for this product. The old Shopify link was cleared. Click Upload as Draft or Upload to Shopify again.";
        setShopifyPublishMessage(message);
        setStatusMessage(message);
        return;
      }

      setShopifyProductId(result.product.id);
      const warningsText = result.warnings.length ? ` Warnings: ${result.warnings.join(" ")}` : "";
      const successMessage =
        mode === "draft"
          ? `${isUpdate ? "Draft updated" : "Draft uploaded"} to Shopify.${warningsText}`
          : result.publishedToOnlineStore
            ? `${isUpdate ? "Product updated" : "Product uploaded"} to Shopify and published to the Online Store.${warningsText}`
            : `${isUpdate ? "Product updated" : "Product uploaded"} to Shopify.${warningsText}`;

      setShopifyPublishMessage(successMessage);
      setStatusMessage(successMessage);
      persistDraftSnapshot({
        ...buildDraftSnapshot(),
        shopifyProductId: result.product.id,
      });
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Could not upload the product to Shopify.";
      setShopifyPublishMessage(message);
      setStatusMessage(message);
    } finally {
      setShopifySubmitMode(null);
      setPublishSubmitting((prev) => ({ ...prev, shopify: false }));
    }
  }

  async function uploadToMockShop(shop: string, mode: "active" | "draft") {
    if (shop === "ebay") {
      const message = "eBay is no longer simulated here. Use Publish to eBay Sandbox for the real flow.";
      setShopifyPublishMessage(message);
      setStatusMessage(message);
      return;
    }

    const title = getPublishTitle();
    const trimmedPrice = publishPrice.trim();
    setShopifyPublishMessage("");
    const nextFieldErrors: PublishFieldErrors = {
      title: !title,
      price: !trimmedPrice,
    };
    setPublishFieldErrors(nextFieldErrors);

    const missingFields: string[] = [];
    if (nextFieldErrors.title) {
      missingFields.push("Product title");
    }
    if (nextFieldErrors.price) {
      missingFields.push("Default price");
    }
    if (missingFields.length > 0) {
      const msg = `Required before ${marketLabels[shop as MarketKey] || shop} upload: ${missingFields.join(", ")}.`;
      setShopifyPublishMessage(msg);
      setStatusMessage(msg);
      return;
    }

    const numericPrice = Number(trimmedPrice);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setPublishFieldErrors((prev) => ({ ...prev, price: true }));
      setShopifyPublishMessage("Default price must be a valid number greater than or equal to 0.");
      setStatusMessage("Price must be a valid number greater than or equal to 0.");
      return;
    }

    setShopifySubmitMode(mode);
    setPublishSubmitting((prev) => ({ ...prev, [shop]: true }));

    const shopLabel = marketLabels[shop as MarketKey] || shop;
    setShopifyPublishMessage(
      mode === "draft"
        ? `Uploading draft product to ${shopLabel}...`
        : `Uploading product to ${shopLabel}...`
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const randomId = generateMockListingId();
      let successMessage = "";
      if (shop === "amazon") {
        const mockASIN = generateMockASIN();
        successMessage = `Success: Product uploaded to Amazon. ASIN: ${mockASIN}, Listing ID: ${randomId}. Status: ${mode.toUpperCase()}.`;
      } else if (shop === "ebay") {
        successMessage = `Success: Product uploaded to eBay. Item ID: ${randomId}. Status: ${mode.toUpperCase()}.`;
      } else if (shop === "tiktok") {
        successMessage = `Success: Product uploaded to TikTok Shop. Product ID: ${randomId}. Status: ${mode.toUpperCase()}.`;
      } else if (shop === "etsy") {
        successMessage = `Success: Product uploaded to Etsy. Listing ID: ${randomId}. Status: ${mode.toUpperCase()}.`;
      } else {
        successMessage = `Success: Product uploaded to ${shopLabel}. ID: ${randomId}. Status: ${mode.toUpperCase()}.`;
      }

      setShopifyPublishMessage(successMessage);
      setStatusMessage(successMessage);
    } catch {
      setShopifyPublishMessage(`Failed to upload to ${shopLabel}.`);
      setStatusMessage(`Failed to upload to ${shopLabel}.`);
    } finally {
      setShopifySubmitMode(null);
      setPublishSubmitting((prev) => ({ ...prev, [shop]: false }));
    }
  }

  async function saveLocalDBDraft() {
    setPublishSubmitting((prev) => ({ ...prev, commandctr: true }));
    setShopifyPublishMessage("Saving product draft to CommandCtr DB...");
    try {
      await saveDraft();
      setShopifyPublishMessage("Success: Product saved to CommandCtr DB.");
    } catch {
      setShopifyPublishMessage("Failed to save product to CommandCtr DB.");
    } finally {
      setPublishSubmitting((prev) => ({ ...prev, commandctr: false }));
    }
  }

  async function uploadToAllShops() {
    setShopifyPublishMessage("");
    const title = getPublishTitle();
    const trimmedPrice = publishPrice.trim();
    const nextFieldErrors: PublishFieldErrors = {
      title: !title,
      price: !trimmedPrice,
    };
    setPublishFieldErrors(nextFieldErrors);

    const missingFields: string[] = [];
    if (nextFieldErrors.title) missingFields.push("Product title");
    if (nextFieldErrors.price) missingFields.push("Default price");

    if (missingFields.length > 0) {
      const msg = `Required before uploading to all shops: ${missingFields.join(", ")}.`;
      setShopifyPublishMessage(msg);
      setStatusMessage(msg);
      return;
    }

    const numericPrice = Number(trimmedPrice);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setPublishFieldErrors((prev) => ({ ...prev, price: true }));
      setShopifyPublishMessage("Default price must be a valid number greater than or equal to 0.");
      setStatusMessage("Price must be a valid number greater than or equal to 0.");
      return;
    }

    setShopifySubmitMode("active");
    setIsUploadingToAll(true);
    setPublishSubmitting({
      shopify: true,
      commandctr: true,
      amazon: true,
      ebay: true,
      tiktok: true,
      etsy: true,
    });
    setShopifyPublishMessage("Uploading to all target shops simultaneously...");

    try {
      const results = await Promise.allSettled([
        (async () => {
          const imagePath = getPublishImagePath().trim();
          if (!imagePath) throw new Error("Shopify image missing");
          const payload = {
            title,
            description: getPublishDescription(),
            vendor: getPublishVendor() || undefined,
            productType: getPublishProductType() || undefined,
            category: getPublishCategory() || undefined,
            status: "ACTIVE" as PublishStatus,
            tags: getPublishTags(),
            imagePath,
            publishToOnlineStore: publishOnOnlineStore,
            variants: draft.shopify.has_variants && draft.shopify.variants && draft.shopify.variants.length > 0
              ? draft.shopify.variants.map((v) => ({
                title: v.title,
                price: parseFloat(v.price || publishPrice || "0").toFixed(2),
                sku: v.sku?.trim() || undefined,
                inventoryQuantity: v.inventoryQuantity || 0,
                trackInventory: v.trackInventory ?? true,
                barcode: v.barcode?.trim() || undefined,
                compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice).toFixed(2) : undefined,
                weight: v.weight ? parseFloat(v.weight) : undefined,
                weightUnit: v.weightUnit || undefined,
              }))
              : [
                {
                  title: "Default Title",
                  price: numericPrice.toFixed(2),
                  sku: publishSku.trim() || undefined,
                  inventoryQuantity: Number(publishStock) || 0,
                  trackInventory: publishTrackInventory,
                },
              ],
          };

          const result = shopifyProductId
            ? await shopifyProductsApi.updateShopifyProduct(shopifyProductId, payload)
            : await shopifyProductsApi.createShopifyProduct(payload);

          setShopifyProductId(result.product.id);
          persistDraftSnapshot({
            ...buildDraftSnapshot(),
            shopifyProductId: result.product.id,
          });
          return `Shopify: Success (ID: ${result.product.id})`;
        })().catch((err) => {
          throw new Error(`Shopify: ${err instanceof Error ? err.message : String(err)}`);
        }).finally(() => {
          setPublishSubmitting((prev) => ({ ...prev, shopify: false }));
        }),

        (async () => {
          await saveDraft();
          return "CommandCtr DB: Saved";
        })().finally(() => {
          setPublishSubmitting((prev) => ({ ...prev, commandctr: false }));
        }),

        ...(["amazon", "ebay", "tiktok", "etsy"] as MarketKey[]).map(async (shop) => {
          try {
            if (shop === "ebay") {
              return "eBay: Use the dedicated eBay Sandbox publish button for the real publish flow.";
            }

            await new Promise((resolve) => setTimeout(resolve, 1500));
            const randomId = generateMockListingId();
            let msg = "";
            if (shop === "amazon") {
              const mockASIN = generateMockASIN();
              msg = `Amazon: Success (ASIN: ${mockASIN})`;
            } else if (shop === "tiktok") {
              msg = `TikTok Shop: Success (Product ID: ${randomId})`;
            } else if (shop === "etsy") {
              msg = `Etsy: Success (Listing ID: ${randomId})`;
            }
            return msg;
          } finally {
            setPublishSubmitting((prev) => ({ ...prev, [shop]: false }));
          }
        })
      ]);

      const messages = results.map((res) => {
        if (res.status === "fulfilled") return res.value;
        return `Error: ${res.reason instanceof Error ? res.reason.message : String(res.reason)}`;
      });

      const successCount = results.filter((res) => res.status === "fulfilled").length;
      const combinedMsg = `Uploaded to ${successCount}/6 channels:\n` + messages.join("\n");
      setShopifyPublishMessage(combinedMsg);
      setStatusMessage(combinedMsg);
    } catch {
      setShopifyPublishMessage("An unexpected error occurred during bulk upload.");
      setStatusMessage("An unexpected error occurred during bulk upload.");
    } finally {
      setShopifySubmitMode(null);
      setIsUploadingToAll(false);
      setPublishSubmitting({
        shopify: false,
        commandctr: false,
        amazon: false,
        ebay: false,
        tiktok: false,
        etsy: false,
      });
    }
  }

  async function generateProduct(
    successMessage = "AI draft generated and connected to the add-product page.",
    forcedImage?: File
  ) {
    if (isImportMode) {
      await generateTextOnly();
      return true;
    }

    const finalImage = forcedImage || selectedImage;
    if (!finalImage) {
      setStatusMessage("Upload a product image before generating.");
      return false;
    }

    if (!sourceTitle.trim()) {
      setStatusMessage("Add a source title before generating.");
      return false;
    }

    const formData = new FormData();
    formData.append("title", sourceTitle.trim());
    formData.append("image", finalImage);

    setIsGenerating(true);
    try {
      const response = await fetch("/api/product-ai/products/generate/text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Product generation failed.");
      }

      const record = (await response.json()) as ApiRecord;
      const generatedProductId = record.id;
      setShopifyProductId(null);
      clearPricingSnapshot();
      applyRecord(record, "AI text draft generated. Marketplace sections are now generating in parallel.");
      if (!isImportMode) {
        router.replace(`/products/add?market=${activeMarket}&productId=${generatedProductId}`, { scroll: false });
      }
      clearSelectedImageSelection();
      await generateMarketplaceSectionsInParallel(generatedProductId, ["amazon", "ebay", "etsy", "tiktok", "shopify"], successMessage);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product generation failed.";

      if (!productId && finalImage && isGenerationTimeoutMessage(message)) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", finalImage);
          uploadFormData.append("market", "source");
          uploadFormData.append("productId", "draft");

          const uploadResponse = await fetch("/api/product-ai/image/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            const uploadErrorBody = (await uploadResponse.json().catch(() => null)) as { detail?: string } | null;
            throw new Error(uploadErrorBody?.detail ?? "The AI request timed out and the local draft image upload failed.");
          }

          const uploadResult = (await uploadResponse.json()) as {
            relative_path: string;
            absolute_path: string;
          };

          applyLocalDraftSeed({
            title: sourceTitle.trim(),
            imagePath: uploadResult.relative_path || uploadResult.absolute_path,
            imageMimeType: finalImage.type || "image/png",
          });
          clearSelectedImageSelection();
          if (!isImportMode) {
            router.replace(`/products/add?market=${activeMarket}`, { scroll: false });
          }
          return false;
        } catch (fallbackError) {
          setStatusMessage(fallbackError instanceof Error ? fallbackError.message : message);
          return false;
        }
      }

      setStatusMessage(message);
      return false;
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateTextOnly() {
    if (isImportMode) {
      if (!currentImportRecordId) {
        setStatusMessage("Import record is missing.");
        return;
      }

      // Title to feed the LLM: prefer the imported source_title, fall back to
      // the currently edited sourceTitle state, otherwise the normalized title.
      const titleForLlm =
        draft.core.source_title.trim() ||
        sourceTitle.trim() ||
        draft.core.normalized_title.trim() ||
        "Imported product";

      // Resolve a usable image file. The import flow may not have a freshly
      // selected image; we have to fetch the imported source image through the
      // local image proxy and turn it into a File for the multipart upload.
      const sourcePath = draft.images.source?.absolute_path || "";
      const sourceImageFile = sourcePath
        ? await fetchSourceImageAsFile(sourcePath, "imported_source.png")
        : null;

      if (!sourceImageFile) {
        setStatusMessage(
          "Imported source image could not be loaded for text generation. Try re-uploading the product image.",
        );
        return;
      }

      setIsGenerating(true);
      try {
        const formData = new FormData();
        formData.append("title", titleForLlm);
        formData.append("image", sourceImageFile);

        const response = await fetch("/api/product-ai/products/generate/text", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorBody?.detail ?? "Text-only generation failed.");
        }

        const record = (await response.json()) as ApiRecord;
        applyGeneratedRecordMerging(
          record,
          "AI text added on top of imported data. Imported fields are kept; empty fields are filled in.",
        );
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Text-only generation failed.");
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    if (!sourceTitle.trim()) {
      setStatusMessage("Add a source title before generating.");
      return;
    }

    if (!selectedImage) {
      setStatusMessage("Upload a product image before generating text-only content.");
      return;
    }

    const formData = new FormData();
    formData.append("title", sourceTitle.trim());
    formData.append("image", selectedImage);

    setIsGenerating(true);
    try {
      const response = await fetch("/api/product-ai/products/generate/text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Text-only generation failed.");
      }

      const record = (await response.json()) as ApiRecord;
      setShopifyProductId(null);
      clearPricingSnapshot();
      applyRecord(record, "AI text draft generated and ready for marketplace images.");
      clearSelectedImageSelection();
      if (!isImportMode) {
        router.replace(`/products/add?market=${activeMarket}&productId=${record.id}&source=product_ai`, { scroll: false });
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Text-only generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateMarketplaceDraft(
    market: MarketKey,
    successMessage = `${marketLabels[market]} content and image generated and the new product draft is ready.`,
  ) {
    if (!selectedImage) {
      setStatusMessage("Upload a product image before generating.");
      return false;
    }

    if (!sourceTitle.trim()) {
      setStatusMessage("Add a source title before generating.");
      return false;
    }

    const formData = new FormData();
    formData.append("title", sourceTitle.trim());
    formData.append("image", selectedImage);

    setMarketImageGenerating((prev) => ({ ...prev, [market]: true }));
    try {
      const response = await fetch(`/api/product-ai/products/generate/${market}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? `Could not generate the ${marketLabels[market]} content and image.`);
      }

      const record = (await response.json()) as ApiRecord;
      setShopifyProductId(null);
      clearPricingSnapshot();
      applyRecord(record, successMessage);
      clearSelectedImageSelection();
      if (!isImportMode) {
        router.replace(`/products/add?market=${activeMarket}&productId=${record.id}&source=product_ai`, { scroll: false });
      }
      return true;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Could not generate the ${marketLabels[market]} content and image.`);
      return false;
    } finally {
      setMarketImageGenerating((prev) => ({ ...prev, [market]: false }));
    }
  }

  async function generateMarketplaceSectionsInParallel(
    requestedProductId: string,
    markets: MarketKey[],
    successMessage = "All marketplace content and image generations complete.",
  ) {
    const uniqueMarkets = Array.from(new Set(markets));
    if (uniqueMarkets.length === 0) {
      return true;
    }

    setStatusMessage("Generating marketplace sections in parallel...");
    setMarketImageGenerating((prev) => {
      const next = { ...prev };
      for (const market of uniqueMarkets) {
        next[market] = true;
      }
      return next;
    });

    const results = await Promise.allSettled(
      uniqueMarkets.map(async (market) => {
        const response = await fetch(`/api/product-ai/products/${requestedProductId}/marketplaces/${market}/generate`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorBody?.detail ?? `Could not generate the ${marketLabels[market]} content and image.`);
        }

        const record = (await response.json()) as ApiRecord;
        applyRecord(record, `${marketLabels[market]} content and image generated.`);
        return market;
      }),
    );

    setMarketImageGenerating((prev) => {
      const next = { ...prev };
      for (const market of uniqueMarkets) {
        next[market] = false;
      }
      return next;
    });

    const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failures.length > 0) {
      const failure = failures[0]?.reason;
      setStatusMessage(failure instanceof Error ? failure.message : "Some marketplace images could not be generated.");
      return false;
    }

    setStatusMessage(successMessage);
    return true;
  }

  async function saveDraft(updatedImages?: ApiGeneratedImages) {
    const nextImages = updatedImages ?? draft.images;
    const nextDraft = {
      ...draft,
      images: nextImages,
    };

    function getSnapshotWithImages(): SavedDraftSnapshot {
      return {
        draft: nextDraft,
        variantsByMarket,
        productId,
        backendProductId,
        ebayListingId,
        ebayListingStatus,
        shopifyProductId,
        sourceTitle,
        publishVendor,
        publishDescription,
        publishPrice,
        publishSku,
        publishStatus,
        publishStock,
        publishOnOnlineStore,
        publishTrackInventory,
        savedAt: new Date().toISOString(),
      };
    }

    persistDraftSnapshot(getSnapshotWithImages());
    setDraftSaveState("saving");

    if (isImportMode && currentImportRecordId) {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/product-ai/imports/products/${currentImportRecordId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            core: buildCoreDraftForSave(),
            amazon: nextDraft.amazon,
            ebay: nextDraft.ebay,
            etsy: nextDraft.etsy,
            tiktok: nextDraft.tiktok,
            shopify: nextDraft.shopify,
            images: nextDraft.images,
          }),
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorBody?.detail ?? "Import draft save failed.");
        }

        const record = (await response.json()) as ImportApiRecord;
        applyImportRecord(record, "Import draft saved.");
        setDraftSaveState("saved");
      } catch (error) {
        setDraftSaveState("idle");
        setStatusMessage(error instanceof Error ? error.message : "Import draft save failed.");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!productId) {
      setDraft(nextDraft);
      setDraftSaveState("saved");
      setStatusMessage("Draft saved locally for this account. Generate with AI later if you want to sync it to product-ai-agent.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/product-ai/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          core: buildCoreDraftForSave(),
          amazon: nextDraft.amazon,
          ebay: nextDraft.ebay,
          etsy: nextDraft.etsy,
          tiktok: nextDraft.tiktok,
          shopify: nextDraft.shopify,
          images: nextDraft.images,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Draft save failed.");
      }

      const record = (await response.json()) as ApiRecord;
      applyRecord(record, "Draft saved to product-ai-agent and kept locally for this account.");
      persistDraftSnapshot({
        ...getSnapshotWithImages(),
        productId: record.id,
      });
      setDraftSaveState("saved");
    } catch (error) {
      setDraftSaveState("idle");
      setStatusMessage(error instanceof Error ? error.message : "Draft save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDraft() {
    const savedProductId = productId;

    setIsDeletingDraft(true);
    try {
      if (isImportMode && currentImportRecordId) {
        const response = await fetch(`/api/product-ai/imports/products/${currentImportRecordId}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 404 && response.status !== 405) {
          const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorBody?.detail ?? "Import delete failed.");
        }

        resetDraftEditor("Import draft deleted.");
        router.replace("/import", { scroll: false });
        return;
      }

      if (savedProductId) {
        const response = await fetch(`/api/product-ai/products/${savedProductId}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 404 && response.status !== 405) {
          const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorBody?.detail ?? "Draft delete failed.");
        }
      }

      resetDraftEditor(
        savedProductId
          ? "Draft deleted locally. Backend draft was removed when supported by the upstream service."
          : "Local draft deleted.",
        { deleteSavedDraft: true },
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Draft delete failed.");
    } finally {
      setIsDeletingDraft(false);
    }
  }

  async function optimizeMarketplace(market: MarketKey) {
    if (isImportMode) {
      if (!currentImportRecordId) {
        setStatusMessage("Import record is missing.");
        return;
      }

      setMarketRegenerating((prev) => ({ ...prev, [market]: true }));
      try {
        const response = await fetch(`/api/product-ai/imports/products/${currentImportRecordId}/marketplaces/${market}/optimize`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorBody?.detail ?? `Could not optimize ${marketLabels[market]}.`);
        }

        const record = (await response.json()) as ImportApiRecord;
        applyImportRecord(record, `${marketLabels[market]} product data optimized.`);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : `Could not optimize ${marketLabels[market]}.`);
      } finally {
        setMarketRegenerating((prev) => ({ ...prev, [market]: false }));
      }
      return;
    }

    if (!productId) {
      setStatusMessage("Generate a product before optimizing marketplace content.");
      return;
    }

    setMarketRegenerating((prev) => ({ ...prev, [market]: true }));
    try {
      const response = await fetch(`/api/product-ai/products/${productId}/marketplaces/${market}/optimize`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? `Could not optimize ${marketLabels[market]}.`);
      }

      const record = (await response.json()) as ApiRecord;
      applyRecord(record, `${marketLabels[market]} product data optimized.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Could not optimize ${marketLabels[market]}.`);
    } finally {
      setMarketRegenerating((prev) => ({ ...prev, [market]: false }));
    }
  }


  async function analyzeDynamicPricing() {
    if (!productId) {
      setStatusMessage("Generate a product before running dynamic pricing analysis.");
      return;
    }

    setIsRefreshingPricing(true);
    setPricingSnapshot(null);
    const requestedProductId = productId;
    try {
      const response = await fetch(`/api/product-ai/products/${requestedProductId}/pricing/snapshot`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not load marketplace pricing.");
      }

      const snapshot = (await response.json()) as ApiProductPricingSnapshot;
      setPricingSnapshot(snapshot);
      const activePricing = snapshot.markets.find((entry) => entry.marketplace === activeMarket) ?? snapshot.markets[0];
      if (activePricing) {
        const synced = syncPublishPriceFromPricing(activePricing);
        if (synced) {
          setStatusMessage(activePricing.analysis_summary || `Marketplace pricing refreshed for ${marketLabels[activePricing.marketplace]}.`);
          return;
        }
      } else {
        setStatusMessage("Marketplace pricing refreshed.");
        return;
      }

      const querySnapshot = await fetchQueryBasedPricing(activeMarket);
      if (querySnapshot) {
        setPricingSnapshot(querySnapshot);
        const queryPricing = querySnapshot.markets.find((entry) => entry.marketplace === activeMarket) ?? querySnapshot.markets[0];
        if (queryPricing && syncPublishPriceFromPricing(queryPricing)) {
          setStatusMessage(queryPricing.analysis_summary || `Marketplace pricing refreshed for ${marketLabels[queryPricing.marketplace]}.`);
          return;
        }
      }

      setStatusMessage(activePricing?.analysis_summary || "Marketplace pricing refreshed, but no reliable price was found.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load marketplace pricing.");
    } finally {
      setIsRefreshingPricing(false);
    }
  }

  function updateVariantInput(market: MarketKey, field: "size" | "color", value: string) {
    setVariantInputs((prev) => ({
      ...prev,
      [market]: {
        ...prev[market],
        [field]: value,
      },
    }));
  }

  async function addVariant(market: MarketKey, type: "size" | "color") {
    if (!productId) {
      setStatusMessage("Generate a product before adding marketplace variants.");
      return;
    }

    const rawValue = variantInputs[market][type].trim();
    if (!rawValue) {
      setStatusMessage(`Add a ${type} value before creating a new ${marketLabels[market]} variant.`);
      return;
    }

    setVariantSubmitting((prev) => ({ ...prev, [market]: true }));
    try {
      const response = await fetch(`/api/product-ai/products/${productId}/marketplaces/${market}/variants/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: rawValue, value: rawValue }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? `Could not add the ${type} variant.`);
      }

      const record = (await response.json()) as ApiRecord;
      applyRecord(
        record,
        type === "color"
          ? `${marketLabels[market]} color variant added with a generated image.`
          : `${marketLabels[market]} size variant added.`,
      );
      setVariantInputs((prev) => ({
        ...prev,
        [market]: {
          ...prev[market],
          [type]: "",
        },
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Could not add the ${type} variant.`);
    } finally {
      setVariantSubmitting((prev) => ({ ...prev, [market]: false }));
    }
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedImage(null);
      return;
    }

    setStatusMessage("Preparing source image for upload...");

    try {
      const prepared = await prepareProductAiImageUpload(file);
      setSelectedImage(prepared.file);
      setStatusMessage(
        prepared.wasOptimized
          ? `Selected source image: ${prepared.file.name}. Optimized from ${(prepared.originalSize / (1024 * 1024)).toFixed(2)} MB to ${(prepared.file.size / (1024 * 1024)).toFixed(2)} MB.`
          : `Selected source image: ${prepared.file.name}`,
      );
    } catch (error) {
      setSelectedImage(null);
      setStatusMessage(error instanceof Error ? error.message : "The selected source image could not be prepared.");
    } finally {
      event.target.value = "";
    }
  }

  async function uploadSelectedSourceImage(file: File, successMessage: string) {
    if (isImportMode) {
      const sourceRecordId = currentImportRecordId;
      if (!sourceRecordId) {
        setStatusMessage("Import record is missing.");
        return false;
      }

      setIsUploadingSourceImage(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("market", "source");
        formData.append("productId", sourceRecordId);

        const response = await fetch("/api/product-ai/image/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorBody?.detail ?? "Could not upload the source image.");
        }

        const result = (await response.json()) as { relative_path: string; absolute_path: string };
        const nextImages = {
          ...draft.images,
          source: {
            ...draft.images.source,
            relative_path: result.relative_path,
            absolute_path: result.absolute_path,
            generation_mode: "manual_upload",
            mime_type: file.type || "image/png",
            validation: {
              ...draft.images.source.validation,
              passed: true,
              file_size_bytes: file.size,
              format: file.type.split("/")[1]?.toUpperCase() || "PNG",
              mime_type: file.type || "image/png",
              errors: [],
            },
          },
        };

        await saveDraft(nextImages);
        clearSelectedImageSelection();
        setStatusMessage(successMessage);
        return true;
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Could not upload the source image.");
        return false;
      } finally {
        setIsUploadingSourceImage(false);
      }
    }

    if (!productId) {
      setStatusMessage("Generate or load a product draft before uploading a source image.");
      return false;
    }

    const formData = new FormData();
    formData.append("image", file);

    setIsUploadingSourceImage(true);
    try {
      const response = await fetch(`/api/product-ai/products/${productId}/source-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not upload the source image.");
      }

      const record = (await response.json()) as ApiRecord;
      applyRecord(record, successMessage);
      clearSelectedImageSelection();
      return true;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not upload the source image.");
      return false;
    } finally {
      setIsUploadingSourceImage(false);
    }
  }

  async function uploadProductSourceImage() {
    if (!selectedImage) {
      setStatusMessage("Choose a source image first.");
      return;
    }

    if (!productId) {
      setStatusMessage("Single-market generation is not available before the first AI draft exists. Click Generate AI once, then generate each marketplace separately.");
      return;
    }

    await uploadSelectedSourceImage(
      selectedImage,
      isImportMode
        ? "Source image uploaded to the import record."
        : "Source image uploaded. Transparent cutout was refreshed and marketplace images are ready for on-demand generation.",
    );
  }

  function formatBytes(bytes?: number) {
    if (!bytes) return "Unknown size";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function triggerDirectImageDownload(src: string, filename: string) {
    const fallbackLink = document.createElement("a");
    fallbackLink.href = src;
    fallbackLink.download = filename;
    fallbackLink.target = "_blank";
    fallbackLink.rel = "noopener noreferrer";
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }

  async function downloadMarketplaceImage(key: ImageCardKey, filename: string) {
    const card = imageCards.find((c) => c.key === key);
    const pathValue = card?.image?.absolute_path || card?.image?.relative_path;
    if (!pathValue) {
      setStatusMessage(`No image path found to download for ${key}.`);
      return;
    }
    try {
      const src = imageUrlFor(pathValue);
      if (!src) return;
      const isCrossOrigin =
        typeof window !== "undefined" && new URL(src, window.location.href).origin !== window.location.origin;

      if (isCrossOrigin) {
        triggerDirectImageDownload(src, filename);
        setStatusMessage(`Opened image download fallback for ${filename}.`);
        return;
      }

      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setStatusMessage(`Downloaded image: ${filename}`);
    } catch (error) {
      const src = imageUrlFor(pathValue);
      if (!src) {
        setStatusMessage(`Download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return;
      }

      triggerDirectImageDownload(src, filename);
      setStatusMessage(`Opened image download fallback for ${filename}.`);
    }
  }

  async function downloadAllImages() {
    const cardsWithImages = imageCards.filter((c) => c.image?.absolute_path || c.image?.relative_path);
    if (cardsWithImages.length === 0) {
      setStatusMessage("No generated images available to download.");
      return;
    }
    setStatusMessage(`Bundling all (${cardsWithImages.length}) images into a ZIP...`);
    try {
      const zip = new JSZip();
      const titleBase = getPublishTitle().trim() || "product";
      const titleClean = titleBase.replace(/[^a-z0-9]/gi, "_").toLowerCase();

      for (let i = 0; i < cardsWithImages.length; i++) {
        const card = cardsWithImages[i];
        const pathValue = card.image?.absolute_path || card.image?.relative_path;
        if (!pathValue) continue;

        const src = imageUrlFor(pathValue);
        if (!src) continue;

        const response = await fetch(src);
        const blob = await response.blob();
        const filename = `${titleClean}_${card.key}.png`;
        zip.file(filename, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${titleClean}_images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setStatusMessage(`ZIP file downloaded successfully: ${titleClean}_images.zip`);
    } catch (error) {
      console.error("Failed to bundle ZIP file", error);
      setStatusMessage(`ZIP generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function generateAllMarketplaceImages() {
    if (isImportMode) {
      if (!currentImportRecordId) {
        setStatusMessage("Import record is missing.");
        return;
      }

      if (selectedImage) {
        const formData = new FormData();
        formData.append("image", selectedImage);

        setIsUploadingSourceImage(true);
        try {
          const response = await fetch(`/api/product-ai/imports/products/${currentImportRecordId}/source-image`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
            throw new Error(errorBody?.detail ?? "Could not generate marketplace images for this import.");
          }

          const record = (await response.json()) as ImportApiRecord;
          applyImportRecord(record, "All marketplace images generated for this import record.");
          clearSelectedImageSelection();
          return;
        } catch (error) {
          setStatusMessage(error instanceof Error ? error.message : "Could not generate marketplace images for this import.");
          return;
        } finally {
          setIsUploadingSourceImage(false);
        }
      }

      if (!hasSourceImage) {
        setStatusMessage("Upload a source image first, then generate marketplace images.");
        return;
      }

      setMarketImageGenerating({
        amazon: true,
        ebay: true,
        etsy: true,
        tiktok: true,
        shopify: true,
      });
      try {
        let latestRecord: ImportApiRecord | null = null;
        for (const market of ["amazon", "ebay", "etsy", "tiktok", "shopify"] as MarketKey[]) {
          const response = await fetch(`/api/product-ai/imports/products/${currentImportRecordId}/marketplaces/${market}/regenerate`, {
            method: "POST",
          });

          if (!response.ok) {
            const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
            throw new Error(errorBody?.detail ?? `Could not generate the ${marketLabels[market]} image.`);
          }

          latestRecord = (await response.json()) as ImportApiRecord;
        }

        if (latestRecord) {
          applyImportRecord(latestRecord, "All marketplace images generated for this import record.");
        }
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Could not generate marketplace images for this import.");
      } finally {
        setMarketImageGenerating(emptyActionState);
      }
      return;
    }

    if (!productId) {
      await generateProduct("All marketplace content and image generations complete.");
      return;
    }
    if (!hasSourceImage) {
      if (!selectedImage) {
        setStatusMessage("Upload a source image first, then generate marketplace images.");
        return;
      }

      const uploadSucceeded = await uploadSelectedSourceImage(
        selectedImage,
        "Source image uploaded. Marketplace sections are now generating in parallel...",
      );
      if (!uploadSucceeded) {
        return;
      }
    }

    await generateMarketplaceSectionsInParallel(
      productId,
      ["amazon", "ebay", "etsy", "tiktok", "shopify"],
      "All marketplace content and image generations complete.",
    );
  }

  async function clearMarketplaceImage(key: ImageCardKey) {
    const nextImages = { ...draft.images };
    if (nextImages[key]) {
      nextImages[key] = {
        ...nextImages[key],
        relative_path: "",
        absolute_path: "",
        validation: {
          ...nextImages[key].validation,
          passed: false,
          width: null,
          height: null,
          file_size_bytes: 0,
          errors: ["Image cleared manually."],
        },
      };
    }
    await saveDraft(nextImages);
    setStatusMessage(`Cleared image for ${marketLabels[key as MarketKey] ?? key}.`);
  }

  async function uploadCardImageDirect(key: ImageCardKey, file: File) {
    setImageUploadingMap((prev) => ({ ...prev, [key]: true }));
    setStatusMessage(`Uploading image for ${marketLabels[key as MarketKey] ?? key}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("market", key);
      formData.append("productId", productId || "draft");

      const response = await fetch("/api/product-ai/image/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Upload failed.");
      }

      const result = (await response.json()) as { relative_path: string; absolute_path: string };

      const nextImages = { ...draft.images };
      const currentImage = nextImages[key];

      let width: number | null = currentImage?.validation?.width ?? null;
      let height: number | null = currentImage?.validation?.height ?? null;

      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        img.onload = () => {
          width = img.width;
          height = img.height;
          URL.revokeObjectURL(img.src);
          resolve(true);
        };
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          resolve(false);
        };
      });

      nextImages[key] = {
        marketplace: key,
        relative_path: result.relative_path,
        absolute_path: result.absolute_path,
        prompt: currentImage?.prompt ?? `${key} image`,
        generation_mode: "manual_upload",
        mime_type: file.type || "image/png",
        validation: {
          passed: true,
          width: width,
          height: height,
          format: file.type.split("/")[1]?.toUpperCase() || "PNG",
          has_alpha: file.type === "image/png" || file.type === "image/webp",
          file_size_bytes: file.size,
          expected_width: currentImage?.validation?.expected_width ?? null,
          expected_height: currentImage?.validation?.expected_height ?? null,
          expected_background: currentImage?.validation?.expected_background ?? "opaque",
          errors: [],
          mime_type: file.type || "image/png",
        },
      };

      await saveDraft(nextImages);
      setStatusMessage(`Successfully uploaded and saved image for ${marketLabels[key as MarketKey] ?? key}.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Image upload failed.";
      setStatusMessage(`Upload failed: ${msg}`);
    } finally {
      setImageUploadingMap((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function validateAndUploadCardImage(key: ImageCardKey, file: File) {
    const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      setStatusMessage(`Invalid file type. Allowed: PNG, JPG, WEBP.`);
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB limit
    if (file.size > maxBytes) {
      setStatusMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max is 10 MB.`);
      return;
    }

    if (key === "source") {
      try {
        const prepared = await prepareProductAiImageUpload(file);
        setSelectedImage(prepared.file);
        setStatusMessage(
          prepared.wasOptimized
            ? `Selected source image: ${prepared.file.name}. Optimized from ${(prepared.originalSize / (1024 * 1024)).toFixed(2)} MB to ${(prepared.file.size / (1024 * 1024)).toFixed(2)} MB.`
            : `Selected source image: ${prepared.file.name}`,
        );
      } catch (error) {
        setSelectedImage(null);
        setStatusMessage(error instanceof Error ? error.message : "The selected source image could not be prepared.");
      }
      return;
    }

    await uploadCardImageDirect(key, file);
  }

  async function onManualUploadSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !activeUploadCardKey) return;
    await validateAndUploadCardImage(activeUploadCardKey, file);
    event.target.value = "";
  }

  function handleCardDrop(e: React.DragEvent<HTMLDivElement>, key: ImageCardKey) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void validateAndUploadCardImage(key, file);
    }
  }

  async function regenerateMarketplaceImage(market: MarketKey) {
    if (isImportMode) {
      setStatusMessage("Use Generate All in the Images panel to create marketplace images for imports.");
      return;
    }

    if (!productId) {
      await generateMarketplaceDraft(market);
      return;
    }

    if (!hasSourceImage) {
      if (!selectedImage) {
        setStatusMessage("Upload a source image first, then generate the marketplace content and image you want.");
        return;
      }

      const uploadSucceeded = await uploadSelectedSourceImage(
        selectedImage,
        `Source image uploaded. Generating the ${marketLabels[market]} content and image now...`,
      );

      if (!uploadSucceeded) {
        return;
      }
    }

    setMarketImageGenerating((prev) => ({ ...prev, [market]: true }));
    try {
      const response = await fetch(`/api/product-ai/products/${productId}/marketplaces/${market}/generate`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? `Could not generate the ${marketLabels[market]} content and image.`);
      }

      const record = (await response.json()) as ApiRecord;
      applyRecord(
        record,
        `${marketLabels[market]} content and image generated for the selected marketplace.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Could not generate the ${marketLabels[market]} content and image.`);
    } finally {
      setMarketImageGenerating((prev) => ({ ...prev, [market]: false }));
    }
  }

  const currentVariants = variantsByMarket[activeMarket] ?? [];
  const canGenerateAll = Boolean(productId || (selectedImage && sourceTitle.trim()));
  const activeMarketPricing = pricingSnapshot?.markets.find((entry) => entry.marketplace === activeMarket) ?? null;

  const isStatusError =
    publishFieldErrors.title ||
    publishFieldErrors.price ||
    statusMessage.toLowerCase().includes("please fill") ||
    statusMessage.toLowerCase().includes("required before") ||
    statusMessage.toLowerCase().includes("must be") ||
    statusMessage.toLowerCase().includes("missing") ||
    statusMessage.toLowerCase().includes("failed") ||
    statusMessage.toLowerCase().includes("could not");
  const editorContextLabel = isImportMode ? "Import Products" : "Products";
  const editorTitle = isImportMode
    ? readOnly
      ? "View Imported Product"
      : "Edit Imported Product"
    : "Add Product";
  const backHref = isImportMode ? "/import" : "/products";
  const displayId = importRecordId || initialImportRecordId || productId;

  function getDisplayStatusMessage(message: string) {
    const normalized = message.trim();
    const lower = normalized.toLowerCase();

    if (!normalized) {
      return "Ready.";
    }

    if (
      lower.includes("dynamic pricing") ||
      lower.includes("default price around") ||
      lower.includes("pricing refreshed") ||
      lower.includes("pricing ready") ||
      lower.includes("recommends a default price")
    ) {
      return "Dynamic pricing ready.";
    }

    if (lower.includes("ai draft generated")) {
      return "AI draft ready.";
    }

    if (lower.includes("text draft generated")) {
      return "AI text draft ready.";
    }

    if (lower.includes("generating marketplace sections in parallel")) {
      return "Generating marketplace sections...";
    }

    if (lower.includes("all marketplace content and image generations complete")) {
      return "All marketplace sections ready.";
    }

    if (lower.includes("content and image generated")) {
      const market = Object.entries(marketLabels).find(([, label]) => lower.includes(label.toLowerCase()))?.[1];
      return market ? `${market} content ready.` : "Marketplace content ready.";
    }

    if (lower.includes("product data optimized")) {
      const market = Object.entries(marketLabels).find(([, label]) => lower.includes(label.toLowerCase()))?.[1];
      return market ? `${market} optimization complete.` : "Marketplace optimization complete.";
    }

    if (lower.includes("source image uploaded")) {
      return "Source image ready.";
    }

    return normalized;
  }

  const displayStatusMessage = isStatusError ? statusMessage : getDisplayStatusMessage(statusMessage);

  return (
    <section className="relative isolate px-4 pt-1 pb-5 md:px-8 md:pt-4 md:pb-8">
      <input
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
        ref={productImageUploadInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
        ref={uploadInputRef}
        type="file"
      />

      <div className="space-y-6">
        <header className="sticky top-0 z-30 overflow-hidden rounded-[28px] border border-[#3c4d78] bg-[#1a2545] px-4 py-4 text-white shadow-[0_22px_50px_-30px_rgba(7,17,41,0.95)] md:px-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,221,232,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(120,149,255,0.12),transparent_30%)]" />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <Link
                  href={backHref}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#5e739f] bg-white/6 px-3 text-sm font-semibold text-white hover:bg-white/12 transition-colors cursor-pointer"
                >
                  &larr; Back
                </Link>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9eb1d4]">{editorContextLabel} &nbsp;&gt;&nbsp; {editorTitle}</p>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="text-[1.85rem] font-bold leading-none tracking-[-0.03em] text-white">{editorTitle}</h1>
                    {displayId ? (
                      <span className="rounded-full border border-[#5b7099] bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-[#dce7fb]">
                        ID: {displayId.slice(0, 8)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex justify-start xl:justify-end">
                <span
                  title={statusMessage}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 xl:max-w-[320px] ${
                  isStatusError 
                    ? "bg-[#ef4444]/10 text-[#fca5a5] border-[#ef4444]/40 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse" 
                    : "bg-[#1b325f]/50 text-[#7adfff] border-[#3059a4]/50"
                }`}
                >
                  {isStatusError && <CircleAlert className="h-3.5 w-3.5 text-[#ef4444] shrink-0" />}
                  <span className="truncate">{displayStatusMessage}</span>
                </span>
              </div>
            </div>

            <div className="grid gap-4 border-t border-white/8 pt-4 xl:grid-cols-[minmax(0,1.25fr)_auto] xl:items-end">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9eb1d4]">Source Title</p>
                  {selectedImage ? (
                    <span className="max-w-[210px] truncate rounded-full border border-[#56709d] bg-white/7 px-2.5 py-1 text-[11px] font-medium text-[#cfe0ff]">
                      Image: {selectedImage.name}
                    </span>
                  ) : null}
                </div>
                <input
                  className={`h-12 w-full rounded-2xl bg-white/7 px-4 text-base font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-[#aab8d6] ${publishFieldErrors.title ? "border border-[#ff7d7d] focus:border-[#ff9b9b]" : "border border-[#51658f] focus:border-[#8ea0bf]"
                    }`}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSourceTitle(value);
                    setDraft((prev) => ({ ...prev, core: { ...prev.core, source_title: value } }));
                    if (publishFieldErrors.title && value.trim()) {
                      setPublishFieldErrors((prev) => ({ ...prev, title: false }));
                    }
                  }}
                  placeholder="Enter the source title used for AI generation"
                  type="text"
                  value={sourceTitle}
                />
              </div>

              <div className="grid gap-2 xl:min-w-[560px] xl:grid-cols-[auto_auto_auto] xl:items-end">
                <div className="rounded-2xl border border-[#51658f]/45 bg-white/6 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                    <button
                      className="h-9 rounded-xl px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-30 cursor-pointer whitespace-nowrap"
                      disabled={!hasSavedDraft}
                      onClick={() => loadSavedDraft()}
                      type="button"
                    >
                      Load
                    </button>
                    <button
                      className="h-9 rounded-xl px-3 text-xs font-semibold text-[#dce7fb] transition hover:bg-white/10 cursor-pointer whitespace-nowrap"
                      onClick={() => clearSavedDraft()}
                      type="button"
                    >
                      Clear
                    </button>
                    <button
                      className={`h-9 rounded-xl px-3 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-30 cursor-pointer whitespace-nowrap ${effectiveDraftSaveState === "saved"
                          ? "text-[#8ea0bf] opacity-60"
                          : "text-[#ccebdc]"
                        }`}
                      disabled={isSaving}
                      onClick={() => void saveDraft()}
                      type="button"
                    >
                      {effectiveDraftSaveState === "saving" ? "Saving..." : effectiveDraftSaveState === "saved" ? "Saved" : "Save"}
                    </button>
                    <button
                      className="h-9 rounded-xl px-3 text-xs font-semibold text-[#ffd8de] transition hover:bg-[#39151d] disabled:opacity-30 cursor-pointer whitespace-nowrap"
                      disabled={isDeletingDraft}
                      onClick={() => void deleteDraft()}
                      type="button"
                    >
                      {isDeletingDraft ? "..." : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#51658f] bg-white/6 px-4 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    onClick={() => uploadInputRef.current?.click()}
                    type="button"
                  >
                    <Upload className="h-4 w-4" />
                    {selectedImage ? "Change Product" : "Upload Product"}
                  </button>

                  {hasPersistedProduct ? (
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#51658f] bg-white/6 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      disabled={isUploadingSourceImage || !selectedImage}
                      onClick={() => void uploadProductSourceImage()}
                      type="button"
                    >
                      {isUploadingSourceImage ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Src
                    </button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>

                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#35d3ce] px-5 text-sm font-bold text-[#153c53] shadow-[0_14px_30px_-20px_rgba(53,211,206,0.95)] transition hover:bg-[#2bc7c2] disabled:opacity-60 cursor-pointer"
                  disabled={isGenerating}
                  onClick={() => void generateProduct()}
                  type="button"
                >
                  {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isGenerating ? "Generating..." : isImportMode ? "Generate Text" : "Generate AI"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-5 pt-4 xl:grid-cols-[minmax(0,1.7fr)_380px] xl:items-start">
          <div className="space-y-5 xl:pr-2">
            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              {/* Header block with refined styling */}
              <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#eef2f6] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#eaf3ff] to-[#d0e3ff] text-[#2b7cf5] shadow-xs">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1f2c44]">Core Product Data</h2>
                    <p className="text-xs text-[#7f92b1]">Primary product specifications and source draft parameters.</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isGenerating || !sourceTitle.trim()}
                  onClick={() => void generateTextOnly()}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#172544] to-[#263c70] px-3.5 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-98 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  {isGenerating ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#35d3ce]" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-[#35d3ce]" />
                  )}
                  {isGenerating ? "Generating..." : "Generate Text Only"}
                </button>
              </div>

              {/* Grid content divided into visual subgroups */}
              <div className="space-y-4">

                {/* 4-column layout for main meta fields */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <EditableField
                    label="Source Title"
                    helperText="Source title context for AI."
                    onChange={(value) => {
                      setSourceTitle(value);
                      setDraft((prev) => ({ ...prev, core: { ...prev.core, source_title: value } }));
                    }}
                    value={draft.core.source_title}
                  />
                  <EditableField
                    label="Normalized Title"
                    helperText="AI marketplace standard title."
                    onChange={(value) => setDraft((prev) => ({ ...prev, core: { ...prev.core, normalized_title: value } }))}
                    value={draft.core.normalized_title}
                  />
                  <EditableField
                    label="Category"
                    helperText="Catalog category identifier."
                    onChange={(value) => setDraft((prev) => ({ ...prev, core: { ...prev.core, category: value } }))}
                    value={draft.core.category}
                  />
                  <EditableField
                    label="Product Type"
                    helperText="Template classification spec."
                    onChange={(value) => setDraft((prev) => ({ ...prev, core: { ...prev.core, product_type: value } }))}
                    value={draft.core.product_type}
                  />
                </div>

                {/* Narrative Summary */}
                <div>
                  <EditableField
                    label="Product Summary"
                    helperText="A comprehensive prose summary of the product generated by AI."
                    multiline
                    onChange={(value) => setDraft((prev) => ({ ...prev, core: { ...prev.core, product_summary: value } }))}
                    value={draft.core.product_summary}
                  />
                </div>

                {/* Specifications & Enrichments */}
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <EditableListField
                    helperText="One core feature highlight per line"
                    label="Generated Features"
                    onChange={(values) => setDraft((prev) => ({ ...prev, core: { ...prev.core, features: values } }))}
                    values={draft.core.features}
                  />
                  <EditableAttributesField
                    attributes={draft.core.attributes}
                    label="Structured Attributes"
                    onChange={(attributes) => setDraft((prev) => ({ ...prev, core: { ...prev.core, attributes } }))}
                  />
                </div>

              </div>
            </article>

            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-[#eef2f6] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd] text-[#0284c7] shadow-xs border border-[#bae6fd]">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1f2c44]">Marketplace Content</h2>
                    <p className="text-xs text-[#7f92b1]">Edit per-marketplace listings and optimize active channel data from the backend.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {marketOrder.map((marketKey) => (
                    <MarketTabLink
                      activeMarket={activeMarket}
                      importRecordId={currentImportRecordId}
                      isImportMode={isImportMode}
                      key={marketKey}
                      market={marketKey}
                      productId={productId}
                      readOnly={readOnly}
                    />
                  ))}
                  <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
                  <button
                    className="group inline-flex w-36 items-center justify-center gap-1.5 rounded-full bg-[#e8f2ff] border border-[#c2ddff] py-1.5 text-xs font-bold text-[#2b7cf5] hover:bg-[#2b7cf5] hover:text-white hover:border-[#2b7cf5] hover:shadow-[0_4px_12px_rgba(43,124,245,0.15)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!hasPersistedProduct || marketRegenerating[activeMarket]}
                    onClick={() => void optimizeMarketplace(activeMarket)}
                    type="button"
                  >
                    {marketRegenerating[activeMarket] ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-180 text-[#2b7cf5] group-hover:text-white" />
                    )}
                    <span>{marketRegenerating[activeMarket] ? "Optimizing..." : "Optimize"}</span>
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {activeMarket === "amazon" ? (
                  <>
                    <EditableField
                      label="Marketplace Title"
                      onChange={(value) => setDraft((prev) => ({ ...prev, amazon: { ...prev.amazon, title: value } }))}
                      value={draft.amazon.title}
                    />
                    <EditableListField
                      helperText="One bullet point per line"
                      label="Bullet Points"
                      onChange={(values) => setDraft((prev) => ({ ...prev, amazon: { ...prev.amazon, bullet_points: values } }))}
                      values={draft.amazon.bullet_points}
                    />
                    <EditableField
                      label="Description"
                      multiline
                      onChange={(value) => setDraft((prev) => ({ ...prev, amazon: { ...prev.amazon, description: value } }))}
                      value={draft.amazon.description}
                    />
                    <EditableListField
                      helperText="One search term per line"
                      label="Backend Search Terms"
                      onChange={(values) => setDraft((prev) => ({ ...prev, amazon: { ...prev.amazon, backend_search_terms: values } }))}
                      values={draft.amazon.backend_search_terms}
                      renderAsTags={true}
                    />
                    <EditableAttributesField
                      attributes={draft.amazon.structured_attributes}
                      label="Structured Attributes"
                      onChange={(attributes) => setDraft((prev) => ({ ...prev, amazon: { ...prev.amazon, structured_attributes: attributes } }))}
                    />
                  </>
                ) : null}

                {activeMarket === "ebay" ? (
                  <>
                    <EditableField
                      label="Marketplace Title"
                      onChange={(value) => setDraft((prev) => ({ ...prev, ebay: { ...prev.ebay, title: value } }))}
                      value={draft.ebay.title}
                    />
                    <div className="flex flex-col rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4 transition-all duration-200 focus-within:border-[#cbd5e1] focus-within:bg-white focus-within:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between border-b border-[#eef2f6] pb-2.5 mb-3">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[#8093b2]">Condition</span>
                          <p className="mt-0.5 text-[11px] text-[#8ea0bf]">eBay publish supports only approved inventory conditions.</p>
                        </div>
                      </div>
                      <select
                        className="h-10 w-full rounded-lg border border-[#d4ddec] bg-white px-3 text-xs font-medium text-[#31415e] outline-none transition focus:border-[#2b7cf5]"
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            ebay: {
                              ...prev.ebay,
                              condition: normalizeEbayCondition(event.target.value),
                            },
                          }))
                        }
                        value={isAllowedEbayCondition(normalizeEbayCondition(draft.ebay.condition)) ? normalizeEbayCondition(draft.ebay.condition) : "NEW"}
                      >
                        {allowedEbayConditions.map((condition) => (
                          <option key={condition} value={condition}>
                            {ebayConditionLabels[condition]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <EditableField
                        label="Currency"
                        helperText="GBP for EBAY_GB."
                        onChange={(value) => setDraft((prev) => ({ ...prev, ebay: { ...prev.ebay, currency: value.toUpperCase() } }))}
                        value={draft.ebay.currency ?? ""}
                      />
                      <EditableField
                        label="Category ID"
                        helperText="Optional. Leave blank to use backend default sandbox category."
                        onChange={(value) => setDraft((prev) => ({ ...prev, ebay: { ...prev.ebay, category_id: value } }))}
                        value={draft.ebay.category_id ?? ""}
                      />
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <EditableField
                        label="Brand"
                        helperText="Recommended eBay item specific."
                        onChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            ebay: {
                              ...prev.ebay,
                              item_specifics: setEbaySpecificFieldValue(prev.ebay.item_specifics, "Brand", value),
                            },
                          }))
                        }
                        value={getEbaySpecificFieldValue(draft.ebay.item_specifics, "Brand")}
                      />
                      <EditableField
                        label="Colour"
                        helperText="Required by many eBay fashion categories."
                        onChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            ebay: {
                              ...prev.ebay,
                              item_specifics: setEbaySpecificFieldValue(prev.ebay.item_specifics, "Colour", value),
                            },
                          }))
                        }
                        value={getEbaySpecificFieldValue(draft.ebay.item_specifics, "Colour")}
                      />
                      <EditableField
                        label="Department"
                        helperText="Example: Men, Women, Unisex Adults."
                        onChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            ebay: {
                              ...prev.ebay,
                              item_specifics: setEbaySpecificFieldValue(prev.ebay.item_specifics, "Department", value),
                            },
                          }))
                        }
                        value={getEbaySpecificFieldValue(draft.ebay.item_specifics, "Department")}
                      />
                      <EditableField
                        label="Type"
                        helperText="Example: Trainer, Boot, Athletic."
                        onChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            ebay: {
                              ...prev.ebay,
                              item_specifics: setEbaySpecificFieldValue(prev.ebay.item_specifics, "Type", value),
                            },
                          }))
                        }
                        value={getEbaySpecificFieldValue(draft.ebay.item_specifics, "Type")}
                      />
                      <EditableField
                        label="Style"
                        helperText="Example: Sneaker, Running Shoe."
                        onChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            ebay: {
                              ...prev.ebay,
                              item_specifics: setEbaySpecificFieldValue(prev.ebay.item_specifics, "Style", value),
                            },
                          }))
                        }
                        value={getEbaySpecificFieldValue(draft.ebay.item_specifics, "Style")}
                      />
                      <EditableField
                        label="UK Shoe Size"
                        helperText="Required by your current eBay footwear category."
                        onChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            ebay: {
                              ...prev.ebay,
                              item_specifics: setEbaySpecificFieldValue(prev.ebay.item_specifics, "UKShoeSize", value),
                            },
                          }))
                        }
                        value={getEbaySpecificFieldValue(draft.ebay.item_specifics, "UKShoeSize")}
                      />
                    </div>
                    <EditableField
                      label="Description Override"
                      helperText="Optional eBay-specific description used instead of the general publish description."
                      multiline
                      onChange={(value) => setDraft((prev) => ({ ...prev, ebay: { ...prev.ebay, description_override: value } }))}
                      value={draft.ebay.description_override ?? ""}
                    />
                    <EditableField
                      label="Listing Notes"
                      multiline
                      onChange={(value) => setDraft((prev) => ({ ...prev, ebay: { ...prev.ebay, listing_notes: value } }))}
                      value={draft.ebay.listing_notes}
                    />
                    <EditableAttributesField
                      attributes={draft.ebay.item_specifics}
                      label="Item Specifics"
                      onChange={(attributes) => setDraft((prev) => ({ ...prev, ebay: { ...prev.ebay, item_specifics: attributes } }))}
                    />
                  </>
                ) : null}

                {activeMarket === "tiktok" ? (
                  <>
                    <EditableField
                      label="Marketplace Title"
                      onChange={(value) => setDraft((prev) => ({ ...prev, tiktok: { ...prev.tiktok, title: value } }))}
                      value={draft.tiktok.title}
                    />
                    <EditableField
                      label="Social Description"
                      multiline
                      onChange={(value) => setDraft((prev) => ({ ...prev, tiktok: { ...prev.tiktok, social_description: value } }))}
                      value={draft.tiktok.social_description}
                    />
                    <EditableListField
                      helperText="One hashtag per line"
                      label="Hashtags"
                      onChange={(values) => setDraft((prev) => ({ ...prev, tiktok: { ...prev.tiktok, hashtags: values } }))}
                      values={draft.tiktok.hashtags}
                      renderAsTags={true}
                    />
                  </>
                ) : null}

                {activeMarket === "etsy" ? (
                  <>
                    <EditableField
                      label="Marketplace Title"
                      onChange={(value) => setDraft((prev) => ({ ...prev, etsy: { ...prev.etsy, title: value } }))}
                      value={draft.etsy.title}
                    />
                    <EditableField
                      label="Description"
                      multiline
                      onChange={(value) => setDraft((prev) => ({ ...prev, etsy: { ...prev.etsy, description: value } }))}
                      value={draft.etsy.description}
                    />
                    <EditableListField
                      helperText="One tag per line"
                      label="Tags"
                      onChange={(values) => setDraft((prev) => ({ ...prev, etsy: { ...prev.etsy, tags: values } }))}
                      values={draft.etsy.tags}
                      renderAsTags={true}
                    />
                    <EditableListField
                      helperText="One material per line"
                      label="Materials"
                      onChange={(values) => setDraft((prev) => ({ ...prev, etsy: { ...prev.etsy, materials: values } }))}
                      values={draft.etsy.materials}
                      renderAsTags={true}
                    />
                    <EditableField
                      label="Occasion"
                      onChange={(value) => setDraft((prev) => ({ ...prev, etsy: { ...prev.etsy, occasion: value } }))}
                      value={draft.etsy.occasion}
                    />
                    <EditableListField
                      helperText="One SEO keyword per line"
                      label="SEO Keywords"
                      onChange={(values) => setDraft((prev) => ({ ...prev, etsy: { ...prev.etsy, seo_keywords: values } }))}
                      values={draft.etsy.seo_keywords}
                      renderAsTags={true}
                    />
                  </>
                ) : null}

                {activeMarket === "shopify" ? (
                  <div className="space-y-6">
                    {/* Card 1: Title & Description */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1f2c44] mb-3">Title & Description</h3>
                      <div className="space-y-4">
                        <EditableField
                          label="Storefront Title"
                          onChange={(value) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, title: value } }))}
                          helperText={publishFieldErrors.title ? "Required for Shopify publish." : undefined}
                          invalid={publishFieldErrors.title}
                          value={draft.shopify.title}
                        />
                        <EditableField
                          label="Body HTML (Description)"
                          multiline
                          onChange={(value) => {
                            setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, body_html: value } }));
                            setPublishDescription(value);
                          }}
                          value={draft.shopify.body_html}
                        />
                      </div>
                    </div>

                    {/* Card 2: Media */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1f2c44] mb-3">Media</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2] mb-2">Shopify Composition Image</p>
                          {draft.images.shopify.relative_path || draft.images.shopify.absolute_path ? (
                            <div className="relative group overflow-hidden rounded-xl border border-[#dbe2ee] bg-slate-50 flex items-center justify-center p-2 aspect-[4/3]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageUrlFor(draft.images.shopify.absolute_path || draft.images.shopify.relative_path) || ""}
                                alt="Shopify product"
                                className="max-h-full max-w-full object-contain"
                              />
                              <div className="absolute inset-0 bg-[#0f172a]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                {!isImportMode ? (
                                  <button
                                    type="button"
                                    onClick={() => void regenerateMarketplaceImage("shopify")}
                                    className="h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1 cursor-pointer border-0"
                                  >
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    <span>Regenerate</span>
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => void clearMarketplaceImage("shopify")}
                                  className="h-8 rounded-lg bg-[#ef6b6b]/90 hover:bg-[#ef6b6b] text-white px-3 text-xs font-semibold transition flex items-center gap-1 cursor-pointer border-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Clear</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleCardDrop(e, "shopify")}
                              className="flex flex-col items-center justify-center aspect-[4/3] rounded-xl border-2 border-dashed border-[#d4ddec] bg-[#f8fbff] text-center p-4"
                            >
                              <ImageIcon className="h-8 w-8 text-[#8ea0bf] mb-2" />
                              <p className="text-xs text-[#5e718e] font-medium mb-2">Drag image here or upload</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveUploadCardKey("shopify");
                                  productImageUploadInputRef.current?.click();
                                }}
                                className="h-7 rounded-lg bg-[#1b2748] hover:bg-[#253663] text-white px-3 text-xs font-bold transition cursor-pointer border-0"
                              >
                                Upload File
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center text-xs text-[#667a99] space-y-2 leading-relaxed">
                          <p className="font-semibold text-[#31415e]">About Shopify Media:</p>
                          <p>This image represents the visual storefront representation. You can regenerate the image using AI tailored for Shopify or upload a custom image file.</p>
                          <p>Supported file formats: <span className="font-semibold text-slate-800">PNG, JPG, WEBP</span>. Size limit: <span className="font-semibold text-slate-800">10 MB</span>.</p>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Category */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1f2c44] mb-3">Product Category</h3>
                      <EditableField
                        label="Category"
                        onChange={(value) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, category: value } }))}
                        value={draft.shopify.category ?? ""}
                        helperText="Determines tax rates and suggests metafield parameters."
                      />
                      {shopifyCategorySuggestions.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8093b2] mb-1.5">AI Suggestions</p>
                          <div className="flex flex-wrap gap-2">
                            {shopifyCategorySuggestions.map((categorySuggestion) => (
                              <button
                                key={categorySuggestion}
                                type="button"
                                onClick={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    shopify: { ...prev.shopify, category: categorySuggestion },
                                  }))
                                }
                                className="rounded-full bg-[#edf2fb] hover:bg-[#dfe9fb] px-3 py-1 text-xs font-semibold text-[#49607f] transition cursor-pointer border-0"
                              >
                                {categorySuggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Card 4: Category Metafields (dynamic per active category) */}
                    {(() => {
                      const metafieldSchema = getMetafieldSchema(draft.shopify.category);
                      const knownKeys = new Set(metafieldSchema.fields.map((f) => f.key));
                      const activeCategory = (draft.shopify.category ?? "").trim();
                      const isGeneric = metafieldSchema.id === "generic";
                      return (
                        <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                          <div className="flex items-center justify-between border-b border-[#eef2f6] pb-3 mb-4">
                            <div>
                              <h3 className="text-sm font-bold text-[#1f2c44]">{metafieldSchema.title}</h3>
                              <p className="text-xs text-[#8ea0bf] mt-0.5">
                                {isGeneric && !activeCategory
                                  ? "Set the Shopify category above to unlock category-specific metafields."
                                  : metafieldSchema.description}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                              {isGeneric ? "Generic schema" : `Active Category: ${activeCategory}`}
                            </span>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            {metafieldSchema.fields.map((field) => {
                              if (field.type === "select" && field.options && field.options.length > 0) {
                                return (
                                  <CustomDropdownSelector
                                    key={field.key}
                                    label={field.label}
                                    value={draft.shopify.metafields?.[field.key] ?? ""}
                                    options={field.options}
                                    onChange={(val) => setDraft((prev) => ({
                                      ...prev,
                                      shopify: {
                                        ...prev.shopify,
                                        metafields: { ...(prev.shopify.metafields ?? {}), [field.key]: val },
                                      },
                                    }))}
                                    placeholder={`Select ${field.label}`}
                                    colorDot={field.colorDot === true}
                                  />
                                );
                              }
                              // text input
                              return (
                                <div
                                  key={field.key}
                                  className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 focus-within:border-[#2b7cf5] focus-within:bg-white transition-all"
                                >
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1 select-none">
                                    {field.label}
                                  </span>
                                  <input
                                    type="text"
                                    value={draft.shopify.metafields?.[field.key] ?? ""}
                                    onChange={(e) => setDraft((prev) => ({
                                      ...prev,
                                      shopify: {
                                        ...prev.shopify,
                                        metafields: { ...(prev.shopify.metafields ?? {}), [field.key]: e.target.value },
                                      },
                                    }))}
                                    placeholder={field.help ?? `Enter ${field.label.toLowerCase()}`}
                                    className="w-full bg-transparent text-xs font-semibold outline-none border-0 text-[#31415e] placeholder:text-[#aab8d6]"
                                  />
                                  {field.help ? (
                                    <span className="text-[10px] text-[#aab8d6] mt-1">{field.help}</span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>

                          {/* Extra metafields that don't fit the resolved schema:
                              show anything in the metafields dict that isn't already
                              a known field, so the user can still edit LLM-provided
                              keys we don't have a UI for. */}
                          {(() => {
                            const extras = Object.entries(draft.shopify.metafields ?? {}).filter(
                              ([key]) => !knownKeys.has(key) && String(key).trim(),
                            );
                            if (extras.length === 0) return null;
                            return (
                              <div className="mt-4 border-t border-[#eef2f6] pt-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8093b2] mb-2">Custom metafields (from AI or import)</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {extras.map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex flex-col rounded-xl border border-[#dbe2ee] bg-white p-3 focus-within:border-[#2b7cf5] transition-all"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] select-none">
                                          {key.replace(/_/g, " ")}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setDraft((prev) => {
                                            const copy = { ...(prev.shopify.metafields ?? {}) };
                                            delete copy[key];
                                            return { ...prev, shopify: { ...prev.shopify, metafields: copy } };
                                          })}
                                          className="text-[10px] font-semibold text-[#aab8d6] hover:text-[#cf4b4b] cursor-pointer border-0 bg-transparent"
                                          aria-label={`Remove ${key} metafield`}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        value={String(value ?? "")}
                                        onChange={(e) => setDraft((prev) => ({
                                          ...prev,
                                          shopify: {
                                            ...prev.shopify,
                                            metafields: { ...(prev.shopify.metafields ?? {}), [key]: e.target.value },
                                          },
                                        }))}
                                        className="w-full bg-transparent text-xs font-semibold outline-none border-0 text-[#31415e]"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          <div className="mt-4 border-t border-[#eef2f6] pt-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8093b2] mb-2">Add Additional Details</p>
                            <div className="flex flex-wrap gap-2">
                              {metafieldSchema.fields.map((field) => {
                                const exists = Boolean(draft.shopify.metafields?.[field.key]);
                                return (
                                  <button
                                    key={field.key}
                                    type="button"
                                    onClick={() => {
                                      if (exists) {
                                        setDraft((prev) => {
                                          const copy = { ...(prev.shopify.metafields ?? {}) };
                                          delete copy[field.key];
                                          return { ...prev, shopify: { ...prev.shopify, metafields: copy } };
                                        });
                                      } else {
                                        const val = window.prompt(`Enter ${field.label} value:`);
                                        if (val) {
                                          setDraft((prev) => ({
                                            ...prev,
                                            shopify: {
                                              ...prev.shopify,
                                              metafields: { ...(prev.shopify.metafields ?? {}), [field.key]: val },
                                            },
                                          }));
                                        }
                                      }
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer border-solid ${
                                      exists
                                        ? "bg-[#172544] border-[#172544] text-white"
                                        : "bg-white border-[#d5dcea] text-[#4a5d7d] hover:bg-[#f8fbff]"
                                    }`}
                                  >
                                    <span>{exists ? `✓ ${field.label}` : `+ ${field.label}`}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Card 5: Pricing */}
                    <div className={`rounded-2xl border p-5 shadow-xs transition-colors duration-300 ${
                      publishFieldErrors.price 
                        ? "border-[#ef6b6b] bg-[#fff5f5]" 
                        : "border-[#dbe2ee] bg-white"
                    }`}>
                      <h3 className="text-sm font-bold text-[#1f2c44] mb-3">Pricing</h3>
                      
                      <div className="space-y-4">
                        {/* Primary Price Field */}
                        <div className={`flex flex-col rounded-xl border p-3 max-w-xs transition-all focus-within:bg-white ${
                          publishFieldErrors.price 
                            ? "border-[#ef6b6b] bg-[#fffcfc] focus-within:border-[#ef6b6b]" 
                            : "border-[#dbe2ee] bg-[#f8fbff] focus-within:border-[#2b7cf5]"
                        }`}>
                          <span className={`text-[11px] font-bold uppercase tracking-wider mb-1 transition-colors ${
                            publishFieldErrors.price ? "text-[#cf4b4b]" : "text-[#8093b2]"
                          }`}>Price</span>
                          <div className="flex items-center">
                            <span className={`text-xs font-semibold select-none mr-1.5 transition-colors ${
                              publishFieldErrors.price ? "text-[#cf4b4b]" : "text-[#8ea0bf]"
                            }`}>£</span>
                            <input
                              type="text"
                              value={publishPrice}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, "");
                                updatePublishPrice(val);
                              }}
                              className={`w-full bg-transparent text-xs font-semibold outline-none border-0 transition-colors ${
                                publishFieldErrors.price ? "text-[#cf4b4b] placeholder-[#fca5a5]" : "text-[#31415e] placeholder:text-[#aab8d6]"
                              }`}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        {publishFieldErrors.price ? (
                          <p className="text-xs text-[#cf4b4b] font-semibold flex items-center gap-1 animate-pulse">
                            <CircleAlert className="h-3.5 w-3.5 text-[#cf4b4b] shrink-0" />
                            Please fill the required publish fields: Default price.
                          </p>
                        ) : null}

                        {/* Interactive Pill Buttons */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setShowCompareAtPrice(!showCompareAtPrice)}
                            className={`px-3 py-1.5 rounded-full border font-semibold transition cursor-pointer select-none ${
                              showCompareAtPrice 
                                ? "bg-[#eef2f6] border-[#d4ddec] text-[#31415e]" 
                                : "bg-white border-dashed border-[#d5dcea] text-[#5a6d8d] hover:bg-[#f8fbff]"
                            }`}
                          >
                            {showCompareAtPrice ? "✓ Compare-at price" : "+ Compare-at price"}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const nextTax = !(draft.shopify.charge_tax ?? true);
                              setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, charge_tax: nextTax } }));
                            }}
                            className={`px-3 py-1.5 rounded-full border font-semibold transition cursor-pointer select-none ${
                              (draft.shopify.charge_tax ?? true)
                                ? "bg-[#eef2f6] border-[#d4ddec] text-[#31415e]"
                                : "bg-white border-[#d5dcea] text-[#5a6d8d] hover:bg-[#f8fbff]"
                            }`}
                          >
                            Charge tax: {(draft.shopify.charge_tax ?? true) ? "Yes" : "No"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowCostPerItem(!showCostPerItem)}
                            className={`px-3 py-1.5 rounded-full border font-semibold transition cursor-pointer select-none ${
                              showCostPerItem 
                                ? "bg-[#eef2f6] border-[#d4ddec] text-[#31415e]" 
                                : "bg-white border-dashed border-[#d5dcea] text-[#5a6d8d] hover:bg-[#f8fbff]"
                            }`}
                          >
                            {showCostPerItem ? "✓ Cost per item" : "+ Cost per item"}
                          </button>
                        </div>

                        {/* Secondary Toggled Inputs */}
                        {(showCompareAtPrice || showCostPerItem) && (
                          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#eef2f6] animate-in fade-in duration-200">
                            {showCompareAtPrice && (
                              <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 transition focus-within:border-[#2b7cf5] focus-within:bg-white animate-in slide-in-from-top-1 duration-150">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Compare-at Price</span>
                                <div className="flex items-center">
                                  <span className="text-xs font-semibold text-[#8ea0bf] select-none mr-1.5">£</span>
                                  <input
                                    type="text"
                                    value={draft.shopify.compare_at_price ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9.]/g, "");
                                      setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, compare_at_price: val } }));
                                    }}
                                    className="w-full bg-transparent text-xs text-[#31415e] font-semibold outline-none border-0"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            )}

                            {showCostPerItem && (
                              <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 transition focus-within:border-[#2b7cf5] focus-within:bg-white animate-in slide-in-from-top-1 duration-150">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Cost Per Item</span>
                                <div className="flex items-center">
                                  <span className="text-xs font-semibold text-[#8ea0bf] select-none mr-1.5">£</span>
                                  <input
                                    type="text"
                                    value={draft.shopify.cost_per_item ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9.]/g, "");
                                      setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, cost_per_item: val } }));
                                    }}
                                    className="w-full bg-transparent text-xs text-[#31415e] font-semibold outline-none border-0"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 6: Inventory */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-[#1f2c44]">Inventory</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#5a6d8d] select-none">Inventory tracked</span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !publishTrackInventory;
                              setPublishTrackInventory(nextVal);
                              setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, inventory_tracked: nextVal } }));
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              publishTrackInventory ? "bg-[#008060]" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                publishTrackInventory ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {publishTrackInventory && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#8093b2]">Quantity & Locations</p>
                            <button
                              type="button"
                              onClick={() => {
                                setNewLocationName("");
                                setLocationError("");
                                setIsAddLocationOpen(true);
                              }}
                              className="text-xs font-bold text-[#2b7cf5] hover:text-[#1d5fb8] cursor-pointer border-0 bg-transparent"
                            >
                              + Add Location
                            </button>
                          </div>

                          <div className="overflow-hidden rounded-xl border border-[#d5dcea] bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-[#d5dcea] text-[#8093b2] font-semibold">
                                  <th className="p-2.5">Location</th>
                                  <th className="p-2.5 w-20 text-center">Unavailable</th>
                                  <th className="p-2.5 w-20 text-center">Committed</th>
                                  <th className="p-2.5 w-20 text-center">Available</th>
                                  <th className="p-2.5 w-20 text-center">On Hand</th>
                                  <th className="p-2.5 w-12 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(draft.shopify.stock_locations ?? []).map((loc, idx) => (
                                  <tr key={loc.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="p-2.5 font-semibold text-[#31415e]">{loc.name}</td>
                                    
                                    {/* Unavailable */}
                                    <td className="p-2.5">
                                      <input
                                        type="number"
                                        value={loc.unavailable ?? 0}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10) || 0;
                                          setDraft((prev) => {
                                            const nextLocs = [...(prev.shopify.stock_locations ?? [])];
                                            nextLocs[idx] = { ...nextLocs[idx], unavailable: val };
                                            return { ...prev, shopify: { ...prev.shopify, stock_locations: nextLocs } };
                                          });
                                        }}
                                        className="w-full h-8 border border-[#d4ddec] rounded-lg text-center text-xs outline-none focus:border-[#2b7cf5]"
                                      />
                                    </td>

                                    {/* Committed */}
                                    <td className="p-2.5">
                                      <input
                                        type="number"
                                        value={loc.committed ?? 0}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10) || 0;
                                          setDraft((prev) => {
                                            const nextLocs = [...(prev.shopify.stock_locations ?? [])];
                                            nextLocs[idx] = { ...nextLocs[idx], committed: val };
                                            return { ...prev, shopify: { ...prev.shopify, stock_locations: nextLocs } };
                                          });
                                        }}
                                        className="w-full h-8 border border-[#d4ddec] rounded-lg text-center text-xs outline-none focus:border-[#2b7cf5]"
                                      />
                                    </td>

                                    {/* Available */}
                                    <td className="p-2.5">
                                      <input
                                        type="number"
                                        value={loc.available}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10) || 0;
                                          setDraft((prev) => {
                                            const nextLocs = [...(prev.shopify.stock_locations ?? [])];
                                            nextLocs[idx] = { ...nextLocs[idx], available: val };
                                            const newTotal = nextLocs.reduce((acc, l) => acc + l.available, 0);
                                            setPublishStock(newTotal.toString());
                                            return { ...prev, shopify: { ...prev.shopify, stock_locations: nextLocs } };
                                          });
                                        }}
                                        className="w-full h-8 border border-[#d4ddec] rounded-lg text-center text-xs outline-none focus:border-[#2b7cf5]"
                                      />
                                    </td>

                                    {/* On Hand (calculated) */}
                                    <td className="p-2.5 text-center font-bold text-[#31415e]">
                                      {(loc.available ?? 0) + (loc.committed ?? 0) + (loc.unavailable ?? 0)}
                                    </td>

                                    {/* Action (Delete) */}
                                    <td className="p-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDraft((prev) => {
                                            const nextLocs = (prev.shopify.stock_locations ?? []).filter((_, i) => i !== idx);
                                            const newTotal = nextLocs.reduce((acc, l) => acc + l.available, 0);
                                            setPublishStock(newTotal.toString());
                                            return { ...prev, shopify: { ...prev.shopify, stock_locations: nextLocs } };
                                          });
                                        }}
                                        className="text-[#ef6b6b] hover:text-[#cf4b4b] cursor-pointer border-0 bg-transparent text-xs font-semibold"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Inventory Card Footer: SKU, Barcode, Sell when out of stock */}
                      <div className="border-t border-[#eef2f6] pt-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <EditableField
                            label="SKU (Stock Keeping Unit)"
                            onChange={(value) => {
                              setPublishSku(value);
                              setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, sku: value } }));
                            }}
                            value={publishSku}
                          />
                          <EditableField
                            label="Barcode (ISBN, UPC, GTIN, etc.)"
                            onChange={(value) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, barcode: value } }))}
                            value={draft.shopify.barcode ?? ""}
                          />
                          
                          {/* Sell when out of stock dropdown picker */}
                          <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 relative select-none shopify-continue-selling-container">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Sell when out of stock</span>
                            <div 
                              onClick={() => setIsContinueSellingDropdownOpen(!isContinueSellingDropdownOpen)}
                              className="flex items-center justify-between cursor-pointer h-5 text-xs font-semibold text-[#31415e] mt-1"
                            >
                              <span>{draft.shopify.continue_selling_out_of_stock ? "Continue selling" : "Off"}</span>
                              <ChevronDown className={`h-4.5 w-4.5 text-[#8ea0bf] transition-transform duration-200 ${isContinueSellingDropdownOpen ? "rotate-180" : ""}`} />
                            </div>

                            {isContinueSellingDropdownOpen && (
                              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-xl border border-[#d5dcea] bg-white py-1 shadow-lg text-xs font-semibold text-[#31415e] animate-in fade-in slide-in-from-top-1 duration-150">
                                <div 
                                  onClick={() => {
                                    setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, continue_selling_out_of_stock: false } }));
                                    setIsContinueSellingDropdownOpen(false);
                                  }}
                                  className={`px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center justify-between ${!draft.shopify.continue_selling_out_of_stock ? "text-[#2b7cf5] bg-blue-50/20" : ""}`}
                                >
                                  <span>Off</span>
                                  {!draft.shopify.continue_selling_out_of_stock && <span className="text-[#2b7cf5]">✓</span>}
                                </div>
                                <div 
                                  onClick={() => {
                                    setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, continue_selling_out_of_stock: true } }));
                                    setIsContinueSellingDropdownOpen(false);
                                  }}
                                  className={`px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center justify-between ${draft.shopify.continue_selling_out_of_stock ? "text-[#2b7cf5] bg-blue-50/20" : ""}`}
                                >
                                  <span>Continue selling</span>
                                  {draft.shopify.continue_selling_out_of_stock && <span className="text-[#2b7cf5]">✓</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 7: Shipping */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-[#1f2c44]">Shipping</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#5a6d8d] select-none">Physical product</span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !(draft.shopify.physical_product ?? true);
                              setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, physical_product: nextVal } }));
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              (draft.shopify.physical_product ?? true) ? "bg-[#008060]" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                (draft.shopify.physical_product ?? true) ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {draft.shopify.physical_product !== false && (
                        <div className="space-y-4 border-t border-[#eef2f6] pt-4">
                          {/* Package Selector */}
                          <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 relative select-none package-select-container focus-within:border-[#2b7cf5] focus-within:bg-white max-w-md">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Package</span>
                            <div
                              onClick={() => setIsPackageDropdownOpen(!isPackageDropdownOpen)}
                              className="flex items-center justify-between cursor-pointer py-0.5 select-none text-xs font-semibold text-[#31415e]"
                            >
                              <span>{shippingPackage}</span>
                              <ChevronDown className={`h-4.5 w-4.5 text-[#8ea0bf] transition-transform duration-200 ${isPackageDropdownOpen ? "rotate-180" : ""}`} />
                            </div>

                            {isPackageDropdownOpen && (
                              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-45 rounded-xl border border-[#d5dcea] bg-white py-1 shadow-lg text-xs font-semibold text-[#31415e] animate-in fade-in slide-in-from-top-1 duration-150">
                                {[
                                  "Store default • Sample box - 8.6 × 5.4 × 1.8 in, 0 lb",
                                  "Custom package • Custom box dimensions"
                                ].map((pkg) => (
                                  <div
                                    key={pkg}
                                    onClick={() => {
                                      setShippingPackage(pkg);
                                      setIsPackageDropdownOpen(false);
                                    }}
                                    className={`px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center justify-between ${shippingPackage === pkg ? "text-[#2b7cf5] bg-blue-50/20" : ""}`}
                                  >
                                    <span>{pkg}</span>
                                    {shippingPackage === pkg && <span className="text-[#2b7cf5]">✓</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 transition focus-within:border-[#2b7cf5] focus-within:bg-white">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Weight</span>
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  value={draft.shopify.weight ?? "0.0"}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, "");
                                    setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, weight: val } }));
                                  }}
                                  className="flex-1 bg-transparent text-xs text-[#31415e] font-semibold outline-none border-0"
                                  placeholder="0.0"
                                />
                                <div className="relative inline-weight-unit-container">
                                  <div
                                    onClick={() => setIsWeightUnitOpen(!isWeightUnitOpen)}
                                    className="flex items-center gap-1 text-xs text-[#31415e] font-semibold cursor-pointer border-l border-slate-200 pl-2.5 ml-2 select-none"
                                  >
                                    <span>{draft.shopify.weight_unit ?? "lb"}</span>
                                    <ChevronDown className="h-3 w-3 text-slate-400" />
                                  </div>
                                  {isWeightUnitOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-16">
                                      {["lb", "oz", "kg", "g"].map((unit) => (
                                        <button
                                          key={unit}
                                          type="button"
                                          onClick={() => {
                                            setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, weight_unit: unit } }));
                                            setIsWeightUnitOpen(false);
                                          }}
                                          className={`w-full text-center py-1 text-xs font-semibold hover:bg-slate-50 cursor-pointer border-0 bg-transparent ${
                                            draft.shopify.weight_unit === unit ? "text-[#2b7cf5] bg-blue-50/50" : "text-slate-700"
                                          }`}
                                        >
                                          {unit}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 relative country-select-container focus-within:border-[#2b7cf5] focus-within:bg-white">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Country/Region of Origin</span>
                              <div
                                onClick={() => setIsCountryOpen(!isCountryOpen)}
                                className="flex items-center justify-between cursor-pointer py-0.5 mt-1 select-none"
                              >
                                <span className={`text-xs font-semibold ${draft.shopify.country_of_origin ? "text-[#31415e]" : "text-slate-400"}`}>
                                  {draft.shopify.country_of_origin
                                    ? { US: "United States", GB: "United Kingdom", BD: "Bangladesh", VN: "Vietnam", CN: "China" }[draft.shopify.country_of_origin] || draft.shopify.country_of_origin
                                    : "Select Country"}
                                </span>
                                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isCountryOpen ? "rotate-180" : ""}`} />
                              </div>
                              {isCountryOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 max-h-56 overflow-y-auto">
                                  {draft.shopify.country_of_origin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, country_of_origin: "" } }));
                                        setIsCountryOpen(false);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 font-semibold cursor-pointer border-0 bg-transparent flex items-center justify-between"
                                    >
                                      <span>Clear selection</span>
                                    </button>
                                  )}
                                  <div className="space-y-0.5">
                                    {[
                                      { value: "US", label: "United States" },
                                      { value: "GB", label: "United Kingdom" },
                                      { value: "BD", label: "Bangladesh" },
                                      { value: "VN", label: "Vietnam" },
                                      { value: "CN", label: "China" },
                                    ].map((c) => {
                                      const isSelected = c.value === draft.shopify.country_of_origin;
                                      return (
                                        <button
                                          key={c.value}
                                          type="button"
                                          onClick={() => {
                                            setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, country_of_origin: c.value } }));
                                            setIsCountryOpen(false);
                                          }}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 flex items-center justify-between transition-all ${
                                            isSelected ? "bg-[#edf5ff] text-[#2b7cf5]" : "text-slate-700 hover:bg-slate-50 bg-transparent"
                                          }`}
                                        >
                                          <span>{c.label}</span>
                                          {isSelected && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5 text-[#2b7cf5]">
                                              <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            <EditableField
                              label="HS Code (Harmonized System)"
                              onChange={(value) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, hs_code: value } }))}
                              value={draft.shopify.hs_code ?? ""}
                              helperText="Required for international customs mapping."
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card 7.5: Variants options */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-[#1f2c44]">Variants</h3>
                      </div>

                      <div className="flex items-center gap-2 px-1 mb-4">
                        <input
                          type="checkbox"
                          id="has_variants"
                          checked={draft.shopify.has_variants ?? false}
                          onChange={(e) => {
                            const hasVars = e.target.checked;
                            const nextOptions = hasVars ? (draft.shopify.options ?? [{ name: "Size", values: [] }]) : [];
                            const nextVariants = hasVars ? handleUpdateShopifyVariants(nextOptions, draft.shopify.variants ?? []) : [];
                            setDraft((prev) => ({
                              ...prev,
                              shopify: {
                                ...prev.shopify,
                                has_variants: hasVars,
                                options: nextOptions,
                                variants: nextVariants,
                              },
                            }));
                            if (hasVars) {
                              setEditingOptionIndices({ 0: true });
                            }
                          }}
                          className="h-4 w-4 rounded border-[#d4ddec] text-[#2b7cf5] focus:ring-[#2b7cf5] cursor-pointer"
                        />
                        <label htmlFor="has_variants" className="text-xs font-semibold text-[#4a5d7d] cursor-pointer select-none">
                          This product has options, like size or color
                        </label>
                      </div>

                      {(draft.shopify.has_variants ?? false) && (
                        <div className="space-y-4 border-t border-[#eef2f6] pt-4">
                          {/* Options List */}
                          <div className="space-y-3">
                            {(draft.shopify.options ?? []).map((opt, optIdx) => {
                              const isEditing = editingOptionIndices[optIdx] ?? false;
                              const isRecommended = RECOMMENDED_OPTIONS.some(
                                (r) => r.name.toLowerCase() === opt.name.toLowerCase()
                              );

                              if (!isEditing) {
                                // Collapsed Shopify Card View
                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => {
                                      setEditingOptionIndices((prev) => ({ ...prev, [optIdx]: true }));
                                    }}
                                    className="p-4 bg-[#f8fbff] hover:bg-[#f3f7fe] rounded-xl border border-[#dbe2ee] hover:border-[#2b7cf5]/50 transition-all cursor-pointer flex items-center gap-3 select-none"
                                  >
                                    <div className="text-slate-400 shrink-0">
                                      <DragHandleIcon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-[#8093b2] uppercase tracking-wider">Option {optIdx + 1}</span>
                                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200">
                                          <DatabaseIcon className="h-3 w-3 text-blue-500" />
                                          <span>{opt.name || `Option ${optIdx + 1}`}</span>
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {opt.values.length === 0 ? (
                                          <span className="text-xs italic text-slate-400">No values added yet</span>
                                        ) : (
                                          opt.values.map((v, idx) => (
                                            <span key={idx} className="bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg text-xs font-semibold shadow-2xs">
                                              {v}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-[#2b7cf5] text-xs font-bold hover:underline shrink-0">Edit</div>
                                  </div>
                                );
                              }

                              // Expanded/Editing Card View
                              return (
                                <div key={optIdx} className="p-5 bg-white rounded-xl border border-[#2b7cf5] shadow-xs relative space-y-4">
                                  <div className="flex items-start gap-4">
                                    <div className="text-slate-400 mt-2 shrink-0">
                                      <DragHandleIcon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                      {/* Option Name container */}
                                      <div className="relative option-name-container">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8093b2]">Option Name</span>
                                          {isRecommended && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                              <DatabaseIcon className="h-2.5 w-2.5" />
                                              <span>{opt.name}</span>
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center border border-slate-200 rounded-lg px-3 bg-white focus-within:border-[#2b7cf5] focus-within:ring-1 focus-within:ring-[#2b7cf5] transition-all h-9">
                                          <input
                                            type="text"
                                            value={opt.name}
                                            placeholder="e.g. Size or Color"
                                            onChange={(e) => {
                                              const nextOptions = [...(draft.shopify.options ?? [])];
                                              nextOptions[optIdx] = {
                                                ...opt,
                                                name: e.target.value,
                                              };
                                              const nextVariants = handleUpdateShopifyVariants(nextOptions, draft.shopify.variants ?? []);
                                              setDraft((prev) => ({
                                                ...prev,
                                                shopify: {
                                                  ...prev.shopify,
                                                  options: nextOptions,
                                                  variants: nextVariants,
                                                },
                                              }));
                                            }}
                                            onFocus={() => {
                                              setActiveOptionNameDropdownIndex(optIdx);
                                              setOptionNameSearch("");
                                            }}
                                            className="w-full bg-transparent text-xs text-slate-800 outline-none border-0 p-0 font-medium"
                                          />
                                        </div>

                                        {/* Option Name Dropdown */}
                                        {activeOptionNameDropdownIndex === optIdx && (
                                          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-60 overflow-y-auto">
                                            {/* Search input inside name dropdown */}
                                            <div className="flex items-center gap-2 px-2.5 py-1.5 border border-slate-200 rounded-lg mb-2 focus-within:border-[#2b7cf5] transition-all bg-slate-50/50">
                                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-slate-400 shrink-0">
                                                <circle cx="11" cy="11" r="8" />
                                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                              </svg>
                                              <input
                                                type="text"
                                                placeholder="Search"
                                                value={optionNameSearch}
                                                onChange={(e) => setOptionNameSearch(e.target.value)}
                                                className="w-full bg-transparent text-xs outline-none border-0 p-0 text-slate-800"
                                              />
                                            </div>

                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 select-none">Recommended</div>
                                            <div className="space-y-0.5">
                                              {RECOMMENDED_OPTIONS.filter((o) =>
                                                o.name.toLowerCase().includes(optionNameSearch.toLowerCase())
                                              ).map((item) => (
                                                <button
                                                  key={item.name}
                                                  type="button"
                                                  onClick={() => {
                                                    const nextOptions = [...(draft.shopify.options ?? [])];
                                                    nextOptions[optIdx] = {
                                                      ...opt,
                                                      name: item.name,
                                                    };
                                                    const nextVariants = handleUpdateShopifyVariants(nextOptions, draft.shopify.variants ?? []);
                                                    setDraft((prev) => ({
                                                      ...prev,
                                                      shopify: {
                                                        ...prev.shopify,
                                                        options: nextOptions,
                                                        variants: nextVariants,
                                                      },
                                                    }));
                                                    setActiveOptionNameDropdownIndex(null);
                                                  }}
                                                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer border-0 bg-transparent transition-all"
                                                >
                                                  {item.name}
                                                </button>
                                              ))}
                                            </div>

                                            <div className="border-t border-slate-100 my-1 pt-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveOptionNameDropdownIndex(null);
                                                }}
                                                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 font-bold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                                              >
                                                <Plus className="h-3.5 w-3.5" />
                                                <span>Create custom option</span>
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Option Values container */}
                                      <div className="relative option-values-container">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8093b2]">Option Values</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 items-center p-2 border border-slate-200 rounded-lg bg-white min-h-[40px] focus-within:border-[#2b7cf5] focus-within:ring-1 focus-within:ring-[#2b7cf5] transition-all">
                                          {opt.values.map((val, valIdx) => (
                                            <span key={valIdx} className="bg-slate-100 text-slate-800 pl-1.5 pr-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-slate-200">
                                              <DragHandleIcon className="h-3.5 w-3.5 text-slate-400 cursor-grab active:cursor-grabbing shrink-0" />
                                              <span>{val}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextOptions = [...(draft.shopify.options ?? [])];
                                                  nextOptions[optIdx] = {
                                                    ...opt,
                                                    values: opt.values.filter((_, i) => i !== valIdx),
                                                  };
                                                  const nextVariants = handleUpdateShopifyVariants(nextOptions, draft.shopify.variants ?? []);
                                                  setDraft((prev) => ({
                                                    ...prev,
                                                    shopify: {
                                                      ...prev.shopify,
                                                      options: nextOptions,
                                                      variants: nextVariants,
                                                    },
                                                  }));
                                                }}
                                                className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-[#ef6b6b] hover:bg-rose-50 rounded-full transition-colors cursor-pointer border-0 bg-transparent font-bold"
                                              >
                                                <X className="h-2.5 w-2.5" />
                                              </button>
                                            </span>
                                          ))}
                                          <input
                                            type="text"
                                            placeholder={opt.values.length === 0 ? `Add option value...` : ""}
                                            value={optionValueSearch}
                                            onChange={(e) => setOptionValueSearch(e.target.value)}
                                            onFocus={() => {
                                              setActiveOptionValuesDropdownIndex(optIdx);
                                              setOptionValueSearch("");
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" || e.key === ",") {
                                                e.preventDefault();
                                                const val = optionValueSearch.trim();
                                                if (val && !opt.values.includes(val)) {
                                                  const nextOptions = [...(draft.shopify.options ?? [])];
                                                  nextOptions[optIdx] = {
                                                    ...opt,
                                                    values: [...opt.values, val],
                                                  };
                                                  const nextVariants = handleUpdateShopifyVariants(nextOptions, draft.shopify.variants ?? []);
                                                  setDraft((prev) => ({
                                                    ...prev,
                                                    shopify: {
                                                      ...prev.shopify,
                                                      options: nextOptions,
                                                      variants: nextVariants,
                                                    },
                                                  }));
                                                  setOptionValueSearch("");
                                                }
                                              }
                                            }}
                                            className="h-7 flex-1 min-w-[120px] bg-transparent text-xs text-slate-800 outline-none"
                                          />
                                        </div>

                                        {/* Option Values Dropdown */}
                                        {activeOptionValuesDropdownIndex === optIdx && (
                                          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-60 overflow-y-auto">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 select-none">Default entries</div>
                                            <div className="space-y-0.5 max-h-40 overflow-y-auto">
                                              {(() => {
                                                const recommendation = RECOMMENDED_OPTIONS.find(
                                                  (r) => r.name.toLowerCase() === opt.name.toLowerCase()
                                                );
                                                const defaults = recommendation ? recommendation.defaults : [];
                                                const filtered = defaults.filter((d) =>
                                                  d.toLowerCase().includes(optionValueSearch.toLowerCase())
                                                );
                                                if (filtered.length === 0) {
                                                  return <div className="text-xs text-slate-400 p-2 italic select-none">No matching default entries</div>;
                                                }
                                                return filtered.map((item) => {
                                                  const isChecked = opt.values.includes(item);
                                                  return (
                                                    <label
                                                      key={item}
                                                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer select-none"
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                          let nextValues;
                                                          if (isChecked) {
                                                            nextValues = opt.values.filter((v) => v !== item);
                                                          } else {
                                                            nextValues = [...opt.values, item];
                                                          }
                                                          const nextOptions = [...(draft.shopify.options ?? [])];
                                                          nextOptions[optIdx] = {
                                                            ...opt,
                                                            values: nextValues,
                                                          };
                                                          const nextVariants = handleUpdateShopifyVariants(nextOptions, draft.shopify.variants ?? []);
                                                          setDraft((prev) => ({
                                                            ...prev,
                                                            shopify: {
                                                              ...prev.shopify,
                                                              options: nextOptions,
                                                              variants: nextVariants,
                                                            },
                                                          }));
                                                        }}
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                      />
                                                      <span>{item}</span>
                                                    </label>
                                                  );
                                                });
                                              })()}
                                            </div>

                                            <div className="border-t border-slate-100 my-1 pt-1.5 flex items-center justify-between gap-2">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const val = optionValueSearch.trim();
                                                  if (val && !opt.values.includes(val)) {
                                                    const nextOptions = [...(draft.shopify.options ?? [])];
                                                    nextOptions[optIdx] = {
                                                      ...opt,
                                                      values: [...opt.values, val],
                                                    };
                                                    const nextVariants = handleUpdateShopifyVariants(nextOptions, draft.shopify.variants ?? []);
                                                    setDraft((prev) => ({
                                                      ...prev,
                                                      shopify: {
                                                        ...prev.shopify,
                                                        options: nextOptions,
                                                        variants: nextVariants,
                                                      },
                                                    }));
                                                    setOptionValueSearch("");
                                                  }
                                                }}
                                                className="px-2 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 font-bold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                                              >
                                                <Plus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                                <span>Add entry {optionValueSearch.trim() ? `"${optionValueSearch.trim()}"` : ""}</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveOptionValuesDropdownIndex(null);
                                                }}
                                                className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer border-0 shrink-0"
                                              >
                                                Done
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions inside card */}
                                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextOptions = (draft.shopify.options ?? []).filter((_, i) => i !== optIdx);
                                        const nextVariants = handleUpdateShopifyVariants(nextOptions, draft.shopify.variants ?? []);
                                        setDraft((prev) => ({
                                          ...prev,
                                          shopify: {
                                            ...prev.shopify,
                                            options: nextOptions,
                                            variants: nextVariants,
                                          },
                                        }));
                                        setEditingOptionIndices((prev) => {
                                          const updated = { ...prev };
                                          delete updated[optIdx];
                                          return updated;
                                        });
                                      }}
                                      className="text-xs font-bold text-[#ef6b6b] hover:text-[#cf4b4b] hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingOptionIndices((prev) => ({ ...prev, [optIdx]: false }));
                                      }}
                                      className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-1.5 rounded-lg transition-all cursor-pointer border-0"
                                    >
                                      Done
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Option button */}
                          {(draft.shopify.options ?? []).length < 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextOptions = [...(draft.shopify.options ?? []), { name: "", values: [] }];
                                const newIdx = nextOptions.length - 1;
                                setDraft((prev) => ({
                                  ...prev,
                                  shopify: {
                                    ...prev.shopify,
                                    options: nextOptions,
                                  },
                                }));
                                setEditingOptionIndices((prev) => ({
                                  ...prev,
                                  [newIdx]: true,
                                }));
                              }}
                              className="text-xs font-bold text-[#2b7cf5] hover:text-[#1d5fb8] cursor-pointer bg-transparent border-0 flex items-center gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add another option</span>
                            </button>
                          )}

                          {/* Variants Table controls */}
                          {(draft.shopify.variants ?? []).length > 0 && (
                            <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 select-none">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Group by</span>
                                  <div className="relative shopify-groupby-container">
                                    <div
                                      onClick={() => setIsGroupByOpen(!isGroupByOpen)}
                                      className="flex items-center gap-1.5 h-8 border border-slate-200 rounded-lg px-2.5 text-xs bg-white text-slate-800 cursor-pointer select-none font-semibold hover:border-slate-300 transition-colors"
                                    >
                                      <span>{groupByValue === "all" ? "text" : groupByValue}</span>
                                      <ChevronDown className="h-3 w-3 text-slate-400" />
                                    </div>
                                    {isGroupByOpen && (
                                      <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-32">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setGroupByValue("all");
                                            setIsGroupByOpen(false);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 cursor-pointer border-0 bg-transparent ${
                                            groupByValue === "all" ? "text-[#2b7cf5] bg-blue-50/50" : "text-slate-700"
                                          }`}
                                        >
                                          text
                                        </button>
                                        {(draft.shopify.options ?? []).map((o, idx) => {
                                          const optVal = o.name || `Option ${idx + 1}`;
                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => {
                                                setGroupByValue(optVal);
                                                setIsGroupByOpen(false);
                                              }}
                                              className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 cursor-pointer border-0 bg-transparent ${
                                                groupByValue === optVal ? "text-[#2b7cf5] bg-blue-50/50" : "text-slate-700"
                                              }`}
                                            >
                                              {optVal}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button type="button" className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                      <circle cx="11" cy="11" r="8" />
                                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                  </button>
                                  <button type="button" className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                      <line x1="4" y1="21" x2="4" y2="14" />
                                      <line x1="4" y1="10" x2="4" y2="3" />
                                      <line x1="12" y1="21" x2="12" y2="12" />
                                      <line x1="12" y1="8" x2="12" y2="3" />
                                      <line x1="20" y1="21" x2="20" y2="16" />
                                      <line x1="20" y1="12" x2="20" y2="3" />
                                      <line x1="1" y1="14" x2="7" y2="14" />
                                      <line x1="9" y1="8" x2="15" y2="8" />
                                      <line x1="17" y1="16" x2="23" y2="16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold select-none">
                                      <th className="p-3 w-10 text-center">
                                        <input type="checkbox" className="rounded border-slate-300 text-[#2b7cf5] focus:ring-[#2b7cf5] cursor-pointer" />
                                      </th>
                                      <th className="p-3">Variant</th>
                                      <th className="p-3 w-28">Price</th>
                                      <th className="p-3 w-24">Available</th>
                                      <th className="p-3 w-28">Publishing</th>
                                      <th className="p-3 w-8"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(draft.shopify.variants ?? []).map((variant, varIdx) => (
                                      <tr key={varIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                        <td className="p-3 text-center">
                                          <input type="checkbox" className="rounded border-slate-300 text-[#2b7cf5] focus:ring-[#2b7cf5] cursor-pointer" />
                                        </td>
                                        <td className="p-3">
                                          <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative shrink-0">
                                              {draft.images.shopify?.absolute_path ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                  src={imageUrlFor(draft.images.shopify.absolute_path) ?? undefined}
                                                  alt={variant.title}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="#2b7cf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                                  <polyline points="21 15 16 10 5 21" />
                                                </svg>
                                              )}
                                            </div>
                                            <div className="flex flex-col">
                                              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                                <span>{variant.title}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                              </div>
                                              <span className="text-[10px] text-slate-400">1 variant</span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-3">
                                          <div className="flex items-center border border-slate-200 rounded-lg px-2.5 bg-white focus-within:border-[#2b7cf5] focus-within:ring-1 focus-within:ring-[#2b7cf5] transition-all h-8">
                                            <span className="text-slate-400 mr-1 select-none">£</span>
                                            <input
                                              type="text"
                                              value={variant.price}
                                              onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9.]/g, "");
                                                const nextVariants = [...(draft.shopify.variants ?? [])];
                                                nextVariants[varIdx] = { ...variant, price: val };
                                                setDraft((prev) => ({
                                                  ...prev,
                                                  shopify: { ...prev.shopify, variants: nextVariants },
                                                }));
                                              }}
                                              className="w-full bg-transparent text-xs text-slate-800 outline-none border-0 p-0"
                                            />
                                          </div>
                                        </td>
                                        <td className="p-3">
                                          <input
                                            type="number"
                                            value={variant.inventoryQuantity}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10) || 0;
                                              const nextVariants = [...(draft.shopify.variants ?? [])];
                                              nextVariants[varIdx] = { ...variant, inventoryQuantity: val };
                                              setDraft((prev) => ({
                                                ...prev,
                                                shopify: { ...prev.shopify, variants: nextVariants },
                                              }));
                                            }}
                                            className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs outline-none bg-white text-slate-800 focus:border-[#2b7cf5] transition-all"
                                          />
                                        </td>
                                        <td className="p-3 text-slate-500">
                                          <div className="flex items-center gap-3 select-none">
                                            <span className="flex items-center gap-1.5">
                                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="9" cy="7" r="4" />
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                              </svg>
                                              <span>3</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                <polyline points="10 9 9 9 8 9" />
                                              </svg>
                                              <span>0</span>
                                            </span>
                                          </div>
                                        </td>
                                        <td className="p-3 text-right">
                                          <button type="button" className="text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent">
                                            <ChevronDown className="h-4 w-4" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl text-xs text-slate-500 font-semibold select-none">
                                  Total inventory at {draft.shopify.stock_locations?.[0]?.name ?? "5 Kingston Grove"}: {
                                    (draft.shopify.variants ?? []).reduce((acc, v) => acc + (v.inventoryQuantity ?? 0), 0)
                                  } available
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card 8: SEO Listing Preview */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-[#1f2c44]">Search Engine Listing Preview</h3>
                        <button
                          type="button"
                          onClick={() => setIsSeoCollapsed(!isSeoCollapsed)}
                          className="text-xs font-bold text-[#2b7cf5] hover:text-[#1d5fb8] cursor-pointer flex items-center gap-1 bg-transparent border-0 select-none"
                          title="Edit search engine listing"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="mb-4 p-4 rounded-xl border border-[#e2e8f0] bg-slate-50">
                        <div className="text-[#1a0dab] hover:underline text-base font-semibold leading-snug cursor-pointer truncate max-w-full">
                          {draft.shopify.seo_title || draft.shopify.title || "Jordan Air 1 Style — Burgundy"}
                        </div>
                        <div className="text-[#006621] text-xs leading-normal truncate max-w-full">
                          https://my-store.myshopify.com/products/{draft.shopify.seo_handle || (draft.shopify.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "jordan-air-1-style-burgundy"}
                        </div>
                        <div className="text-[#545454] text-xs leading-relaxed line-clamp-2 mt-1">
                          {draft.shopify.seo_description || (draft.shopify.body_html || "").replace(/<[^>]*>/g, "") || "A modern essential in a rich burgundy finish, crafted with a balanced look that fits seamlessly..."}
                        </div>
                      </div>

                      {!isSeoCollapsed && (
                        <div className="space-y-4 border-t border-[#eef2f6] pt-4 animate-in slide-in-from-top-2 duration-200">
                          <EditableField
                            label="Page Title (SEO Title)"
                            onChange={(value) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, seo_title: value } }))}
                            value={draft.shopify.seo_title}
                            helperText="Displayed in browser tab and search results. Recommended: 70 characters max."
                          />
                          <EditableField
                            label="Meta Description (SEO Description)"
                            multiline
                            onChange={(value) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, seo_description: value } }))}
                            value={draft.shopify.seo_description}
                            helperText="Displayed in search results page descriptions. Recommended: 320 characters max."
                          />
                          <EditableField
                            label="URL Handle"
                            onChange={(value) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, seo_handle: value } }))}
                            value={draft.shopify.seo_handle ?? ""}
                            helperText="URL path handle of this product page."
                          />
                        </div>
                      )}
                    </div>

                    {/* Card 9: Status */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1f2c44] mb-3">Status</h3>
                      <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 relative status-select-container focus-within:border-[#2b7cf5] focus-within:bg-white max-w-md">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Product Status</span>
                        <div
                          onClick={() => setIsStatusOpen(!isStatusOpen)}
                          className="flex items-center justify-between cursor-pointer py-0.5 mt-1 select-none"
                        >
                          <span className="text-xs font-semibold text-[#31415e]">
                            {publishStatus === "ACTIVE" ? "Active" : "Draft"}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isStatusOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isStatusOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 max-h-56 overflow-y-auto">
                            <div className="space-y-0.5">
                              {[
                                { value: "ACTIVE", label: "Active" },
                                { value: "DRAFT", label: "Draft" },
                              ].map((s) => {
                                const isSelected = s.value === publishStatus;
                                return (
                                  <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => {
                                      setPublishStatus(s.value as PublishStatus);
                                      setIsStatusOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 flex items-center justify-between transition-all ${
                                      isSelected ? "bg-[#edf5ff] text-[#2b7cf5]" : "text-slate-700 hover:bg-slate-50 bg-transparent"
                                    }`}
                                  >
                                    <span>{s.label}</span>
                                    {isSelected && (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5 text-[#2b7cf5]">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 10: Publishing */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1f2c44] mb-3">Publishing</h3>
                      <div className="flex items-center gap-2 px-1 py-1">
                        <input
                          type="checkbox"
                          id="publish_store"
                          checked={publishOnOnlineStore}
                          onChange={(e) => setPublishOnOnlineStore(e.target.checked)}
                          className="h-4 w-4 rounded border-[#d4ddec] text-[#2b7cf5] focus:ring-[#2b7cf5] cursor-pointer"
                        />
                        <label htmlFor="publish_store" className="text-xs font-semibold text-[#4a5d7d] cursor-pointer select-none">
                          Publish to Online Store
                        </label>
                      </div>
                    </div>

                    {/* Card 11: Product Organization */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1f2c44] mb-3">Product Organization</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <EditableField
                          label="Product Type"
                          onChange={(value) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, product_type: value } }))}
                          value={draft.shopify.product_type}
                        />

                        <EditableField
                          label="Vendor"
                          onChange={(value) => {
                            setPublishVendor(value);
                            setDraft((prev) => {
                              const nextAttrs = { ...prev.core.attributes };
                              nextAttrs.brand = value;
                              return { ...prev, core: { ...prev.core, attributes: nextAttrs } };
                            });
                          }}
                          value={publishVendor}
                        />

                        <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 transition focus-within:border-[#2b7cf5] focus-within:bg-white sm:col-span-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Collections</span>
                          <input
                            type="text"
                            placeholder="e.g. Home page, Shoes"
                            value={(draft.shopify.collections ?? []).join(", ")}
                            onChange={(e) => {
                              const vals = e.target.value.split(",").map(v => v.trim()).filter(Boolean);
                              setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, collections: vals } }));
                            }}
                            className="mt-1 w-full bg-transparent text-xs text-[#31415e] font-semibold outline-none border-0"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <EditableListField
                          helperText="One tag per line"
                          label="Tags"
                          onChange={(values) => setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, tags: values } }))}
                          values={draft.shopify.tags}
                          renderAsTags={true}
                        />
                      </div>
                    </div>

                    {/* Card 12: Theme Template */}
                    <div className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1f2c44] mb-3">Theme Template</h3>
                      <div className="flex flex-col rounded-xl border border-[#dbe2ee] bg-[#f8fbff] p-3 relative theme-select-container focus-within:border-[#2b7cf5] focus-within:bg-white max-w-md">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8093b2] mb-1">Theme Template</span>
                        <div
                          onClick={() => setIsThemeOpen(!isThemeOpen)}
                          className="flex items-center justify-between cursor-pointer py-0.5 mt-1 select-none"
                        >
                          <span className="text-xs font-semibold text-[#31415e]">
                            {draft.shopify.theme_template ?? "Default product"}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isThemeOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isThemeOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 max-h-56 overflow-y-auto">
                            <div className="space-y-0.5">
                              {["Default product", "Custom template"].map((t) => {
                                const isSelected = t === draft.shopify.theme_template;
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                      setDraft((prev) => ({ ...prev, shopify: { ...prev.shopify, theme_template: t } }));
                                      setIsThemeOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 flex items-center justify-between transition-all ${
                                      isSelected ? "bg-[#edf5ff] text-[#2b7cf5]" : "text-slate-700 hover:bg-slate-50 bg-transparent"
                                    }`}
                                  >
                                    <span>{t}</span>
                                    {isSelected && (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5 text-[#2b7cf5]">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>

            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1f2c44]">Publish Targets</h2>
                  <p className="text-sm text-[#7f92b1]">Upload the current product data to supported CommandCtr marketplace backends.</p>
                </div>
                <div className="rounded-full bg-[#eef5ff] px-3 py-2 text-xs font-semibold text-[#4d6284]">
                  Active market: {marketLabels[activeMarket]}
                </div>
              </div>

              {activeMarket !== "shopify" ? (
                <>
                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <EditableField
                      label="Vendor / Brand"
                      onChange={(value) => {
                        setPublishVendor(value);
                        setDraft((prev) => {
                          const nextAttributes = { ...prev.core.attributes };
                          if (value.trim()) {
                            nextAttributes.brand = value.trim();
                          } else {
                            delete nextAttributes.brand;
                          }

                          return {
                            ...prev,
                            core: {
                              ...prev.core,
                              attributes: nextAttributes,
                            },
                          };
                        });
                      }}
                      value={publishVendor}
                    />
                    <EditableField
                      label="Default SKU"
                      onChange={(value) => {
                        setPublishSku(value);
                        setDraft((prev) => {
                          const nextAttributes = { ...prev.core.attributes };
                          if (value.trim()) {
                            nextAttributes.sku = value.trim();
                          } else {
                            delete nextAttributes.sku;
                          }

                          return {
                            ...prev,
                            core: {
                              ...prev.core,
                              attributes: nextAttributes,
                            },
                          };
                        });
                      }}
                      value={publishSku}
                    />
                    <div className={`block rounded-2xl border p-3 transition-colors duration-300 ${publishFieldErrors.price ? "border-[#ef6b6b] bg-[#fff5f5]" : "border-[#dbe2ee] bg-[#f8fbff]"}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide transition-colors ${publishFieldErrors.price ? "text-[#cf4b4b]" : "text-[#8093b2]"}`}>Default Price</p>
                      {publishFieldErrors.price ? (
                        <p className="mt-1 text-xs font-semibold text-[#cf4b4b] flex items-center gap-1 animate-pulse">
                          <CircleAlert className="h-3.5 w-3.5 text-[#cf4b4b] shrink-0" />
                          Please fill the required publish fields: Default price.
                        </p>
                      ) : null}
                      <div className={`mt-2 flex h-9 w-full items-center rounded-lg border bg-white overflow-hidden transition-all ${publishFieldErrors.price ? "border-[#ef6b6b] focus-within:border-[#ef6b6b]" : "border-[#d4ddec] focus-within:border-[#97abd0]"}`}>
                        {/* Decrement Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(publishPrice) || 0;
                            const nextVal = Math.max(0, current - 1);
                            updatePublishPrice(nextVal.toFixed(2));
                          }}
                          className="flex h-full w-9 items-center justify-center text-[#64748b] hover:bg-slate-50 active:bg-slate-100 transition-colors border-r border-[#d4ddec] select-none font-bold text-base cursor-pointer"
                        >
                          &minus;
                        </button>

                        {/* Currency Symbol Prefix */}
                        <span className="pl-2.5 text-xs font-semibold text-[#8ea0bf] select-none">
                          {getCurrencySymbol(activeMarketPricing?.currency ?? getEstimatedPriceRange()?.currency ?? "USD")}
                        </span>

                        {/* Numeric Input */}
                        <input
                          className="h-full flex-1 bg-transparent pl-1 pr-3 text-center text-xs font-semibold text-[#31415e] outline-none"
                          onChange={(event) => {
                            const val = event.target.value.replace(/[^0-9.]/g, "");
                            const parts = val.split(".");
                            if (parts.length > 2) {
                              return;
                            }
                            updatePublishPrice(val);
                          }}
                          onBlur={() => {
                            const parsed = parseFloat(publishPrice);
                            if (!isNaN(parsed) && parsed >= 0) {
                              updatePublishPrice(parsed.toFixed(2));
                            }
                          }}
                          type="text"
                          value={publishPrice}
                        />

                        {/* Increment Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(publishPrice) || 0;
                            const nextVal = Math.max(0, current + 1);
                            updatePublishPrice(nextVal.toFixed(2));
                          }}
                          className="flex h-full w-9 items-center justify-center text-[#64748b] hover:bg-slate-50 active:bg-slate-100 transition-colors border-l border-[#d4ddec] select-none font-bold text-base cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="block rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Stock Count</p>
                      <div className="mt-2 flex h-9 w-full items-center rounded-lg border border-[#d4ddec] bg-white overflow-hidden transition-all focus-within:border-[#97abd0]">
                        {/* Decrement Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(publishStock, 10) || 0;
                            setPublishStock(Math.max(0, current - 1).toString());
                          }}
                          className="flex h-full w-9 items-center justify-center text-[#64748b] hover:bg-slate-50 active:bg-slate-100 transition-colors border-r border-[#d4ddec] select-none font-bold text-base cursor-pointer"
                        >
                          &minus;
                        </button>

                        {/* Numeric Input */}
                        <input
                          className="h-full flex-1 bg-transparent px-3 text-center text-xs font-semibold text-[#31415e] outline-none"
                          onChange={(event) => {
                            const val = event.target.value.replace(/[^0-9]/g, "");
                            setPublishStock(val || "0");
                          }}
                          type="text"
                          value={publishStock}
                        />

                        {/* Increment Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(publishStock, 10) || 0;
                            setPublishStock((current + 1).toString());
                          }}
                          className="flex h-full w-9 items-center justify-center text-[#64748b] hover:bg-slate-50 active:bg-slate-100 transition-colors border-l border-[#d4ddec] select-none font-bold text-base cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      {/* Primary Upload Status */}
                      <div className="relative rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-3" ref={statusDropdownRef}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Primary Upload Status</p>
                        <p className="mt-1 text-xs text-[#8ea0bf]">`Upload to Shopify` always creates or updates an ACTIVE Shopify product. `Upload as Draft` always forces DRAFT.</p>

                        {/* Dropdown Trigger */}
                        <button
                          type="button"
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className="mt-2 h-9 w-full rounded-lg border border-[#d4ddec] bg-white px-3 text-xs text-[#31415e] font-semibold outline-none transition-all flex items-center justify-between hover:border-[#b8c9e4] focus:border-[#97abd0] cursor-pointer"
                        >
                          <span>{publishStatus}</span>
                          <ChevronDown className={`h-3.5 w-3.5 text-[#8ea0bf] transition-transform duration-200 ${isStatusDropdownOpen ? "transform rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isStatusDropdownOpen && (
                          <div className="absolute left-3 right-3 z-30 mt-1.5 rounded-lg border border-[#e2e8f0] bg-white p-1.5 shadow-lg shadow-[#0f172a]/8 transition-all duration-150 animate-in fade-in slide-in-from-top-1">
                            {publishStatusOptions.map((status) => {
                              const isSelected = publishStatus === status;
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => {
                                    setPublishStatus(status);
                                    setIsStatusDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${isSelected
                                      ? "bg-[#edf5ff] text-[#1b2748]"
                                      : "text-[#4a5d7d] hover:bg-[#f8fbff] hover:text-[#172544]"
                                    }`}
                                >
                                  <span>{status}</span>
                                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#2b7cf5]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Publish to Online Store */}
                      <div className="relative rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-3" ref={onlineStoreDropdownRef}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Publish to Online Store</p>
                        <p className="mt-1 text-xs text-[#8ea0bf]">Controls storefront channel availability immediately upon upload.</p>

                        {/* Dropdown Trigger */}
                        <button
                          type="button"
                          onClick={() => setIsOnlineStoreDropdownOpen(!isOnlineStoreDropdownOpen)}
                          className="mt-2 h-9 w-full rounded-lg border border-[#d4ddec] bg-white px-3 text-xs text-[#31415e] font-semibold outline-none transition-all flex items-center justify-between hover:border-[#b8c9e4] focus:border-[#97abd0] cursor-pointer"
                        >
                          <span>{publishOnOnlineStore ? "Yes" : "No"}</span>
                          <ChevronDown className={`h-3.5 w-3.5 text-[#8ea0bf] transition-transform duration-200 ${isOnlineStoreDropdownOpen ? "transform rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isOnlineStoreDropdownOpen && (
                          <div className="absolute left-3 right-3 z-30 mt-1.5 rounded-lg border border-[#e2e8f0] bg-white p-1.5 shadow-lg shadow-[#0f172a]/8 transition-all duration-150 animate-in fade-in slide-in-from-top-1">
                            {["Yes", "No"].map((option) => {
                              const optionVal = option === "Yes";
                              const isSelected = publishOnOnlineStore === optionVal;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => {
                                    setPublishOnOnlineStore(optionVal);
                                    setIsOnlineStoreDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${isSelected
                                      ? "bg-[#edf5ff] text-[#1b2748]"
                                      : "text-[#4a5d7d] hover:bg-[#f8fbff] hover:text-[#172544]"
                                    }`}
                                >
                                  <span>{option}</span>
                                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#2b7cf5]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Track Inventory */}
                      <div className="relative rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-3" ref={trackInventoryDropdownRef}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Track Inventory</p>
                        <p className="mt-1 text-xs text-[#8ea0bf]">Controls whether Shopify tracks inventory levels for this product&apos;s variant.</p>

                        {/* Dropdown Trigger */}
                        <button
                          type="button"
                          onClick={() => setIsTrackInventoryDropdownOpen(!isTrackInventoryDropdownOpen)}
                          className="mt-2 h-9 w-full rounded-lg border border-[#d4ddec] bg-white px-3 text-xs text-[#31415e] font-semibold outline-none transition-all flex items-center justify-between hover:border-[#b8c9e4] focus:border-[#97abd0] cursor-pointer"
                        >
                          <span>{publishTrackInventory ? "Yes" : "No"}</span>
                          <ChevronDown className={`h-3.5 w-3.5 text-[#8ea0bf] transition-transform duration-200 ${isTrackInventoryDropdownOpen ? "transform rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isTrackInventoryDropdownOpen && (
                          <div className="absolute left-3 right-3 z-30 mt-1.5 rounded-lg border border-[#e2e8f0] bg-white p-1.5 shadow-lg shadow-[#0f172a]/8 transition-all duration-150 animate-in fade-in slide-in-from-top-1">
                            {["Yes", "No"].map((option) => {
                              const optionVal = option === "Yes";
                              const isSelected = publishTrackInventory === optionVal;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => {
                                    setPublishTrackInventory(optionVal);
                                    setIsTrackInventoryDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${isSelected
                                      ? "bg-[#edf5ff] text-[#1b2748]"
                                      : "text-[#4a5d7d] hover:bg-[#f8fbff] hover:text-[#172544]"
                                    }`}
                                >
                                  <span>{option}</span>
                                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#2b7cf5]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <EditableField
                      label="Publish Description"
                      helperText="Used as the default storefront description during publish."
                      multiline
                      onChange={setPublishDescription}
                      value={publishDescription}
                      className="h-full"
                    />
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-[#667a99]">
                      Publish sends basic Shopify product fields only. Images, inventory, SEO, and variants will be added later.
                    </div>
                    <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Suggested Price Range</p>
                      <p className="mt-1 text-xs text-[#8ea0bf]">
                        {getEstimatedPriceRange()
                          ? `Estimated from ${activeMarketPricing?.source_mode ?? "market research"} for ${marketLabels[activeMarket]}.`
                          : "Refresh marketplace pricing to calculate a recommended convenience range."}
                      </p>
                      {getEstimatedPriceRange() ? (
                        <>
                          <p className="mt-3 text-lg font-semibold text-[#31415e]">
                            {formatPriceValue(getEstimatedPriceRange()?.minimum, getEstimatedPriceRange()?.currency)} - {formatPriceValue(getEstimatedPriceRange()?.maximum, getEstimatedPriceRange()?.currency)}
                          </p>
                          <p className="mt-1 text-xs text-[#8ea0bf]">
                            Recommended: {formatPriceValue(getEstimatedPriceRange()?.recommended, getEstimatedPriceRange()?.currency)} | Source: {getEstimatedPriceRange()?.source}
                          </p>
                        </>
                      ) : (
                        <p className="mt-3 text-sm text-[#667a99]">No calculated range yet.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] px-4 py-4 text-xs font-semibold text-[#667a99]">
                  Shopify active: Control all pricing, inventory, descriptions, and storefront channels directly in the Marketplace Content tab above.
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Dynamic Price</p>
                    <p className="mt-1 text-xs text-[#6f82a3]">
                      The selected marketplace button controls which dynamic price and range are shown below.
                    </p>
                  </div>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#d5dcea] bg-white px-3.5 text-xs font-bold text-[#4a5d7d] hover:bg-[#edf2fb] hover:border-[#b8c9e4] shadow-xs active:scale-98 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    disabled={!hasPersistedProduct || isRefreshingPricing}
                    onClick={() => void analyzeDynamicPricing()}
                    type="button"
                  >
                    {isRefreshingPricing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                    {isRefreshingPricing ? "Refreshing..." : "Dynamic Price"}
                  </button>
                </div>

                {pricingSnapshot ? (
                  <>
                    {activeMarketPricing ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                        <button
                          type="button"
                          onClick={() => {
                            if (!syncPublishPriceFromPricing(activeMarketPricing)) {
                              void analyzeDynamicPricing();
                            }
                          }}
                          className="rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-left transition hover:border-[#b8c9e4] hover:bg-[#f8fbff] cursor-pointer"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">
                            {marketLabels[activeMarketPricing.marketplace]} Dynamic Price
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#31415e]">
                            {activeMarketPricing.analysis_summary}
                          </p>
                          <p className="mt-3 text-xs text-[#8ea0bf]">
                            {activeMarketPricing.market_signal || "Marketplace signal available after pricing refresh."}
                          </p>
                          {activeMarketPricing.similar_listings.length ? (
                            <div className="mt-3 space-y-2">
                              {activeMarketPricing.similar_listings.slice(0, 4).map((listing, index) => (
                                <div key={`${listing.source}-${listing.title}-${index}`} className="rounded-xl border border-[#edf2fb] bg-[#f8fbff] px-3 py-2">
                                  <p className="text-xs font-semibold text-[#31415e]">
                                    {listing.source}: {listing.title}
                                  </p>
                                  <p className="mt-1 text-[11px] text-[#6f82a3]">
                                    {typeof listing.price === "number" ? formatPriceValue(listing.price, listing.currency) : "Price unavailable"}
                                    {listing.url ? ` • ${listing.url}` : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!syncPublishPriceFromPricing(activeMarketPricing)) {
                              void analyzeDynamicPricing();
                            }
                          }}
                          className="rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-left transition hover:border-[#b8c9e4] hover:bg-[#f8fbff] cursor-pointer"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Range</p>
                          {activeMarketPricing.suggested_price_range ? (
                            <>
                              <p className="mt-2 text-sm font-semibold text-[#31415e]">
                                {formatPriceValue(activeMarketPricing.suggested_price_range.minimum, activeMarketPricing.suggested_price_range.currency)} - {formatPriceValue(activeMarketPricing.suggested_price_range.maximum, activeMarketPricing.suggested_price_range.currency)}
                              </p>
                              <p className="mt-1 text-xs text-[#8ea0bf]">
                                Recommended: {formatPriceValue(activeMarketPricing.suggested_price_range.recommended, activeMarketPricing.suggested_price_range.currency)}
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 text-sm font-semibold text-[#31415e]">Range not available yet</p>
                          )}
                          <p className="mt-3 text-xs text-[#8ea0bf]">
                            Search: {activeMarketPricing.search_queries[0] ?? "No search query recorded"}
                          </p>
                          <p className="mt-1 text-xs text-[#8ea0bf]">
                            Source: {getPricingModeLabel(activeMarketPricing.source_mode)}
                            {activeMarketPricing.comparable_count ? ` • ${activeMarketPricing.comparable_count} comparable listings` : ""}
                          </p>
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#dbe2ee] bg-white px-4 py-4 text-sm leading-6 text-[#667a99]">
                    Refresh marketplace pricing after generating the product draft to get estimated sell ranges for Amazon, eBay, Etsy, TikTok Shop, and Shopify.
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2] mb-2">Publish Target Channel</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "commandctr", label: "CommandCtr DB" },
                      { key: "amazon", label: "Amazon" },
                      { key: "ebay", label: "eBay" },
                      { key: "etsy", label: "Etsy" },
                      { key: "tiktok", label: "TikTok Shop" },
                      { key: "shopify", label: "Shopify" }
                    ].map((target) => {
                      const isSelected = selectedPublishShop === target.key;
                      const styles = publishTabStyles[target.key as PublishTarget];
                      return (
                        <button
                          key={target.key}
                          type="button"
                          onClick={() => {
                            setSelectedPublishShop(target.key as PublishTarget);
                            if (target.key !== "commandctr") {
                              const persistedId = productId ?? backendProductId;
                              const suffix = persistedId ? `&productId=${persistedId}` : "";
                              router.replace(`/products/add?market=${target.key}${suffix}`, { scroll: false });
                            }
                          }}
                          className={`group inline-flex h-9.5 items-center justify-center gap-2 rounded-lg px-4.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
                            isSelected ? styles.active : styles.inactive
                          }`}
                        >
                          {target.key === "amazon" && (
                            <AmazonLogo
                              className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 shrink-0 ${
                                isSelected ? "grayscale-0 opacity-100" : "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                              }`}
                              mode={isSelected ? "light" : "light"}
                            />
                          )}
                          {target.key === "ebay" && (
                            <EbayLogo
                              className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 shrink-0 ${
                                isSelected ? "grayscale-0 opacity-100" : "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                              }`}
                            />
                          )}
                          {target.key === "etsy" && (
                            <EtsyLogo
                              className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 shrink-0 ${
                                isSelected ? "grayscale-0 opacity-100" : "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                              }`}
                            />
                          )}
                          {target.key === "tiktok" && (
                            <TikTokLogo
                              className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 shrink-0 ${
                                isSelected ? "grayscale-0 opacity-100" : "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                              }`}
                              mode={isSelected ? "dark" : "light"}
                            />
                          )}
                          {target.key === "shopify" && (
                            <ShopifyLogo
                              className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 shrink-0 ${
                                isSelected ? "grayscale-0 opacity-100" : "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                              }`}
                            />
                          )}
                          {target.key === "commandctr" && (
                            <Boxes
                              className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 shrink-0 ${
                                isSelected ? "text-[#0284c7] opacity-100" : "text-[#8ea0bf] opacity-50 group-hover:opacity-100"
                              }`}
                            />
                          )}
                          <span>{target.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                  {selectedPublishShop === "commandctr" ? (
                    <button
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#172544] px-4 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-98 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      disabled={publishSubmitting.commandctr}
                      onClick={() => void saveLocalDBDraft()}
                      type="button"
                    >
                      {publishSubmitting.commandctr ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#35d3ce]" />
                      )}
                      Save to CommandCtr DB
                    </button>
                  ) : (
                    <button
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#172544] px-4 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-98 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      disabled={publishSubmitting[selectedPublishShop]}
                      onClick={() => {
                        if (selectedPublishShop === "shopify") {
                          void uploadToShopify("active");
                        } else if (selectedPublishShop === "ebay") {
                          void uploadToEbay("active");
                        } else {
                          void uploadToMockShop(selectedPublishShop, "active");
                        }
                      }}
                      type="button"
                    >
                      {publishSubmitting[selectedPublishShop] && shopifySubmitMode === "active" ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 text-[#35d3ce]" />
                      )}
                      {publishSubmitting[selectedPublishShop] && shopifySubmitMode === "active"
                        ? `Uploading to ${marketLabels[selectedPublishShop as MarketKey]}...`
                        : selectedPublishShop === "shopify" && shopifyProductId
                          ? "Update on Shopify"
                          : selectedPublishShop === "ebay"
                            ? "Publish to eBay Sandbox"
                          : `Upload to ${marketLabels[selectedPublishShop as MarketKey]}`}
                    </button>
                  )}

                  <button
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#172544] to-[#263c70] px-4 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-98 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    disabled={Object.values(publishSubmitting).some(Boolean)}
                    onClick={() => void uploadToAllShops()}
                    type="button"
                  >
                    {isUploadingToAll ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-[#35d3ce]" />
                    )}
                    Upload to All Shops
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] px-4 py-3 text-xs leading-6 text-[#667a99]">
                <p className="font-semibold mb-1">Upload Targets Information:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Shopify</strong>: Fully integrated upload and update support via active endpoints.</li>
                  <li><strong>CommandCtr DB</strong>: Saves the current product draft to the local SQLite database.</li>
                  <li><strong>eBay</strong>: Uses the real eBay Sandbox publish flow through the backend job worker.</li>
                  <li><strong>Amazon, TikTok Shop, Etsy</strong>: Simulated upload integration. Click to test output listings.</li>
                </ul>
              </div>
              {selectedPublishShop === "shopify" && shopifyProductId ? (
                <div className="mt-4 rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-xs leading-6 text-[#667a99]">
                  Current Shopify product ID:
                  <span className="ml-2 font-semibold text-[#31415e]">{shopifyProductId}</span>
                </div>
              ) : selectedPublishShop === "ebay" && backendProductId ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-xs leading-6 text-[#667a99]">
                    Current backend product ID:
                    <span className="ml-2 font-semibold text-[#31415e]">{backendProductId}</span>
                  </div>
                  {ebayListingId ? (
                    <div className="rounded-2xl border border-[#ccebdc] bg-[#eefbf4] px-4 py-3 text-xs leading-6 text-[#267a4f]">
                      <span className="font-semibold text-[#1f6b45]">eBay Sandbox listing:</span>
                      <a
                        href={getEbaySandboxListingUrl(ebayListingId) ?? "#"}
                        rel="noreferrer"
                        target="_blank"
                        className="ml-2 break-all font-semibold text-[#1f6b45] underline underline-offset-2 hover:text-[#155236]"
                      >
                        {getEbaySandboxListingUrl(ebayListingId)}
                      </a>
                      {ebayListingStatus ? (
                        <span className="ml-2 text-[#3f7d5b]">Status: {ebayListingStatus}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4 rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-xs leading-6 text-[#667a99]">
                {selectedPublishShop === "shopify" ? "Shopify" : marketLabels[selectedPublishShop as MarketKey] || "CommandCtr"} upload needs:
                <span className="font-semibold text-[#31415e]"> product title </span>
                and
                <span className="font-semibold text-[#31415e]"> default price</span>.
                Vendor, SKU, tags, product type, description, status, and the generated image are included when available.
              </div>
              {publishFieldErrors.title || publishFieldErrors.price ? (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#f3c1c1] bg-[#fff5f5] px-4 py-3 text-sm text-[#b24646]">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Fill the highlighted required fields before creating the {selectedPublishShop === "shopify" ? "Shopify" : marketLabels[selectedPublishShop as MarketKey] || "CommandCtr"} product.</p>
                </div>
              ) : null}
              {shopifyPublishMessage ? (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${Object.values(publishSubmitting).some(Boolean)
                      ? "border border-[#cde4ff] bg-[#f3f8ff] text-[#355b91]"
                      : shopifyPublishMessage.toLowerCase().includes("success") || shopifyPublishMessage.toLowerCase().includes("published to ebay sandbox")
                        ? "border border-[#ccebdc] bg-[#eefbf4] text-[#267a4f]"
                        : "border border-[#dbe2ee] bg-[#f8fbff] text-[#546884]"
                    }`}
                >
                  {shopifyPublishMessage}
                </div>
              ) : null}
            </article>

            {/* Marketplace Variants removed */}
          </div>

          <aside className="space-y-5 xl:pr-2">
            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <div className="flex items-center justify-between gap-3 border-b border-[#eef2f6] pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eefaf7] text-[#2dc7c3]">
                    <ImageIcon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1f2c44]">Generated Images</h2>
                    <p className="text-xs text-[#7f92b1]">Upload custom files or generate marketplace-ready views.</p>
                  </div>
                </div>
              </div>

              {/* Channel Filter Dropdown */}
              <div className="relative mt-3 z-20" ref={filterDropdownRef}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2] mb-1.5">View Channel / Card</p>
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className={`h-9.5 w-full rounded-lg border px-3 text-xs font-semibold outline-none transition-all flex items-center justify-between cursor-pointer ${
                    dropdownTriggerStyles[selectedFilterKey] || "border-[#d4ddec] bg-[#f8fbff] text-[#31415e]"
                  } hover:border-[#b8c9e4]`}
                >
                  <span className="flex items-center gap-2.5">
                    {(() => {
                      const activeOpt = filterOptions.find(opt => opt.key === selectedFilterKey);
                      if (activeOpt) {
                        const IconComponent = activeOpt.icon;
                        const isMarket = ["amazon", "ebay", "etsy", "tiktok", "shopify"].includes(activeOpt.key);
                        return (
                          <IconComponent
                            className={`h-4 w-4 transition-transform duration-200 shrink-0 ${isMarket ? "" : "text-[#2b7cf5]"}`}
                          />
                        );
                      }
                      return <Filter className="h-4 w-4 text-[#8ea0bf] shrink-0" />;
                    })()}
                    {filterOptions.find(opt => opt.key === selectedFilterKey)?.label}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#8ea0bf] transition-transform duration-200 ${isFilterDropdownOpen ? "transform rotate-180" : ""}`} />
                </button>

                {isFilterDropdownOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-[#e2e8f0] bg-white p-1.5 shadow-lg shadow-[#0f172a]/8 transition-all duration-150 animate-in fade-in slide-in-from-top-1">
                    {filterOptions.map((opt) => {
                      const isSelected = selectedFilterKey === opt.key;
                      const IconComponent = opt.icon;
                      const isMarket = ["amazon", "ebay", "etsy", "tiktok", "shopify"].includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setSelectedFilterKey(opt.key);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? dropdownSelectedStyles[opt.key] || "bg-[#edf5ff] text-[#1b2748]"
                              : "text-[#4a5d7d] hover:bg-[#f8fbff] hover:text-[#172544]"
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <IconComponent
                              className={`h-4 w-4 transition-colors duration-150 shrink-0 ${
                                isMarket ? "" : isSelected ? "text-[#2b7cf5]" : "text-[#8ea0bf]"
                              }`}
                            />
                            {opt.label}
                          </span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-[#2b7cf5]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Global Actions Area */}
              <div className="flex gap-2.5 mt-3 border-b border-[#eef2f6] pb-3.5">
                <button
                  className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#172544] to-[#263c70] px-4 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-98 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  disabled={!canGenerateAll || Object.values(marketImageGenerating).some(Boolean) || isGenerating}
                  onClick={() => void generateAllMarketplaceImages()}
                  type="button"
                >
                  {Object.values(marketImageGenerating).some(Boolean) ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#35d3ce]" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-[#35d3ce]" />
                  )}
                  {Object.values(marketImageGenerating).some(Boolean) ? "Generating..." : "Generate All"}
                </button>
                <button
                  className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dbe2ee] bg-white px-4 text-xs font-bold text-[#31415e] shadow-xs hover:bg-[#f8fbff] active:scale-98 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  disabled={!imageCards.some(card => card.image?.absolute_path || card.image?.relative_path)}
                  onClick={() => void downloadAllImages()}
                  type="button"
                >
                  <Download className="h-3.5 w-3.5 text-[#4a5d7d]" />
                  Download All
                </button>
              </div>

              {/* Hidden file input for manual card uploads */}
              <input
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={onManualUploadSelected}
                ref={manualUploadInputRef}
                type="file"
              />

              {/* Reusable Platform Cards */}
              <div className="mt-5 space-y-5">
                {imageCards
                  .filter(({ key }) => selectedFilterKey === "all" || key === selectedFilterKey)
                  .map(({ key, label, image, note }) => {
                    const hasPath = Boolean(image?.absolute_path || image?.relative_path);
                    const isUploading = Boolean(imageUploadingMap[key]);
                    const isGeneratingThis = key !== "source" && key !== "transparent_cutout" && Boolean(marketImageGenerating[key as MarketKey]);
                    const isBusy = isUploading || isGeneratingThis || (key === "transparent_cutout" && isUploadingSourceImage);

                    const rawErrors = image?.validation?.errors ?? [];
                    const validationErrors = rawErrors.filter((err) => {
                      if (err === "No source image uploaded yet." && (hasPath || (key === "source" && selectedImagePreviewUrl))) {
                        return false;
                      }
                      return true;
                    });

                    // Status resolving
                    let statusText = "Not Generated";
                    let badgeStyles = "bg-slate-50 text-slate-600 border-slate-200";

                    if (isUploading) {
                      statusText = "Uploading...";
                      badgeStyles = "bg-blue-50 text-blue-600 border-blue-200 animate-pulse";
                    } else if (isGeneratingThis) {
                      statusText = "Generating...";
                      badgeStyles = "bg-purple-50 text-purple-600 border-purple-200 animate-pulse";
                    } else if (hasPath) {
                      if (validationErrors.length > 0) {
                        statusText = "Failed";
                        badgeStyles = "bg-rose-50 text-rose-700 border-rose-200";
                      } else if (image?.validation?.passed) {
                        statusText = "Ready";
                        badgeStyles = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      } else {
                        statusText = "Review";
                        badgeStyles = "bg-amber-50 text-amber-700 border-amber-200";
                      }
                    } else if (key === "source" && selectedImagePreviewUrl) {
                      statusText = "Selected";
                      badgeStyles = "bg-indigo-50 text-indigo-700 border-indigo-200";
                    }

                    const isDraggingOver = draggingOverCardKey === key;
                    const filename = `${(getPublishTitle() || "product").replace(/\s+/g, "_").toLowerCase()}_${key}.png`;

                    return (
                      <div
                        className={`group relative rounded-2xl border bg-white p-4 transition-all duration-300 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] ${isDraggingOver
                            ? "border-indigo-500 ring-2 ring-indigo-50"
                            : "border-[#e2e8f0] hover:border-[#cbd5e1] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]"
                          }`}
                        key={key}
                        onDragLeave={() => setDraggingOverCardKey(null)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDraggingOverCardKey(key);
                        }}
                        onDrop={(e) => {
                          setDraggingOverCardKey(null);
                          handleCardDrop(e, key);
                        }}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="text-sm font-semibold text-[#1e293b] flex items-center gap-1.5">
                              {label}
                            </h3>
                            <span className="text-[10px] font-mono tracking-wider text-[#94a3b8] uppercase">
                              {key === "source" && selectedImagePreviewUrl && !hasPath
                                ? "local_selection"
                                : image?.generation_mode ?? "inactive_slot"}
                            </span>
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold transition-all duration-300 ${badgeStyles}`}>
                            {statusText}
                          </span>
                        </div>

                        {/* Preview Box Area */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-50 border border-dashed border-[#e2e8f0] transition-all duration-300 flex items-center justify-center">
                          {isBusy ? (
                            <div className="absolute inset-0 bg-white/85 z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-xs">
                              <LoaderCircle className="h-8 w-8 animate-spin text-[#172544]" />
                              <p className="text-xs font-semibold text-[#334155] animate-pulse">
                                {isUploading ? "Uploading file..." : "Generating image..."}
                              </p>
                            </div>
                          ) : null}

                          {hasPath ? (
                            <div className="relative w-full h-full">
                              <ProductPreview
                                alt={label}
                                backgroundLabel={image?.validation?.expected_background ?? "Image"}
                                image={image}
                                previewSrc={null}
                              />
                            </div>
                          ) : key === "source" && selectedImagePreviewUrl ? (
                            <div className="relative w-full h-full">
                              <ProductPreview
                                alt={label}
                                backgroundLabel="source"
                                image={null}
                                previewSrc={selectedImagePreviewUrl}
                              />
                            </div>
                          ) : (
                            // Drag and Drop Empty State
                            <div
                              className={`flex flex-col items-center justify-center p-6 text-center w-full h-full select-none cursor-pointer transition-all duration-200 ${isDraggingOver ? "bg-indigo-50/50" : "hover:bg-slate-100/30"
                                }`}
                              onClick={() => {
                                setActiveUploadCardKey(key);
                                manualUploadInputRef.current?.click();
                              }}
                            >
                              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#475569] group-hover:scale-110 transition-transform duration-300">
                                <Upload className="h-5 w-5" />
                              </div>
                              <p className="text-xs font-semibold text-[#334155]">
                                {isDraggingOver ? "Drop image here" : "Upload or drop image"}
                              </p>
                              <p className="mt-1 text-[10px] text-[#94a3b8]">
                                PNG, JPG, WEBP • Max 10MB
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Technical/Validation Meta Deck */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-medium text-[#64748b]">
                          <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-bold">Template BG</span>
                            <span className="text-[#334155] truncate font-semibold mt-0.5">
                              {key === "source" && selectedImagePreviewUrl && !hasPath
                                ? "selected local"
                                : image?.validation?.expected_background ?? "unknown"}
                            </span>
                          </div>
                          <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-bold">Size & Format</span>
                            <span className="text-[#334155] truncate font-semibold mt-0.5">
                              {image?.validation?.width && image?.validation?.height
                                ? `${image.validation.width} x ${image.validation.height}`
                                : "Not generated"}
                            </span>
                          </div>
                        </div>

                        {/* Card Control Bar */}
                        <div className="mt-3 flex flex-col gap-2">
                          {/* Row 1: Primary Actions */}
                          <div className="flex gap-2 w-full">
                            {/* Generate/Regenerate for markets */}
                            {key !== "source" && !isImportMode ? (
                              <button
                                className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#d5dcea] bg-white text-xs font-bold text-[#4a5d7d] hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200 px-3 whitespace-nowrap"
                                disabled={isBusy || isUploadingSourceImage || isGenerating}
                                onClick={() => {
                                  if (key === "transparent_cutout") {
                                    void uploadProductSourceImage();
                                  } else {
                                    void regenerateMarketplaceImage(key as MarketKey);
                                  }
                                }}
                                type="button"
                              >
                                <RefreshCcw className={`h-3.5 w-3.5 ${(isGeneratingThis || (key === "transparent_cutout" && isUploadingSourceImage)) ? "animate-spin" : ""}`} />
                                {hasPath ? "Regenerate Image" : "Generate Image"}
                              </button>
                            ) : selectedImage ? (
                              <button
                                className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#172544] text-xs font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200 px-3 whitespace-nowrap"
                                disabled={isUploadingSourceImage || isGenerating}
                                onClick={() => void uploadProductSourceImage()}
                                type="button"
                              >
                                {isUploadingSourceImage ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 text-[#35d3ce]" />}
                                Create Cutout
                              </button>
                            ) : null}

                            {/* Direct manual upload */}
                            <button
                              className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#d5dcea] bg-white px-3 text-xs font-bold text-[#4a5d7d] hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200 whitespace-nowrap"
                              disabled={isBusy}
                              onClick={() => {
                                setActiveUploadCardKey(key);
                                manualUploadInputRef.current?.click();
                              }}
                              title={hasPath ? "Replace Custom Image" : "Upload Custom Image"}
                              type="button"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              {hasPath ? "Replace" : "Upload"}
                            </button>
                          </div>

                          {/* Row 2: Secondary/Utility Actions */}
                          {hasPath ? (
                            <div className="flex gap-2 w-full">
                              <button
                                className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#d5dcea] bg-white px-3 text-xs font-bold text-[#4a5d7d] hover:bg-[#f8fbff] hover:text-[#172544] transition-all duration-200"
                                onClick={() => void downloadMarketplaceImage(key, filename)}
                                title="Download Variant"
                                type="button"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download</span>
                              </button>
                              <button
                                className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all duration-200"
                                onClick={() => void clearMarketplaceImage(key)}
                                title="Clear Image"
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {/* Display warning or file size validation details */}
                        {image?.validation?.file_size_bytes ? (
                          <p className="mt-2 text-[10px] text-[#94a3b8] flex items-center justify-between">
                            <span>File size: {formatBytes(image.validation.file_size_bytes)}</span>
                            {image.validation.mime_type ? (
                              <span className="font-semibold">{image.validation.mime_type}</span>
                            ) : null}
                          </p>
                        ) : null}

                        {validationErrors.length > 0 ? (
                          <div className="mt-2 rounded-lg bg-rose-50 border border-rose-100 p-2 text-[10px] text-rose-700 flex items-start gap-1">
                            <CircleAlert className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="leading-normal">{validationErrors[0]}</span>
                          </div>
                        ) : note ? (
                          <p className="mt-2 text-[10px] text-[#94a3b8] leading-normal">{note}</p>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </article>



          </aside>
        </div>
      </div>

      {isAddLocationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081224]/55 px-4 py-6 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-default" onClick={() => setIsAddLocationOpen(false)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-[#d7dfeb] bg-white p-6 shadow-[0_32px_90px_-48px_rgba(15,29,56,0.95)] animate-in zoom-in-95 duration-200 text-[#1d2a43]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#87a0c2]">Shopify Settings</p>
                <h2 className="mt-2 text-xl font-bold text-[#1d2a43]">Add Stock Location</h2>
                <p className="mt-1 text-xs text-[#6c7e9f] leading-relaxed">
                  Enter the name of a new physical store or warehouse to track inventory quantities.
                </p>
              </div>
              <button
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d5dcea] text-[#5a6d8d] transition hover:bg-[#f5f8fc] cursor-pointer"
                onClick={() => setIsAddLocationOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <label className="block rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4 cursor-pointer">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8093b2] select-none">Location Name</span>
                <input
                  autoFocus
                  className="mt-2 h-11 w-full rounded-xl border border-[#d4ddec] bg-white px-3 text-sm text-[#31415e] outline-none transition focus:border-[#2b7cf5] focus:ring-1 focus:ring-[#2b7cf5]"
                  onChange={(e) => {
                    setNewLocationName(e.target.value);
                    if (locationError) setLocationError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddLocationSubmit();
                    }
                  }}
                  placeholder="e.g. London Retail Store"
                  type="text"
                  value={newLocationName}
                />
              </label>

              {locationError && (
                <div className="mt-3 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-200">
                  <CircleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{locationError}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-xs font-semibold text-[#4a5d7d] hover:bg-[#f5f8fc] transition cursor-pointer"
                onClick={() => setIsAddLocationOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#172544] hover:bg-[#21325c] px-5 text-xs font-semibold text-white transition cursor-pointer"
                onClick={handleAddLocationSubmit}
                type="button"
              >
                Add Location
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
