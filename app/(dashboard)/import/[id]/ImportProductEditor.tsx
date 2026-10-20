"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Image as ImageIcon, Loader2, RefreshCcw, Save, Sparkles, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type MarketKey = "amazon" | "ebay" | "etsy" | "tiktok" | "shopify";

type ApiImageVariant = {
  marketplace: string;
  absolute_path: string;
  relative_path: string;
  validation: { passed: boolean; expected_background: string; errors: string[] };
};

type ApiProduct = {
  core: {
    normalized_title: string;
    category: string;
    product_type: string;
    product_summary: string;
    features: string[];
    attributes: Record<string, string>;
    source_title: string;
  };
  amazon: { title: string; bullet_points: string[]; description: string };
  ebay: { title: string; condition: string; listing_notes: string; item_specifics: Record<string, string> };
  etsy: { title: string; description: string; tags: string[]; materials: string[] };
  tiktok: { title: string; social_description: string; hashtags: string[] };
  shopify: { title: string; body_html: string; product_type: string; seo_title: string; seo_description: string; tags: string[] };
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

type ImportRecord = {
  id: string;
  status: string;
  linked_product_id: string | null;
  primary_record_id?: string | null;
  duplicate_count?: number;
  can_upload_as_product?: boolean;
  missing_fields: string[];
  notes: string[];
  product: ApiProduct;
};

const marketLabels: Record<MarketKey, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  etsy: "Etsy",
  tiktok: "TikTok Shop",
  shopify: "Shopify",
};

function imageUrlFor(path: string) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path;
}

export default function ImportProductEditor({ importId, activeMarket, readOnly = false }: { importId: string; activeMarket: MarketKey; readOnly?: boolean }) {
  const sourceImageInputRef = useRef<HTMLInputElement>(null);
  const [record, setRecord] = useState<ImportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [marketBusy, setMarketBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [message, setMessage] = useState("Loading imported product...");

  useEffect(() => {
    let active = true;
    void fetch(`/api/product-ai/imports/products/${importId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorBody?.detail ?? "Could not load import record.");
        }
        return response.json() as Promise<ImportRecord>;
      })
      .then((payload) => {
        if (active) {
          setRecord(payload);
          setMessage(readOnly ? "Imported product loaded." : "Imported product loaded. Save changes here, then upload it as a real product when ready.");
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Could not load import record.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [importId, readOnly]);

  const previewImages = useMemo(() => {
    if (!record) return [];
    return [
      { key: "source", label: "Source Upload", image: record.product.images.source },
      { key: "transparent_cutout", label: "Transparent Cutout", image: record.product.images.transparent_cutout },
      { key: "amazon", label: "Amazon", image: record.product.images.amazon },
      { key: "ebay", label: "eBay", image: record.product.images.ebay },
      { key: "etsy", label: "Etsy", image: record.product.images.etsy },
      { key: "tiktok", label: "TikTok", image: record.product.images.tiktok },
      { key: "shopify", label: "Shopify", image: record.product.images.shopify },
    ];
  }, [record]);

  const hasDuplicateBlock = Boolean(record?.primary_record_id) || (record?.duplicate_count ?? 0) > 0;
  const hasMissingRequiredFields = Boolean(record && record.missing_fields.length > 0);

  if (!record && !isLoading) {
    return <section className="px-4 py-5 md:px-8 md:py-8"><div className="rounded-2xl border border-[#dbe2ee] bg-white p-6 text-sm text-[#546884]">{message}</div></section>;
  }

  async function saveImport() {
    if (!record) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/product-ai/imports/products/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          core: record.product.core,
          amazon: record.product.amazon,
          ebay: record.product.ebay,
          etsy: record.product.etsy,
          tiktok: record.product.tiktok,
          shopify: record.product.shopify,
        }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not save import record.");
      }
      setRecord((await response.json()) as ImportRecord);
      setMessage("Imported product saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save import record.");
    } finally {
      setIsSaving(false);
    }
  }

  async function optimizeAll() {
    if (!record) return;
    setIsOptimizing(true);
    try {
      const response = await fetch(`/api/product-ai/imports/products/${record.id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaces: ["amazon", "ebay", "etsy", "tiktok", "shopify"], optimize_core: true }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not optimize imported product.");
      }
      setRecord((await response.json()) as ImportRecord);
      setMessage("Imported product optimized and saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not optimize imported product.");
    } finally {
      setIsOptimizing(false);
    }
  }

  async function optimizeMarket() {
    if (!record) return;
    setMarketBusy(true);
    try {
      const response = await fetch(`/api/product-ai/imports/products/${record.id}/marketplaces/${activeMarket}/optimize`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not optimize marketplace content.");
      }
      setRecord((await response.json()) as ImportRecord);
      setMessage(`${activeMarket} content optimized and saved to the import record.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not optimize marketplace content.");
    } finally {
      setMarketBusy(false);
    }
  }

  async function regenerateMarketImage() {
    if (!record) return;
    setMarketBusy(true);
    try {
      const response = await fetch(`/api/product-ai/imports/products/${record.id}/marketplaces/${activeMarket}/regenerate`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not regenerate marketplace image.");
      }
      setRecord((await response.json()) as ImportRecord);
      setMessage(`${activeMarket} data and image regenerated and saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not regenerate marketplace image.");
    } finally {
      setMarketBusy(false);
    }
  }

  async function uploadAsProduct() {
    if (!record) return;
    setIsUploading(true);
    try {
      const response = await fetch(`/api/product-ai/imports/products/${record.id}/upload-as-product`, { method: "POST" });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not upload as product.");
      }
      const payload = (await response.json()) as { import_record: ImportRecord; product_record: { id: string } };
      setRecord(payload.import_record);
      setMessage(`Uploaded as product. Product ID ${payload.product_record.id.slice(0, 12)} is now available on the products page.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload as product.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSourceImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !record) {
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setIsUploadingImage(true);

    try {
      const response = await fetch(`/api/product-ai/imports/products/${record.id}/source-image`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not upload source image.");
      }
      setRecord((await response.json()) as ImportRecord);
      setMessage("Source image uploaded and saved to the import record.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload source image.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-5">
        <div className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <p className="text-sm font-semibold text-[#a9b8d6]">Import Products &gt; {readOnly ? "View Imported Product" : "Edit Imported Product"}</p>
          <h1 className="mt-2 text-2xl font-semibold">{record?.product.core.normalized_title || "Imported Product"}</h1>
          <p className="mt-1 text-sm text-[#a9b8d6]">{message}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {readOnly ? (
            <Link className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d]" href={`/import/${importId}?market=${activeMarket}`}>
              <Save className="h-4 w-4" /> Open Edit Mode
            </Link>
          ) : null}
          {!readOnly ? (
          <>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d] disabled:opacity-60"
            disabled={isUploadingImage}
            onClick={() => sourceImageInputRef.current?.click()}
            type="button"
          >
            {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload Source Image
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d] disabled:opacity-60" disabled={isSaving} onClick={() => void saveImport()} type="button">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Import Record
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#35d3ce] px-4 text-sm font-semibold text-[#153c53] disabled:opacity-60" disabled={isOptimizing} onClick={() => void optimizeAll()} type="button">
            {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Optimize All
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d] disabled:opacity-60" disabled={marketBusy} onClick={() => void optimizeMarket()} type="button">
            {marketBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Optimize {activeMarket}
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d] disabled:opacity-60" disabled={marketBusy} onClick={() => void regenerateMarketImage()} type="button">
            {marketBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} Regenerate {activeMarket} Image
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#172544] px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isUploading || !record?.can_upload_as_product} onClick={() => void uploadAsProduct()} type="button">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {record?.can_upload_as_product ? "Upload as Product" : hasDuplicateBlock ? "Resolve Duplicates First" : "Complete Required Fields"}
          </button>
          {!record?.can_upload_as_product && record && hasDuplicateBlock ? (
            <Link className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#f4d7a2] bg-[#fff5df] px-4 text-sm font-semibold text-[#f4a632]" href={`/import/resolve/${record.id}`}>
              Resolve Duplicate Group
            </Link>
          ) : null}
          {!record?.can_upload_as_product && record && !hasDuplicateBlock && hasMissingRequiredFields ? (
            <span className="inline-flex h-11 items-center rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d]">
              Add a product title and source image to continue
            </span>
          ) : null}
          </>
          ) : null}
          {record?.linked_product_id ? (
            <Link className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d]" href={`/products/add?productId=${record.linked_product_id}`}>
              <CheckCircle2 className="h-4 w-4" /> Open Uploaded Product
            </Link>
          ) : null}
        </div>

        {record ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_380px]">
            <input
              accept="image/*"
              className="hidden"
              onChange={handleSourceImageChange}
              ref={sourceImageInputRef}
              type="file"
            />
            <div className="space-y-5">
              <Panel title="Core Product Data">
                  <Input disabled={readOnly} label="Normalized Title" value={record.product.core.normalized_title} onChange={(value) => setRecord({ ...record, product: { ...record.product, core: { ...record.product.core, normalized_title: value } } })} />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Input disabled={readOnly} label="Category" value={record.product.core.category} onChange={(value) => setRecord({ ...record, product: { ...record.product, core: { ...record.product.core, category: value } } })} />
                    <Input disabled={readOnly} label="Product Type" value={record.product.core.product_type} onChange={(value) => setRecord({ ...record, product: { ...record.product, core: { ...record.product.core, product_type: value } } })} />
                  </div>
                  <TextArea disabled={readOnly} label="Product Summary" value={record.product.core.product_summary} onChange={(value) => setRecord({ ...record, product: { ...record.product, core: { ...record.product.core, product_summary: value } } })} />
                  <TextArea disabled={readOnly} label="Structured Attributes" value={Object.entries(record.product.core.attributes).map(([key, value]) => `${key}: ${value}`).join("\n")} onChange={(value) => setRecord({ ...record, product: { ...record.product, core: { ...record.product.core, attributes: toAttributes(value) } } })} />
              </Panel>

              <Panel title="Marketplace Content">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(["amazon", "ebay", "etsy", "tiktok", "shopify"] as MarketKey[]).map((market) => (
                      <Link
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${market === activeMarket ? "bg-[#1b2748] text-white" : "bg-[#eef5ff] text-[#4d6284]"}`}
                        href={`/import/${importId}?market=${market}`}
                        key={market}
                        scroll={false}
                      >
                        {marketLabels[market]}
                      </Link>
                    ))}
                  </div>
                  {!readOnly ? (
                  <button
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d] disabled:opacity-60"
                    disabled={marketBusy}
                    onClick={() => void optimizeMarket()}
                    type="button"
                  >
                    {marketBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Optimize {marketLabels[activeMarket]}
                  </button>
                  ) : null}
                </div>

                <p className="mt-3 text-sm text-[#8093b2]">
                  {readOnly ? "Review per-marketplace content for this imported product." : "You can edit per-marketplace content and optimize the active marketplace SEO data from the backend."}
                </p>

                <div className="mt-5 grid gap-4">
                  {activeMarket === "amazon" ? (
                    <>
                      <Input disabled={readOnly} label="Title" value={record.product.amazon.title} onChange={(value) => setRecord({ ...record, product: { ...record.product, amazon: { ...record.product.amazon, title: value } } })} />
                      <TextArea disabled={readOnly} label="Description" value={record.product.amazon.description} onChange={(value) => setRecord({ ...record, product: { ...record.product, amazon: { ...record.product.amazon, description: value } } })} />
                      <TextArea disabled={readOnly} label="Bullet Points" value={record.product.amazon.bullet_points.join("\n")} onChange={(value) => setRecord({ ...record, product: { ...record.product, amazon: { ...record.product.amazon, bullet_points: toList(value) } } })} />
                    </>
                  ) : null}
                  {activeMarket === "ebay" ? (
                    <>
                      <Input disabled={readOnly} label="Title" value={record.product.ebay.title} onChange={(value) => setRecord({ ...record, product: { ...record.product, ebay: { ...record.product.ebay, title: value } } })} />
                      <Input disabled={readOnly} label="Condition" value={record.product.ebay.condition} onChange={(value) => setRecord({ ...record, product: { ...record.product, ebay: { ...record.product.ebay, condition: value } } })} />
                      <TextArea disabled={readOnly} label="Listing Notes" value={record.product.ebay.listing_notes} onChange={(value) => setRecord({ ...record, product: { ...record.product, ebay: { ...record.product.ebay, listing_notes: value } } })} />
                    </>
                  ) : null}
                  {activeMarket === "etsy" ? (
                    <>
                      <Input disabled={readOnly} label="Title" value={record.product.etsy.title} onChange={(value) => setRecord({ ...record, product: { ...record.product, etsy: { ...record.product.etsy, title: value } } })} />
                      <TextArea disabled={readOnly} label="Description" value={record.product.etsy.description} onChange={(value) => setRecord({ ...record, product: { ...record.product, etsy: { ...record.product.etsy, description: value } } })} />
                    </>
                  ) : null}
                  {activeMarket === "tiktok" ? (
                    <>
                      <Input disabled={readOnly} label="Title" value={record.product.tiktok.title} onChange={(value) => setRecord({ ...record, product: { ...record.product, tiktok: { ...record.product.tiktok, title: value } } })} />
                      <TextArea disabled={readOnly} label="Social Description" value={record.product.tiktok.social_description} onChange={(value) => setRecord({ ...record, product: { ...record.product, tiktok: { ...record.product.tiktok, social_description: value } } })} />
                    </>
                  ) : null}
                  {activeMarket === "shopify" ? (
                    <>
                      <Input disabled={readOnly} label="Title" value={record.product.shopify.title} onChange={(value) => setRecord({ ...record, product: { ...record.product, shopify: { ...record.product.shopify, title: value } } })} />
                      <Input disabled={readOnly} label="Product Type" value={record.product.shopify.product_type} onChange={(value) => setRecord({ ...record, product: { ...record.product, shopify: { ...record.product.shopify, product_type: value } } })} />
                      <Input disabled={readOnly} label="SEO Title" value={record.product.shopify.seo_title} onChange={(value) => setRecord({ ...record, product: { ...record.product, shopify: { ...record.product.shopify, seo_title: value } } })} />
                      <TextArea disabled={readOnly} label="SEO Description" value={record.product.shopify.seo_description} onChange={(value) => setRecord({ ...record, product: { ...record.product, shopify: { ...record.product.shopify, seo_description: value } } })} />
                    </>
                  ) : null}
                </div>
              </Panel>
            </div>

            <Panel title="Images">
              <div className="space-y-4">
                {previewImages.map((item) => {
                  const src = item.image ? imageUrlFor(item.image.absolute_path) : null;
                  return (
                    <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4" key={item.key}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#20314d]">{item.label}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.image?.validation.passed ? "bg-[#def7ea] text-[#2ba66d]" : "bg-[#fff2d6] text-[#f4a632]"}`}>
                          {item.image?.validation.passed ? "Ready" : "Pending"}
                        </span>
                      </div>
                      <div className="mt-3 flex h-48 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d3dbe8] bg-white">
                        {src ? (
                          <Image alt={item.label} className="h-full w-full object-contain" height={240} src={src} unoptimized width={240} />
                        ) : (
                          <p className="px-6 text-center text-sm text-[#8ea0bf]">No image generated yet.</p>
                        )}
                      </div>
                      {item.key === "source" && !readOnly ? (
                        <button
                          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-3 text-xs font-semibold text-[#4a5d7d] disabled:opacity-60"
                          disabled={isUploadingImage}
                          onClick={() => sourceImageInputRef.current?.click()}
                          type="button"
                        >
                          {isUploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {src ? "Replace Source Image" : "Upload Source Image"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#dbe2ee] bg-white p-6 text-sm text-[#546884]">{isLoading ? "Loading..." : message}</div>
        )}
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
      <h2 className="text-lg font-semibold text-[#1f2c44]">{title}</h2>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function Input({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">{label}</p>
      <input className="mt-3 h-11 w-full rounded-xl border border-[#d4ddec] bg-white px-3 text-sm text-[#31415e] outline-none disabled:bg-[#eef3fb] disabled:text-[#667a97]" disabled={disabled} readOnly={disabled} type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="mt-4 block rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">{label}</p>
      <textarea className="mt-3 min-h-36 w-full rounded-xl border border-[#d4ddec] bg-white px-3 py-3 text-sm leading-6 text-[#31415e] outline-none disabled:bg-[#eef3fb] disabled:text-[#667a97]" disabled={disabled} readOnly={disabled} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function toList(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function toAttributes(value: string) {
  return value.split("\n").reduce<Record<string, string>>((acc, line) => {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) return acc;
    acc[key.trim()] = rest.join(":").trim();
    return acc;
  }, {});
}
