import fs from "node:fs/promises";
import path from "node:path";

import { MARKETPLACE_IMAGE_PROFILES } from "./product-pipeline/marketplaces.mjs";
import { ensureDir, readJson, resolveMaybeRelativePath, slugify, timestampSlug, validatePngAgainstProfile, writeBinary, writeJson } from "./product-pipeline/io.mjs";
import { generateMarketplaceImages, generateStructuredProductPackage } from "./product-pipeline/openai.mjs";
import { SUPPORTED_MARKETPLACES, validateProductBrief } from "./product-pipeline/schema.mjs";

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = nextValue;
    index += 1;
  }

  return args;
}

function createRunManifest({ brief, runDir, sourceImagePath, textModel, imageModel }) {
  return {
    status: "started",
    run_directory: runDir,
    started_at: new Date().toISOString(),
    models: {
      text: textModel,
      image: imageModel,
    },
    requested_marketplaces: brief.marketplaces,
    source_image_path: sourceImagePath,
    outputs: {},
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input ? path.resolve(process.cwd(), args.input) : null;

  if (!inputPath) {
    throw new Error('Missing required argument "--input". Example: pnpm generate:product --input examples/product-brief.sample.json');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in the environment.");
  }

  const textModel = process.env.OPENAI_TEXT_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5";
  const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
  const outputRoot = path.resolve(process.cwd(), args["output-dir"] ?? "generated-products");

  const brief = await readJson(inputPath);
  const briefValidation = validateProductBrief(brief);
  if (!briefValidation.ok) {
    throw new Error(`Invalid product brief:\n- ${briefValidation.errors.join("\n- ")}`);
  }

  const requestedMarketplaces = Array.from(new Set(brief.marketplaces));
  const sourceImagePath = resolveMaybeRelativePath(inputPath, brief.sourceImagePath ?? null);

  if (sourceImagePath) {
    await fs.access(sourceImagePath);
  }

  const runSlug = slugify(`${brief.brand}-${brief.productName}`) || "product";
  const runDir = path.join(outputRoot, `${runSlug}-${timestampSlug()}`);
  const auditDir = path.join(runDir, "audit");
  const imagesDir = path.join(runDir, "images");

  await ensureDir(runDir);
  await ensureDir(auditDir);
  await ensureDir(imagesDir);

  const auditWriter = async (fileName, value) => writeJson(path.join(auditDir, fileName), value);
  const manifest = createRunManifest({ brief, runDir, sourceImagePath, textModel, imageModel });

  await writeJson(path.join(runDir, "input-brief.json"), brief);
  await writeJson(path.join(runDir, "manifest.json"), manifest);

  const { productPackage } = await generateStructuredProductPackage({
    apiKey,
    model: textModel,
    brief: {
      ...brief,
      marketplaces: requestedMarketplaces,
      supportedMarketplaces: SUPPORTED_MARKETPLACES,
    },
    auditWriter,
  });

  const normalizedProductPackage = {
    ...productPackage,
    slug: productPackage.slug || runSlug,
  };

  await writeJson(path.join(runDir, "product-package.json"), normalizedProductPackage);

  const imageOutputs = await generateMarketplaceImages({
    apiKey,
    imageModel,
    brief,
    productPackage: normalizedProductPackage,
    requestedMarketplaces,
    sourceImagePath,
    imagesDir,
    auditWriter,
    writeBinary,
    validatePng: validatePngAgainstProfile,
  });

  const finalManifest = {
    ...manifest,
    status: "completed",
    completed_at: new Date().toISOString(),
    outputs: {
      product_package: path.join(runDir, "product-package.json"),
      images: imageOutputs,
      audit_directory: auditDir,
      marketplace_profiles: Object.fromEntries(
        requestedMarketplaces.map((marketplace) => [marketplace, MARKETPLACE_IMAGE_PROFILES[marketplace]]),
      ),
    },
  };

  await writeJson(path.join(runDir, "manifest.json"), finalManifest);

  console.log(`Product package created in ${runDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
