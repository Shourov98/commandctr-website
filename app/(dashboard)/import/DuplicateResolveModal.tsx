"use client";

import { Loader2, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ImportRecord = {
  id: string;
  status: "imported" | "needs_review" | "duplicate" | "parse_issue" | "uploaded";
  created_at: string;
  updated_at: string;
  notes: string[];
  product: {
    core: {
      normalized_title: string;
      category: string;
      product_type: string;
      attributes: Record<string, string>;
    };
  };
};

type DuplicateGroup = {
  kind: "import_group" | "catalog_conflict";
  primary: ImportRecord;
  duplicates: ImportRecord[];
  catalog_matches: {
    id: string;
    status: string;
    normalized_title: string;
    category: string;
    product_type: string;
    preview_image_path: string;
  }[];
};

type DuplicateResolveModalProps = {
  isOpen: boolean;
  recordId: string | null;
  onClose: () => void;
  onResolved: () => Promise<void> | void;
};

export default function DuplicateResolveModal({ isOpen, recordId, onClose, onResolved }: DuplicateResolveModalProps) {
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"promote" | "delete" | "delete_all" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Loading duplicate group...");

  const loadGroup = useCallback(async () => {
    if (!recordId) {
      return null;
    }

    const response = await fetch(`/api/product-ai/imports/products/${recordId}/duplicates`, { cache: "no-store" });
    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(errorBody?.detail ?? "Could not load duplicate group.");
    }

    return (await response.json()) as DuplicateGroup;
  }, [recordId]);

  useEffect(() => {
    if (!isOpen || !recordId) {
      return;
    }

    let active = true;

    void loadGroup()
      .then((payload) => {
        if (!active || !payload) {
          return;
        }

        setGroup(payload);
        setMessage(
          payload.kind === "catalog_conflict"
            ? "This imported record conflicts with an existing product already in the catalog."
            : payload.duplicates.length > 0
              ? "Review the main record and remove duplicate rows you do not want to keep."
              : "Duplicate group is resolved. Only the main record remains."
        );
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setGroup(null);
        setMessage(error instanceof Error ? error.message : "Could not load duplicate group.");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, loadGroup, recordId]);

  const shouldShowLoading = isLoading || (!group && Boolean(recordId));

  async function promote(recordIdToPromote: string) {
    setBusyId(recordIdToPromote);
    setBusyAction("promote");
    try {
      const response = await fetch(`/api/product-ai/imports/products/${recordIdToPromote}/duplicates/promote`, { method: "POST" });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not promote duplicate record.");
      }

      const payload = (await response.json()) as DuplicateGroup;
      setGroup(payload);
      setMessage("Main record updated.");
      await onResolved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not promote duplicate record.");
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function remove(recordIdToDelete: string) {
    setBusyId(recordIdToDelete);
    setBusyAction("delete");
    try {
      const response = await fetch(`/api/product-ai/imports/products/${recordIdToDelete}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not delete duplicate record.");
      }

      const payload = await loadGroup();
      if (payload) {
        setGroup(payload);
        setMessage(payload.duplicates.length > 0 ? "Duplicate record deleted." : "Duplicate group resolved. Only the main record remains.");
      }
      await onResolved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete duplicate record.");
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function removeAllDuplicates() {
    if (!recordId) {
      return;
    }

    setBusyId("__all__");
    setBusyAction("delete_all");
    try {
      const response = await fetch(`/api/product-ai/imports/products/${recordId}/duplicates/delete-all`, { method: "POST" });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not delete duplicate records.");
      }

      const payload = (await response.json()) as DuplicateGroup;
      setGroup(payload);
      setMessage("All duplicate records deleted. Only the main record remains.");
      await onResolved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete duplicate records.");
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091224]/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-[#dbe2ee] bg-white shadow-[0_30px_90px_-40px_rgba(17,31,56,0.85)]">
        <div className="flex items-start justify-between border-b border-[#e6ecf6] bg-[#1b2748] px-6 py-5 text-white">
          <div>
            <p className="text-sm font-semibold text-[#a9b8d6]">Import Products</p>
            <h2 className="mt-1 text-2xl font-semibold">Resolve Duplicates</h2>
            <p className="mt-1 text-sm text-[#a9b8d6]">{message}</p>
          </div>
          <button className="rounded-full border border-[#4c5e86] p-2 text-[#dbe5fb] transition hover:bg-[#24345c]" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-6">
          {shouldShowLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#60708d]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading duplicate group...
            </div>
          ) : group ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#1f2c44]">Main Record</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eefbf4] px-3 py-1 text-xs font-semibold text-[#267a4f]">
                    <Star className="h-3.5 w-3.5" /> Keep
                  </span>
                </div>
                <RecordCard record={group.primary} />
                <div className="mt-4 flex gap-3">
                  <Link className="inline-flex h-10 items-center rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d]" href={`/import/${group.primary.id}`}>
                    Open Main Record
                  </Link>
                </div>
              </article>

              <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[#1f2c44]">
                    {group.kind === "catalog_conflict" ? "Existing Catalog Matches" : "Duplicate Records"}
                  </h3>
                  {group.kind === "import_group" && group.duplicates.length > 0 ? (
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fff0f3] px-4 text-sm font-semibold text-[#df2b67] disabled:opacity-60"
                      disabled={busyAction !== null}
                      onClick={() => void removeAllDuplicates()}
                      type="button"
                    >
                      {busyAction === "delete_all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete All Duplicates
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 space-y-4">
                  {group.kind === "catalog_conflict" ? (
                    group.catalog_matches.length > 0 ? group.catalog_matches.map((product) => (
                      <div className="rounded-2xl border border-[#e5ebf5] bg-[#f8fbff] p-4" key={product.id}>
                        <p className="text-lg font-semibold text-[#20314d]">{product.normalized_title}</p>
                        <p className="mt-1 text-sm text-[#61738f]">{product.category} • {product.product_type}</p>
                        <p className="mt-1 text-xs text-[#8ea0bf]">Product ID: {product.id}</p>
                        <p className="mt-1 text-xs text-[#8ea0bf]">Status: {product.status}</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Link className="inline-flex h-10 items-center rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d]" href={`/products/add?productId=${product.id}`}>
                            Open Existing Product
                          </Link>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-[#667a97]">No existing catalog matches are available to review.</p>
                    )
                  ) : group.duplicates.length > 0 ? (
                    group.duplicates.map((record) => (
                      <div className="rounded-2xl border border-[#e5ebf5] bg-[#f8fbff] p-4" key={record.id}>
                        <RecordCard record={record} compact />
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Link className="inline-flex h-10 items-center rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d]" href={`/import/${record.id}`}>
                            Open
                          </Link>
                          <button
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d] disabled:opacity-60"
                            disabled={busyAction !== null}
                            onClick={() => void promote(record.id)}
                            type="button"
                          >
                            {busyId === record.id && busyAction === "promote" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Keep This Instead
                          </button>
                          <button
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fff0f3] px-4 text-sm font-semibold text-[#df2b67] disabled:opacity-60"
                            disabled={busyAction !== null}
                            onClick={() => void remove(record.id)}
                            type="button"
                          >
                            {busyId === record.id && busyAction === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete Duplicate
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#667a97]">No duplicate records remain in this group.</p>
                  )}
                </div>
              </article>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#dbe2ee] bg-white p-6 text-sm text-[#546884]">{message}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordCard({ record, compact = false }: { record: ImportRecord; compact?: boolean }) {
  return (
    <div className={compact ? "" : "mt-4"}>
      <p className="text-lg font-semibold text-[#20314d]">{record.product.core.normalized_title}</p>
      <p className="mt-1 text-sm text-[#61738f]">
        {record.product.core.category} • {record.product.core.product_type}
      </p>
      <p className="mt-1 text-xs text-[#8ea0bf]">Record ID: {record.id}</p>
      <p className="mt-1 text-xs text-[#8ea0bf]">Updated: {record.updated_at.slice(0, 19).replace("T", " ")}</p>
      {record.product.core.attributes.sku ? <p className="mt-1 text-xs text-[#8ea0bf]">SKU: {record.product.core.attributes.sku}</p> : null}
      {record.notes[0] ? <p className="mt-2 text-xs text-[#d28e10]">{record.notes[0]}</p> : null}
    </div>
  );
}
