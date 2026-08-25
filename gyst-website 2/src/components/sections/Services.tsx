"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain, Mic, Workflow, Network } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: Brain,
    title: "RAG Systems",
    description:
      "Custom knowledge bases that understand your business. Vector databases, semantic search, and intelligent document retrieval.",
  },
  {
    icon: Mic,
    title: "Voice AI Agents",
    description:
      "Conversational AI that sounds human. Phone systems, voice assistants, and real-time speech processing.",
  },
  {
    icon: Workflow,
    title: "Automation Workflows",
    description:
      "End-to-end process automation. Connect APIs, trigger actions, and orchestrate complex business logic.",
  },
  {
    icon: Network,
    title: "Multi-Agent Systems",
    description:
      "Coordinated AI teams that collaborate. Specialized agents working together to solve complex problems.",
  },
];

export function Services() {
  const containerRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      gsap.from(cardsRef.current, {
        y: 80,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <section id="services" ref={containerRef} className="py-24 px-4 bg-card">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Our Services</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We build production-ready AI systems that scale with your business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {services.map((service, i) => (
            <div
              key={service.title}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              className="group bg-background border border-border rounded-xl p-8 hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <service.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
