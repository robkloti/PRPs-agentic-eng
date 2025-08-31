'use client'

import React from 'react'
import { motion } from 'motion/react'
import Image from 'next/image'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import ScrollReveal from '@/components/motion/scroll-reveal'

interface ClientLogo {
  name: string
  src: string
  alt: string
  width?: number
  height?: number
}

const clientLogos: ClientLogo[] = [
  {
    name: 'Galaxy Housing',
    src: '/images/clients/galaxy-housing.svg',
    alt: 'Galaxy Housing - Property Management AI Solutions',
    width: 120,
    height: 40
  },
  {
    name: 'Force at Work',
    src: '/images/clients/force-at-work.svg', 
    alt: 'Force at Work - Marketing AI Automation',
    width: 120,
    height: 40
  },
  {
    name: 'RC Wallet',
    src: '/images/clients/rc-wallet.svg',
    alt: 'RC Wallet - Crypto Finance AI Solutions', 
    width: 120,
    height: 40
  }
]

interface ClientLogosProps {
  title?: string
  subtitle?: string
  showTitle?: boolean
  className?: string
}

const ClientLogos: React.FC<ClientLogosProps> = ({ 
  title = "Trusted by Industry Leaders",
  subtitle = "Join the growing list of companies transforming with GYST's AI solutions",
  showTitle = true,
  className = ""
}) => {
  const shouldReduceMotion = useReducedMotion()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
        delayChildren: 0.2
      }
    }
  }

  const logoVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: [0.6, -0.05, 0.01, 0.99]
      }
    }
  }

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {showTitle && (
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          </ScrollReveal>
        )}

        <ScrollReveal delay={showTitle ? 0.2 : 0}>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {clientLogos.map((logo) => (
              <motion.div
                key={logo.name}
                variants={logoVariants}
                className="group"
                whileHover={shouldReduceMotion ? {} : { 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="relative p-4 rounded-lg transition-all duration-300 group-hover:shadow-elegant">
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width || 120}
                    height={logo.height || 40}
                    className="h-8 sm:h-10 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    priority
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                    {logo.name}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Add more placeholder */}
            <motion.div
              variants={logoVariants}
              className="group cursor-pointer"
            >
              <div className="relative p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-primary/50 transition-colors duration-300">
                <div className="h-8 sm:h-10 w-24 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <span className="text-sm font-medium">Your Logo</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default ClientLogos