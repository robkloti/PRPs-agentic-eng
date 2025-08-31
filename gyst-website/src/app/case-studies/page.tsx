import { Metadata } from 'next'
import Link from 'next/link'
import { motion } from 'motion/react'
import ScrollReveal from '@/components/motion/scroll-reveal'
import CounterAnimation from '@/components/motion/counter-animation'
import MagneticButton from '@/components/motion/magnetic-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { caseStudies } from '@/data/case-studies'

export const metadata: Metadata = {
  title: 'AI Success Stories - GYST Case Studies | Proven ROI Results',
  description: 'Discover how GYST delivered measurable AI transformation results: 300% lead increase for Galaxy Housing, 500% engagement boost for Force at Work, $2.3M in new acquisitions for RC Wallet.',
  openGraph: {
    title: 'AI Success Stories - GYST Case Studies',
    description: 'Discover how GYST delivered measurable AI transformation results with proven ROI.',
    type: 'website',
  },
}

const industries = [
  "All Industries",
  "Property Management", 
  "Marketing & Advertising",
  "Financial Services",
  "Healthcare",
  "Government",
  "Insurance"
]

const services = [
  "All Services",
  "AI Strategy & Roadmap",
  "RAG Solutions", 
  "Chatbots & Conversational AI",
  "Lead Generation AI",
  "AI Avatars & Digital Humans",
  "Content Generation"
]

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Real AI Results for
              <br />
              <span className="gradient-text-rainbow">Real Businesses</span>
            </h1>
          </ScrollReveal>
          
          <ScrollReveal delay={0.1}>
            <p className="text-xl text-muted-foreground mb-12 max-w-4xl mx-auto">
              Don't just take our word for it. See how GYST has helped organizations 
              across industries implement AI solutions that deliver measurable ROI, 
              reduce costs, and create new revenue streams.
            </p>
          </ScrollReveal>
          
          <ScrollReveal delay={0.2}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div className="text-center">
                <CounterAnimation 
                  value={300} 
                  suffix="%" 
                  className="text-3xl font-bold text-primary block"
                />
                <p className="text-sm text-muted-foreground mt-1">Average Lead Increase</p>
              </div>
              <div className="text-center">
                <CounterAnimation 
                  value={85} 
                  suffix="%" 
                  className="text-3xl font-bold text-primary block"
                />
                <p className="text-sm text-muted-foreground mt-1">Response Time Reduction</p>
              </div>
              <div className="text-center">
                <CounterAnimation 
                  value={2.3} 
                  prefix="$" 
                  suffix="M" 
                  className="text-3xl font-bold text-primary block"
                />
                <p className="text-sm text-muted-foreground mt-1">Client Acquisitions</p>
              </div>
              <div className="text-center">
                <CounterAnimation 
                  value={500} 
                  suffix="%" 
                  className="text-3xl font-bold text-primary block"
                />
                <p className="text-sm text-muted-foreground mt-1">Engagement Boost</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Featured Case Studies */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Featured Success Stories
              </h2>
              <p className="text-lg text-muted-foreground">
                In-depth case studies showing our approach, implementation, and measurable results
              </p>
            </div>
          </ScrollReveal>
          
          <div className="space-y-16">
            {caseStudies.map((study, index) => (
              <ScrollReveal key={study.id} delay={index * 0.1}>
                <Card className="overflow-hidden">
                  <div className={`grid grid-cols-1 lg:grid-cols-2 ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                    {/* Content */}
                    <div className="p-8 lg:p-12">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge variant="secondary">{study.industry}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {study.timeline}
                        </span>
                      </div>
                      
                      <h3 className="text-2xl lg:text-3xl font-bold mb-4">
                        {study.title}
                      </h3>
                      
                      <p className="text-lg text-muted-foreground mb-6">
                        {study.description}
                      </p>
                      
                      <div className="mb-8">
                        <h4 className="font-semibold mb-3">Challenge:</h4>
                        <p className="text-muted-foreground mb-6">{study.challenge}</p>
                        
                        <h4 className="font-semibold mb-3">Solution:</h4>
                        <p className="text-muted-foreground mb-6">{study.solution}</p>
                        
                        <h4 className="font-semibold mb-3">Services Delivered:</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {study.services.map((service) => (
                            <Badge key={service} variant="outline">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 mb-8">
                        {study.results.map((result, resultIndex) => (
                          <div key={resultIndex} className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary mb-1">
                              {result.metric}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {result.description}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mb-8">
                        <h4 className="font-semibold mb-3">Technologies Used:</h4>
                        <div className="flex flex-wrap gap-2">
                          {study.technologies.map((tech) => (
                            <Badge key={tech} variant="secondary">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <MagneticButton 
                        href={`/case-studies/${study.slug}`}
                        variant="outline"
                      >
                        Read Full Case Study →
                      </MagneticButton>
                    </div>
                    
                    {/* Image/Visual */}
                    <div className={`bg-muted/30 flex items-center justify-center p-8 ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                      <div className="w-full h-64 lg:h-96 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-primary mb-2">
                            {study.results[0]?.metric || study.company}
                          </div>
                          <div className="text-lg text-muted-foreground">
                            {study.results[0]?.description || 'Success Story'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics Overview */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Consistent Results Across Industries
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Our proven methodology delivers measurable outcomes regardless of industry or company size
            </p>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { metric: "15+", description: "Successful AI Implementations" },
              { metric: "95%", description: "Client Satisfaction Rate" },
              { metric: "6", description: "Average Months to ROI" },
              { metric: "24/7", description: "Ongoing Support & Optimization" }
            ].map((stat, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <Card className="p-6 text-center">
                  <CardContent className="pt-6">
                    <CounterAnimation 
                      value={parseInt(stat.metric)}
                      suffix={stat.metric.replace(/\d+/g, '')}
                      className="text-3xl font-bold text-primary block mb-2"
                    />
                    <p className="text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Ready to Be Our Next Success Story?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join the growing list of organizations that have transformed their 
              business with GYST's proven AI implementation methodology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="/contact" size="lg">
                Start Your AI Transformation
              </MagneticButton>
              <MagneticButton href="/contact" variant="outline" size="lg">
                Book Strategy Call
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}