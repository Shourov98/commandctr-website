import AboutUsCarousel from "../components/AboutUsCarousel";
import AboutUsPerksSection from "../components/AboutUsPerksSection";
import AboutUsPropertiesSection from "../components/AboutUsPropertiesSection";
import AboutUsTopHeading from "../components/AboutUsTopHeading";
import AboutUsJourneySection from "../components/AboutUsJourneySection";
import AboutUsConstructingCoherenceSection from "../components/AboutUsConstructingCoherenceSection";
import AboutUsFaqSection from "../components/AboutUsFaqSection";

export default function AboutUsPage() {
  return (
    <main className="overflow-x-hidden bg-[#f3f4f6]">
      <AboutUsTopHeading />
      <AboutUsCarousel />
      <AboutUsPropertiesSection />
      <AboutUsPerksSection />
      <AboutUsJourneySection />
      <AboutUsConstructingCoherenceSection />
      <AboutUsFaqSection />
    </main>
  );
}
