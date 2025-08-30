'use client'

import React from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface FloatingElement {
  size: number
  delay: number
  duration: number
  opacity: number
  startX: number
  startY: number
}

const FloatingElements: React.FC = () => {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) return null

  // Generate floating elements with varied properties
  const elements: FloatingElement[] = [
    { size: 60, delay: 0, duration: 8, opacity: 0.05, startX: 10, startY: 20 },
    { size: 40, delay: 2, duration: 12, opacity: 0.08, startX: 80, startY: 60 },
    { size: 80, delay: 4, duration: 10, opacity: 0.04, startX: 30, startY: 80 },
    { size: 30, delay: 1, duration: 15, opacity: 0.06, startX: 90, startY: 30 },
    { size: 50, delay: 3, duration: 9, opacity: 0.07, startX: 60, startY: 10 },
    { size: 35, delay: 5, duration: 11, opacity: 0.05, startX: 20, startY: 50 },
    { size: 45, delay: 1.5, duration: 13, opacity: 0.06, startX: 70, startY: 90 },
    { size: 25, delay: 6, duration: 14, opacity: 0.08, startX: 40, startY: 40 }
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((element, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{
            width: element.size,
            height: element.size,
            background: `linear-gradient(135deg, 
              oklch(0.9680 0.2110 109.7692), 
              oklch(0.9054 0.1546 194.7689))`,
            left: `${element.startX}%`,
            top: `${element.startY}%`,
            opacity: element.opacity
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            rotate: [0, 360],
            opacity: [element.opacity, element.opacity * 3, element.opacity]
          }}
          transition={{
            duration: element.duration,
            delay: element.delay,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
      
      {/* Additional gradient orbs for depth */}
      {!shouldReduceMotion && (
        <>
          <motion.div
            className="absolute w-32 h-32 rounded-full opacity-10"
            style={{
              background: `radial-gradient(circle, oklch(0.7017 0.3225 328.3634) 0%, transparent 70%)`,
              right: '10%',
              top: '15%'
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
          
          <motion.div
            className="absolute w-24 h-24 rounded-full opacity-15"
            style={{
              background: `radial-gradient(circle, oklch(0.9680 0.2110 109.7692) 0%, transparent 60%)`,
              left: '15%',
              bottom: '25%'
            }}
            animate={{
              scale: [1.1, 0.9, 1.1],
              opacity: [0.15, 0.05, 0.15]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2
            }}
          />
        </>
      )}
    </div>
  )
}

export default FloatingElements