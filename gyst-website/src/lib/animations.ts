/**
 * GYST Motion Design System
 * Professional animation variants and constants for enterprise-grade interactions
 */

export const motionVariants = {
  // Hero Section Animations
  heroContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  },
  
  heroTitle: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99] as const
      }
    }
  },
  
  // Services Grid Animations
  serviceCard: {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99] as const
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: 'easeOut' as const
      }
    }
  },
  
  // Case Study Animations
  metricCounter: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const
      }
    }
  },
  
  // Magnetic Button Effect
  magneticButton: {
    rest: { scale: 1 },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: 'easeOut' as const
      }
    },
    tap: {
      scale: 0.95
    }
  },
  
  // Scroll Reveal Animations
  slideInFromLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99] as const
      }
    }
  },
  
  slideInFromRight: {
    hidden: { opacity: 0, x: 60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99] as const
      }
    }
  },
  
  slideInFromBottom: {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99] as const
      }
    }
  },
  
  // Stagger Container
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },
  
  // Form Animations
  formField: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut' as const
      }
    }
  },
  
  // Custom Cursor Variants
  cursorVariants: {
    default: {
      x: -16,
      y: -16,
      scale: 1,
      opacity: 1
    },
    text: {
      height: 64,
      width: 64,
      x: -32,
      y: -32,
      backgroundColor: 'oklch(0.9680 0.2110 109.7692)',
      mixBlendMode: 'difference' as const
    },
    button: {
      height: 80,
      width: 80,
      x: -40,
      y: -40,
      backgroundColor: 'transparent',
      border: '2px solid oklch(0.9680 0.2110 109.7692)'
    }
  }
}

// Animation timing constants
export const animationTiming = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  verySlow: 0.8
}

// Easing curves
export const easings = {
  smooth: [0.6, -0.05, 0.01, 0.99] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  elastic: [0.175, 0.885, 0.32, 1.275] as const,
  snap: [0.25, 0.46, 0.45, 0.94] as const
}

// Professional animation presets
export const presets = {
  fadeInUp: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: easings.smooth }
  },
  
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, ease: easings.snap }
  },
  
  slideInLeft: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: easings.smooth }
  }
}