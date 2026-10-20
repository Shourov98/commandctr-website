import Image from "next/image";

const avatars = [
  { name: "SA", bg: "bg-[#375476]" },
  { name: "JR", bg: "bg-[#2f6b68]" },
  { name: "MK", bg: "bg-[#5e4d8f]" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_72%_46%,_rgba(46,203,222,0.26)_0%,_rgba(18,28,59,0.42)_28%,_#101a39_62%,_#0d1633_100%)] px-6 py-16 sm:px-10 lg:px-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-[1380px] items-center gap-10 lg:grid-cols-2 lg:gap-8">
        <div className="max-w-[620px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1d8ca2] bg-[#114359]/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2fd1c8]">
            <span className="text-[10px]">✦</span>
            Now Supporting TikTok Shop
          </div>

          <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.04] text-white sm:text-5xl lg:text-6xl">
            <span className="block">THE ONE-STOP</span>
            <span className="block text-[#2fd1c8]">MARKETPLACE</span>
            <span className="block text-[#2fd1c8]">GENESIS.</span>
          </h1>

          <p className="mt-5 max-w-[560px] text-lg leading-relaxed text-[#9aa7c2]">
            Stop juggling tabs. The ultimate Command Center to sync inventory,
            update products, and fulfill orders across TikTok Shop, Amazon, and
            eBay in real-time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="rounded-md bg-[#36d3cb] px-9 py-4 text-lg font-bold uppercase tracking-wide text-[#10233d] transition hover:bg-[#50dfd6]">
              Get Started
            </button>
            <button className="inline-flex items-center gap-3 rounded-md border border-[#1a6074] bg-[#19314f]/55 px-8 py-4 text-lg font-semibold uppercase tracking-wide text-[#a7b6ca] transition hover:border-[#2d9db4] hover:text-[#cae8ef]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#2fd1c8] text-[11px] text-[#0e2a3f]">
                ▶
              </span>
              View Demo
            </button>
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              {avatars.map((avatar, index) => (
                <div
                  key={avatar.name}
                  className={`${
                    index === 0 ? "" : "-ml-2.5"
                  } flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0f1837] text-sm font-bold text-white ${avatar.bg}`}
                >
                  {avatar.name}
                </div>
              ))}
              <div className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0f1837] bg-[#33466d] text-sm font-semibold text-[#d7e0ed]">
                +2k
              </div>
            </div>
            <div>
              <div className="text-sm tracking-[0.18em] text-[#f7c948]">
                ★★★★★
              </div>
              <p className="text-xl leading-tight text-[#93a2bc]">
                Trusted by 2,000+ top sellers.
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="pointer-events-none absolute h-[74%] w-[74%] rounded-full bg-[#2fd1c8]/30 blur-3xl" />
          <Image
            src="/hero.svg"
            alt="Marketplace overview dashboard"
            width={900}
            height={620}
            priority
            className="relative w-full max-w-[760px]"
          />
        </div>
      </div>
    </section>
  );
}
