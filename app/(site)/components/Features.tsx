const channels = [
  { label: "TikTok Shop", icon: "♪", className: "text-[#6e7482]" },
  { label: "amazon", icon: "", className: "text-[#6e7482] lowercase" },
  { label: "ebay", icon: "", className: "text-[#7d8596] lowercase" },
  { label: "Shopify", icon: "◼", className: "text-[#6e7482]" },
];

const featureRows = [
  "Real-time inventory synchronization across channels",
  "Hands-on support to scale",
  "Real-time inventory syncing",
  "Automated order routing",
];

export default function Features() {
  return (
    <section className="bg-[#f3f4f6] text-[#3f4a5f]">
      <div className="border-b border-[#eceef3]">
        <div className="mx-auto w-full max-w-[1320px] px-6 py-10 sm:px-10 lg:px-16">
          <div className="flex items-center justify-center gap-4 text-center">
            <span className="h-px w-10 bg-[#8b94a8]" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#56c7c6]">
              Seamlessly Connected With
            </p>
            <span className="h-px w-10 bg-[#8b94a8]" />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-16 gap-y-5">
            {channels.map((channel) => (
              <div
                key={channel.label}
                className={`flex items-center gap-2 text-2xl font-semibold sm:text-3xl ${channel.className}`}
              >
                {channel.icon ? (
                  <span className="text-[18px] leading-none opacity-95">
                    {channel.icon}
                  </span>
                ) : null}
                {channel.label === "ebay" ? (
                  <span>
                    <span className="text-[#e85050]">e</span>
                    <span className="text-[#4f89e6]">b</span>
                    <span className="text-[#f0c441]">a</span>
                    <span className="text-[#60ba65]">y</span>
                  </span>
                ) : (
                  <span>{channel.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-6 py-18 sm:px-10 lg:px-16 lg:py-24">
        <div className="max-w-[760px]">
          <h2 className="text-2xl font-semibold leading-[1.25] text-[#556278] sm:text-3xl lg:text-5xl">
            Beyond simple connections, it&apos;s about orchestrating your entire
            ecosystem. Command Center isn&apos;t just syncing inventory; it is
            redefining how merchants sell, ship, and scale.
          </h2>

          <p className="mt-10 max-w-[690px] text-lg leading-[1.75] text-[#66758e] sm:text-xl lg:mt-14 lg:text-2xl">
            At Command Center, we integrate over 50 platforms with a click. We
            apply battle-tested infrastructure to help your store reach its full
            potential, creating lasting efficiency in an ever-changing market.
          </p>
        </div>

        <div className="mt-20 space-y-14">
          {featureRows.map((row) => (
            <div key={row}>
              <h3 className="text-3xl font-semibold leading-tight text-[#27324a] sm:text-4xl lg:text-5xl">
                {row}
              </h3>
              <div className="mt-3 h-px w-full bg-[#a8b1c2]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
