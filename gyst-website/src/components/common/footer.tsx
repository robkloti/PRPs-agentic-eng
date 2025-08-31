'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react'
import { GYST_BRAND, NAVIGATION_LINKS, SOCIAL_LINKS } from '@/lib/constants'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'

const Footer: React.FC = () => {
  const shouldReduceMotion = useReducedMotion()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-foreground text-background">
      {/* Newsletter CTA section */}
      <div className="border-b border-background/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <ScrollReveal className="text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h3 className="text-3xl font-bold">
                Stay Ahead with AI Insights
              </h3>
              <p className="text-background/70 text-lg">
                Get the latest AI trends, case studies, and implementation strategies 
                delivered to your inbox monthly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-4 py-3 rounded-lg bg-background/10 border border-background/20 text-background placeholder:text-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <MagneticButton variant="primary" size="md">
                  Subscribe
                  <ArrowRight className="ml-2 w-4 h-4" />
                </MagneticButton>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <ScrollReveal>
              <div className="space-y-4">
                <Link href="/" className="flex items-center">
                  <div className="relative w-16 h-16">
                    <Image
                      src="/images/branding/gyst-logo-removebg-preview.png"
                      alt="GYST Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                </Link>
                <p className="text-background/70 text-sm leading-relaxed">
                  {GYST_BRAND.description}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-background/70">
                    <Mail className="w-4 h-4" />
                    <span>{GYST_BRAND.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-background/70">
                    <Phone className="w-4 h-4" />
                    <span>{GYST_BRAND.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-background/70">
                    <MapPin className="w-4 h-4" />
                    <span>{GYST_BRAND.address}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Services */}
          <div>
            <ScrollReveal delay={0.1}>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/services#ai-strategy" className="hover:text-primary transition-colors">AI Strategy</Link></li>
                <li><Link href="/services#rag-solutions" className="hover:text-primary transition-colors">RAG Solutions</Link></li>
                <li><Link href="/services#chatbots" className="hover:text-primary transition-colors">AI Chatbots</Link></li>
                <li><Link href="/services#lead-generation" className="hover:text-primary transition-colors">Lead Generation</Link></li>
                <li><Link href="/services#content" className="hover:text-primary transition-colors">Content Generation</Link></li>
                <li><Link href="/services#implementation" className="hover:text-primary transition-colors">Custom Development</Link></li>
              </ul>
            </ScrollReveal>
          </div>

          {/* Company */}
          <div>
            <ScrollReveal delay={0.2}>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-background/70">
                {NAVIGATION_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>

          {/* Resources */}
          <div>
            <ScrollReveal delay={0.3}>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/blog" className="hover:text-primary transition-colors">AI Insights Blog</Link></li>
                <li><Link href="/case-studies" className="hover:text-primary transition-colors">Success Stories</Link></li>
                <li><Link href="/resources" className="hover:text-primary transition-colors">Implementation Guides</Link></li>
                <li><Link href="/webinars" className="hover:text-primary transition-colors">Expert Webinars</Link></li>
                <li><Link href="/support" className="hover:text-primary transition-colors">Support Center</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">Get Quote</Link></li>
              </ul>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-background/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-background/70">
                © {currentYear} {GYST_BRAND.name}. All rights reserved.
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <Link href="/privacy" className="text-background/70 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-background/70 hover:text-primary transition-colors">
                  Terms of Service
                </Link>
                <Link href="/cookies" className="text-background/70 hover:text-primary transition-colors">
                  Cookie Policy
                </Link>
              </div>

              <div className="flex items-center gap-4">
                {Object.entries(SOCIAL_LINKS).map(([platform, url]) => (
                  <motion.a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-background/70 hover:text-primary transition-colors"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                  >
                    <span className="sr-only">{platform}</span>
                    <div className="w-5 h-5 bg-background/20 rounded"></div>
                  </motion.a>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </footer>
  )
}

export default Footer