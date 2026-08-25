"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";

const caseStudies = [
  {
    title: "Primary Care Practice",
    subtitle: "Streamlined Scheduling with AI",
    industry: "Healthcare",
    logo: "🏥",
    metrics: [
      { label: "Efficiency Gain", value: "85%", description: "in appointment scheduling" },
      { label: "Cost Reduction", value: "60%", description: "in administrative overhead" },
      { label: "Patient Satisfaction", value: "94%", description: "overall rating" },
    ],
    challenges: [
      "Manual appointment scheduling consuming 15+ hours/week",
      "High no-show rates due to lack of automated reminders",
      "Staff overwhelmed with repetitive phone calls",
    ],
    solutions: [
      "AI voice agent handling 24/7 appointment booking",
      "Automated SMS/email reminders reducing no-shows by 40%",
      "Natural language processing for insurance verification",
    ],
    results: "Freed up 15 hours/week for patient care, reduced administrative costs by $3,500/month, improved patient experience with instant scheduling.",
  },
  {
    title: "E-commerce Brand",
    subtitle: "AI-Powered Customer Support at Scale",
    industry: "Retail",
    logo: "🛍️",
    metrics: [
      { label: "Response Time", value: "< 30sec", description: "average first response" },
      { label: "Volume Handled", value: "10k+", description: "monthly inquiries" },
      { label: "CSAT Score", value: "4.8/5", description: "customer satisfaction" },
    ],
    challenges: [
      "Customer inquiries growing 300% YoY",
      "Support team couldn't scale fast enough",
      "High ticket volume during peak hours",
    ],
    solutions: [
      "RAG-powered chatbot with product knowledge base",
      "Intelligent routing to human agents for complex issues",
      "Proactive order tracking and return handling",
    ],
    results: "Handled 85% of inquiries automatically, reduced response time from 4 hours to 30 seconds, saved $8k/month in support costs.",
  },
  {
    title: "Financial Services Firm",
    subtitle: "Automated Compliance & Document Processing",
    industry: "Finance",
    logo: "💼",
    metrics: [
      { label: "Processing Speed", value: "12x", description: "faster document review" },
      { label: "Accuracy", value: "99.2%", description: "in compliance checks" },
      { label: "ROI", value: "380%", description: "in first year" },
    ],
    challenges: [
      "Manual review of 500+ documents/month",
      "Compliance errors costing $50k+ in penalties",
      "7-day turnaround time for loan applications",
    ],
    solutions: [
      "Multi-agent system for document classification and extraction",
      "Automated KYC/AML compliance checks",
      "Intelligent fraud detection with real-time alerts",
    ],
    results: "Reduced document processing time from 7 days to 14 hours, eliminated compliance errors, increased loan approval rate by 23%.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

export function CaseStudies() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="case-studies" className="py-24 px-4 bg-card">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Real Results, Measurable Impact
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how we&apos;ve helped businesses transform their operations with AI
          </p>
        </div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
        >
          {caseStudies.map((study) => (
            <motion.div
              key={study.title}
              variants={itemVariants}
              className="bg-background border border-border rounded-xl p-8 hover:border-accent hover:shadow-xl hover:shadow-accent/20 transition-all duration-300 cursor-pointer group"
            >
              {/* Header */}
              <div className="mb-6">
                <div className="text-4xl mb-3">{study.logo}</div>
                <div className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                  {study.industry}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {study.title}
                </h3>
                <p className="text-sm text-muted-foreground">{study.subtitle}</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
                {study.metrics.map((metric) => (
                  <div key={metric.label} className="text-center">
                    <div className="text-2xl font-bold text-accent mb-1">
                      {metric.value}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {metric.description}
                    </div>
                  </div>
                ))}
              </div>

              {/* Results */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-foreground mb-2">Key Results</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {study.results}
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 text-accent font-semibold text-sm group-hover:gap-3 transition-all">
                Read Full Case Study
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
