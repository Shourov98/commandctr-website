"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ImportStatus = "imported" | "needs_review" | "duplicate" | "parse_issue" | "rejected" | "uploaded";

export type ImportRow = {
  id: string;
  status: ImportStatus;
  created_at: string;
  updated_at: string;
  normalized_title: string;
  category: string;
  product_type: string;
  preview_image_path: string;
  linked_product_id: string | null;
  missing_fields: string[];
  notes: string[];
  primary_record_id: string | null;
  duplicate_count: number;
  can_upload_as_product: boolean;
  catalog_conflict_product_ids: string[];
};

type ImportListResponse = {
  items: ImportRow[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
  summary: {
    total_imported: number;
    uploaded_as_product: number;
    needs_review: number;
    duplicates: number;
    rejected?: number;
  };
};

type PaginationState = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

type ImportPageState = {
  rows: ImportRow[];
  pagination: PaginationState;
  summary: ImportListResponse["summary"];
  searchQuery: string;
  isLoading: boolean;
  isUploading: boolean;
  isBulkDeleting: boolean;
  isGeneratingAll: boolean;
  busyRecordId: string | null;
  pageMessage: string;
  hasLoadedOnce: boolean;
  lastLoadedAt: number | null;
  shouldRefresh: () => boolean;
  setSearchQuery: (value: string) => void;
  loadPage: (page?: number) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  deleteImportRecord: (recordId: string) => Promise<void>;
  deleteImportRecords: (recordIds: string[]) => Promise<void>;
  deleteAllImportRecords: () => Promise<void>;
  generateAllImportData: () => Promise<void>;
  uploadAsProduct: (recordId: string) => Promise<void>;
  updateImportListing: (recordId: string, payload: { title?: string; category?: string }) => Promise<void>;
  uploadSourceImage: (recordId: string, file: File) => Promise<void>;
  changePage: (nextPage: number) => Promise<void>;
};

const IMPORT_PAGE_REFRESH_INTERVAL_MS = 60_000;

async function fetchImportPage(page: number, pageSize: number) {
  const response = await fetch(`/api/product-ai/imports/products?page=${page}&page_size=${pageSize}`, { cache: "no-store" });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(errorBody?.detail ?? "Could not load imported products.");
  }

  return (await response.json()) as ImportListResponse;
}

export const useImportPageStore = create<ImportPageState>()(
  persist(
    (set, get) => ({
      rows: [],
      pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 0 },
      summary: { total_imported: 0, uploaded_as_product: 0, needs_review: 0, duplicates: 0 },
      searchQuery: "",
      isLoading: false,
      isUploading: false,
      isBulkDeleting: false,
      isGeneratingAll: false,
      busyRecordId: null,
      pageMessage: "Uploaded import records stay here until you delete them or upload them as products.",
      hasLoadedOnce: false,
      lastLoadedAt: null,
      shouldRefresh: () => {
        const { lastLoadedAt } = get();
        return !lastLoadedAt || Date.now() - lastLoadedAt > IMPORT_PAGE_REFRESH_INTERVAL_MS;
      },
      setSearchQuery: (value) => set({ searchQuery: value }),
      async loadPage(page) {
        const targetPage = page ?? get().pagination.page;
        const state = get();
        if (state.isLoading && state.hasLoadedOnce) {
          return;
        }

        set({ isLoading: true });

        try {
          const payload = await fetchImportPage(targetPage, get().pagination.page_size);
          set({
            rows: payload.items,
            pagination: payload.pagination,
            summary: payload.summary,
            hasLoadedOnce: true,
            lastLoadedAt: Date.now(),
          });
        } catch (error) {
          set({
            pageMessage: error instanceof Error ? error.message : "Could not load imported products.",
          });
        } finally {
          set({ isLoading: false });
        }
      },
  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    set({ isUploading: true });

    try {
      const response = await fetch("/api/product-ai/imports/products/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not upload import file.");
      }

      await get().loadPage(1);
      set({ pageMessage: "Import file processed and saved to the database." });
    } catch (error) {
      set({
        pageMessage: error instanceof Error ? error.message : "Could not upload import file.",
      });
    } finally {
      set({ isUploading: false });
    }
  },
  async deleteImportRecord(recordId) {
    set({ busyRecordId: recordId });
    try {
      const response = await fetch(`/api/product-ai/imports/products/${recordId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not delete import record.");
      }

      await get().loadPage(get().pagination.page);
      set({ pageMessage: "Import record deleted." });
    } catch (error) {
      set({
        pageMessage: error instanceof Error ? error.message : "Could not delete import record.",
      });
    } finally {
      set({ busyRecordId: null });
    }
  },
  async deleteImportRecords(recordIds) {
    if (recordIds.length === 0) {
      return;
    }
    set({ isBulkDeleting: true, busyRecordId: null });
    try {
      const response = await fetch("/api/product-ai/imports/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_ids: recordIds }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not delete selected import records.");
      }

      const payload = (await response.json()) as { deleted_count?: number };
      await get().loadPage(get().pagination.page);
      set({ pageMessage: `${payload.deleted_count ?? recordIds.length} import record(s) deleted.` });
    } catch (error) {
      set({
        pageMessage: error instanceof Error ? error.message : "Could not delete selected import records.",
      });
    } finally {
      set({ isBulkDeleting: false });
    }
  },
  async deleteAllImportRecords() {
    set({ isBulkDeleting: true, busyRecordId: null });
    try {
      const response = await fetch("/api/product-ai/imports/products/delete-all", {
        method: "POST",
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not delete all import records.");
      }

      const payload = (await response.json()) as { deleted_count?: number };
      await get().loadPage(1);
      set({ pageMessage: `${payload.deleted_count ?? 0} import record(s) deleted.` });
    } catch (error) {
      set({
        pageMessage: error instanceof Error ? error.message : "Could not delete all import records.",
      });
    } finally {
      set({ isBulkDeleting: false });
    }
  },
  async generateAllImportData() {
    set({ isGeneratingAll: true });
    try {
      const response = await fetch("/api/product-ai/imports/products/generate-data", {
        method: "POST",
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not generate data for imported products.");
      }

      const payload = (await response.json()) as { processed_count?: number; skipped_count?: number; failed_count?: number; limit?: number };
      await get().loadPage(get().pagination.page);
      set({
        pageMessage: `Generated marketplace text for ${payload.processed_count ?? 0} product(s). Skipped ${payload.skipped_count ?? 0}, failed ${payload.failed_count ?? 0}. Max ${payload.limit ?? 10} eligible products per run.`,
      });
    } catch (error) {
      set({
        pageMessage: error instanceof Error ? error.message : "Could not generate data for imported products.",
      });
    } finally {
      set({ isGeneratingAll: false });
    }
  },
  async uploadAsProduct(recordId) {
    set({ busyRecordId: recordId });
    try {
      const response = await fetch(`/api/product-ai/imports/products/${recordId}/upload-as-product`, { method: "POST" });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not upload import record as product.");
      }

      await get().loadPage(get().pagination.page);
      set({ pageMessage: "Import record uploaded as a real product and linked." });
    } catch (error) {
      set({
        pageMessage: error instanceof Error ? error.message : "Could not upload import record as product.",
      });
    } finally {
      set({ busyRecordId: null });
    }
  },
  async updateImportListing(recordId, payload) {
    set({ busyRecordId: recordId });
    try {
      const trimmedTitle = payload.title?.trim();
      const trimmedCategory = payload.category?.trim();
      const response = await fetch(`/api/product-ai/imports/products/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          core: {
            ...(trimmedTitle !== undefined ? { normalized_title: trimmedTitle, source_title: trimmedTitle } : {}),
            ...(trimmedCategory !== undefined ? { category: trimmedCategory || "General Merchandise" } : {}),
          },
        }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not update import record.");
      }

      await get().loadPage(get().pagination.page);
      set({ pageMessage: "Import record updated." });
    } catch (error) {
      set({
        pageMessage: error instanceof Error ? error.message : "Could not update import record.",
      });
    } finally {
      set({ busyRecordId: null });
    }
  },
  async uploadSourceImage(recordId, file) {
    set({ busyRecordId: recordId });
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("market", "source");
      uploadFormData.append("productId", recordId);

      const uploadResponse = await fetch("/api/product-ai/image/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorBody = (await uploadResponse.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not upload source image.");
      }

      const uploadPayload = (await uploadResponse.json()) as { relative_path?: string; absolute_path?: string };
      const imagePath = uploadPayload.relative_path || uploadPayload.absolute_path || "";
      if (!imagePath) {
        throw new Error("Uploaded image path is missing.");
      }

      const updateResponse = await fetch(`/api/product-ai/imports/products/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: {
            source: {
              marketplace: "source",
              relative_path: uploadPayload.relative_path ?? "",
              absolute_path: uploadPayload.absolute_path ?? imagePath,
              prompt: "Original uploaded image saved for audit and downstream editing.",
              generation_mode: "manual_upload",
              mime_type: file.type || "image/png",
              validation: {
                passed: true,
                width: null,
                height: null,
                format: file.type.split("/")[1]?.toUpperCase() || "PNG",
                has_alpha: file.type === "image/png" || file.type === "image/webp",
                file_size_bytes: file.size,
                expected_width: null,
                expected_height: null,
                expected_background: "source",
                errors: [],
                mime_type: file.type || "image/png",
              },
            },
          },
        }),
      });

      if (!updateResponse.ok) {
        const errorBody = (await updateResponse.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Could not attach source image to the import record.");
      }

      await get().loadPage(get().pagination.page);
      set({ pageMessage: "Source image updated." });
    } catch (error) {
      set({
        pageMessage: error instanceof Error ? error.message : "Could not upload source image.",
      });
    } finally {
      set({ busyRecordId: null });
    }
  },
  async changePage(nextPage) {
    const { pagination } = get();
    if (nextPage < 1 || (pagination.total_pages > 0 && nextPage > pagination.total_pages)) {
      return;
    }

    await get().loadPage(nextPage);
  },
    }),
    {
      name: "twinstr-import-page",
      partialize: (state) => ({
        rows: state.rows,
        pagination: state.pagination,
        summary: state.summary,
        searchQuery: state.searchQuery,
        pageMessage: state.pageMessage,
        hasLoadedOnce: state.hasLoadedOnce,
        lastLoadedAt: state.lastLoadedAt,
      }),
    },
  ),
);
