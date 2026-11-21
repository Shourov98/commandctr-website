export type AmazonOfferEvidence = {
  reference_offers?: Array<{
    title: string; url?: string; price: number | null; shipping: number | null;
    delivered_price: number | null; currency: string; fulfilment: string; my_offer: boolean;
    exclusion_reasons: string[];
  }>;
  reference_price_range?: {
    minimum: number; maximum: number; currency: string; count: number; price_basis: string;
  } | null;
  offer_diagnostics?: {returned_count: number; qualifying_count: number; exclusion_counts: Record<string,number>};
};

const reasonLabels: Record<string,string> = {
  own_offer:"Your own offer", fulfilment_mismatch:"Different fulfilment method",
  fulfilment_unknown:"Fulfilment method unknown", condition_mismatch:"Different condition",
  business_offer:"Business offer", not_currently_available:"Not currently available",
  invalid_gbp_price_or_shipping:"GBP price or delivery charge unavailable",
  duplicate_seller:"Duplicate seller", seller_missing:"Seller identity unavailable",
};
function money(value: number | null, currency: string) {
  return value !== null && Number.isFinite(value)
    ? new Intl.NumberFormat("en-GB",{style:"currency",currency}).format(value) : "Unavailable";
}
export default function AmazonOfferReferences({pricing}:{pricing:AmazonOfferEvidence}) {
  const offers=pricing.reference_offers;
  if (!offers) return null;
  const range=pricing.reference_price_range;
  return <section aria-label="Observed Amazon offers" className="mt-3 rounded-xl border border-[#dbe2ee] bg-white p-3 space-y-2 text-xs text-[#31415e]">
    <h4 className="font-semibold">Observed Amazon offers</h4>
    {pricing.offer_diagnostics ? <p>{pricing.offer_diagnostics.returned_count} offers returned; {pricing.offer_diagnostics.qualifying_count} match the recommendation rules.</p> : null}
    {range ? <p className="font-semibold">
      Other-seller reference total: {money(range.minimum,range.currency)}
      {range.maximum !== range.minimum ? " – "+money(range.maximum,range.currency) : ""}
      {" · "+range.count+" offer"+(range.count===1?"":"s")+" · includes reported delivery"}
    </p> : null}
    <p>These are observed asking prices. Review fulfilment and delivery differences before setting your selling price.</p>
    {offers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-left">
      <thead><tr><th className="p-2">Offer</th><th className="p-2">Method</th><th className="p-2">Item</th><th className="p-2">Delivery</th><th className="p-2">Total</th><th className="p-2">Comparison status</th></tr></thead>
      <tbody>{offers.map((offer,index)=><tr key={index} className="border-t border-[#edf2fb]">
        <td className="p-2">{offer.my_offer?"Your offer":"Other seller"}</td><td className="p-2">{offer.fulfilment}</td>
        <td className="p-2">{money(offer.price,offer.currency)}</td><td className="p-2">{money(offer.shipping,offer.currency)}</td>
        <td className="p-2 font-semibold">{money(offer.delivered_price,offer.currency)}</td>
        <td className="p-2">{offer.exclusion_reasons.length
          ? offer.exclusion_reasons.map(reason=>reasonLabels[reason]||reason.replaceAll("_"," ")).join("; ")
          : "Matches comparison rules"}</td>
      </tr>)}</tbody>
    </table></div> : <p>Amazon returned no offers for the requested condition.</p>}
  </section>;
}
