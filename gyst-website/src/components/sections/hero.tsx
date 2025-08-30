'use client'

import React from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { HERO_CONTENT } from '@/lib/constants'
import { motionVariants } from '@/lib/animations'
import MagneticButton from '@/components/motion/magnetic-button'
import FloatingElements from '@/components/motion/floating-elements'
import ScrollReveal from '@/components/motion/scroll-reveal'

const Hero: React.FC = () => {
  const shouldReduceMotion = useReducedMotion()

  const staggeredTextVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
        delayChildren: shouldReduceMotion ? 0 : 0.3
      }
    }
  }

  const wordVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: [0.6, -0.05, 0.01, 0.99] as const
      }
    }
  }

  // Split text into words for staggered animation
  const headlineWords = HERO_CONTENT.headline.split(' ')
  const highlightWords = HERO_CONTENT.highlightedText.split(' ')

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
      
      {/* Floating background elements */}
      <FloatingElements />
      
      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          variants={motionVariants.heroContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Badge/Announcement */}
          <motion.div
            variants={motionVariants.heroTitle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Premium AI Agency</span>
          </motion.div>

          {/* Main headline with staggered animation */}
          <div className="space-y-4">
            <motion.h1
              variants={staggeredTextVariants}
              initial="hidden"
              animate="visible"
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight"
            >
              <div className="flex flex-wrap justify-center gap-x-4 mb-2">
                {headlineWords.map((word, index) => (
                  <motion.span
                    key={`headline-${index}`}
                    variants={wordVariants}
                    className="inline-block"
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
              
              <div className="flex flex-wrap justify-center gap-x-4">
                {highlightWords.map((word, index) => (
                  <motion.span
                    key={`highlight-${index}`}
                    variants={wordVariants}
                    className="inline-block text-primary"
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
            </motion.h1>
          </div>

          {/* Subheading */}
          <motion.p
            variants={motionVariants.heroTitle}
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed"
          >
            {HERO_CONTENT.subheading}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={motionVariants.heroTitle}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <MagneticButton href="/contact" variant="primary" size="lg" className="group">
              {HERO_CONTENT.primaryCTA}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
            
            <MagneticButton href="/case-studies" variant="outline" size="lg">
              {HERO_CONTENT.secondaryCTA}
            </MagneticButton>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={motionVariants.heroTitle}
            className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>50+ Clients Transformed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>$2.3M+ ROI Generated</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>6 Industries Served</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <ScrollReveal delay={1.5} className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{
            duration: shouldReduceMotion ? 0 : 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs uppercase tracking-wide">Scroll to explore</span>
          <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-transparent"></div>
        </motion.div>
      </ScrollReveal>
    </section>
  )
}

export default Hero