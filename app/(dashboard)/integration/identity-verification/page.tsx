import Link from "next/link";
import { Camera, IdCard, LoaderCircle, Lock, Moon } from "lucide-react";

export default function IdentityVerificationPage() {
  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="relative mx-auto max-w-5xl">
        <button className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[#91a2bd] shadow-sm" type="button">
          <Moon className="h-4 w-4" />
        </button>

        <div className="mx-auto max-w-3xl pt-16 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-[#25344d]">Identity Verification</h1>
          <p className="mt-4 text-xl leading-relaxed text-[#8ea0bf]">
            To ensure the highest security standards, we partner with Amazon for identity verification. Please prepare your
            government-issued ID.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-10">
          <div className="flex flex-col items-center">
            <span className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1b2748] text-white">
              <IdCard className="h-5 w-5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5d6f8f]">Government ID</p>
          </div>
          <span className="h-px w-12 bg-[#dce4f1]" />
          <div className="flex flex-col items-center">
            <span className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1b2748] text-white">
              <Camera className="h-5 w-5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5d6f8f]">Camera Access</p>
          </div>
        </div>

        <article className="relative mx-auto mt-6 max-w-4xl rounded-2xl border border-[#e0e7f2] bg-[#f8fafd] p-6" data-tour="identity-final">
          <span className="absolute right-4 top-3 inline-flex items-center gap-1 text-xs text-[#8ea0bf]">
            <Lock className="h-3.5 w-3.5" /> Secure Connection
          </span>

          <div className="flex h-[300px] flex-col items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#6b7d9b]" />
            <p className="mt-3 text-sm font-semibold text-[#5d6f8f]">Loading secure verification portal...</p>
            <p className="text-xs text-[#9aabc6]">Connecting to Amazon Verification Services</p>
          </div>
        </article>

        <div className="mx-auto mt-6 max-w-4xl border-t border-[#e1e8f4] pt-6">
          <div className="flex items-center justify-between">
            <Link className="inline-flex h-11 w-44 items-center justify-center rounded-xl border border-[#c7d3e6] text-sm font-semibold text-[#60708d]" href="/integration/banking">
              Cancel
            </Link>
            <Link className="inline-flex h-11 w-64 items-center justify-center rounded-xl bg-[#233a69] text-sm font-semibold text-white" href="/integration">
              Start Verification
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-[#9aabc6]">
            <Lock className="-mt-0.5 mr-1 inline h-3.5 w-3.5" /> Your video will only be shared with Amazon for verification purposes.
          </p>
        </div>
      </div>
    </section>
  );
}
