type AmazonDraft = {
  title: string;
  bullet_points: string[];
  description: string;
  backend_search_terms: string[];
  structured_attributes: Record<string, string>;
};

/** Existing-ASIN offers keep Amazon's catalogue; show the generated draft separately. */
export default function AmazonDraftPreview({ amazon }: { amazon: AmazonDraft }) {
  return (
    <section aria-label="Amazon draft content" className="rounded-2xl border border-[#dbe2ee] bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#172544]">Amazon draft content</h3>
      <p className="text-xs text-[#667a99]">
        These are the Amazon-specific fields returned by AI. Review factual claims against the product.
        Existing-ASIN offers use Amazon&apos;s catalogue content. To create a new catalogue listing,
        choose the barcode or approved GTIN-exemption option below.
      </p>
      <label className="block text-xs font-semibold text-[#667a99]">
        Amazon product title
        <input aria-label="Generated Amazon title" readOnly value={amazon.title}
          className="mt-1 w-full rounded-lg border border-[#d4ddec] p-2 text-sm text-[#31415e]" />
      </label>
      <label className="block text-xs font-semibold text-[#667a99]">
        Amazon bullet points
        <textarea aria-label="Generated Amazon bullet points" readOnly rows={Math.max(3, amazon.bullet_points.length)}
          value={amazon.bullet_points.join("\n")}
          className="mt-1 w-full rounded-lg border border-[#d4ddec] p-2 text-sm text-[#31415e]" />
      </label>
      <label className="block text-xs font-semibold text-[#667a99]">
        Amazon description
        <textarea aria-label="Generated Amazon description" readOnly rows={4} value={amazon.description}
          className="mt-1 w-full rounded-lg border border-[#d4ddec] p-2 text-sm text-[#31415e]" />
      </label>
      <label className="block text-xs font-semibold text-[#667a99]">
        Amazon search terms
        <textarea aria-label="Generated Amazon search terms" readOnly rows={3}
          value={amazon.backend_search_terms.join("\n")}
          className="mt-1 w-full rounded-lg border border-[#d4ddec] p-2 text-sm text-[#31415e]" />
      </label>
      {Object.keys(amazon.structured_attributes).length ? (
        <table className="w-full text-left text-xs text-[#31415e]">
          <caption className="text-left font-semibold pb-2">Amazon structured attributes</caption>
          <tbody>{Object.entries(amazon.structured_attributes).map(([key,value]) => (
            <tr key={key} className="border-t border-[#edf2fb]">
              <th className="p-2 font-medium">{key}</th><td className="p-2 break-words">{value}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : null}
    </section>
  );
}
