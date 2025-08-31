'use client'

import React from 'react'
import { motion } from 'motion/react'
import { ArrowRight, ExternalLink, TrendingUp } from 'lucide-react'
import { caseStudies } from '@/data/case-studies'
import { motionVariants } from '@/lib/animations'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'
import CounterAnimation from '@/components/motion/counter-animation'
import { Badge } from '@/components/ui/badge'

interface CaseStudyCardProps {
  caseStudy: typeof caseStudies[0]
  index: number
  featured?: boolean
}

const CaseStudyCard: React.FC<CaseStudyCardProps> = ({ caseStudy, index, featured = false }) => {
  const shouldReduceMotion = useReducedMotion()

  return (
    <ScrollReveal delay={index * 0.2} className="h-full">
      <motion.div
        className={cn(
          'relative p-8 bg-card border border-border shadow-elegant hover:shadow-elegant-hover transition-all duration-300 group cursor-pointer h-full flex flex-col rounded-lg',
          featured && 'border-primary/20 shadow-elegant-hover'
        )}
        variants={motionVariants.serviceCard}
        whileHover={shouldReduceMotion ? {} : "hover"}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs">
              {caseStudy.industry}
            </Badge>
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {caseStudy.client}
            </h3>
            <div className="text-sm text-muted-foreground">
              {caseStudy.timeline} • {caseStudy.teamSize}
            </div>
          </div>
          {featured && (
            <Badge className="bg-primary text-primary-foreground">Featured</Badge>
          )}
        </div>

        {/* Challenge & Solution */}
        <div className="space-y-4 mb-6 flex-grow">
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
              Challenge:
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {caseStudy.challenge}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
              Solution:
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {caseStudy.solution}
            </p>
          </div>
        </div>

        {/* Results - Key Metrics */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
            Results:
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {caseStudy.results.slice(0, 4).map((result, resultIndex) => (
              <div key={resultIndex} className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-1">
                  <CounterAnimation
                    value={parseFloat(result.value.replace(/[^\d.]/g, ''))}
                    suffix={result.value.replace(/[\d.]/g, '')}
                    delay={index * 0.2 + resultIndex * 0.1}
                    duration={2}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {result.description.split(' ').slice(0, 3).join(' ')}...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Services used */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {caseStudy.services.slice(0, 3).map((service) => (
              <Badge key={service} variant="outline" className="text-xs">
                {service}
              </Badge>
            ))}
            {caseStudy.services.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{caseStudy.services.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Testimonial (if available) */}
        {caseStudy.testimonial && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
            <blockquote className="text-sm italic text-muted-foreground mb-2">
              &ldquo;{caseStudy.testimonial.quote.substring(0, 120)}...&rdquo;
            </blockquote>
            <cite className="text-xs font-medium text-foreground">
              {caseStudy.testimonial.author}, {caseStudy.testimonial.position}
            </cite>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          <MagneticButton 
            href={`/case-studies/${caseStudy.id}`}
            variant="outline" 
            size="sm"
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
          >
            View Full Case Study
            <ExternalLink className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </MagneticButton>
        </div>

        {/* Hover glow effect */}
        <motion.div
          className="absolute inset-0 rounded-[inherit] opacity-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, oklch(0.9680 0.2110 109.7692)05 0%, transparent 60%)`
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: shouldReduceMotion ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </ScrollReveal>
  )
}

const CaseStudies: React.FC = () => {
  const featuredStudies = caseStudies.filter(study => study.featured)

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <motion.div
            variants={motionVariants.heroContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div
              variants={motionVariants.heroTitle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary border border-secondary/20 mb-6"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Proven Success Stories</span>
            </motion.div>

            <motion.h2
              variants={motionVariants.heroTitle}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4"
            >
              Real Results,
              <br />
              <span className="gradient-text-accent">Measurable Impact</span>
            </motion.h2>

            <motion.p
              variants={motionVariants.heroTitle}
              className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto"
            >
              See how we&rsquo;ve helped companies across industries transform their operations 
              and achieve remarkable ROI through strategic AI implementation.
            </motion.p>
          </motion.div>
        </ScrollReveal>

        {/* Featured case study spotlight */}
        {featuredStudies.length > 0 && (
          <ScrollReveal className="mb-16">
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 lg:p-12 border border-primary/10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Badge className="bg-primary text-primary-foreground">Featured Success</Badge>
                    <h3 className="text-3xl font-bold text-foreground">
                      {featuredStudies[0].client} achieves
                    </h3>
                    <div className="text-4xl font-bold">
                      <CounterAnimation
                        value={parseInt(featuredStudies[0].results[0].value)}
                        suffix={featuredStudies[0].results[0].value.replace(/\d/g, '')}
                        className="text-primary"
                        duration={2.5}
                      />
                      <span className="text-lg text-muted-foreground ml-2">
                        {featuredStudies[0].results[0].description}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {featuredStudies[0].solution}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {featuredStudies[0].services.map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>

                  <MagneticButton 
                    href={`/case-studies/${featuredStudies[0].id}`}
                    variant="primary"
                  >
                    View Full Case Study
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </MagneticButton>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {featuredStudies[0].results.slice(0, 4).map((result, index) => (
                    <motion.div
                      key={index}
                      className="text-center p-6 bg-background/80 backdrop-blur-sm rounded-xl border border-border/50"
                      variants={motionVariants.metricCounter}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="text-3xl font-bold text-primary mb-2">
                        <CounterAnimation
                          value={parseFloat(result.value.replace(/[^\d.]/g, ''))}
                          suffix={result.value.replace(/[\d.]/g, '')}
                          delay={0.5 + index * 0.1}
                          duration={2}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.description}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Case studies grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={motionVariants.staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {featuredStudies.map((caseStudy, index) => (
            <CaseStudyCard 
              key={caseStudy.id} 
              caseStudy={caseStudy} 
              index={index}
              featured={true}
            />
          ))}
        </motion.div>

        {/* CTA section */}
        <ScrollReveal delay={1.0} className="text-center mt-16">
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-foreground">
              Ready to Create Your Success Story?
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join the growing list of companies that have transformed their business 
              with GYST&rsquo;s AI solutions. Let&rsquo;s discuss your transformation goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="/contact" variant="primary" size="lg">
                Start Your AI Journey
                <ArrowRight className="ml-2 w-4 h-4" />
              </MagneticButton>
              <MagneticButton href="/case-studies" variant="outline" size="lg">
                Explore All Case Studies
              </MagneticButton>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default CaseStudies