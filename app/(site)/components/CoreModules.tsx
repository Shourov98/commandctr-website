const modules = [
  {
    title: "Core Modules",
    description: "Select a function to expand capabilities.",
    icon: "◫",
  },
  {
    title: "Multi-Sync Engine",
    description: "Real-time inventory propagation across 20+ global marketplaces.",
    icon: "⇄",
  },
  {
    title: "AI Optimization",
    description: "Automated title and description enhancement for SEO dominance.",
    icon: "✦",
  },
  {
    title: "Smart Rules",
    description: "Logic-based filtering to prevent low-margin ad spend.",
    icon: "☷",
  },
  {
    title: "Data Feeds",
    description: "Customizable attribute mapping for 300+ advertising channels.",
    icon: "▣",
  },
  {
    title: "Enterprise Security",
    description: "SOC2 compliant infrastructure with role-based access control.",
    icon: "⛨",
  },
  {
    title: "Open API",
    description: "Full programmatic access to extend platform capabilities.",
    icon: "❖",
  },
  {
    title: "Ready to deploy?",
    button: "VIEW FULL SPECS",
  },
];

export default function CoreModules() {
  return (
    <section className="bg-[#f3f4f6]">
      <div className="grid w-full grid-cols-1 border-[#dfe3ea] sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((item, index) => {
          const isCta = index === modules.length - 1;

          return (
            <article
              key={item.title}
              className={`group min-h-[300px] border border-[#dfe3ea] px-10 py-12 transition-colors duration-300 lg:min-h-[390px] ${
                isCta ? "bg-[#f3f4f6]" : "bg-[#f3f4f6] hover:bg-[#223867]"
              }`}
            >
              <div className="flex h-full flex-col">
                {!isCta ? (
                  <>
                    <div
                      className="mb-9 inline-flex h-20 w-20 items-center justify-center border border-[#dee4ec] text-4xl text-[#3a455c] transition-colors group-hover:border-[#4b5f84] group-hover:text-[#f1f6ff]"
                    >
                      {item.icon}
                    </div>

                    <h3 className="text-[34px] font-semibold leading-tight text-[#1f2940] transition-colors group-hover:text-white">
                      {item.title}
                    </h3>

                    <p className="mt-4 max-w-[430px] text-[26px] leading-[1.45] text-[#6b7892] transition-colors group-hover:text-[#ced8ea]">
                      {item.description}
                    </p>
                  </>
                ) : (
                  <div className="my-auto">
                    <h3 className="text-[34px] font-semibold leading-tight text-[#2fd1c8] group-hover:text-[#2fd1c8]">
                      {item.title}
                    </h3>
                    <button className="mt-7 border border-[#2fd1c8] px-9 py-4 text-[24px] font-semibold tracking-wide text-[#2fd1c8] transition hover:bg-[#2fd1c8] hover:text-[#153354]">
                      {item.button}
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
