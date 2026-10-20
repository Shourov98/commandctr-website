import ProductDetailClient from "./ProductDetailClient";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
};

export default async function ProductDetailPage({ params, searchParams }: ProductDetailPageProps) {
  const { id } = await params;
  const { source } = await searchParams;

  return <ProductDetailClient id={id} sourceHint={source} />;
}
