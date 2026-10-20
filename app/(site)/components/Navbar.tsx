"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Integrations", href: "/integrations" },
    { label: "Pricing", href: "/pricing" },
    { label: "About Us", href: "/about-us" },
    { label: "FAQ", href: "/faq" },
    { label: "Privacy Policy", href: "/privacy-policy" },
  ];

  const navLinkClass =
    "text-[18px] leading-none font-medium text-[#171b2c] no-underline transition-colors duration-200 hover:text-[#2dc2bd] max-[1180px]:text-[15px]";

  return (
    <header
      className={`sticky top-0 z-50 flex w-full items-center justify-between gap-6 px-16 py-2.5 transition-colors duration-300 min-[1181px]:min-h-[72px] max-[1180px]:flex-wrap max-[1180px]:justify-center max-[1180px]:px-5 max-[1180px]:py-4 ${
        isScrolled
          ? "border-b border-white/60 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/55"
          : "border-b border-[#dcdde1] bg-white"
      }`}
    >
      <Link
        className="leading-none font-bold tracking-[-0.02em] text-[#2dc2bd] text-[24px] max-[1180px]:text-[17px]"
        href="/"
      >
        Twinstr
      </Link>

      <nav
        className="flex items-center gap-[38px] max-[1180px]:order-3 max-[1180px]:w-full max-[1180px]:flex-wrap max-[1180px]:justify-center max-[1180px]:gap-[18px]"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <Link key={item.href} className={navLinkClass} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-[18px]">
        <Link className={navLinkClass} href="/login">
          Sign In
        </Link>
        <Link
          className="whitespace-nowrap rounded-[6px] border border-[#132446] px-[18px] py-3 text-[16px] leading-none font-semibold text-[#132446] no-underline transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#132446] hover:text-[#e9f7ff] max-[1180px]:text-[14px]"
          href="/dashboard"
        >
          Dashboard
        </Link>
        <Link
          className="whitespace-nowrap rounded-[6px] bg-[#132446] px-[22px] py-4 text-[18px] leading-none font-semibold text-[#2fd1c8] no-underline shadow-[0_4px_12px_rgba(11,20,40,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1b3361] hover:shadow-[0_8px_16px_rgba(11,20,40,0.24)] max-[1180px]:text-[15px]"
          href="/signup"
        >
          Start Free Trial
        </Link>
      </div>
    </header>
  );
}
