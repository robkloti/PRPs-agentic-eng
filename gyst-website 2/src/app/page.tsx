import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { TechStack } from "@/components/sections/TechStack";
import { Team } from "@/components/sections/Team";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { CTA } from "@/components/sections/CTA";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Services />
      <TechStack />
      <Team />
      <CaseStudies />
      <CTA />
    </main>
  );
}
