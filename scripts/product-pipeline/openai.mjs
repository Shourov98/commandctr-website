import fs from "node:fs/promises";
import path from "node:path";

import { MARKETPLACE_IMAGE_PROFILES } from "./marketplaces.mjs";
import { PRODUCT_PACKAGE_SCHEMA, validateProductPackage } from "./schema.mjs";
import { detectMimeType, parsePngMetadata } from "./io.mjs";

const RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const IMAGE_GENERATIONS_API_URL = "https://api.openai.com/v1/images/generations";
const IMAGE_EDITS_API_URL = "https://api.openai.com/v1/images/edits";

function createHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function parseJsonResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function generateStructuredProductPackage({
  apiKey,
  model,
  brief,
  auditWriter,
  maxAttempts = 2,
}) {
  let validationFeedback = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const prompt = [
      "Generate a production-grade ecommerce product package as strict JSON.",
      "The package must be commercially usable, factual, and safe for human review.",
      "Do not invent unverifiable certifications, legal claims, medical claims, or unsupported performance claims.",
      "Write all copy in clean US English.",
      "Return all supported marketplace copy sets: amazon, ebay, etsy, tiktok_shop, and shopify.",
      validationFeedback,
      "Input brief JSON:",
      JSON.stringify(brief, null, 2),
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch(RESPONSES_API_URL, {
      method: "POST",
      headers: createHeaders(apiKey),
      body: JSON.stringify({
        model,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "product_package",
            schema: PRODUCT_PACKAGE_SCHEMA,
            strict: true,
          },
        },
      }),
    });

    const data = await parseJsonResponse(response);
    await auditWriter(`responses-structured-attempt-${attempt}.json`, data);

    if (!response.ok) {
      throw new Error(`Structured product generation failed with ${response.status} ${response.statusText}.`);
    }

    const outputText = typeof data.output_text === "string" ? data.output_text.trim() : "";
    if (!outputText) {
      validationFeedback = "Previous attempt failed because the model returned no output. Return only valid JSON matching the schema.";
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      validationFeedback = "Previous attempt returned invalid JSON. Return only valid JSON matching the schema.";
      continue;
    }

    const validation = validateProductPackage(parsed);
    if (validation.ok) {
      return {
        productPackage: parsed,
        rawResponse: data,
      };
    }

    validationFeedback = `Previous attempt failed validation. Fix these issues exactly: ${validation.errors.join(" | ")}`;
  }

  throw new Error("Could not generate a valid structured product package after multiple attempts.");
}

export async function generateImageFromPrompt({
  apiKey,
  model,
  prompt,
  size,
  background,
  quality = "high",
  auditWriter,
  auditName,
}) {
  const response = await fetch(IMAGE_GENERATIONS_API_URL, {
    method: "POST",
    headers: createHeaders(apiKey),
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      background,
      output_format: "png",
    }),
  });

  const data = await parseJsonResponse(response);
  await auditWriter(auditName, data);

  if (!response.ok) {
    throw new Error(`Image generation failed with ${response.status} ${response.statusText}.`);
  }

  const base64 = data?.data?.[0]?.b64_json;
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new Error("Image generation returned no image bytes.");
  }

  const buffer = Buffer.from(base64, "base64");
  const metadata = parsePngMetadata(buffer);

  return {
    buffer,
    metadata,
    rawResponse: data,
  };
}

export async function editImageWithPrompt({
  apiKey,
  model,
  prompt,
  inputImagePath,
  size,
  background,
  quality = "high",
  auditWriter,
  auditName,
}) {
  const inputBuffer = await fs.readFile(inputImagePath);
  const mimeType = detectMimeType(inputImagePath);
  const form = new FormData();

  form.append("model", model);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("quality", quality);
  form.append("background", background);
  form.append("output_format", "png");
  form.append("image", new File([inputBuffer], path.basename(inputImagePath), { type: mimeType }));

  const response = await fetch(IMAGE_EDITS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const data = await parseJsonResponse(response);
  await auditWriter(auditName, data);

  if (!response.ok) {
    throw new Error(`Image edit failed with ${response.status} ${response.statusText}.`);
  }

  const base64 = data?.data?.[0]?.b64_json;
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new Error("Image edit returned no image bytes.");
  }

  const buffer = Buffer.from(base64, "base64");
  const metadata = parsePngMetadata(buffer);

  return {
    buffer,
    metadata,
    rawResponse: data,
  };
}

export async function generateMarketplaceImages({
  apiKey,
  imageModel,
  brief,
  productPackage,
  requestedMarketplaces,
  sourceImagePath,
  imagesDir,
  auditWriter,
  writeBinary,
  validatePng,
}) {
  const outputs = {};
  let baseCutoutPath = null;

  if (sourceImagePath) {
    const cutout = await editImageWithPrompt({
      apiKey,
      model: imageModel,
      prompt: productPackage.image_prompts.base_cutout,
      inputImagePath: sourceImagePath,
      size: "1024x1024",
      background: "transparent",
      auditWriter,
      auditName: "image-base-cutout.json",
    });

    baseCutoutPath = path.join(imagesDir, "base-cutout.png");
    await writeBinary(baseCutoutPath, cutout.buffer);
    outputs.base_cutout = {
      file: baseCutoutPath,
      validation: validatePng(cutout.buffer, {
        expectedWidth: 1024,
        expectedHeight: 1024,
        alphaRequired: true,
      }),
    };
  }

  for (const marketplace of requestedMarketplaces) {
    const profile = MARKETPLACE_IMAGE_PROFILES[marketplace];
    const prompt = [
      profile.prefix,
      `Product context: ${productPackage.canonical_title}.`,
      `Brand: ${productPackage.brand}.`,
      `Market background guidance: ${productPackage.marketplaces[marketplace].background_strategy}.`,
      `Model-crafted prompt: ${productPackage.image_prompts[marketplace]}.`,
      `Core features: ${productPackage.bullet_points.slice(0, 4).join("; ")}.`,
      brief.color ? `Color: ${brief.color}.` : "",
      brief.materials ? `Materials: ${brief.materials.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const outputPath = path.join(imagesDir, profile.outputName);
    const result =
      sourceImagePath && (profile.requiresTransparencyBase ? baseCutoutPath : sourceImagePath)
        ? await editImageWithPrompt({
            apiKey,
            model: imageModel,
            prompt,
            inputImagePath: profile.requiresTransparencyBase ? baseCutoutPath : sourceImagePath,
            size: profile.size,
            background: profile.background,
            auditWriter,
            auditName: `image-${marketplace}.json`,
          })
        : await generateImageFromPrompt({
            apiKey,
            model: imageModel,
            prompt,
            size: profile.size,
            background: profile.background,
            auditWriter,
            auditName: `image-${marketplace}.json`,
          });

    await writeBinary(outputPath, result.buffer);
    outputs[marketplace] = {
      file: outputPath,
      validation: validatePng(result.buffer, profile.validation),
    };
  }

  return outputs;
}
