import Hero from "@/components/sections/hero";
import TechCarouselSection from "@/components/sections/tech-carousel-section";
import ClientLogos from "@/components/sections/client-logos";
import ServicesGrid from "@/components/sections/services-grid";
import TechStack from "@/components/sections/tech-stack";
import CaseStudies from "@/components/sections/case-studies";

export default function Home() {
  return (
    <>
      <Hero />
      <TechCarouselSection />
      <ServicesGrid />
      <ClientLogos />
      <TechStack />
      <CaseStudies />
    </>
  );
}
