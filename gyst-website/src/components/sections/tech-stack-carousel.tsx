'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import Image from 'next/image'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface TechLogo {
  name: string
  src: string
  alt: string
}

const TechStackCarousel: React.FC = () => {
  const shouldReduceMotion = useReducedMotion()
  const [techLogos, setTechLogos] = useState<TechLogo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fallback logos if no uploaded ones are found
  const defaultLogos: TechLogo[] = [
    { name: 'OpenAI', src: '/images/tech-stack/openai.svg', alt: 'OpenAI' },
    { name: 'Anthropic', src: '/images/tech-stack/anthropic.svg', alt: 'Anthropic Claude' },
    { name: 'Python', src: '/images/tech-stack/python.svg', alt: 'Python' },
    { name: 'TypeScript', src: '/images/tech-stack/typescript.svg', alt: 'TypeScript' },
    { name: 'Next.js', src: '/images/tech-stack/nextjs.svg', alt: 'Next.js' },
    { name: 'React', src: '/images/tech-stack/react.svg', alt: 'React' },
    { name: 'AWS', src: '/images/tech-stack/aws.svg', alt: 'Amazon Web Services' },
    { name: 'Docker', src: '/images/tech-stack/docker.svg', alt: 'Docker' },
  ]

  useEffect(() => {
    const fetchTechLogos = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/files?category=tech-stack')
        if (response.ok) {
          const data = await response.json()
          const uploadedLogos = data.files as TechLogo[]
          
          // Use only the uploaded logos
          setTechLogos(uploadedLogos)
        } else {
          // Show empty if API fails
          setTechLogos([])
        }
      } catch (error) {
        console.error('Failed to fetch tech logos:', error)
        setTechLogos([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTechLogos()
  }, [])

  // Create an infinite scrolling effect by duplicating the array
  const duplicatedLogos = [...techLogos, ...techLogos]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.6
      }
    }
  }

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden py-8">
        <div className="flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading tech stack...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative"
      >
        {/* Gradient overlays for smooth fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
        
        {/* Scrolling container */}
        <motion.div
          className="flex items-center gap-8"
          animate={shouldReduceMotion ? {} : {
            x: [0, -50 * techLogos.length],
          }}
          transition={shouldReduceMotion ? {} : {
            duration: 30,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {duplicatedLogos.map((logo, index) => (
            <motion.div
              key={`${logo.name}-${index}`}
              className="flex-shrink-0 group"
              whileHover={shouldReduceMotion ? {} : {
                scale: 1.1,
                transition: { duration: 0.2 }
              }}
            >
              <div className="relative w-16 h-16 md:w-20 md:h-20 bg-card border border-border rounded-lg p-3 hover:shadow-elegant hover:border-primary/30 transition-all duration-300">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  className="object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300 p-2"
                  onError={(e) => {
                    // Fallback to a placeholder if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent && !parent.querySelector('.fallback-text')) {
                      const fallback = document.createElement('div')
                      fallback.className = 'fallback-text absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground'
                      fallback.textContent = logo.name.charAt(0).toUpperCase()
                      parent.appendChild(fallback)
                    }
                  }}
                />
                
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
                  {logo.name}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-foreground"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default TechStackCarousel