'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useScrollPosition } from '@/hooks/use-scroll-position'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { NAVIGATION_LINKS, GYST_BRAND, CTA_BUTTONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import MagneticButton from '@/components/motion/magnetic-button'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const scrollY = useScrollPosition()
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  const isScrolled = scrollY > 50
  const headerVariants = {
    initial: { opacity: 0, y: -20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: shouldReduceMotion ? 0 : 0.6,
        delay: shouldReduceMotion ? 0 : 0.2,
        ease: shouldReduceMotion ? 'linear' as const : [0.6, -0.05, 0.01, 0.99] as const
      }
    }
  }

  const mobileMenuVariants = {
    closed: {
      opacity: 0,
      height: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.3,
        ease: 'easeInOut' as const
      }
    },
    open: {
      opacity: 1,
      height: 'auto' as const,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.3,
        ease: 'easeInOut' as const
      }
    }
  }

  const linkVariants = {
    closed: { opacity: 0, x: -20 },
    open: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.2,
        delay: shouldReduceMotion ? 0 : i * 0.1,
        ease: 'easeOut' as const
      }
    })
  }

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border' 
          : 'bg-transparent'
      )}
      variants={headerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: shouldReduceMotion ? 1 : 1.05 }}
            whileTap={{ scale: shouldReduceMotion ? 1 : 0.95 }}
          >
            <Link href="/" className="flex items-center">
              <div className="relative w-16 h-16">
                <Image
                  src="/images/branding/gyst-logo-removebg-preview.png"
                  alt="GYST Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {NAVIGATION_LINKS.map((link) => {
              const isActive = pathname === link.href
              return (
                <motion.div key={link.href} whileHover={{ y: shouldReduceMotion ? 0 : -2 }}>
                  <Link
                    href={link.href}
                    className={cn(
                      'text-sm font-medium transition-colors relative py-2',
                      isActive 
                        ? 'text-primary' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        layoutId="activeTab"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* CTA Button */}
          <div className="hidden lg:block">
            <MagneticButton href="/contact" variant="primary" size="sm">
              {CTA_BUTTONS.primary}
            </MagneticButton>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="lg:hidden p-2 text-foreground hover:text-primary transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileTap={{ scale: shouldReduceMotion ? 1 : 0.9 }}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                >
                  <X size={24} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                >
                  <Menu size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="lg:hidden border-t border-border bg-background/95 backdrop-blur-md"
              variants={mobileMenuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <nav className="py-4 space-y-4">
                {NAVIGATION_LINKS.map((link, linkIndex) => {
                  const isActive = pathname === link.href
                  return (
                    <motion.div
                      key={link.href}
                      custom={linkIndex}
                      variants={linkVariants}
                      initial="closed"
                      animate="open"
                      exit="closed"
                    >
                      <Link
                        href={link.href}
                        className={cn(
                          'block px-4 py-2 text-base font-medium transition-colors',
                          isActive 
                            ? 'text-primary bg-primary/10' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  )
                })}
                
                <motion.div
                  className="px-4 pt-2"
                  custom={NAVIGATION_LINKS.length}
                  variants={linkVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  <MagneticButton 
                    href="/contact" 
                    variant="primary" 
                    className="w-full"
                    size="sm"
                  >
                    {CTA_BUTTONS.primary}
                  </MagneticButton>
                </motion.div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}

export default Header