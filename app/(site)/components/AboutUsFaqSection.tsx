const faqItems = [
  "Is my platform data secure?",
  "Which sales channels do you support?",
  "Can I change my pricing plan later?",
  "Do you offer custom enterprise integrations?",
];

export default function AboutUsFaqSection() {
  return (
    <section className="bg-[#f3f4f6] px-6 pb-24 sm:px-10 lg:px-16 lg:pb-28">
      <div className="mx-auto grid w-full max-w-[1280px] gap-14 lg:grid-cols-[360px_1fr] lg:gap-20">
        <div>
          <h2 className="text-[46px] font-bold leading-[1.05] tracking-[-0.02em] text-[#161f33] sm:text-[54px]">
            <span className="block">Common</span>
            <span className="block">Questions</span>
          </h2>

          <p className="mt-6 max-w-[320px] text-[20px] leading-[1.45] text-[#6f7b8f]">
            Everything you need to know about security, platform support, and how we
            help you scale your business.
          </p>

          <button className="mt-8 text-[33px] font-semibold leading-none text-[#32cbc6]">
            Contact Support →
          </button>
        </div>

        <div>
          {faqItems.map((item, index) => (
            <div key={item} className={index > 0 ? "border-t border-[#dde2ea]" : ""}>
              <button className="flex w-full items-center justify-between py-11 text-left">
                <span className="pr-4 text-[30px] font-semibold leading-tight text-[#1d2435] sm:text-[34px]">
                  {item}
                </span>
                <span className="text-[46px] font-light leading-none text-[#9da8b8]">+</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
