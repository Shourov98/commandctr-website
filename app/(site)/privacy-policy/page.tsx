import Link from "next/link";

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    paragraphs: [
      "We collect information you provide directly to us when creating an account, submitting forms, connecting channels, or contacting support. This may include your name, company details, email address, billing profile, and business identifiers.",
      "We also collect technical and usage information such as device details, IP address, browser type, pages visited, actions within the platform, and timestamps to maintain security and improve product performance.",
    ],
  },
  {
    id: "how-we-use-your-information",
    title: "2. How We Use Your Information",
    paragraphs: [
      "We process your information to provide, operate, secure, and improve our services, including order syncing, product feed management, analytics, and account management.",
      "We may use your information to communicate service updates, technical notices, onboarding guidance, and customer support responses. We do not sell your personal information.",
    ],
  },
  {
    id: "data-sharing-and-disclosure",
    title: "3. Data Sharing and Disclosure",
    paragraphs: [
      "We share information only with trusted subprocessors and service providers required to run our platform, such as infrastructure hosting, payment processing, and support tools.",
      "We may disclose information if required by law, to enforce our terms, protect rights and safety, or in connection with a merger, acquisition, or asset transfer.",
    ],
  },
  {
    id: "data-retention-and-security",
    title: "4. Data Retention and Security",
    paragraphs: [
      "We retain information only for as long as needed to provide services, meet legal obligations, resolve disputes, and enforce agreements. Retention periods vary based on data type and regulatory requirements.",
      "We maintain administrative, technical, and physical safeguards designed to protect your information from unauthorized access, misuse, alteration, and loss.",
    ],
  },
  {
    id: "marketing-communications",
    title: "5. Marketing Communications",
    paragraphs: [
      "You can opt out of receiving promotional communications from us by using the unsubscribe link within each email, updating your email preferences within your Service account settings menu, or contacting us as provided below to have your contact information removed from our promotional email list or registration database.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-[#f3f4f6] px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 lg:grid-cols-[320px_1fr] lg:gap-12">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-2xl border border-[#dfe3ea] bg-[#f7f8fa] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#35c8c6]">
              Legal
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[#1a2236]">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#687488]">
              How we collect, use, and protect your data.
            </p>

            <nav className="mt-6 space-y-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-[#516079] transition hover:bg-[#ecf1f7] hover:text-[#1d2a45]"
                >
                  {section.title}
                </a>
              ))}
              <a
                href="#contact-us"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[#516079] transition hover:bg-[#ecf1f7] hover:text-[#1d2a45]"
              >
                6. Contact Us
              </a>
            </nav>
          </div>
        </aside>

        <div className="rounded-2xl border border-[#dfe3ea] bg-[#f3f4f6] p-6 sm:p-10 lg:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#35c8c6]">
              Legal
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[#1a2236] sm:text-4xl">
              Privacy Policy
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#687488] sm:text-lg">
              This Privacy Policy explains how Command Center collects, uses, discloses,
              and protects your information when you use our platform and services.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.title} id={section.id} className="scroll-mt-28">
                <h2 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1f2940] sm:text-[30px]">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-[1.7] text-[#556174] sm:text-[16px]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <section id="contact-us" className="scroll-mt-28">
              <h2 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1f2940] sm:text-[30px]">
                6. Contact Us
              </h2>

              <p className="mt-3 text-[15px] leading-[1.7] text-[#556174] sm:text-[16px]">
                If you have questions or concerns about how your information is handled,
                please direct your inquiry to Command Center, which we have appointed as
                responsible for facilitating such inquiries.
              </p>

              <div className="mt-6 rounded-2xl border border-[#e2e6ed] bg-[#f6f7f9] p-8 sm:p-10">
                <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-[28px] font-semibold text-[#202941] sm:text-[30px]">
                      Command Center Inc.
                    </h3>
                    <p className="mt-1 text-[15px] text-[#6b7689] sm:text-[16px]">
                      Attn: Privacy Officer
                    </p>
                    <p className="mt-4 text-[15px] leading-[1.5] text-[#505b6d] sm:text-[16px]">
                      100 Innovation Drive, Suite 500
                      <br />
                      Tech District, NY 10011
                    </p>
                  </div>

                  <Link
                    href="/contact-us"
                    className="inline-flex h-12 items-center justify-center rounded-[10px] bg-[#1b2d54] px-8 text-[18px] font-semibold text-[#2ed2cb] shadow-[0_8px_16px_rgba(15,32,66,0.22)] transition hover:bg-[#223867]"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
