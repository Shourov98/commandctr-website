"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 49,
    cta: "Start Trial",
    features: ["2 Channels", "500 Orders/mo", "Basic Support"],
  },
  {
    name: "Growth",
    monthlyPrice: 149,
    cta: "Start Trial",
    features: [
      "10 Channels",
      "5,000 Orders/mo",
      "AI Optimization Suite",
      "Custom API Access",
    ],
    popular: true,
  },
  {
    name: "Scale",
    monthlyPrice: 399,
    cta: "Contact Sales",
    features: [
      "Unlimited Channels",
      "Unlimited Orders",
      "Advanced API Limits",
      "Dedicated Success Manager",
    ],
  },
];

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const pricingPlans = useMemo(() => {
    return plans.map((plan) => {
      const amount =
        billingCycle === "yearly"
          ? Math.round(plan.monthlyPrice * 12 * 0.8) / 12
          : plan.monthlyPrice;

      return {
        ...plan,
        displayPrice: Number.isInteger(amount) ? amount.toString() : amount.toFixed(2),
      };
    });
  }, [billingCycle]);

  return (
    <section className="bg-[#f3f4f6] px-6 py-20 sm:px-10 lg:px-16 lg:py-24">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#131c32] sm:text-5xl">
            Simple Pricing for <span className="text-[#31c8c5]">Scale</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[860px] text-base leading-relaxed text-[#657184] sm:text-xl">
            Transparent plans for every stage of your ecommerce empire. Upgrade or
            downgrade at any time.
          </p>

          <div className="mt-7 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`text-base font-medium transition-colors sm:text-xl ${
                billingCycle === "monthly" ? "text-[#1b2337]" : "text-[#8d98a9]"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() =>
                setBillingCycle((prev) => (prev === "monthly" ? "yearly" : "monthly"))
              }
              aria-label="Toggle billing cycle"
              className={`relative h-9 w-16 rounded-full transition-colors ${
                billingCycle === "yearly" ? "bg-[#31c8c5]" : "bg-[#d0d5de]"
              }`}
            >
              <span
                className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-all ${
                  billingCycle === "yearly" ? "left-8" : "left-1"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`text-base font-medium transition-colors sm:text-xl ${
                billingCycle === "yearly" ? "text-[#1b2337]" : "text-[#8d98a9]"
              }`}
            >
              Yearly
            </button>

            <span className="rounded-full bg-[#d7f2ef] px-3 py-1 text-sm font-medium text-[#0f8a85]">
              Save 20%
            </span>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-end">
          {pricingPlans.map((plan) => {
            const featured = !!plan.popular;

            return (
              <article
                key={plan.name}
                className={`group relative rounded-[28px] border px-8 py-10 transition-all duration-300 hover:-translate-y-2 ${
                  featured
                    ? "border-[#2c4374] bg-[#273d70] text-white shadow-[0_8px_18px_rgba(16,29,56,0.22)] hover:shadow-[0_22px_45px_rgba(20,40,77,0.42)]"
                    : "border-[#e2e5ea] bg-[#e8eaee] text-[#1a2236] shadow-[0_6px_14px_rgba(21,34,62,0.08)] hover:border-[#cad3e2] hover:shadow-[0_18px_34px_rgba(21,34,62,0.16)]"
                }`}
              >
                {featured ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#32cbc6] px-5 py-1.5 text-sm font-bold uppercase tracking-wide text-[#ffffff]">
                    Most Popular
                  </span>
                ) : null}

                <h3 className="text-[18px] font-semibold leading-tight sm:text-[22px]">
                  {plan.name}
                </h3>

                <p className="mt-2 flex items-end">
                  <span className="text-[40px] font-bold leading-none sm:text-[48px]">
                    ${plan.displayPrice}
                  </span>
                  <span
                    className={`mb-1.5 text-[22px] ${
                      featured ? "text-[#b7c3d9]" : "text-[#7b8496]"
                    }`}
                  >
                    /mo
                  </span>
                </p>

                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-center gap-3 text-[15px] sm:text-[16px] ${
                        featured ? "text-[#e7edf8]" : "text-[#5e687b]"
                      }`}
                    >
                      <Check className="h-5 w-5 shrink-0" strokeWidth={3} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`mt-9 w-full rounded-full px-8 py-3.5 text-[17px] font-semibold transition-all duration-300 ${
                    featured
                      ? "bg-white text-[#2b354a] group-hover:bg-[#e9f0fc] group-hover:shadow-lg"
                      : "bg-white text-[#3a4356] group-hover:bg-[#f8fbff] group-hover:shadow-md"
                  }`}
                >
                  {plan.cta}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
