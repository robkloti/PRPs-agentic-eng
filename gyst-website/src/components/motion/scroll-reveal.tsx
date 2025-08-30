'use client'

import React from 'react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale'
  distance?: number
  duration?: number
  once?: boolean
  threshold?: number
  rootMargin?: string
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 30,
  duration = 0.6,
  once = true,
  threshold = 0.1,
  rootMargin = '-50px',
  ...props
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    margin: rootMargin as any,
    amount: threshold
  })
  const shouldReduceMotion = useReducedMotion()

  // Generate animation variants based on direction
  const getVariants = () => {
    if (shouldReduceMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { 
          opacity: 1,
          transition: { duration: 0, delay: 0 }
        }
      }
    }

    const baseHidden = { opacity: 0 }
    const baseVisible = { 
      opacity: 1,
      transition: { 
        duration, 
        delay,
        ease: [0.6, -0.05, 0.01, 0.99] as const
      }
    }

    switch (direction) {
      case 'up':
        return {
          hidden: { ...baseHidden, y: distance },
          visible: { ...baseVisible, y: 0 }
        }
      case 'down':
        return {
          hidden: { ...baseHidden, y: -distance },
          visible: { ...baseVisible, y: 0 }
        }
      case 'left':
        return {
          hidden: { ...baseHidden, x: distance },
          visible: { ...baseVisible, x: 0 }
        }
      case 'right':
        return {
          hidden: { ...baseHidden, x: -distance },
          visible: { ...baseVisible, x: 0 }
        }
      case 'scale':
        return {
          hidden: { ...baseHidden, scale: 0.8 },
          visible: { ...baseVisible, scale: 1 }
        }
      default:
        return {
          hidden: baseHidden,
          visible: baseVisible
        }
    }
  }

  const variants = getVariants()

  return (
    <motion.div
      ref={ref}
      className={cn('', className)}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default ScrollReveal