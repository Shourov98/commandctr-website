import { Clock3, Headset, Mail, MessageCircleMore, MoveRight } from "lucide-react";

export default function ContactUs() {
  return (
    <section className="bg-[linear-gradient(180deg,#eaf5f5_0%,#f3f4f6_34%)] px-6 py-14 sm:px-10 lg:px-16 lg:py-18">
      <div className="mx-auto w-full lg:w-[80%]">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-[#24479b] sm:text-6xl">Get in Touch</h1>
          <p className="mt-4 text-xl text-[#5e6b80] sm:text-2xl">
            Our team is here to help you scale your commerce empire.
          </p>
        </div>

        <div className="mt-12 grid gap-7 lg:grid-cols-[1.35fr_0.95fr]">
          <section className="rounded-xl border border-[#e3e7ee] bg-[#f7f8fa] p-6 shadow-sm sm:p-8">
            <form className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-lg font-semibold text-[#4d586b]" htmlFor="full-name">
                    Full Name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    placeholder="John Doe"
                    className="h-11 w-full rounded-lg border border-[#cdd4de] bg-[#f7f8fa] px-4 text-base text-[#2f3b52] placeholder:text-[#9ea7b6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-lg font-semibold text-[#4d586b]" htmlFor="business-email">
                    Business Email
                  </label>
                  <input
                    id="business-email"
                    type="email"
                    placeholder="john@company.com"
                    className="h-11 w-full rounded-lg border border-[#cdd4de] bg-[#f7f8fa] px-4 text-base text-[#2f3b52] placeholder:text-[#9ea7b6] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-lg font-semibold text-[#4d586b]" htmlFor="company-name">
                  Company Name
                </label>
                <input
                  id="company-name"
                  type="text"
                  placeholder="Acme Inc."
                  className="h-11 w-full rounded-lg border border-[#cdd4de] bg-[#f7f8fa] px-4 text-base text-[#2f3b52] placeholder:text-[#9ea7b6] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-lg font-semibold text-[#4d586b]" htmlFor="subject">
                  Subject
                </label>
                <select
                  id="subject"
                  className="h-11 w-full rounded-lg border border-[#cdd4de] bg-[#f7f8fa] px-4 text-base text-[#556076] focus:outline-none"
                  defaultValue="General Inquiry"
                >
                  <option>General Inquiry</option>
                  <option>Sales Question</option>
                  <option>Technical Support</option>
                  <option>Partnership</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-lg font-semibold text-[#4d586b]" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="How can we help you?"
                  className="w-full resize-none rounded-lg border border-[#cdd4de] bg-[#f7f8fa] px-4 py-3 text-base text-[#2f3b52] placeholder:text-[#9ea7b6] focus:outline-none"
                />
              </div>

              <button
                type="button"
                className="h-12 w-full rounded-lg bg-[#2a4798] text-xl font-semibold text-white transition hover:bg-[#3657ae]"
              >
                Send Message
              </button>
            </form>
          </section>

          <div className="space-y-7">
            <section className="rounded-xl border border-[#e3e7ee] bg-[#f7f8fa] p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2.5">
                <Headset className="h-5 w-5 text-[#2fd1c8]" />
                <h2 className="text-[40px] font-bold text-[#28489b]">Support &amp; Sales</h2>
              </div>

              <div className="mt-7 space-y-7">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-md bg-[#edf1f7] p-2">
                    <Mail className="h-5 w-5 text-[#2a4798]" />
                  </div>
                  <div>
                    <p className="text-lg text-[#7b8798]">Email Support</p>
                    <p className="text-[20px] font-semibold text-[#2a4798]">
                      support@commandcenter.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="rounded-md bg-[#edf1f7] p-2">
                    <Clock3 className="h-5 w-5 text-[#2a4798]" />
                  </div>
                  <div>
                    <p className="text-lg text-[#7b8798]">Business Hours</p>
                    <p className="text-[34px] font-semibold text-[#2f3a53]">9 AM - 6 PM EST</p>
                    <p className="text-[18px] text-[#6a768d]">Monday - Friday</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-[#e5e8ef] pt-6">
                <p className="text-lg font-medium text-[#6f7a8e]">Need a quicker answer?</p>
                <button
                  type="button"
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#2a4798] text-xl font-semibold text-[#2a4798] transition hover:bg-[#edf3ff]"
                >
                  <MessageCircleMore className="h-5 w-5" />
                  Chat with Us
                </button>
              </div>
            </section>

            <section className="rounded-xl bg-[#24479b] p-6 text-white shadow-sm sm:p-8">
              <h3 className="text-[39px] font-bold">Visit our Headquarters</h3>
              <p className="mt-4 text-[17px] leading-[1.5] text-[#cad5ee]">
                100 Innovation Drive, Suite 500
                <br />
                Tech District, NY 10011
              </p>
              <a
                href="#"
                className="mt-4 inline-flex items-center gap-1.5 text-[17px] font-semibold text-[#2fd1c8] transition hover:text-[#56c7c6]"
              >
                Get Directions
                <MoveRight className="h-4 w-4" />
              </a>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
