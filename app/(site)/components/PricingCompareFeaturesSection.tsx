import { Check, Minus } from "lucide-react";
import { Fragment } from "react";

type CellValue = "check" | "dash" | string;

type FeatureRow = {
  feature: string;
  starter: CellValue;
  growth: CellValue;
  scale: CellValue;
  highlightGrowth?: boolean;
  badge?: string;
};

type FeatureSection = {
  title: string;
  rows: FeatureRow[];
};

const featureSections: FeatureSection[] = [
  {
    title: "Core Platform",
    rows: [
      { feature: "Master Inventory Sync", starter: "check", growth: "check", scale: "check" },
      { feature: "Channels Included", starter: "2", growth: "10", scale: "Unlimited", highlightGrowth: true },
      { feature: "Monthly Orders", starter: "500", growth: "5,000", scale: "Unlimited", highlightGrowth: true },
    ],
  },
  {
    title: "Automation & AI",
    rows: [
      { feature: "AI Listing Generator", starter: "dash", growth: "check", scale: "check", badge: "New" },
      { feature: "Smart Order Routing", starter: "dash", growth: "check", scale: "check" },
      { feature: "Bulk Product Editing", starter: "check", growth: "check", scale: "check" },
    ],
  },
  {
    title: "Support & API",
    rows: [
      { feature: "Support Level", starter: "Email", growth: "Priority Email & Chat", scale: "24/7 Dedicated Manager", highlightGrowth: true },
      { feature: "API Access", starter: "Standard", growth: "Advanced", scale: "Custom Limits", highlightGrowth: true },
      { feature: "Marketplace Support", starter: "Basic", growth: "All Major", scale: "Custom + Regional", highlightGrowth: true },
    ],
  },
];

function renderCell(value: CellValue, emphasize = false) {
  if (value === "check") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2ebf68] text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }

  if (value === "dash") {
    return <Minus className="mx-auto h-4 w-4 text-[#c7ced8]" strokeWidth={2.5} />;
  }

  return (
    <span className={emphasize ? "font-semibold text-[#3650a1]" : "font-medium text-[#5a6474]"}>
      {value}
    </span>
  );
}

export default function PricingCompareFeaturesSection() {
  return (
    <section className="bg-[#f3f4f6] px-6 pb-20 sm:px-10 lg:px-16 lg:pb-24">
      <div className="mx-auto w-full max-w-[1280px]">
        <h2 className="text-2xl font-bold text-[#1a2236] sm:text-3xl">Compare Features</h2>

        <div className="mt-8 overflow-hidden rounded-xl border border-[#e5e8ee] bg-[#f7f8fa]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-[#f1f3f6]">
                  <th className="px-5 py-5 text-left text-sm font-semibold uppercase tracking-[0.06em] text-[#7f8899]">
                    Feature
                  </th>
                  <th className="px-5 py-5 text-center text-[24px] font-semibold text-[#1f2739]">
                    Starter
                  </th>
                  <th className="px-5 py-5 text-center text-[24px] font-semibold text-[#3450a3]">
                    Growth
                  </th>
                  <th className="px-5 py-5 text-center text-[24px] font-semibold text-[#1f2739]">
                    Scale
                  </th>
                </tr>
              </thead>

              <tbody>
                {featureSections.map((section) => (
                  <Fragment key={section.title}>
                    <tr className="bg-[#eceef2]">
                      <td
                        colSpan={4}
                        className="px-5 py-3 text-sm font-semibold uppercase tracking-[0.06em] text-[#7a8493]"
                      >
                        {section.title}
                      </td>
                    </tr>

                    {section.rows.map((row) => (
                      <tr key={row.feature} className="border-t border-[#e5e8ee]">
                        <td className="px-5 py-4 text-[18px] font-semibold text-[#374152]">
                          <span>{row.feature}</span>
                          {row.badge ? (
                            <span className="ml-2 inline-flex rounded-full bg-[#d957cc] px-2 py-0.5 text-[12px] font-semibold text-white">
                              {row.badge}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-center text-[18px]">
                          {renderCell(row.starter)}
                        </td>
                        <td className="px-5 py-4 text-center text-[18px]">
                          {renderCell(row.growth, row.highlightGrowth)}
                        </td>
                        <td className="px-5 py-4 text-center text-[18px]">
                          {renderCell(row.scale)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
