'use client'

import React from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import ScrollReveal from '@/components/motion/scroll-reveal'
import { Badge } from '@/components/ui/badge'
import TechStackCarousel from './tech-stack-carousel'

interface TechCategory {
  title: string
  description: string
  technologies: Technology[]
}

interface Technology {
  name: string
  icon: string // For now using text/emoji, can be replaced with actual logos
  category: string
  description: string
}

const techStack: TechCategory[] = [
  {
    title: "AI & Machine Learning",
    description: "Cutting-edge AI frameworks and models",
    technologies: [
      { name: "OpenAI GPT", icon: "🤖", category: "LLM", description: "Advanced language models" },
      { name: "Anthropic Claude", icon: "🧠", category: "LLM", description: "Constitutional AI assistant" },
      { name: "LangChain", icon: "🔗", category: "Framework", description: "AI application development" },
      { name: "Pinecone", icon: "🌲", category: "Vector DB", description: "Vector database for RAG" },
      { name: "HuggingFace", icon: "🤗", category: "ML", description: "Open-source AI models" },
      { name: "TensorFlow", icon: "📊", category: "ML", description: "Machine learning platform" }
    ]
  },
  {
    title: "Development Stack",
    description: "Modern web technologies and frameworks",
    technologies: [
      { name: "Next.js", icon: "▲", category: "Frontend", description: "React framework" },
      { name: "TypeScript", icon: "📘", category: "Language", description: "Type-safe JavaScript" },
      { name: "Python", icon: "🐍", category: "Backend", description: "AI/ML development" },
      { name: "Node.js", icon: "💚", category: "Runtime", description: "JavaScript runtime" },
      { name: "FastAPI", icon: "⚡", category: "API", description: "High-performance APIs" },
      { name: "PostgreSQL", icon: "🐘", category: "Database", description: "Relational database" }
    ]
  },
  {
    title: "Cloud & Infrastructure",
    description: "Scalable cloud solutions and deployment",
    technologies: [
      { name: "AWS", icon: "☁️", category: "Cloud", description: "Amazon Web Services" },
      { name: "Vercel", icon: "🔺", category: "Hosting", description: "Deployment platform" },
      { name: "Docker", icon: "🐳", category: "Container", description: "Application containerization" },
      { name: "Redis", icon: "🔴", category: "Cache", description: "In-memory data store" },
      { name: "Supabase", icon: "⚡", category: "Backend", description: "Open source Firebase alternative" },
      { name: "Stripe", icon: "💳", category: "Payments", description: "Payment processing" }
    ]
  }
]

const TechStack: React.FC = () => {
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

  const categoryVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: [0.6, -0.05, 0.01, 0.99]
      }
    }
  }

  const techVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.4,
        ease: "easeOut"
      }
    }
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Built with
            <br />
            <span className="gradient-text-secondary">Industry-Leading Technology</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            We leverage the most advanced AI frameworks, modern development tools, and scalable 
            cloud infrastructure to deliver enterprise-grade solutions.
          </p>
        </ScrollReveal>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {techStack.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              variants={categoryVariants}
              className="bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-elegant-hover transition-all duration-300"
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {category.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {category.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {category.technologies.map((tech, techIndex) => (
                  <motion.div
                    key={tech.name}
                    variants={techVariants}
                    className="group relative p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer"
                    whileHover={shouldReduceMotion ? {} : {
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{tech.icon}</span>
                      <span className="font-semibold text-sm">{tech.name}</span>
                    </div>
                    
                    <Badge variant="outline" className="text-xs mb-1">
                      {tech.category}
                    </Badge>
                    
                    <p className="text-xs text-muted-foreground">
                      {tech.description}
                    </p>

                    {/* Hover tooltip */}
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-3 py-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-10">
                      {tech.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <ScrollReveal delay={0.6} className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Want to see how we can integrate these technologies for your business?
          </p>
          <motion.a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
          >
            <span>📁</span>
            Manage Technology Assets
          </motion.a>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default TechStack