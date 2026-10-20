import CoreModules from "./components/CoreModules";
import Features from "./components/Features";
import Hero from "./components/Hero";
import PricingSection from "./components/PricingSection";
import TestimonialSection from "./components/TestimonialSection";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <CoreModules />
      <TestimonialSection />
      <PricingSection />
    </div>
  );
}
