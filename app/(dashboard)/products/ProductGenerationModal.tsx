"use client";

import { LoaderCircle, Sparkles, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useRef, useState } from "react";

import { prepareProductAiImageUpload } from "@/lib/product-ai-upload";

type ProductGenerationModalProps = {
  onClose: () => void;
  open: boolean;
};

type ProductRecordResponse = {
  id: string;
};

function isGenerationTimeoutMessage(message: string) {
  return message.includes("timed out") || message.includes("504");
}

export default function ProductGenerationModal({
  onClose,
  open,
}: ProductGenerationModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState("Add the product title and source image to start generation.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) {
    return null;
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
          ? `Selected image: ${prepared.file.name}. Optimized from ${(prepared.originalSize / (1024 * 1024)).toFixed(2)} MB to ${(prepared.file.size / (1024 * 1024)).toFixed(2)} MB.`
          : `Selected image: ${prepared.file.name}`,
      );
    } catch (error) {
      setSelectedImage(null);
      setStatusMessage(error instanceof Error ? error.message : "The selected image could not be prepared.");
    } finally {
      event.target.value = "";
    }
  }

  async function preserveLocalDraftAfterTimeout() {
    if (!selectedImage || !title.trim()) {
      return false;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", selectedImage);
    uploadFormData.append("market", "source");
    uploadFormData.append("productId", "draft");

    const uploadResponse = await fetch("/api/product-ai/image/upload", {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const uploadError = (await uploadResponse.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(uploadError?.detail ?? "The AI request timed out and the local draft image upload failed.");
    }

    const uploadResult = (await uploadResponse.json()) as {
      relative_path: string;
      absolute_path: string;
    };

    const params = new URLSearchParams({
      market: "shopify",
      localDraftTitle: title.trim(),
      localDraftImagePath: uploadResult.relative_path || uploadResult.absolute_path,
      localDraftImageMimeType: selectedImage.type || "image/png",
    });

    router.push(`/products/add?${params.toString()}`);
    return true;
  }

  async function generateDraft() {
    if (!title.trim()) {
      setStatusMessage("Product title is required.");
      return;
    }

    if (!selectedImage) {
      setStatusMessage("Product image is required.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("image", selectedImage);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/product-ai/products/generate/text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Draft generation failed.");
      }

      const record = (await response.json()) as ProductRecordResponse;
      router.push(`/products/add?market=shopify&productId=${record.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Draft generation failed.";

      if (isGenerationTimeoutMessage(message)) {
        try {
          const recovered = await preserveLocalDraftAfterTimeout();
          if (recovered) {
            return;
          }
        } catch (fallbackError) {
          const fallbackMessage =
            fallbackError instanceof Error ? fallbackError.message : "Draft generation failed.";
          setStatusMessage(fallbackMessage);
          setIsSubmitting(false);
          return;
        }
      }

      setStatusMessage(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081224]/55 px-4 py-6">
      <input
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
        ref={fileInputRef}
        type="file"
      />

      <div className="w-full max-w-2xl rounded-[28px] border border-[#d7dfeb] bg-white p-6 shadow-[0_32px_90px_-48px_rgba(15,29,56,0.95)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#87a0c2]">AI Product Intake</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1d2a43]">Generate Draft Product</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6c7e9f]">
              Start here with the source title and product image. After generation succeeds, we will redirect you to the editable add-product page with the saved draft loaded.
            </p>
          </div>

          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d5dcea] text-[#5a6d8d] transition hover:bg-[#f5f8fc]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="block rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Product Title</p>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-[#d4ddec] bg-white px-3 text-sm text-[#31415e] outline-none transition focus:border-[#97abd0]"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. AuroraFlow Vacuum Bottle"
              type="text"
              value={title}
            />
          </label>

          <div className="rounded-2xl border border-[#dbe2ee] bg-[#f8fbff] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8093b2]">Source Product Image</p>
            <p className="mt-1 text-xs text-[#8ea0bf]">Use the original product image that should drive product data and marketplace image generation.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d4ddec] bg-white px-4 text-sm font-semibold text-[#465574] transition hover:bg-[#f7fafe]"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload className="h-4 w-4" />
                {selectedImage ? "Change Image" : "Upload Image"}
              </button>
              <span className="text-sm text-[#5f7293]">
                {selectedImage ? selectedImage.name : "No image selected yet"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#d7e5fb] bg-[#eef5ff] px-4 py-3 text-sm text-[#486280]">
          {statusMessage}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#4a5d7d]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#172544] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => void generateDraft()}
            type="button"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isSubmitting ? "Generating Draft..." : "Generate Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
