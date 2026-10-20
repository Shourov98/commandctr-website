import AddProductEditor from "../../../products/add/AddProductEditor";

type ImportViewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ market?: string }>;
};

const marketOrder = ["amazon", "ebay", "etsy", "tiktok", "shopify"] as const;
type MarketKey = (typeof marketOrder)[number];

export default async function ImportViewPage({ params, searchParams }: ImportViewPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const market = resolvedSearchParams.market;
  const activeMarket: MarketKey = marketOrder.includes(market as MarketKey) ? (market as MarketKey) : "shopify";
  return (
    <AddProductEditor
      activeMarket={activeMarket}
      initialImportRecordId={id}
      initialProductId={null}
      initialSourceHint={null}
      localDraftSeed={null}
      readOnly
    />
  );
}
