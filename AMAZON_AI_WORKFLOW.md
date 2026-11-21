# Amazon UK listing workflow

The Amazon tab uses the existing AI-agent response for draft title, bullets,
description, search terms and structured attributes. Global generation and
Generate All Images request only Amazon when that tab is selected. Other tabs
keep their existing behaviour.

## Identity and pricing

Existing catalogue offers:
1. Enter the exact child/variant ASIN and verify it against Amazon UK.
2. The catalogue response fills the title, brand and available selected attributes.
   Existing catalogue images are displayed by the catalogue preview.
3. Research GBP price calls the authenticated commerce-backend endpoint
   GET /api/v1/amazon/pricing/{asin}?conditionType=new_new&fulfillmentChannel=DEFAULT.
4. The backend reads getItemOffers with the connected seller token and UK
   marketplace A1F83G8C2ARO7P. It filters the exact condition and fulfilment,
   excludes the seller's own offers and duplicate sellers, and requires two
   valid GBP offers before suggesting their median item price.
5. Research preserves a manual selling price. Use suggested GBP price explicitly
   accepts a valid suggestion. No live Amazon listing is changed by research.

New catalogue products:
- Enter a real model number or manufacturer part number, exact variant size and
  size system when applicable, colour and pack count.
- Research uses POST /api/pricing/query/text on commandctr-ai-agent with country
  GB and currency GBP. Only independently fetched, qualifying amazon.co.uk
  evidence can produce a suggestion. Missing/blocked evidence returns no price.
- A seller SKU is an internal inventory identifier, not a manufacturer model.
- Unknown origin, manufacturer, capacity and model are no longer filled with
  invented Twinstr/GB/bottle defaults.
- Barcodes, GTIN exemption, inventory and safety declarations still require
  seller-verified facts. AI response fields remain reviewable draft content.

Suggestions compare item prices; delivery, VAT treatment, fees and margin must
be reviewed. This is on-demand price research, not scheduled automatic repricing.
It does not guarantee Amazon acceptance or Buy Box eligibility.

## Images and deployment

Locally stored response images are previewed through the authenticated website
proxy to GET /api/products/{product_id}/image?path=... on commandctr-ai-agent.
That endpoint only serves registered assets within the product's output directory.
It fixes cross-server preview access, but local temporary storage is not durable.

New catalogue submission requires a validated main image with a public HTTPS
storage URL. Configure persistent public S3 image delivery for production;
Amazon must be able to fetch the image independently of the website session.
Existing-ASIN offers use catalogue content and do not replace the catalogue image.

Deploy the changes in all three projects:
- commandctr-website: PRODUCT_AI_AGENT_BASE_URL points to commandctr-ai-agent /api;
  NEXT_PUBLIC_API_BASE_URL/BACKEND_API_BASE_URL point to commandctr-backend-py /api/v1.
- commandctr-ai-agent: enable and fund the configured OpenAI image/search providers;
  configure persistent image storage.
- commandctr-backend-py: configure Amazon UK production seller credentials and
  Product Pricing API permissions. Sandbox data cannot populate a live suggestion.

## Verification

Website production build and node --test tests/amazon-ai.test.cjs.
AI-agent API tests cover GBP matching, request forwarding and image delivery.
Commerce-backend tests/test_amazon_pricing.py covers exact offer constraints.
Local browser verification used mock authentication, catalogue, image and pricing
responses; it is not proof of live provider credits or Amazon permissions.

Amazon draft title, bullets, description, search terms and attributes are also
shown in a read-only preview in existing-ASIN mode. New-catalogue modes keep
their editable content fields. Server image metadata is authoritative; pending
slots no longer inherit image paths from an older draft. Updated image previews
use the record revision to retry previously failed URLs.
