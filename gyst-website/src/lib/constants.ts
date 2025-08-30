/**
 * GYST Brand Constants and Configuration
 */

export const GYST_BRAND = {
  name: "GYST",
  tagline: "Get Your Stack Together",
  description: "Premium AI Agency transforming enterprise operations with custom AI solutions",
  email: "hello@gyst.ai",
  phone: "+1 (555) GYST-AI",
  address: "Enterprise AI Solutions, Global"
} as const

export const NAVIGATION_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Insights" },
  { href: "/contact", label: "Contact" }
] as const

export const CTA_BUTTONS = {
  primary: "Get AI Strategy",
  secondary: "View Case Studies",
  tertiary: "Schedule Consultation",
  newsletter: "Get AI Insights"
} as const

export const HERO_CONTENT = {
  headline: "Turn your AI investment",
  highlightedText: "into scalable ROI",
  subheading: "Most leaders talk about AI. Some run experiments. But only a few leaders turn AI into real business results. GYST helps your organization adopt AI that cuts operating costs, creates revenue streams, and builds innovation muscle.",
  primaryCTA: CTA_BUTTONS.primary,
  secondaryCTA: CTA_BUTTONS.secondary
} as const

export const METRICS = {
  clientsServed: 50,
  projectsCompleted: 150,
  roiGenerated: "2.3M",
  industriesServed: 6,
  avgROI: "400%",
  implementationTime: "30"
} as const

export const SOCIAL_LINKS = {
  linkedin: "https://linkedin.com/company/gyst-ai",
  twitter: "https://twitter.com/gyst_ai",
  github: "https://github.com/gyst-ai"
} as const

// SEO and metadata
export const SEO_CONSTANTS = {
  defaultTitle: "GYST - Premium AI Agency | Enterprise AI Transformation",
  defaultDescription: "Transform your business with custom AI solutions. From RAG systems to AI avatars, we deliver measurable ROI through strategic AI implementation.",
  keywords: [
    "AI agency",
    "enterprise AI",
    "RAG solutions",
    "AI chatbots", 
    "AI transformation",
    "custom AI development",
    "AI strategy",
    "machine learning",
    "AI avatars",
    "lead generation AI"
  ],
  ogImage: "/images/og-image.jpg",
  twitterHandle: "@gyst_ai"
} as const

// Animation and performance settings
export const PERFORMANCE_CONFIG = {
  enableAnimations: true,
  respectReducedMotion: true,
  lazyLoadImages: true,
  optimizeScrolling: true
} as const