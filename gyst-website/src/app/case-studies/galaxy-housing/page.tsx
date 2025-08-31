import { Metadata } from 'next'
import { ArrowLeft, ArrowRight, ExternalLink, CheckCircle, TrendingUp, Clock, Users, Target } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'
import CounterAnimation from '@/components/motion/counter-animation'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Galaxy Housing AI Success Story | 300% Lead Flow Increase | GYST Case Study',
  description: 'Discover how GYST transformed Galaxy Housing\'s property management with AI-powered lead qualification, RAG database for listings, and voice marketing. 300% increase in qualified lead flow, 85% faster response times.',
  keywords: 'property management AI, real estate lead generation, RAG database, AI chatbots property, voice marketing real estate, property management automation, real estate AI case study',
  openGraph: {
    title: 'Galaxy Housing: 300% Lead Flow Increase with AI | GYST Case Study',
    description: 'See how AI-powered lead qualification and automated marketing transformed this property management company\'s operations and growth.',
  }
}

export default function GalaxyHousingCaseStudy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Link 
            href="/case-studies" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Case Studies
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <ScrollReveal>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Property Management</Badge>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
                  How Galaxy Housing Achieved a{' '}
                  <span className="gradient-text-primary">300% Increase</span>{' '}
                  in Qualified Lead Flow with AI
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                  From manual processes to intelligent automation: See how end-to-end AI implementation 
                  transformed Galaxy Housing's lead qualification, property listings, and marketing operations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg">
                    Get Similar Results
                  </MagneticButton>
                  <MagneticButton href="/contact" variant="outline" size="lg">
                    Request Case Study Details
                  </MagneticButton>
                </div>
              </ScrollReveal>
            </div>
            <div>
              <ScrollReveal delay={0.2}>
                <div className="bg-card border border-border rounded-lg p-8 shadow-elegant">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        <CounterAnimation value={300} suffix="%" duration={2} />
                      </div>
                      <div className="text-sm text-muted-foreground">Qualified Lead Flow</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        <CounterAnimation value={85} suffix="%" duration={2} delay={0.5} />
                      </div>
                      <div className="text-sm text-muted-foreground">Faster Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        <CounterAnimation value={40} suffix="%" duration={2} delay={1} />
                      </div>
                      <div className="text-sm text-muted-foreground">Conversion Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        <CounterAnimation value={60} suffix="%" duration={2} delay={1.5} />
                      </div>
                      <div className="text-sm text-muted-foreground">Less Admin Work</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Project Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Project Overview</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <ScrollReveal delay={0.1}>
              <div className="bg-card border border-border rounded-lg p-6 text-center shadow-elegant">
                <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Timeline</h3>
                <p className="text-muted-foreground">8 weeks</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="bg-card border border-border rounded-lg p-6 text-center shadow-elegant">
                <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Team Size</h3>
                <p className="text-muted-foreground">4 specialists</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="bg-card border border-border rounded-lg p-6 text-center shadow-elegant">
                <Target className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Industry</h3>
                <p className="text-muted-foreground">Property Management</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <div className="bg-card border border-border rounded-lg p-6 text-center shadow-elegant">
                <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">ROI Impact</h3>
                <p className="text-muted-foreground">300%+ Growth</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* The Challenge */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <ScrollReveal>
                <h2 className="text-3xl font-bold text-foreground mb-6">The Challenge</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Galaxy Housing was struggling with manual property management processes that created bottlenecks 
                  in their lead qualification system. In a competitive real estate market, slow response times 
                  and inefficient lead screening were costing them opportunities and revenue.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Manual Lead Qualification</h4>
                      <p className="text-sm text-muted-foreground">Staff spent hours manually screening leads, often missing high-value prospects</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Slow Response Times</h4>
                      <p className="text-sm text-muted-foreground">Average 4-6 hour response time to inquiries in a market requiring instant responses</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Inconsistent Follow-up</h4>
                      <p className="text-sm text-muted-foreground">No systematic approach to lead nurturing and multi-touch campaigns</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Scattered Property Data</h4>
                      <p className="text-sm text-muted-foreground">Property information spread across multiple systems, slowing decision-making</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold text-sm">
                    Result: Lost opportunities, frustrated leads, and team burnout from manual processes
                  </p>
                </div>
              </ScrollReveal>
            </div>
            <div>
              <ScrollReveal delay={0.2}>
                <div className="bg-card border border-border rounded-lg p-8 shadow-elegant">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Before AI Implementation</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Lead Response Time</span>
                      <span className="font-semibold text-red-600">4-6 hours</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Manual Qualification Rate</span>
                      <span className="font-semibold text-red-600">100%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Lead-to-Client Conversion</span>
                      <span className="font-semibold text-red-600">12%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Administrative Overhead</span>
                      <span className="font-semibold text-red-600">High</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Qualified Lead Volume</span>
                      <span className="font-semibold text-red-600">Limited</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our AI-Powered Solution</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We implemented a comprehensive end-to-end AI system that transformed every aspect 
              of Galaxy Housing's lead management and property operations.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ScrollReveal delay={0.1}>
              <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Intelligent Lead Qualification</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  AI-powered system that automatically scores and qualifies leads based on property preferences, 
                  budget, timeline, and behavioral signals.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Real-time lead scoring algorithm</li>
                  <li>• Automated qualification workflows</li>
                  <li>• Priority routing to sales team</li>
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">RAG Property Database</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Centralized knowledge base with instant access to property details, market data, 
                  and historical information for faster decision-making.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Unified property data repository</li>
                  <li>• Natural language query interface</li>
                  <li>• Real-time market insights</li>
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Multi-Channel Voice Marketing</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Automated voice and text campaigns that nurture leads across multiple touchpoints 
                  with personalized messaging and timing.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Automated follow-up sequences</li>
                  <li>• Voice message campaigns</li>
                  <li>• Multi-channel coordination</li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Implementation Process */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">8-Week Implementation Timeline</h2>
            <p className="text-lg text-muted-foreground">
              Structured approach ensuring minimal disruption while maximizing transformation impact
            </p>
          </ScrollReveal>

          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {[
                {
                  week: "Weeks 1-2",
                  title: "Discovery & Data Audit",
                  tasks: ["Current process mapping", "Data source identification", "System integration planning", "Team interviews & training needs"]
                },
                {
                  week: "Weeks 3-4", 
                  title: "AI System Development",
                  tasks: ["Lead qualification model training", "RAG database construction", "Voice campaign framework", "Initial testing protocols"]
                },
                {
                  week: "Weeks 5-6",
                  title: "Integration & Testing",
                  tasks: ["CRM system integration", "Workflow automation setup", "User interface development", "Performance optimization"]
                },
                {
                  week: "Weeks 7-8",
                  title: "Launch & Optimization",
                  tasks: ["Team training & onboarding", "Go-live support", "Performance monitoring", "Initial optimization cycles"]
                }
              ].map((phase, index) => (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                    <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">{phase.week}</Badge>
                    <h3 className="font-semibold text-foreground mb-4">{phase.title}</h3>
                    <ul className="space-y-2">
                      {phase.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              <span className="gradient-text-primary">Measurable Results</span> Within 60 Days
            </h2>
            <p className="text-lg text-muted-foreground">
              Real business impact delivered through intelligent AI automation
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <ScrollReveal>
              <h3 className="text-xl font-semibold text-foreground mb-6">Key Performance Improvements</h3>
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">Qualified Lead Flow</span>
                    <span className="text-2xl font-bold text-primary">+300%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">From 50 to 200+ qualified leads per month through intelligent screening</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">Response Time Reduction</span>
                    <span className="text-2xl font-bold text-primary">85%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">From 4-6 hours to 15-30 minutes average response time</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">Conversion Rate Improvement</span>
                    <span className="text-2xl font-bold text-primary">+40%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">From 12% to 17% lead-to-client conversion rate</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">Administrative Efficiency</span>
                    <span className="text-2xl font-bold text-primary">60%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Reduction in manual administrative tasks and data entry</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-8">
                <h3 className="text-xl font-semibold text-foreground mb-6">Client Testimonial</h3>
                <blockquote className="text-lg italic text-muted-foreground mb-6 leading-relaxed">
                  "GYST transformed our entire lead management process. We're now handling 3x more qualified leads 
                  with the same team size. The AI system doesn't just automate—it actually improves our decision-making 
                  and helps us identify opportunities we would have missed."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">SM</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Sarah Mitchell</div>
                    <div className="text-sm text-muted-foreground">Operations Director, Galaxy Housing</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Technologies Used */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Technology Stack</h2>
            <p className="text-lg text-muted-foreground">
              Enterprise-grade AI technologies powering Galaxy Housing's transformation
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              "RAG Architecture",
              "Voice AI",
              "Multi-channel Marketing",
              "CRM Integration"
            ].map((tech, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="bg-card border border-border rounded-lg p-4 text-center shadow-elegant hover:shadow-elegant-hover transition-all duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold text-lg">
                      {tech.split(' ').map(word => word[0]).join('')}
                    </span>
                  </div>
                  <h3 className="font-medium text-foreground text-sm">{tech}</h3>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Ready to Achieve Similar Results for Your Business?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Schedule a strategic consultation to discover how AI can transform your operations, 
              increase qualified leads, and drive measurable growth like Galaxy Housing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                Schedule Your Strategy Session
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton href="/case-studies" variant="outline" size="lg">
                View More Case Studies
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}