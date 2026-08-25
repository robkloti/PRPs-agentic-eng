"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

// Simple animated circle data
const aiAnimationData = {
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 180,
  w: 500,
  h: 500,
  nm: "AI Network",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360] }, { t: 180 }] },
        p: { a: 0, k: [250, 250, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [100, 100, 100], e: [120, 120, 100] }, { t: 90, s: [120, 120, 100], e: [100, 100, 100] }, { t: 180 }] }
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "el",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [200, 200] }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.53, 0.75, 0.92, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 3 }
            },
            {
              ty: "fl",
              c: { a: 0, k: [0.53, 0.75, 0.92, 0.2] },
              o: { a: 0, k: 30 }
            }
          ]
        }
      ],
      ip: 0,
      op: 180,
      st: 0
    }
  ]
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
    },
  },
};

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 opacity-30">
          <Lottie animationData={aiAnimationData} loop={true} />
        </div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 opacity-20">
          <Lottie animationData={aiAnimationData} loop={true} />
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto px-4 py-16 pt-32 text-center"
      >
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] bg-clip-text text-transparent"
        >
          Compound your AI investment
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto"
        >
          At GYST, we don&apos;t just build AI systems—we create intelligent ecosystems that learn,
          adapt, and improve. Our RAG systems, voice AI agents, and multi-agent orchestration
          turn your AI stack into a compounding asset that gets better with time.
        </motion.p>

        <motion.p
          variants={itemVariants}
          className="text-base md:text-lg font-semibold text-foreground mb-12"
        >
          Your AI should pay for itself.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button size="lg" className="text-base px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground">
              Get Started Free
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button size="lg" variant="outline" className="text-base px-8 py-6">
              View Live Demos
            </Button>
          </motion.div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-16"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[hsl(var(--green))]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No contracts, cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[hsl(var(--green))]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>30-day money-back guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[hsl(var(--green))]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Enterprise-grade security</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
