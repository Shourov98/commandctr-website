"use client";

export const PRODUCT_AI_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const TARGET_UPLOAD_BYTES = PRODUCT_AI_MAX_UPLOAD_BYTES - 256 * 1024;
const FALLBACK_OUTPUT_TYPE = "image/jpeg";
const MAX_DIMENSION_STEPS = [2200, 1800, 1600, 1400, 1200, 960];
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

type PreparedProductAiImage = {
  file: File;
  originalSize: number;
  wasOptimized: boolean;
};

function replaceFileExtension(filename: string, nextExtension: string) {
  const sanitizedExtension = nextExtension.startsWith(".") ? nextExtension : `.${nextExtension}`;
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return `${filename}${sanitizedExtension}`;
  }
  return `${filename.slice(0, lastDotIndex)}${sanitizedExtension}`;
}

function loadImageElement(file: File): Promise<{ image: HTMLImageElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        image,
        release: () => URL.revokeObjectURL(objectUrl),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file could not be loaded as an image."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The image optimizer could not encode the uploaded image."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

export async function prepareProductAiImageUpload(file: File): Promise<PreparedProductAiImage> {
  if (file.size <= TARGET_UPLOAD_BYTES) {
    return {
      file,
      originalSize: file.size,
      wasOptimized: false,
    };
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported.");
  }

  const preferredOutputType =
    file.type === "image/jpeg" || file.type === "image/webp" ? file.type : FALLBACK_OUTPUT_TYPE;
  const nextExtension = preferredOutputType === "image/webp" ? ".webp" : ".jpg";
  const { image, release } = await loadImageElement(file);

  try {
    let smallestCandidate: Blob | null = null;

    for (const maxDimension of MAX_DIMENSION_STEPS) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("The image optimizer could not access a canvas context.");
      }

      context.drawImage(image, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, preferredOutputType, quality);

        if (!smallestCandidate || blob.size < smallestCandidate.size) {
          smallestCandidate = blob;
        }

        if (blob.size <= TARGET_UPLOAD_BYTES) {
          return {
            file: new File([blob], replaceFileExtension(file.name, nextExtension), {
              type: preferredOutputType,
              lastModified: Date.now(),
            }),
            originalSize: file.size,
            wasOptimized: true,
          };
        }
      }
    }

    if (!smallestCandidate) {
      throw new Error("The image optimizer could not prepare the selected image.");
    }

    if (smallestCandidate.size > PRODUCT_AI_MAX_UPLOAD_BYTES) {
      throw new Error("Image is still too large after optimization. Please choose a smaller source image.");
    }

    return {
      file: new File([smallestCandidate], replaceFileExtension(file.name, nextExtension), {
        type: preferredOutputType,
        lastModified: Date.now(),
      }),
      originalSize: file.size,
      wasOptimized: true,
    };
  } finally {
    release();
  }
}
