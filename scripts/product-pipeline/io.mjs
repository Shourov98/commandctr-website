import fs from "node:fs/promises";
import path from "node:path";

const PNG_SIGNATURE = "89504e470d0a1a0a";

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function writeJson(filePath, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, serialized, "utf8");
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function writeBinary(filePath, buffer) {
  await fs.writeFile(filePath, buffer);
}

export function resolveMaybeRelativePath(baseFilePath, relativeOrAbsolutePath) {
  if (!relativeOrAbsolutePath) {
    return null;
  }

  if (path.isAbsolute(relativeOrAbsolutePath)) {
    return relativeOrAbsolutePath;
  }

  return path.resolve(path.dirname(baseFilePath), relativeOrAbsolutePath);
}

export function detectMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      throw new Error(`Unsupported image extension "${extension}". Use .png, .jpg, .jpeg, or .webp.`);
  }
}

export function parsePngMetadata(buffer) {
  if (buffer.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) {
    throw new Error("Generated file is not a PNG image.");
  }

  const ihdrType = buffer.subarray(12, 16).toString("ascii");
  if (ihdrType !== "IHDR") {
    throw new Error("PNG IHDR chunk not found.");
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  const hasAlpha = colorType === 4 || colorType === 6;

  return {
    width,
    height,
    bitDepth,
    colorType,
    hasAlpha,
  };
}

export function validatePngAgainstProfile(buffer, profile) {
  const meta = parsePngMetadata(buffer);
  const errors = [];

  if (profile.expectedWidth != null && meta.width !== profile.expectedWidth) {
    errors.push(`Expected width ${profile.expectedWidth}, received ${meta.width}.`);
  }

  if (profile.expectedHeight != null && meta.height !== profile.expectedHeight) {
    errors.push(`Expected height ${profile.expectedHeight}, received ${meta.height}.`);
  }

  if (profile.alphaRequired === true && meta.hasAlpha !== true) {
    errors.push("Expected PNG with alpha channel, but the output image does not expose alpha.");
  }

  return {
    ok: errors.length === 0,
    errors,
    meta,
  };
}
