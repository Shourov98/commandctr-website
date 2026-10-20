This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local Product Generation Pipeline

This repo includes a standalone OpenAI-backed pipeline that generates structured product data and marketplace-specific images, then saves everything locally for review.

### Setup

Create `.env.local` with:

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_TEXT_MODEL=gpt-5
OPENAI_IMAGE_MODEL=gpt-image-1.5
```

If you already use `OPENAI_MODEL`, the script will fall back to that for text generation.

### Input Brief

Use the sample brief at `examples/product-brief.sample.json` as the template. You can optionally point `sourceImagePath` to a local product image. When provided, the pipeline will try to:

- produce a transparent product cutout
- create marketplace-specific edited images from the source asset

Without a source image, the pipeline will generate images from prompts only.

### Run

```bash
pnpm run generate:product -- --input examples/product-brief.sample.json
```

Optional:

```bash
pnpm run generate:product -- --input examples/product-brief.sample.json --output-dir generated-products
```

### Output

Each run is written to `generated-products/<slug>-<timestamp>/` with:

- `input-brief.json`
- `product-package.json`
- `manifest.json`
- `images/`
- `audit/`

The `audit/` directory stores raw API responses for traceability. The `manifest.json` includes saved file paths and lightweight PNG validation metadata.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
