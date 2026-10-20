import AddProductEditor from "../../products/add/AddProductEditor";

type MarketKey = "amazon" | "ebay" | "etsy" | "tiktok" | "shopify";

type ImportEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ market?: string }>;
};

const marketOrder: MarketKey[] = ["amazon", "ebay", "etsy", "tiktok", "shopify"];

export default async function ImportEditPage({ params, searchParams }: ImportEditPageProps) {
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
    />
  );
}
