import Image from "next/image";

export default function AboutUsConstructingCoherenceSection() {
  return (
    <section className="bg-[#f3f4f6] px-6 pb-20 sm:px-10 lg:px-16 lg:pb-24">
      <div className="mx-auto w-full max-w-[1280px]">
        <h2 className="text-[44px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] text-[#152142] sm:text-[64px]">
          <span className="block">Constructing</span>
          <span className="mt-2 block text-[#38cbc7]">Coherence</span>
        </h2>

        <div className="mt-16 overflow-hidden rounded-xl border border-[#2b3c63] bg-[#182f59] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto flex w-full max-w-[1120px] items-center justify-center gap-0">
            <div className="relative h-[170px] w-[29%] min-w-[140px] sm:h-[230px] lg:h-[290px]">
              <Image
                src="/zero-left.svg"
                alt="Input channels illustration"
                fill
                className="object-contain"
              />
            </div>

            <div className="relative h-[220px] w-[34%] min-w-[170px] sm:h-[290px] lg:h-[360px]">
              <Image
                src="/zero.svg"
                alt="Zero core module illustration"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="relative h-[170px] w-[29%] min-w-[140px] sm:h-[230px] lg:h-[290px]">
              <Image
                src="/zero-right.svg"
                alt="Output channels illustration"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
