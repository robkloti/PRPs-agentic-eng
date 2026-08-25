"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const team = [
  {
    name: "Team Collaboration",
    role: "Our distributed team",
    image: "/images/team-1.jpg", // Placeholder
    alt: "GYST team collaborating",
  },
  {
    name: "AI Development",
    role: "Building the future",
    image: "/images/team-2.jpg", // Placeholder
    alt: "Developer working on AI systems",
  },
  {
    name: "Client Success",
    role: "Your partner in growth",
    image: "/images/team-3.jpg", // Placeholder
    alt: "Client meeting and consultation",
  },
];

export function Team() {
  return (
    <section id="about" className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Meet the Team
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We&apos;re a distributed team of AI engineers, designers, and strategists
            passionate about building intelligent systems that scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-card border border-border">
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">[Team Photo]</span>
                </div>
                {/* <Image
                  src={member.image}
                  alt={member.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                /> */}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-1">
                {member.name}
              </h3>
              <p className="text-muted-foreground">{member.role}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">$10B+</div>
            <div className="text-sm text-muted-foreground">Revenue Covered</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">200+</div>
            <div className="text-sm text-muted-foreground">AI Agents Deployed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">10M</div>
            <div className="text-sm text-muted-foreground">API Calls/Month</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-sm text-muted-foreground">Uptime SLA</div>
          </div>
        </div>
      </div>
    </section>
  );
}
