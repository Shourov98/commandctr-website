"use client";

import { AlertTriangle, CheckCircle2, CloudUpload, Edit3, Eye, FileText, Loader2, Search, Sparkles, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import DuplicateResolveModal from "./DuplicateResolveModal";
import { useImportPageStore, type ImportRow, type ImportStatus } from "@/lib/stores/import-page-store";

type EditableField = "title" | "category";

function StatusBadge({ status }: { status: ImportStatus }) {
  const styles: Record<ImportStatus, string> = {
    imported: "bg-[#ddf7f0] text-[#56cbc2]",
    needs_review: "bg-[#e9f0ff] text-[#4a84ef]",
    duplicate: "bg-[#fff2d6] text-[#f4a632]",
    parse_issue: "bg-[#ffe4e4] text-[#d25353]",
    rejected: "bg-[#ffe1eb] text-[#d63767]",
    uploaded: "bg-[#eefbf4] text-[#267a4f]",
  };
  const labels: Record<ImportStatus, string> = {
    imported: "Imported",
    needs_review: "Needs Review",
    duplicate: "Duplicate",
    parse_issue: "Parse Issue",
    rejected: "Rejected",
    uploaded: "Uploaded",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
}

function imageUrlFor(path: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `/api/product-ai/image?path=${encodeURIComponent(path)}`;
}

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [resolveRecordId, setResolveRecordId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ recordId: string; field: EditableField; value: string } | null>(null);
  const rows = useImportPageStore((state) => state.rows);
  const pagination = useImportPageStore((state) => state.pagination);
  const summary = useImportPageStore((state) => state.summary);
  const searchQuery = useImportPageStore((state) => state.searchQuery);
  const isLoading = useImportPageStore((state) => state.isLoading);
  const isUploading = useImportPageStore((state) => state.isUploading);
  const isBulkDeleting = useImportPageStore((state) => state.isBulkDeleting);
  const isGeneratingAll = useImportPageStore((state) => state.isGeneratingAll);
  const busyRecordId = useImportPageStore((state) => state.busyRecordId);
  const pageMessage = useImportPageStore((state) => state.pageMessage);
  const hasLoadedOnce = useImportPageStore((state) => state.hasLoadedOnce);
  const shouldRefresh = useImportPageStore((state) => state.shouldRefresh);
  const setSearchQuery = useImportPageStore((state) => state.setSearchQuery);
  const loadPage = useImportPageStore((state) => state.loadPage);
  const uploadFile = useImportPageStore((state) => state.uploadFile);
  const deleteImportRecord = useImportPageStore((state) => state.deleteImportRecord);
  const deleteImportRecords = useImportPageStore((state) => state.deleteImportRecords);
  const deleteAllImportRecords = useImportPageStore((state) => state.deleteAllImportRecords);
  const generateAllImportData = useImportPageStore((state) => state.generateAllImportData);
  const uploadAsProduct = useImportPageStore((state) => state.uploadAsProduct);
  const updateImportListing = useImportPageStore((state) => state.updateImportListing);
  const uploadSourceImage = useImportPageStore((state) => state.uploadSourceImage);
  const changePage = useImportPageStore((state) => state.changePage);

  useEffect(() => {
    if (!hasLoadedOnce || rows.length === 0) {
      void loadPage();
      return;
    }

    if (shouldRefresh()) {
      void loadPage();
    }
  }, [hasLoadedOnce, loadPage, rows.length, shouldRefresh]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => rows.some((row) => row.id === id)));
  }, [rows]);

  const showInitialLoading = isLoading && rows.length === 0;
  const showRefreshing = isLoading && rows.length > 0;

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) =>
      row.normalized_title.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query) ||
      row.product_type.toLowerCase().includes(query),
    );
  }, [rows, searchQuery]);

  const metrics = useMemo(() => ({
    total: summary.total_imported,
    uploaded: summary.uploaded_as_product,
    review: summary.needs_review,
    duplicates: summary.duplicates,
  }), [summary]);

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.id));
  const someVisibleSelected = filteredRows.some((row) => selectedIds.includes(row.id));

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file);
    } finally {
      event.target.value = "";
    }
  }

  async function refreshCurrentPage() {
    await loadPage(pagination.page);
  }

  function startEditing(row: ImportRow, field: EditableField) {
    setEditing({
      recordId: row.id,
      field,
      value: field === "title" ? row.normalized_title : row.category,
    });
  }

  async function commitEdit() {
    if (!editing) {
      return;
    }
    const nextValue = editing.value.trim();
    const currentRow = rows.find((row) => row.id === editing.recordId);
    if (!currentRow) {
      setEditing(null);
      return;
    }
    const currentValue = editing.field === "title" ? currentRow.normalized_title : currentRow.category;
    if (nextValue === currentValue.trim()) {
      setEditing(null);
      return;
    }
    await updateImportListing(editing.recordId, editing.field === "title" ? { title: nextValue } : { category: nextValue });
    setEditing(null);
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitEdit();
      return;
    }
    if (event.key === "Escape") {
      setEditing(null);
    }
  }

  function toggleSelection(recordId: string) {
    setSelectedIds((current) => (current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId]));
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredRows.some((row) => row.id === id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...filteredRows.map((row) => row.id)])));
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      return;
    }
    await deleteImportRecords(selectedIds);
    setSelectedIds([]);
  }

  async function handleDeleteAll() {
    await deleteAllImportRecords();
    setSelectedIds([]);
  }

  async function handleGenerateAllData() {
    await generateAllImportData();
  }

  async function handleImageChange(recordId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      await uploadSourceImage(recordId, file);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <DuplicateResolveModal
          key={resolveRecordId ?? "closed"}
          isOpen={resolveRecordId !== null}
          onClose={() => setResolveRecordId(null)}
          onResolved={refreshCurrentPage}
          recordId={resolveRecordId}
        />

        <div className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <h1 className="text-2xl font-semibold">Bulk Product Import</h1>
          <p className="mt-1 text-sm text-[#a9b8d6]">Imported records stay in this workspace until you delete them or upload them as real products.</p>
        </div>

        <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-6">
          <h2 className="text-2xl font-semibold text-[#1f2c44]">Import Overview</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Imported" value={metrics.total} accent="☰" />
            <MetricCard label="Uploaded As Product" value={metrics.uploaded} accent="✓" />
            <MetricCard label="Needs Review" value={metrics.review} accent="↺" />
            <MetricCard label="Duplicates" value={metrics.duplicates} accent="⊖" />
          </div>
        </article>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row lg:max-w-[840px]">
            <div className="relative w-full md:max-w-[390px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96a3bc]" />
              <input
                className="h-11 w-full rounded-xl border border-[#d6dce9] bg-white py-2 pl-10 pr-3 text-sm text-[#243251] outline-none placeholder:text-[#8f9bb1] focus:border-[#98abcf]"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search imported products..."
                type="text"
                value={searchQuery}
              />
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-5 text-sm font-semibold text-[#465574] disabled:opacity-60"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              {isUploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#c9d8f4] bg-[#eef5ff] px-5 text-sm font-semibold text-[#2f5fa8] disabled:opacity-50"
              disabled={rows.length === 0 || isGeneratingAll}
              onClick={() => void handleGenerateAllData()}
              type="button"
            >
              {isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Text For 10
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#f2c2d2] bg-[#fff2f7] px-5 text-sm font-semibold text-[#c23868] disabled:opacity-50"
              disabled={selectedIds.length === 0 || isBulkDeleting}
              onClick={() => void handleBulkDelete()}
              type="button"
            >
              {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Selected
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#efb5c7] bg-[#ffe7ef] px-5 text-sm font-semibold text-[#b82f5d] disabled:opacity-50"
              disabled={rows.length === 0 || isBulkDeleting}
              onClick={() => void handleDeleteAll()}
              type="button"
            >
              {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete All
            </button>
          </div>
        </div>

        <input accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={handleFileChange} ref={inputRef} type="file" />

        <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] px-4 py-3 text-sm text-[#5d708e]">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 text-[#4a84ef]" />
            <div>
              <p className="font-semibold text-[#30435f]">Import workflow</p>
              <p className="mt-1">Rows stay editable in this list. Double click the title or category to update text, and hover the image to upload or replace it before sending the row to products.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-sm text-[#546884]">{pageMessage}</div>

        <article className="overflow-hidden rounded-2xl border border-[#e1e6f0] bg-white">
          {showRefreshing ? (
            <div className="border-b border-[#edf1f7] px-4 py-3 text-sm text-[#6f7f9f]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing import records...
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] text-left">
              <thead className="bg-[#233a69] text-xs font-semibold uppercase tracking-wide text-[#d8e4fb]">
                <tr>
                  <th className="px-4 py-4">
                    <input
                      checked={allVisibleSelected}
                      className="h-4 w-4 rounded border-[#bed0ed]"
                      onChange={toggleSelectAll}
                      ref={(node) => {
                        if (node) {
                          node.indeterminate = !allVisibleSelected && someVisibleSelected;
                        }
                      }}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-4 py-4">Image</th>
                  <th className="px-4 py-4">Product</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Missing</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Linked Product</th>
                  <th className="px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {showInitialLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-[#7f92b1]" colSpan={8}>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading import records...
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length > 0 ? filteredRows.map((row) => {
                  const hasDuplicateGroup = row.status === "duplicate" || Boolean(row.primary_record_id) || row.duplicate_count > 0;
                  const canUploadRow = row.can_upload_as_product && row.status !== "duplicate" && row.status !== "rejected";
                  const isBusy = busyRecordId === row.id;
                  const imageUrl = imageUrlFor(row.preview_image_path);
                  const isEditingTitle = editing?.recordId === row.id && editing.field === "title";
                  const isEditingCategory = editing?.recordId === row.id && editing.field === "category";
                  const uploadButtonLabel = canUploadRow ? "Upload as Product" : hasDuplicateGroup ? "Resolve Duplicate" : "Complete Fields";

                  return (
                    <tr className="border-t border-[#e9eef7] text-sm text-[#44526d]" key={row.id}>
                      <td className="px-4 py-4 align-top">
                        <input
                          checked={selectedIds.includes(row.id)}
                          className="mt-2 h-4 w-4 rounded border-[#bed0ed]"
                          disabled={isBusy || isBulkDeleting}
                          onChange={() => toggleSelection(row.id)}
                          type="checkbox"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div
                          className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-[#dde5f1] bg-[#f6f8fc]"
                          onClick={() => imageInputRefs.current[row.id]?.click()}
                          onDoubleClick={() => imageInputRefs.current[row.id]?.click()}
                          role="button"
                          tabIndex={0}
                        >
                          {imageUrl ? (
                            <img alt={row.normalized_title || "Imported product image"} className="h-full w-full object-cover" src={imageUrl} />
                          ) : (
                            <span className="px-3 text-center text-xs font-medium text-[#8ea0bf]">Click to upload image</span>
                          )}
                          <button
                            className="absolute inset-x-2 bottom-2 inline-flex items-center justify-center rounded-xl bg-[#172544]/90 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                            disabled={isBusy}
                            onClick={(event) => {
                              event.stopPropagation();
                              imageInputRefs.current[row.id]?.click();
                            }}
                            type="button"
                          >
                            <Upload className="mr-1 h-3.5 w-3.5" />
                            {imageUrl ? "Replace" : "Upload"}
                          </button>
                        </div>
                        <input
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => void handleImageChange(row.id, event)}
                          ref={(node) => {
                            imageInputRefs.current[row.id] = node;
                          }}
                          type="file"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        {isEditingTitle ? (
                          <input
                            autoFocus
                            className="w-full rounded-xl border border-[#98abcf] bg-white px-3 py-2 text-sm font-semibold text-[#243251] outline-none"
                            onBlur={() => void commitEdit()}
                            onChange={(event) => setEditing((current) => current ? { ...current, value: event.target.value } : current)}
                            onKeyDown={handleEditKeyDown}
                            value={editing?.value ?? ""}
                          />
                        ) : (
                          <button className="text-left" disabled={isBusy} onDoubleClick={() => startEditing(row, "title")} type="button">
                            <p className="font-semibold text-[#2c3a57]">{row.normalized_title || "Add product title"}</p>
                            <p className="mt-1 text-xs text-[#8ea0bf]">{row.product_type} • {row.updated_at.slice(0, 10)}</p>
                            {row.notes[0] ? <p className="mt-2 text-xs text-[#d28e10]">{row.notes[0]}</p> : null}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {isEditingCategory ? (
                          <input
                            autoFocus
                            className="w-full rounded-xl border border-[#98abcf] bg-white px-3 py-2 text-sm text-[#243251] outline-none"
                            onBlur={() => void commitEdit()}
                            onChange={(event) => setEditing((current) => current ? { ...current, value: event.target.value } : current)}
                            onKeyDown={handleEditKeyDown}
                            value={editing?.value ?? ""}
                          />
                        ) : (
                          <button className="rounded-xl bg-[#f6f8fc] px-3 py-2 text-left text-sm text-[#44526d]" disabled={isBusy} onDoubleClick={() => startEditing(row, "category")} type="button">
                            {row.category || "Add category"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {row.missing_fields.length ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-[#eef2f7] px-3 py-1 text-xs font-semibold text-[#5e718e]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.missing_fields.join(", ")}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-full bg-[#eefbf4] px-3 py-1 text-xs font-semibold text-[#267a4f]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={row.status} />
                          {hasDuplicateGroup ? (
                            <button
                              className="inline-flex items-center gap-2 rounded-xl border border-[#f4d7a2] bg-[#fff5df] px-3 py-1.5 text-xs font-semibold text-[#f4a632]"
                              onClick={() => setResolveRecordId(row.id)}
                              type="button"
                            >
                              Resolve
                            </button>
                          ) : null}
                          {row.primary_record_id ? <span className="text-xs text-[#8ea0bf]">Duplicate of {row.primary_record_id.slice(0, 8)}</span> : null}
                          {!row.primary_record_id && row.duplicate_count > 0 ? <span className="text-xs text-[#8ea0bf]">Main record</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">{row.linked_product_id ? row.linked_product_id.slice(0, 12) : "--"}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center justify-center gap-3">
                          <Link className="inline-flex items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-3 py-2 text-xs font-semibold text-[#465574]" href={`/import/${row.id}`}>
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                          <Link className="inline-flex items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-3 py-2 text-xs font-semibold text-[#465574]" href={`/import/view/${row.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                          <button
                            className="inline-flex items-center gap-2 rounded-xl bg-[#35d3ce] px-3 py-2 text-xs font-semibold text-[#153c53] disabled:opacity-60"
                            disabled={isBusy || !canUploadRow}
                            onClick={() => void uploadAsProduct(row.id)}
                            type="button"
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {uploadButtonLabel}
                          </button>
                          <button className="text-[#f03f8f]" disabled={isBusy || isBulkDeleting} onClick={() => void deleteImportRecord(row.id)} type="button">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-[#7f92b1]" colSpan={8}>No import records found yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
        <div className="flex items-center justify-between rounded-xl border border-[#e1e6f0] bg-white px-4 py-3 text-xs text-[#7b89a6]">
          <p>Showing {filteredRows.length} of {pagination.total_items} import records on page {pagination.page}{pagination.total_pages ? ` of ${pagination.total_pages}` : ""}</p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-[#c7d3e6] px-4 py-1.5 font-semibold text-[#60708d] disabled:opacity-50"
              disabled={pagination.page <= 1}
              onClick={() => void changePage(pagination.page - 1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-xl border border-[#c7d3e6] px-4 py-1.5 font-semibold text-[#60708d] disabled:opacity-50"
              disabled={pagination.total_pages === 0 || pagination.page >= pagination.total_pages}
              onClick={() => void changePage(pagination.page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl bg-[#1a2748] p-5 text-white">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#198eff] text-white">{accent}</div>
      <p className="text-sm text-[#c0cce4]">{label}</p>
      <p className="mt-1 text-4xl font-semibold">{value}</p>
    </div>
  );
}
