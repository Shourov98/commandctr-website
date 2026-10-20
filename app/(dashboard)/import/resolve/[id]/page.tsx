import ResolveImportDuplicates from "./ResolveImportDuplicates";

type ResolveImportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResolveImportPage({ params }: ResolveImportPageProps) {
  const { id } = await params;
  return <ResolveImportDuplicates recordId={id} />;
}
