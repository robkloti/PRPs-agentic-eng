import { Metadata } from 'next'
import { ArrowLeft, ArrowRight, ExternalLink, CheckCircle, TrendingUp, Clock, Users, Target, Globe, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'
import CounterAnimation from '@/components/motion/counter-animation'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Force at Work AI Marketing Success | 500% Social Engagement Boost | GYST',
  description: 'See how GYST helped Force at Work scale Japanese market marketing with AI avatars, social automation, and culturally-aware content. 500% social engagement increase, 70% faster content creation.',
  keywords: 'AI avatars marketing, social media automation, Japanese marketing AI, cultural AI training, marketing agency AI, content creation automation, social engagement AI',
  openGraph: {
    title: 'Force at Work: 500% Social Engagement with AI Marketing | GYST',
    description: 'Discover how AI avatars and automated marketing transformed this agency\'s Japanese market penetration.',
  }
}

export default function ForceAtWorkCaseStudy() {
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
                <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">Marketing Agency</Badge>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
                  How Force at Work Achieved{' '}
                  <span className="gradient-text-secondary">500% Social Engagement</span>{' '}
                  with AI-Powered Japanese Marketing
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                  From manual content creation to intelligent automation: Discover how AI avatars and 
                  culturally-aware marketing transformed Force at Work's Japanese market penetration.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg">
                    Scale Your Marketing with AI
                  </MagneticButton>
                  <MagneticButton href="/contact" variant="outline" size="lg">
                    Request Detailed Case Study
                  </MagneticButton>
                </div>
              </ScrollReveal>
            </div>
            <div>
              <ScrollReveal delay={0.2}>
                <div className="bg-card border border-border rounded-lg p-8 shadow-elegant">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-secondary mb-2">
                        <CounterAnimation value={500} suffix="%" duration={2} />
                      </div>
                      <div className="text-sm text-muted-foreground">Social Engagement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-secondary mb-2">
                        <CounterAnimation value={70} suffix="%" duration={2} delay={0.5} />
                      </div>
                      <div className="text-sm text-muted-foreground">Faster Content</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-secondary mb-2">
                        <CounterAnimation value={200} suffix="%" duration={2} delay={1} />
                      </div>
                      <div className="text-sm text-muted-foreground">Campaign ROI</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-secondary mb-2">
                        <CounterAnimation value={250} suffix="%" duration={2} delay={1.5} />
                      </div>
                      <div className="text-sm text-muted-foreground">Market Reach</div>
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
                <Clock className="w-8 h-8 text-secondary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Timeline</h3>
                <p className="text-muted-foreground">10 weeks</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="bg-card border border-border rounded-lg p-6 text-center shadow-elegant">
                <Users className="w-8 h-8 text-secondary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Team Size</h3>
                <p className="text-muted-foreground">5 specialists</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="bg-card border border-border rounded-lg p-6 text-center shadow-elegant">
                <Globe className="w-8 h-8 text-secondary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Market Focus</h3>
                <p className="text-muted-foreground">Japanese Business Culture</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <div className="bg-card border border-border rounded-lg p-6 text-center shadow-elegant">
                <TrendingUp className="w-8 h-8 text-secondary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Engagement Boost</h3>
                <p className="text-muted-foreground">500% Increase</p>
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
                  Force at Work needed to scale personalized marketing campaigns across Japanese markets 
                  while maintaining cultural authenticity and high engagement quality. Manual content 
                  creation and localization was becoming a bottleneck to growth.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Cultural Context Challenges</h4>
                      <p className="text-sm text-muted-foreground">Difficulty maintaining Japanese business culture nuances in scaled content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Manual Content Bottlenecks</h4>
                      <p className="text-sm text-muted-foreground">Time-intensive content creation and localization limiting campaign frequency</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Inconsistent Social Presence</h4>
                      <p className="text-sm text-muted-foreground">Irregular posting schedules and engagement across multiple platforms</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Limited Lead Generation</h4>
                      <p className="text-sm text-muted-foreground">Lack of systematic approach to identifying and nurturing Japanese market prospects</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold text-sm">
                    Result: Missed market opportunities and inability to scale culturally-appropriate marketing campaigns
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
                      <span className="text-muted-foreground">Content Creation Time</span>
                      <span className="font-semibold text-red-600">8+ hours per piece</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Social Engagement Rate</span>
                      <span className="font-semibold text-red-600">2.3%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Campaign ROI</span>
                      <span className="font-semibold text-red-600">85%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Market Penetration</span>
                      <span className="font-semibold text-red-600">Limited</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Content Authenticity</span>
                      <span className="font-semibold text-red-600">Inconsistent</span>
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
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Culturally-Aware AI Solution</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We developed a comprehensive AI system that understands Japanese business culture 
              while automating content creation and marketing campaigns at scale.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ScrollReveal delay={0.1}>
              <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">AI Avatars for Content</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Culturally-trained AI avatars that create authentic Japanese business content 
                  while maintaining brand consistency and cultural sensitivity.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Japanese business culture training</li>
                  <li>• Brand voice consistency</li>
                  <li>• Multi-format content generation</li>
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Social Media Automation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Intelligent posting schedules, engagement monitoring, and response automation 
                  across multiple Japanese social platforms and business networks.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Multi-platform coordination</li>
                  <li>• Optimal timing algorithms</li>
                  <li>• Engagement response automation</li>
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Intelligent Lead Generation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  AI-powered system that identifies, qualifies, and nurtures Japanese market 
                  prospects through culturally-appropriate outreach and engagement strategies.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Cultural behavior analysis</li>
                  <li>• Automated prospect nurturing</li>
                  <li>• Japanese business etiquette</li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Cultural AI Training Details */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <ScrollReveal>
                <h2 className="text-3xl font-bold text-foreground mb-6">
                  The Power of <span className="gradient-text-secondary">Cultural AI Training</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  Our AI system was specifically trained on Japanese business culture, communication patterns, 
                  and market preferences to ensure authentic, respectful, and effective marketing content.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Business Hierarchy Understanding</h4>
                      <p className="text-sm text-muted-foreground">
                        AI trained on Japanese corporate structure, decision-making processes, and appropriate communication levels
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Seasonal Marketing Awareness</h4>
                      <p className="text-sm text-muted-foreground">
                        Integration of Japanese business calendar, holidays, and seasonal marketing patterns for optimal timing
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Language Nuance Mastery</h4>
                      <p className="text-sm text-muted-foreground">
                        Advanced understanding of keigo (honorific language) and appropriate business formality levels
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Trust-Building Protocols</h4>
                      <p className="text-sm text-muted-foreground">
                        Implementation of relationship-first approaches essential to Japanese business culture
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
            <div>
              <ScrollReveal delay={0.2}>
                <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-8">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Client Success Quote</h3>
                  <blockquote className="text-lg italic text-muted-foreground mb-6 leading-relaxed">
                    "The AI avatars perfectly captured Japanese business culture nuances. Our clients can't tell 
                    the difference from human-created content. It's like having a native Japanese marketing team 
                    that works 24/7."
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center">
                      <span className="text-secondary font-bold">HT</span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Hiroshi Tanaka</div>
                      <div className="text-sm text-muted-foreground">Creative Director, Force at Work</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              <span className="gradient-text-secondary">Exceptional Results</span> Across All Metrics
            </h2>
            <p className="text-lg text-muted-foreground">
              Dramatic improvements in engagement, efficiency, and market penetration
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <ScrollReveal>
              <h3 className="text-xl font-semibold text-foreground mb-6">Performance Transformation</h3>
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">Social Media Engagement</span>
                    <span className="text-2xl font-bold text-secondary">+500%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">From 2.3% to 14% average engagement rate across all platforms</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">Content Creation Speed</span>
                    <span className="text-2xl font-bold text-secondary">70%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Reduction in time from concept to published content</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">Campaign ROI</span>
                    <span className="text-2xl font-bold text-secondary">+200%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">From 85% to 255% return on marketing campaign investment</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">Market Reach Expansion</span>
                    <span className="text-2xl font-bold text-secondary">+250%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Increase in Japanese market reach and qualified prospect pipeline</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Content Quality Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Cultural Authenticity Score</span>
                      <span className="font-semibold text-secondary">98%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Client Satisfaction</span>
                      <span className="font-semibold text-secondary">96%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Content Approval Rate</span>
                      <span className="font-semibold text-secondary">92%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Operational Efficiency</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Content Pieces Per Week</span>
                      <span className="font-semibold text-secondary">45</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Platform Coverage</span>
                      <span className="font-semibold text-secondary">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Response Time</span>
                      <span className="font-semibold text-secondary">&lt;2min</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 shadow-elegant">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Business Impact</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">New Client Acquisitions</span>
                      <span className="font-semibold text-secondary">+180%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Revenue Growth</span>
                      <span className="font-semibold text-secondary">+220%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Market Position</span>
                      <span className="font-semibold text-secondary">Top 3</span>
                    </div>
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
            <h2 className="text-3xl font-bold text-foreground mb-4">Advanced AI Technology Stack</h2>
            <p className="text-lg text-muted-foreground">
              Cutting-edge AI technologies enabling culturally-aware marketing automation
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              "AI Avatars",
              "Social Media APIs",
              "Cultural AI Training",
              "Lead Generation Automation"
            ].map((tech, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="bg-card border border-border rounded-lg p-4 text-center shadow-elegant hover:shadow-elegant-hover transition-all duration-300">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-secondary font-bold text-lg">
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
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/5">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Ready to Scale Your Marketing with AI?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Transform your marketing operations like Force at Work. Schedule a consultation to discover 
              how AI avatars and intelligent automation can boost your engagement and expand your market reach.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                Start Your Marketing Transformation
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton href="/case-studies" variant="outline" size="lg">
                Explore More Success Stories
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}