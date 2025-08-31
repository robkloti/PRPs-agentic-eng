import { Metadata } from 'next'
import ServicesGrid from '@/components/sections/services-grid'
import { services } from '@/data/services'
import { Brain, Database, MessageSquare, TrendingUp, Wand2, Cog, ArrowRight, CheckCircle, Star } from 'lucide-react'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'AI Services & Solutions | Custom AI Development for Enterprise | GYST',
  description: 'Transform your business with GYST\'s AI services: Custom AI development, RAG solutions, AI chatbots, lead generation automation, and AI strategy consulting. Enterprise-grade AI implementations that deliver measurable ROI.',
  keywords: 'AI services, custom AI development, RAG solutions, AI chatbots, lead generation AI, AI strategy consulting, enterprise AI, machine learning services, AI automation, business AI solutions',
  openGraph: {
    title: 'Enterprise AI Services & Custom AI Development | GYST',
    description: 'Comprehensive AI solutions for enterprise: Custom AI development, intelligent automation, RAG systems, and AI strategy. Get measurable ROI from AI implementations.',
  }
}

const ServiceIcons = {
  strategy: Brain,
  rag: Database,
  chatbot: MessageSquare,
  leadgen: TrendingUp,
  content: Wand2,
  implementation: Cog
} as const

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              <span className="gradient-text-primary">AI Services & Solutions</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
              Transform your business operations with enterprise-grade AI solutions. From strategy to implementation, 
              we deliver AI systems that generate measurable ROI and competitive advantages.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                Get Your AI Strategy
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton href="/case-studies" variant="outline" size="lg">
                View Case Studies
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Why Choose GYST Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why Choose GYST for AI Implementation?
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Unlike agencies that build toy demos, we create production-ready AI systems that integrate 
              seamlessly with your existing operations and deliver measurable business impact.
            </p>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollReveal delay={0.1} className="text-center">
              <div className="p-6 bg-card border border-border rounded-lg shadow-elegant">
                <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-3">Production-Ready Solutions</h3>
                <p className="text-muted-foreground">
                  Enterprise-grade AI systems with robust security, scalability, and monitoring. 
                  No prototypes—only solutions ready for real-world deployment.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.2} className="text-center">
              <div className="p-6 bg-card border border-border rounded-lg shadow-elegant">
                <Star className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-3">Proven ROI Track Record</h3>
                <p className="text-muted-foreground">
                  Average 300%+ ROI across client implementations. We focus on AI applications 
                  that directly impact your bottom line and operational efficiency.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.3} className="text-center">
              <div className="p-6 bg-card border border-border rounded-lg shadow-elegant">
                <Cog className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-3">Seamless Integration</h3>
                <p className="text-muted-foreground">
                  AI solutions that work with your existing systems and workflows. 
                  Minimal disruption, maximum impact, with comprehensive training and support.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <ServicesGrid />

      {/* Service Categories Deep Dive */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              <span className="gradient-text-secondary">Comprehensive AI Service Categories</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From strategic planning to custom development, our AI services cover every stage 
              of your AI transformation journey.
            </p>
          </ScrollReveal>

          <div className="space-y-16">
            {/* AI Strategy & Consulting */}
            <ScrollReveal className="bg-card border border-border rounded-lg p-8 shadow-elegant">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">AI Strategy</Badge>
                  <h3 className="text-2xl font-bold text-foreground mb-4">AI Strategy & Roadmap Development</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Navigate AI adoption with confidence through comprehensive strategy development. We assess your 
                    current capabilities, identify high-impact AI use cases, and create detailed implementation roadmaps 
                    that align with your business objectives and budget constraints.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">AI readiness assessment and capability audit</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">ROI-focused use case identification and prioritization</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">Detailed implementation timeline with resource requirements</span>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-6">
                  <h4 className="font-semibold text-foreground mb-4">Typical Deliverables</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Executive AI Strategy Document</li>
                    <li>• Technical Architecture Recommendations</li>
                    <li>• Budget & Resource Planning</li>
                    <li>• Risk Assessment & Mitigation Plan</li>
                    <li>• Success Metrics & KPI Framework</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            {/* AI Implementation */}
            <ScrollReveal className="bg-card border border-border rounded-lg p-8 shadow-elegant">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="order-2 lg:order-1 bg-muted/30 rounded-lg p-6">
                  <h4 className="font-semibold text-foreground mb-4">Popular Implementation Services</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Custom RAG Systems for Knowledge Management</li>
                    <li>• Intelligent Chatbots & Virtual Assistants</li>
                    <li>• Automated Lead Generation & Qualification</li>
                    <li>• Content Generation & Brand Voice AI</li>
                    <li>• Process Automation & Workflow Intelligence</li>
                  </ul>
                </div>
                <div className="order-1 lg:order-2">
                  <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">AI Implementation</Badge>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Custom AI Development & Deployment</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Turn AI strategy into reality with custom-built solutions tailored to your specific business needs. 
                    From RAG systems that unlock your knowledge base to intelligent automation that streamlines operations, 
                    we build AI that works in the real world.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                      <span className="text-sm">Custom model development and fine-tuning</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                      <span className="text-sm">Enterprise-grade security and compliance</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                      <span className="text-sm">Seamless integration with existing systems</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* AI Optimization */}
            <ScrollReveal className="bg-card border border-border rounded-lg p-8 shadow-elegant">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">AI Optimization</Badge>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Performance Enhancement & Scaling</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Maximize the impact of your existing AI investments through optimization and intelligent scaling. 
                    We enhance performance, reduce costs, and expand capabilities to drive even greater business value 
                    from your AI systems.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-sm">Performance monitoring and optimization</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-sm">Cost reduction through efficiency improvements</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-sm">Capability expansion and feature enhancement</span>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-6">
                  <h4 className="font-semibold text-foreground mb-4">Optimization Focus Areas</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Lead Generation & Conversion Optimization</li>
                    <li>• Model Performance & Accuracy Tuning</li>
                    <li>• Infrastructure Cost Optimization</li>
                    <li>• User Experience & Interface Enhancement</li>
                    <li>• Data Pipeline & Processing Efficiency</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Industries We Serve */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Industries We Transform with AI
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our AI solutions are battle-tested across diverse industries, delivering proven results 
              in complex, regulated, and high-stakes environments.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { industry: 'Property Management', description: 'Automated lead qualification, tenant screening, and maintenance optimization' },
              { industry: 'Financial Services', description: 'Risk assessment, fraud detection, and regulatory compliance automation' },
              { industry: 'Healthcare', description: 'Patient data analysis, appointment scheduling, and clinical decision support' },
              { industry: 'Manufacturing', description: 'Predictive maintenance, quality control, and supply chain optimization' },
              { industry: 'Marketing Agencies', description: 'Content generation, campaign optimization, and client reporting automation' },
              { industry: 'Insurance', description: 'Claims processing, underwriting automation, and customer service enhancement' },
              { industry: 'Legal', description: 'Document analysis, contract review, and legal research automation' },
              { industry: 'E-commerce', description: 'Personalized recommendations, inventory management, and customer support' },
              { industry: 'Government', description: 'Citizen services automation, document processing, and compliance monitoring' }
            ].map((item, index) => (
              <ScrollReveal key={index} delay={index * 0.1} className="bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-elegant-hover transition-all duration-300">
                <h3 className="text-lg font-semibold text-foreground mb-3">{item.industry}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Ready to Transform Your Business with AI?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Schedule a strategic consultation to discover how AI can drive measurable growth, 
              reduce operational costs, and create competitive advantages for your organization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                Schedule Your AI Strategy Session
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton href="/case-studies" variant="outline" size="lg">
                Explore Success Stories
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}