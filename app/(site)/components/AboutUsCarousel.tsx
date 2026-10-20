"use client";

import Image from "next/image";
import { CreditCard, ShoppingCart, Store, Truck } from "lucide-react";
import { useEffect, useState } from "react";

const slides = [
  { src: "/about-us-hero.png", alt: "Team collaborating on commerce strategy" },
  { src: "/about-us-hero2.svg", alt: "Team planning growth operations" },
];

export default function AboutUsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="bg-[#f3f4f6] pb-16 lg:pb-24">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[26px] border border-[#c8d0dc] bg-[#e9edf3] shadow-[0_20px_42px_rgba(16,32,58,0.16)]">
          <div className="relative h-[380px] w-full sm:h-[520px] lg:h-[760px]">
            {slides.map((slide, index) => (
              <div
                key={slide.src}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === activeIndex ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  className="object-contain"
                />
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-4 hidden items-center md:flex lg:left-8">
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="h-24 w-[4px] rounded-full bg-[#2fd1c8]" />
              <div className="space-y-3 lg:space-y-4">
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-[#1a2749] text-white shadow-md lg:h-[72px] lg:w-[72px]">
                  <ShoppingCart className="h-6 w-6 lg:h-7 lg:w-7" />
                </div>
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-[#1a2749] text-white shadow-md lg:h-[72px] lg:w-[72px]">
                  <Store className="h-6 w-6 lg:h-7 lg:w-7" />
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-4 hidden items-center md:flex lg:right-8">
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="space-y-3 lg:space-y-4">
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-[#1a2749] text-white shadow-md lg:h-[72px] lg:w-[72px]">
                  <Truck className="h-6 w-6 lg:h-7 lg:w-7" />
                </div>
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-[#1a2749] text-white shadow-md lg:h-[72px] lg:w-[72px]">
                  <CreditCard className="h-6 w-6 lg:h-7 lg:w-7" />
                </div>
              </div>
              <div className="h-24 w-[4px] rounded-full bg-[#233a6e]" />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-[#1a2749] px-4 py-4 text-white shadow-xl sm:bottom-6 sm:left-6 sm:right-6 sm:px-7">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#223765] text-[#2fd1c8]">
                  ↗
                </div>
                <div>
                  <p className="text-lg font-semibold sm:text-xl">Growth Velocity</p>
                  <p className="text-sm text-[#7f90af]">Year over year expansion</p>
                </div>
              </div>
              <p className="ml-auto pr-2 text-2xl font-bold text-[#1ee57a] sm:text-3xl">+124%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
