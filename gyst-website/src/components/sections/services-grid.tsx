'use client'

import React from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Brain, Database, MessageSquare, TrendingUp, Wand2, Cog } from 'lucide-react'
import { services, Service } from '@/data/services'
import { motionVariants } from '@/lib/animations'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'
import { Badge } from '@/components/ui/badge'

// Icon mapping for services
const ServiceIcons = {
  strategy: Brain,
  rag: Database,
  chatbot: MessageSquare,
  leadgen: TrendingUp,
  content: Wand2,
  implementation: Cog
} as const

const ServiceCard: React.FC<{ service: Service; index: number }> = ({ service, index }) => {
  const shouldReduceMotion = useReducedMotion()
  const IconComponent = ServiceIcons[service.icon as keyof typeof ServiceIcons] || Brain

  return (
    <ScrollReveal delay={index * 0.1} className="h-full">
      <motion.div
        className="relative h-full p-8 bg-card border border-border shadow-elegant hover:shadow-elegant-hover transition-all duration-300 group cursor-pointer rounded-lg"
        variants={motionVariants.serviceCard}
        whileHover={shouldReduceMotion ? {} : "hover"}
        layout
      >
        {/* Service category badge */}
        <div className="flex items-center justify-between mb-6">
          <Badge 
            variant="secondary" 
            className={cn(
              'text-xs font-medium',
              service.category === 'strategy' && 'bg-primary/10 text-primary',
              service.category === 'implementation' && 'bg-secondary/10 text-secondary',
              service.category === 'optimization' && 'bg-accent/10 text-accent'
            )}
          >
            {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
          </Badge>
          {(service.deliveryTime || service.pricing.starting) && (
            <div className="text-right text-sm text-muted-foreground">
              {service.deliveryTime && <div>{service.deliveryTime}</div>}
              {service.pricing.starting && <div className="font-semibold text-foreground">{service.pricing.starting}+</div>}
            </div>
          )}
        </div>

        {/* Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <IconComponent className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
            {service.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {service.description}
          </p>
        </div>

        {/* Includes section */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Includes:
          </h4>
          <ul className="space-y-2">
            {service.includes.slice(0, 3).map((item, itemIndex) => (
              <li key={itemIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
            {service.includes.length > 3 && (
              <li className="text-sm text-muted-foreground italic">
                +{service.includes.length - 3} more features
              </li>
            )}
          </ul>
        </div>

        {/* Benefits section */}
        <div className="space-y-4 mb-8">
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Key Benefits:
          </h4>
          <ul className="space-y-2">
            {service.benefits.slice(0, 2).map((benefit, benefitIndex) => (
              <li key={benefitIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-2 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Industries */}
        <div className="flex flex-wrap gap-1 mb-6">
          {service.industries.slice(0, 3).map((industry) => (
            <Badge key={industry} variant="outline" className="text-xs">
              {industry}
            </Badge>
          ))}
          {service.industries.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{service.industries.length - 3}
            </Badge>
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <MagneticButton 
            href={`/services/${service.id}`}
            variant="outline" 
            size="sm"
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
          >
            Learn More
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </MagneticButton>
        </div>

        {/* Hover glow effect */}
        <motion.div
          className="absolute inset-0 rounded-[inherit] opacity-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${
              service.category === 'strategy' 
                ? 'oklch(0.9680 0.2110 109.7692)' 
                : service.category === 'implementation'
                ? 'oklch(0.9054 0.1546 194.7689)'
                : 'oklch(0.7017 0.3225 328.3634)'
            }10 0%, transparent 60%)`
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: shouldReduceMotion ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </ScrollReveal>
  )
}

const ServicesGrid: React.FC = () => {

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6"
            >
              <Cog className="w-4 h-4" />
              <span className="text-sm font-medium">AI Services & Solutions</span>
            </motion.div>

            <motion.h2
              variants={motionVariants.heroTitle}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4"
            >
              Transform Your Business
              <br />
              <span className="gradient-text-primary">with Custom AI Solutions</span>
            </motion.h2>

            <motion.p
              variants={motionVariants.heroTitle}
              className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto"
            >
              From strategic planning to full-scale implementation, we deliver AI solutions 
              that drive measurable business outcomes and competitive advantages.
            </motion.p>
          </motion.div>
        </ScrollReveal>

        {/* Services grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={motionVariants.staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {services.map((service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          ))}
        </motion.div>

        {/* CTA section */}
        <ScrollReveal delay={0.8} className="text-center mt-16">
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-foreground">
              Ready to Get Started?
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Schedule a consultation to discuss your AI transformation goals. 
              We&rsquo;ll create a custom roadmap tailored to your business needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg">
                Schedule Consultation
                <ArrowRight className="ml-2 w-4 h-4" />
              </MagneticButton>
              <MagneticButton href="/case-studies" variant="outline" size="lg">
                View Success Stories
              </MagneticButton>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default ServicesGrid