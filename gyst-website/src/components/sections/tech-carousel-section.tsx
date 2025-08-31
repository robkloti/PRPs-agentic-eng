'use client'

import React from 'react'
import ScrollReveal from '@/components/motion/scroll-reveal'
import TechStackCarousel from './tech-stack-carousel'

const TechCarouselSection: React.FC = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            <span className="gradient-text-primary">Technologies We Master</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            Industry-leading tools and frameworks powering our AI solutions
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <TechStackCarousel />
        </ScrollReveal>
      </div>
    </section>
  )
}

export default TechCarouselSection