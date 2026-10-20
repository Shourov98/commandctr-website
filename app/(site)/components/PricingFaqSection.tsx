const faqItems = [
  "Can I upgrade my plan later?",
  "Do you offer a free trial?",
  "What happens if I exceed my order limit?",
  "Is my data secure?",
];

export default function PricingFaqSection() {
  return (
    <section className="bg-[#f3f4f6] px-6 pb-24 sm:px-10 lg:px-16 lg:pb-28">
      <div className="mx-auto grid w-full max-w-[1280px] gap-14 lg:grid-cols-[360px_1fr] lg:gap-20">
        <div>
          <h2 className="text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-[#161f33] sm:text-[42px]">
            <span className="block">Common</span>
            <span className="block">Questions</span>
          </h2>

          <p className="mt-6 max-w-[320px] text-[17px] leading-[1.45] text-[#6f7b8f]">
            Everything you need to know about billing, features, and how we help
            you scale.
          </p>

          <button className="mt-8 text-[26px] font-semibold leading-none text-[#32cbc6]">
            Contact Support →
          </button>
        </div>

        <div>
          {faqItems.map((item, index) => (
            <div key={item} className={index > 0 ? "border-t border-[#dde2ea]" : ""}>
              <button className="flex w-full items-center justify-between py-10 text-left">
                <span className="pr-4 text-[22px] font-semibold leading-tight text-[#1d2435] sm:text-[26px]">
                  {item}
                </span>
                <span className="text-[34px] font-light leading-none text-[#9da8b8]">+</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
