'use client'

import React, { useState, MouseEvent } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useAnalytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'

interface MagneticButtonProps {
  children: React.ReactNode
  href?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  href,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  disabled = false,
  type = 'button',
  ...props
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const { trackCTAClick } = useAnalytics()

  const handleClick = () => {
    // Track CTA click for analytics
    const buttonText = typeof children === 'string' ? children : 'Button'
    const location = typeof window !== 'undefined' ? window.location.pathname : ''
    
    trackCTAClick(buttonText, location, href)
    
    // Call original onClick if provided
    if (onClick) {
      onClick()
    }
  }

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (disabled || shouldReduceMotion) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    
    // Apply subtle magnetic effect
    setMousePosition({ x: x * 0.1, y: y * 0.1 })
  }

  const handleMouseEnter = () => {
    if (!disabled) setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    setMousePosition({ x: 0, y: 0 })
  }

  const magneticVariants = {
    rest: { 
      x: 0, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.3, ease: [0.6, -0.05, 0.01, 0.99] as const }
    },
    hover: {
      x: shouldReduceMotion ? 0 : mousePosition.x,
      y: shouldReduceMotion ? 0 : mousePosition.y,
      scale: disabled ? 1 : 1.02,
      transition: { duration: 0.2, ease: 'easeOut' as const }
    },
    tap: {
      scale: disabled ? 1 : 0.98,
      transition: { duration: 0.1 }
    }
  }

  const glowVariants = {
    rest: { opacity: 0, scale: 0.8 },
    hover: {
      opacity: disabled ? 0 : 1,
      scale: 1.1,
      transition: { duration: 0.3 }
    }
  }

  const baseClasses = cn(
    'relative inline-flex items-center justify-center font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    {
      // Variants
      'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg': 
        variant === 'primary' && !disabled,
      'bg-secondary text-secondary-foreground hover:bg-secondary/90': 
        variant === 'secondary' && !disabled,
      'border border-border bg-background hover:bg-accent hover:text-accent-foreground': 
        variant === 'outline' && !disabled,
      'hover:bg-accent hover:text-accent-foreground': 
        variant === 'ghost' && !disabled,
      
      // Sizes
      'h-9 px-4 py-2 text-sm': size === 'sm',
      'h-11 px-8 py-2': size === 'md',
      'h-14 px-10 py-3 text-lg': size === 'lg'
    },
    className
  )

  const glowColor = variant === 'primary' 
    ? 'oklch(0.9680 0.2110 109.7692)' 
    : variant === 'secondary'
    ? 'oklch(0.9054 0.1546 194.7689)'
    : 'oklch(0.7017 0.3225 328.3634)'

  const Component = href ? motion(Link) : motion.button

  return (
    <Component
      href={href}
      className={baseClasses}
      variants={magneticVariants}
      initial="rest"
      animate={isHovering ? "hover" : "rest"}
      whileTap="tap"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={disabled}
      type={href ? undefined : type}
      {...props}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] opacity-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${glowColor}30 0%, transparent 70%)`
        }}
        variants={glowVariants}
        initial="rest"
        animate={isHovering ? "hover" : "rest"}
      />
      
      {/* Content */}
      <motion.span 
        className="relative z-10"
        animate={{ 
          opacity: disabled ? 0.5 : isHovering ? 1 : 0.9 
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>
    </Component>
  )
}

export default MagneticButton