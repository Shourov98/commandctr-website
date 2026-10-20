const journeyItems = [
  {
    year: "2025",
    title: "Strategic Expansion Phase",
    points: [
      "Strategic partnership with major global retail giants",
      "Launch of AI-powered Product Feed Management Tool",
      "Surpassed 50,000+ active enterprise users",
    ],
    active: true,
  },
  {
    year: "2024",
    title: "Global Market Penetration",
    points: [
      "Expanded to Asian markets with dedicated support for Temu & Shein",
      "Added 4 new major eCommerce platforms to our ecosystem",
      "Completed Amazon Full API Integration v2",
    ],
  },
  {
    year: "2022",
    title: "The Foundation",
    points: [
      "Official launch with 3 initial marketplace integrations",
      "Reached first 10,000 users milestone",
      "Established headquarters in Singapore",
    ],
  },
];

export default function AboutUsJourneySection() {
  return (
    <section className="bg-[#f3f4f6] px-6 py-20 sm:px-10 lg:px-16 lg:py-24">
      <div className="mx-auto w-full max-w-[980px]">
        <h2 className="text-center text-3xl font-extrabold tracking-[-0.02em] text-[#111b34] sm:text-4xl">
          Our Journey of Growth
        </h2>

        <div className="relative mt-16 pl-14 sm:pl-20">
          <div className="absolute bottom-2 left-8 top-2 w-px bg-[#cfdae7] sm:left-12" />

          <div className="space-y-14 sm:space-y-16">
            {journeyItems.map((item) => (
              <article key={item.year} className="relative">
                <span
                  className={`absolute left-[-32px] top-0.5 h-4 w-4 rounded-full border-2 sm:left-[-40px] ${
                    item.active
                      ? "border-[#f3f4f6] bg-[#38cbc7]"
                      : "border-[#f3f4f6] bg-[#c1ccdb]"
                  }`}
                />

                <p className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-[#1a243b] sm:text-[32px]">
                  {item.year}
                </p>
                <h3 className="mt-3 text-[22px] font-semibold leading-tight text-[#4a596f] sm:text-[24px]">
                  {item.title}
                </h3>

                <ul className="mt-5 space-y-2 text-[16px] leading-[1.55] text-[#62748f] sm:text-[18px]">
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
