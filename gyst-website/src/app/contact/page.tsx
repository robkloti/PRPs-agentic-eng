import { Metadata } from 'next'
import { motion } from 'motion/react'
import ScrollReveal from '@/components/motion/scroll-reveal'
import MagneticButton from '@/components/motion/magnetic-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Contact GYST - AI Strategy Consultation | Get Your Stack Together',
  description: 'Ready to transform your business with AI? Contact GYST for a strategic consultation on implementing AI solutions that drive real ROI and business growth.',
  openGraph: {
    title: 'Contact GYST - AI Strategy Consultation',
    description: 'Ready to transform your business with AI? Contact GYST for a strategic consultation.',
    type: 'website',
  },
}

const services = [
  { name: "AI Strategy & Roadmap", description: "Strategic planning for AI transformation" },
  { name: "RAG Solutions", description: "Enterprise knowledge bases with real-time data" },
  { name: "AI Chatbots & Avatars", description: "Conversational AI with human-like interactions" },
  { name: "Lead Generation AI", description: "End-to-end sales automation and prospect identification" },
  { name: "AI Content Generation", description: "Industry-specific content creation with brand consistency" },
  { name: "Custom AI Development", description: "Bespoke AI solutions for unique business challenges" },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Ready to <span className="gradient-text-primary">Transform</span>
              <br />
              Your Business with AI?
            </h1>
          </ScrollReveal>
          
          <ScrollReveal delay={0.1}>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Most leaders talk about AI. Some run experiments. But only a few leaders 
              turn AI into real business results. Let's discuss how GYST can help your 
              organization adopt AI that drives measurable ROI.
            </p>
          </ScrollReveal>
          
          <ScrollReveal delay={0.2}>
            <div className="flex flex-wrap gap-2 justify-center mb-12">
              <Badge variant="secondary">Free Consultation</Badge>
              <Badge variant="secondary">No Commitment Required</Badge>
              <Badge variant="secondary">Enterprise Ready</Badge>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <ScrollReveal>
              <Card className="p-8">
                <CardHeader>
                  <CardTitle className="text-2xl mb-2">Start Your AI Transformation</CardTitle>
                  <CardDescription className="text-lg">
                    Tell us about your business challenges and AI goals. We'll respond within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                          First Name *
                        </label>
                        <Input 
                          id="firstName" 
                          name="firstName" 
                          required 
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                          Last Name *
                        </label>
                        <Input 
                          id="lastName" 
                          name="lastName" 
                          required 
                          placeholder="Smith"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        Business Email *
                      </label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        required 
                        placeholder="john@company.com"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium mb-2">
                        Company *
                      </label>
                      <Input 
                        id="company" 
                        name="company" 
                        required 
                        placeholder="Your Company Inc."
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium mb-2">
                        Your Role *
                      </label>
                      <Input 
                        id="role" 
                        name="role" 
                        required 
                        placeholder="CTO, VP Engineering, etc."
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="industry" className="block text-sm font-medium mb-2">
                        Industry
                      </label>
                      <Input 
                        id="industry" 
                        name="industry" 
                        placeholder="Healthcare, Finance, Manufacturing, etc."
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="teamSize" className="block text-sm font-medium mb-2">
                        Team Size
                      </label>
                      <select 
                        id="teamSize" 
                        name="teamSize"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      >
                        <option value="">Select team size...</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-1000">201-1,000 employees</option>
                        <option value="1000+">1,000+ employees</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="budget" className="block text-sm font-medium mb-2">
                        Project Budget Range
                      </label>
                      <select 
                        id="budget" 
                        name="budget"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      >
                        <option value="">Select budget range...</option>
                        <option value="under-25k">Under $25,000</option>
                        <option value="25k-100k">$25,000 - $100,000</option>
                        <option value="100k-500k">$100,000 - $500,000</option>
                        <option value="500k+">$500,000+</option>
                        <option value="not-sure">Not sure yet</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="services" className="block text-sm font-medium mb-2">
                        Services of Interest
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {services.map((service) => (
                          <label key={service.name} className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              name="services" 
                              value={service.name}
                              className="rounded border-border"
                            />
                            <span className="text-sm">{service.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium mb-2">
                        Project Details *
                      </label>
                      <Textarea 
                        id="message" 
                        name="message" 
                        required 
                        rows={4}
                        placeholder="Tell us about your business challenges, AI goals, current tech stack, and timeline..."
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="timeline" className="block text-sm font-medium mb-2">
                        Preferred Timeline
                      </label>
                      <select 
                        id="timeline" 
                        name="timeline"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      >
                        <option value="">Select timeline...</option>
                        <option value="asap">ASAP - Ready to start immediately</option>
                        <option value="1-3-months">1-3 months</option>
                        <option value="3-6-months">3-6 months</option>
                        <option value="6-12-months">6-12 months</option>
                        <option value="exploring">Just exploring options</option>
                      </select>
                    </div>
                    
                    <MagneticButton 
                      type="submit" 
                      size="lg" 
                      className="w-full"
                    >
                      Request AI Strategy Consultation
                    </MagneticButton>
                    
                    <p className="text-sm text-muted-foreground text-center">
                      By submitting this form, you agree to our privacy policy. 
                      We'll never share your information and you can unsubscribe at any time.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </ScrollReveal>
            
            {/* Contact Information */}
            <div className="space-y-8">
              <ScrollReveal delay={0.1}>
                <Card className="p-8">
                  <CardHeader>
                    <CardTitle className="text-xl mb-4">Why Choose GYST?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                        <span className="text-primary-foreground text-sm font-bold">✓</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Proven Results</h4>
                        <p className="text-sm text-muted-foreground">
                          300% increase in qualified leads for Galaxy Housing, 
                          500% social engagement boost for Force at Work
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                        <span className="text-primary-foreground text-sm font-bold">✓</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Enterprise Experience</h4>
                        <p className="text-sm text-muted-foreground">
                          Successfully deployed AI solutions across pharma, 
                          insurance, property, government, and crypto sectors
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                        <span className="text-primary-foreground text-sm font-bold">✓</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">End-to-End Solution</h4>
                        <p className="text-sm text-muted-foreground">
                          From strategy and implementation to deployment and optimization, 
                          we handle the complete AI transformation journey
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                        <span className="text-primary-foreground text-sm font-bold">✓</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Compliance Ready</h4>
                        <p className="text-sm text-muted-foreground">
                          Deep understanding of regulatory requirements 
                          for healthcare, finance, and government sectors
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
              
              <ScrollReveal delay={0.2}>
                <Card className="p-8">
                  <CardHeader>
                    <CardTitle className="text-xl mb-4">What Happens Next?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mt-1 font-bold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">Initial Consultation</h4>
                        <p className="text-sm text-muted-foreground">
                          We'll schedule a 30-minute discovery call to understand 
                          your business challenges and AI goals
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mt-1 font-bold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">AI Readiness Assessment</h4>
                        <p className="text-sm text-muted-foreground">
                          We'll evaluate your current tech stack, data infrastructure, 
                          and team capabilities
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mt-1 font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">Strategic Proposal</h4>
                        <p className="text-sm text-muted-foreground">
                          We'll present a customized AI implementation roadmap 
                          with clear ROI projections and timeline
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
              
              <ScrollReveal delay={0.3}>
                <Card className="p-8 bg-muted/50">
                  <CardContent className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Prefer to Talk Directly?</h3>
                    <p className="text-muted-foreground mb-4">
                      Schedule a call at your convenience
                    </p>
                    <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="outline" size="lg">
                      Book Calendar Slot
                    </MagneticButton>
                  </CardContent>
                </Card>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}