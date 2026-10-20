import { Clock3, Coins, RefreshCw } from "lucide-react";

const perks = [
  {
    title: "Lost Revenue",
    value: "15%",
    suffix: "-15% YoY",
    description: "Sales lost due to stockouts and slow cross-channel listing updates.",
    icon: Coins,
  },
  {
    title: "Daily Admin Time",
    value: "4h",
    suffix: "Daily",
    description: "Hours wasted manually updating inventory across CSV files and portals.",
    icon: Clock3,
  },
  {
    title: "Sync Errors",
    value: "Infinite",
    suffix: "Risk",
    description: "Overselling leads to account bans on Amazon and frustrated customers.",
    icon: RefreshCw,
  },
];

export default function AboutUsPerksSection() {
  return (
    <section className="relative w-full overflow-x-hidden bg-[radial-gradient(circle_at_78%_42%,rgba(66,110,214,0.32)_0%,rgba(36,52,95,0.28)_26%,rgba(23,35,69,0.92)_52%,#18264d_100%),linear-gradient(90deg,#1a294f_0%,#1e2f5c_48%,#1a2447_100%)] px-6 py-16 sm:px-10 lg:px-8 lg:py-20">
      <div className="grid items-end gap-8 lg:grid-cols-[1.65fr_1fr]">
        <div>
          <p className="text-lg font-semibold uppercase tracking-[0.08em] text-[#34d6ce]">
            The Fragmentation Tax
          </p>
          <h2 className="mt-3 max-w-[720px] text-3xl font-bold leading-[1.1] text-[#f0f3f9] sm:text-4xl lg:text-5xl">
            The Cost of Chaos is Higher Than You Think.
          </h2>
        </div>
        <p className="max-w-[500px] text-lg leading-relaxed text-[#a7b0c2] sm:text-xl">
          Manual syncing isn&apos;t just annoying - it&apos;s expensive. See what
          you&apos;re losing every single day.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {perks.map((perk) => {
          const Icon = perk.icon;

          return (
            <article
              key={perk.title}
              className="rounded-3xl border border-[#365186] bg-[#273d70]/90 p-8 shadow-[0_14px_32px_rgba(8,14,30,0.42)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3a4570] text-[#33d8ce]">
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="mt-6 text-[28px] font-medium text-[#b8c2d7]">{perk.title}</h3>

              <p className="mt-2 flex items-end gap-2">
                <span className="text-[46px] font-bold leading-none text-[#f3f7fc]">
                  {perk.value}
                </span>
                <span className="mb-1 text-[24px] font-semibold text-[#31d7cd]">
                  {perk.suffix}
                </span>
              </p>

              <p className="mt-4 max-w-[430px] text-[16px] leading-[1.45] text-[#7382a0]">
                {perk.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
