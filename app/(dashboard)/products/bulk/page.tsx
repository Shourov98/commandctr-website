"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, XCircle } from "lucide-react";

import { ApiClientError } from "@/lib/auth";
import { shopifyProductsApi, type ShopifyBulkJob, type ShopifyBulkUploadRow } from "@/lib/shopify-products";

const CSV_HEADERS = ["title", "description", "vendor", "product_type", "tags", "handle", "status", "option_name", "option_value", "price", "sku", "barcode"];

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else { quoted = !quoted; }
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); if (row.some((value) => value.trim())) rows.push(row); row = []; field = "";
    } else { field += char; }
  }
  row.push(field); if (row.some((value) => value.trim())) rows.push(row);
  if (!rows.length) throw new Error("The CSV file is empty.");
  const headers = rows[0].map((value) => value.trim().toLowerCase());
  if (!headers.includes("title")) throw new Error("The CSV must contain a title column.");
  return rows.slice(1).map((values) => {
    const source = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
    return {
      title: source.title,
      description: source.description || undefined,
      vendor: source.vendor || undefined,
      productType: source.product_type || undefined,
      tags: source.tags ? source.tags.split("|").map((tag) => tag.trim()).filter(Boolean) : [],
      handle: source.handle || undefined,
      status: source.status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "DRAFT",
      optionName: source.option_name || undefined,
      optionValue: source.option_value || undefined,
      price: source.price || undefined,
      sku: source.sku || undefined,
      barcode: source.barcode || undefined,
    } satisfies ShopifyBulkUploadRow;
  });
};

const downloadTemplate = () => {
  const example = [CSV_HEADERS.join(","), "CommandCtr bulk test product,Created by CommandCtr bulk upload,CommandCtr,Test Products,commandctr-bulk-test,DRAFT,Size,One Size,9.99,CC-BULK-TEST-001,"];
  const url = URL.createObjectURL(new Blob([example.join("\n")], { type: "text/csv" }));
  const link = document.createElement("a"); link.href = url; link.download = "shopify-bulk-upload-template.csv"; link.click(); URL.revokeObjectURL(url);
};

export default function ShopifyBulkUploadPage() {
  const [rows, setRows] = useState<ShopifyBulkUploadRow[]>([]);
  const [publishToOnlineStore, setPublishToOnlineStore] = useState(false);
  const [job, setJob] = useState<ShopifyBulkJob | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  useEffect(() => {
    if (!job || !["created", "running"].includes(job.status)) return;
    const interval = window.setInterval(() => {
      void shopifyProductsApi.getBulkJob(job._id).then(setJob).catch((error) => setMessage(error instanceof ApiClientError ? error.message : "Could not refresh bulk upload status."));
    }, 3000);
    return () => window.clearInterval(interval);
  }, [job]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setRows(parseCsv(await file.text())); setJob(null); setMessage(""); }
    catch (error) { setRows([]); setMessage(error instanceof Error ? error.message : "Could not read this CSV file."); }
  }

  async function startUpload() {
    setBusy(true); setMessage("");
    try { setJob(await shopifyProductsApi.startBulkUpload({ rows, publishToOnlineStore })); }
    catch (error) { setMessage(error instanceof ApiClientError ? error.message : "Could not start the Shopify bulk upload."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl space-y-6 p-6 text-[#17213a]">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#16a4b3]">SHOPIFY</p><h1 className="text-3xl font-bold">Bulk product upload</h1><p className="mt-2 max-w-2xl text-sm text-[#667085]">Upload a CSV, validate it before submission, and track Shopify&apos;s asynchronous bulk operation.</p></div><Link className="rounded-lg border border-[#d8dfeb] px-4 py-2 text-sm font-semibold" href="/products">Back to products</Link></div>
    <section className="rounded-2xl border border-[#d8dfeb] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">1. Prepare CSV</h2><p className="text-sm text-[#667085]">Variant columns are optional as a group. If used, option name, option value, and price are all required.</p></div><button onClick={downloadTemplate} className="rounded-lg border border-[#16a4b3] px-3 py-2 text-sm font-semibold text-[#087b8a]">Download template</button></div><label className="mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#b7c5d8] bg-[#f8fafc] p-9 text-sm font-semibold text-[#42526b]"><FileSpreadsheet className="h-6 w-6"/><span>{rows.length ? `${rows.length} product rows ready` : "Choose CSV file"}</span><input accept=".csv,text/csv" className="hidden" type="file" onChange={onFileChange}/></label></section>
    {message && <div className="flex gap-2 rounded-xl border border-[#f2c8c8] bg-[#fff5f5] p-4 text-sm text-[#a12b2b]"><AlertTriangle className="h-5 w-5 shrink-0"/>{message}</div>}
    {rows.length > 0 && <section className="rounded-2xl border border-[#d8dfeb] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold">2. Review and submit</h2><p className="text-sm text-[#667085]">{rows.length} rows will be sent to Shopify in one bulk operation.</p></div><label className="flex items-center gap-2 text-sm font-medium"><input checked={publishToOnlineStore} onChange={(event) => setPublishToOnlineStore(event.target.checked)} type="checkbox"/> Publish active products to Online Store</label></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-[#667085]"><tr><th className="p-2">Title</th><th className="p-2">Status</th><th className="p-2">Variant</th><th className="p-2">Price</th><th className="p-2">SKU</th></tr></thead><tbody>{preview.map((row, index) => <tr className="border-b" key={`${row.title}-${index}`}><td className="p-2 font-medium">{row.title || <span className="text-red-600">Missing title</span>}</td><td className="p-2">{row.status}</td><td className="p-2">{row.optionName ? `${row.optionName}: ${row.optionValue}` : "Default product"}</td><td className="p-2">{row.price ?? "—"}</td><td className="p-2">{row.sku ?? "—"}</td></tr>)}</tbody></table></div><button disabled={busy || Boolean(job && ["created", "running"].includes(job.status))} onClick={() => void startUpload()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0e9cad] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4"/>}Start bulk upload</button></section>}
    {job && <section className="rounded-2xl border border-[#d8dfeb] bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><h2 className="font-bold">Shopify job: {job.status}</h2>{job.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600"/> : job.status === "failed" ? <XCircle className="h-5 w-5 text-red-600"/> : <Loader2 className="h-5 w-5 animate-spin text-[#0e9cad]"/>}</div><p className="mt-2 text-sm text-[#667085]">Processed {job.processedRows} of {job.totalRows}; successful {job.succeededRows}; failed {job.failedRows}.</p>{job.lastError && <p className="mt-2 text-sm text-red-700">{job.lastError}</p>}{job.rows.filter((row) => row.errors.length).slice(0, 10).map((row) => <p className="mt-2 text-sm text-red-700" key={row.line}>Row {row.line}: {row.errors.join(" ")}</p>)}</section>}
  </main>;
}
