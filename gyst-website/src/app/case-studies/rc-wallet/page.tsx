import { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ArrowRight, Zap, Users, TrendingUp, Award, Clock, Target } from 'lucide-react'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'
import CounterAnimation from '@/components/motion/counter-animation'

export const metadata: Metadata = {
  title: 'RC Wallet Case Study | Crypto Whale Detection & AI Customer Support | GYST',
  description: 'Discover how GYST transformed RC Wallet with on-chain analysis for whale detection, automated lead generation, and RAG-powered customer support. $2.3M in new client acquisitions.',
  keywords: 'crypto AI, blockchain analysis, whale detection, cryptocurrency lead generation, on-chain data analysis, crypto customer support, DeFi automation, blockchain AI solutions',
  openGraph: {
    title: 'RC Wallet Success Story | $2.3M in New Crypto Clients with AI',
    description: 'Learn how on-chain analysis and intelligent lead generation helped RC Wallet identify 1000+ high-value crypto investors and achieve 90% reduction in support resolution time.',
    type: 'article'
  }
}

export default function RCWalletCaseStudy() {
  const results = [
    { metric: 'Whale Prospects Identified', value: '1000+', description: 'High-value crypto investors identified and qualified' },
    { metric: 'Support Resolution Time', value: '90%', description: 'Reduction in customer support ticket resolution time' },
    { metric: 'New Client Acquisitions', value: '$2.3M', description: 'Value of new client acquisitions directly attributed to AI' },
    { metric: 'Customer Satisfaction', value: '95%', description: 'Customer satisfaction score for AI-powered support' }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <Badge className="mb-6 bg-accent/10 text-accent border-accent/20 px-4 py-2 text-sm">
              Crypto Finance Case Study
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              <span className="gradient-text-secondary">RC Wallet:</span><br />
              <span className="text-foreground">Crypto Whale Detection & Intelligent Support</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
              How on-chain analysis and AI-powered customer support generated $2.3M in new client acquisitions 
              and revolutionized crypto investor identification.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                Discuss Your Crypto AI Project
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton href="/case-studies" variant="outline" size="lg">
                View All Case Studies
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Results Metrics */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Measurable Crypto AI Impact
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              RC Wallet's AI transformation delivered exceptional results in whale identification, 
              customer support efficiency, and revenue generation.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {results.map((result, index) => (
              <ScrollReveal key={index} delay={index * 0.1} className="text-center bg-card border border-border rounded-lg p-6 shadow-elegant">
                <div className="text-3xl sm:text-4xl font-bold gradient-text-primary mb-2">
                  <CounterAnimation 
                    value={parseFloat(result.value.replace(/[^\d.]/g, '')) || 0}
                    suffix={result.value.replace(/[\d.]/g, '')}
                    duration={2}
                    delay={index * 0.2}
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{result.metric}</h3>
                <p className="text-sm text-muted-foreground">{result.description}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Challenge Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                The Crypto Investment Challenge
              </h2>
              <div className="space-y-6">
                <div className="border-l-4 border-destructive pl-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Manual Whale Identification</h3>
                  <p className="text-muted-foreground">
                    RC Wallet was manually analyzing blockchain data to identify high-value crypto investors (whales), 
                    a time-intensive process that missed numerous opportunities and couldn't scale with market growth.
                  </p>
                </div>
                <div className="border-l-4 border-destructive pl-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Complex Customer Support</h3>
                  <p className="text-muted-foreground">
                    Crypto-specific customer queries required deep technical knowledge, leading to long resolution times 
                    and frustrated customers seeking answers about DeFi protocols, yield farming, and blockchain mechanics.
                  </p>
                </div>
                <div className="border-l-4 border-destructive pl-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Missed Revenue Opportunities</h3>
                  <p className="text-muted-foreground">
                    Without systematic whale identification and qualification, RC Wallet was missing high-value prospects 
                    and failing to capitalize on the growing institutional crypto investment market.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="bg-muted/30 rounded-lg p-8">
                <h3 className="text-xl font-semibold text-foreground mb-6">Challenge Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Manual whale analysis time per prospect</span>
                    <span className="font-semibold text-destructive">4-6 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Customer support ticket resolution</span>
                    <span className="font-semibold text-destructive">48-72 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Qualified prospects identified monthly</span>
                    <span className="font-semibold text-destructive">15-20</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Customer satisfaction score</span>
                    <span className="font-semibold text-destructive">68%</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              <span className="gradient-text-primary">AI-Powered Crypto Intelligence Solution</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We developed a comprehensive on-chain analysis system with automated whale identification 
              and RAG-powered customer support tailored for crypto-specific queries.
            </p>
          </ScrollReveal>

          <div className="space-y-12">
            {/* On-Chain Analysis System */}
            <ScrollReveal className="bg-card border border-border rounded-lg p-8 shadow-elegant">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-8 h-8 text-primary" />
                    <h3 className="text-2xl font-bold text-foreground">Automated Whale Detection</h3>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Our AI system continuously monitors blockchain transactions across multiple networks, 
                    automatically identifying high-value investors based on transaction patterns, portfolio size, 
                    and trading behavior. The system analyzes wallet addresses, transaction history, and DeFi interactions 
                    to score and qualify prospects in real-time.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">Multi-chain transaction pattern analysis</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">Real-time whale scoring and qualification</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">DeFi protocol interaction tracking</span>
                    </div>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                  <h4 className="font-semibold text-foreground mb-4">Whale Detection Criteria</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Portfolio value &gt; $1M across all wallets</li>
                    <li>• Active trading in last 30 days</li>
                    <li>• DeFi protocol usage patterns</li>
                    <li>• Yield farming and liquidity provision</li>
                    <li>• Cross-chain transaction behavior</li>
                    <li>• Institutional wallet characteristics</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            {/* RAG-Powered Support */}
            <ScrollReveal className="bg-card border border-border rounded-lg p-8 shadow-elegant">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="order-2 lg:order-1 bg-secondary/5 rounded-lg p-6 border border-secondary/20">
                  <h4 className="font-semibold text-foreground mb-4">Knowledge Base Coverage</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• DeFi protocol documentation and guides</li>
                    <li>• Yield farming strategies and risks</li>
                    <li>• Cryptocurrency market analysis</li>
                    <li>• Wallet security best practices</li>
                    <li>• Tax implications and reporting</li>
                    <li>• Regulatory compliance guidelines</li>
                  </ul>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-8 h-8 text-secondary" />
                    <h3 className="text-2xl font-bold text-foreground">Intelligent Customer Support</h3>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    The RAG system leverages a comprehensive crypto knowledge base to provide instant, 
                    accurate answers to complex customer queries. It understands DeFi protocols, yield farming strategies, 
                    and regulatory requirements, delivering expert-level support 24/7 while learning from each interaction.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                      <span className="text-sm">24/7 crypto-expert level support responses</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                      <span className="text-sm">Multi-language support for global markets</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                      <span className="text-sm">Contextual learning from customer interactions</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Lead Generation Automation */}
            <ScrollReveal className="bg-card border border-border rounded-lg p-8 shadow-elegant">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-8 h-8 text-accent" />
                    <h3 className="text-2xl font-bold text-foreground">Automated Lead Generation</h3>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    The system automatically generates qualified leads by analyzing on-chain behavior patterns, 
                    identifying potential customers through their transaction history, and creating personalized 
                    outreach campaigns based on their crypto investment profile and preferences.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-sm">Behavioral pattern-based lead scoring</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-sm">Personalized outreach campaign automation</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-sm">CRM integration with lead nurturing workflows</span>
                    </div>
                  </div>
                </div>
                <div className="bg-accent/5 rounded-lg p-6 border border-accent/20">
                  <h4 className="font-semibold text-foreground mb-4">Lead Generation Process</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-accent">1</span>
                      </div>
                      <span>Identify whale wallets through on-chain analysis</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-accent">2</span>
                      </div>
                      <span>Score prospects based on investment patterns</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-accent">3</span>
                      </div>
                      <span>Create personalized outreach campaigns</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-accent">4</span>
                      </div>
                      <span>Track engagement and optimize conversion</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Implementation Timeline */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              12-Week Implementation Timeline
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From blockchain data integration to full-scale whale detection and intelligent support system deployment.
            </p>
          </ScrollReveal>

          <div className="space-y-8">
            {[
              {
                phase: 'Phase 1: Infrastructure & Data Integration',
                weeks: 'Weeks 1-3',
                tasks: ['Blockchain API integration setup', 'Multi-chain data pipeline development', 'Real-time transaction monitoring system'],
                icon: Clock
              },
              {
                phase: 'Phase 2: Whale Detection Algorithm',
                weeks: 'Weeks 4-6',
                tasks: ['Transaction pattern analysis engine', 'Whale scoring algorithm development', 'Portfolio value calculation system'],
                icon: Target
              },
              {
                phase: 'Phase 3: RAG Knowledge Base',
                weeks: 'Weeks 7-9',
                tasks: ['Crypto knowledge base curation', 'RAG system implementation', 'Multi-language support integration'],
                icon: Users
              },
              {
                phase: 'Phase 4: Lead Generation & Testing',
                weeks: 'Weeks 10-12',
                tasks: ['Automated lead generation workflows', 'A/B testing and optimization', 'Full system deployment and monitoring'],
                icon: TrendingUp
              }
            ].map((phase, index) => (
              <ScrollReveal key={index} delay={index * 0.1} className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <phase.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-foreground">{phase.phase}</h3>
                      <Badge variant="outline" className="text-xs">{phase.weeks}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {phase.tasks.map((task, taskIndex) => (
                        <div key={taskIndex} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies Used */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Advanced Crypto AI Technologies
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Cutting-edge blockchain analysis and AI technologies power RC Wallet's whale detection and support systems.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { tech: 'Blockchain APIs', description: 'Multi-chain data aggregation from Ethereum, Polygon, BSC, and more' },
              { tech: 'RAG Architecture', description: 'Retrieval-augmented generation for crypto-specific knowledge queries' },
              { tech: 'Machine Learning', description: 'Pattern recognition for whale behavior and transaction analysis' },
              { tech: 'Real-time Processing', description: 'Streaming data pipelines for instant whale identification' }
            ].map((item, index) => (
              <ScrollReveal key={index} delay={index * 0.1} className="bg-card border border-border rounded-lg p-6 shadow-elegant text-center">
                <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-3">{item.tech}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal className="text-center">
            <blockquote className="text-2xl sm:text-3xl font-bold text-foreground mb-8 leading-relaxed">
              "GYST's on-chain analysis identified prospects we never would have found manually. 
              The AI system understands crypto markets better than most human analysts, and the ROI has been exceptional."
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="font-semibold text-foreground">David Chen</p>
                <p className="text-sm text-muted-foreground">CEO, RC Wallet</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Ready to Transform Your Crypto Business with AI?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Discover how on-chain analysis, automated whale detection, and intelligent customer support 
              can drive exceptional growth for your cryptocurrency platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                Schedule Your Crypto AI Consultation
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton href="/services" variant="outline" size="lg">
                Explore AI Services
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}