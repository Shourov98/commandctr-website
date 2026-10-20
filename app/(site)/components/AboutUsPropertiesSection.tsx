const properties = [
  "Single Dashboard, Total Marketplace Control",
  "Real-Time Inventory & Order Synchronization",
  "AI-Powered Listing, Pricing & Demand Optimization",
  "Seamless Onboarding & Embedded Marketplace Integration",
];

export default function AboutUsPropertiesSection() {
  return (
    <section className="bg-[#f3f4f6] px-6 pb-20 sm:px-10 lg:px-16 lg:pb-28">
      <div className="mx-auto w-full max-w-[1260px]">
        <div className="max-w-[700px]">
          <h2 className="text-[28px] font-semibold leading-[1.3] text-[#3f4a5e] sm:text-[34px]">
            We built the E-Commerce Command Center to eliminate the chaos of
            selling across multiple marketplaces.
          </h2>

          <p className="mt-8 text-[18px] leading-[1.75] text-[#5f6c82] sm:text-[20px]">
            Modern sellers shouldn&apos;t have to jump between dashboards, manually
            update inventory, or manage disconnected systems. Our platform brings
            everything into one unified control center products, inventory,
            orders, payouts, and AI-powered optimization so businesses can focus
            on growth instead of operations. We believe marketplaces should feel
            like invisible infrastructure, not daily obstacles.
          </p>
        </div>

        <div className="mt-14 space-y-11">
          {properties.map((item) => (
            <div key={item}>
              <h3 className="text-[20px] font-semibold leading-tight text-[#2a3449] sm:text-[38px]">
                {item}
              </h3>
              <div className="mt-3 h-px w-full bg-[#bcc4d1]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
