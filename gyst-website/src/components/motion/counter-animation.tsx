'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

interface CounterAnimationProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
  separator?: boolean
  decimals?: number
  delay?: number
}

const CounterAnimation: React.FC<CounterAnimationProps> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 2,
  className,
  separator = true,
  decimals = 0,
  delay = 0,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true)

      if (shouldReduceMotion) {
        setDisplayValue(value)
        return
      }

      let startTime: number
      let animationFrame: number

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / (duration * 1000), 1)

        // Easing function for smooth animation (easeOutCubic)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        
        const currentValue = easeOut * value
        setDisplayValue(currentValue)

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate)
        }
      }

      // Add delay if specified
      const timeoutId = setTimeout(() => {
        animationFrame = requestAnimationFrame(animate)
      }, delay * 1000)

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame)
        }
        clearTimeout(timeoutId)
      }
    }
  }, [isInView, hasAnimated, value, duration, shouldReduceMotion, delay])

  const formatNumber = (num: number) => {
    const rounded = decimals > 0 ? num.toFixed(decimals) : Math.floor(num)
    const numStr = rounded.toString()
    
    if (separator && Math.abs(num) >= 1000) {
      return parseFloat(numStr).toLocaleString()
    }
    
    return numStr
  }

  return (
    <motion.span
      ref={ref}
      className={cn('tabular-nums font-bold', className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isInView ? 1 : 0, 
        scale: isInView ? 1 : 0.8 
      }}
      transition={{ 
        duration: shouldReduceMotion ? 0 : 0.6, 
        delay: shouldReduceMotion ? 0 : delay,
        ease: [0.6, -0.05, 0.01, 0.99] 
      }}
      {...props}
    >
      {prefix}{formatNumber(displayValue)}{suffix}
    </motion.span>
  )
}

export default CounterAnimation