import { Metadata } from 'next'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ArrowRight, Target, Users, Lightbulb, Award } from 'lucide-react'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'

export const metadata: Metadata = {
  title: 'About GYST | Premium AI Agency Leadership & Vision | Get Your Stack Together',
  description: 'Meet the team behind GYST\'s AI transformation success. Learn about our mission to deliver enterprise-grade AI solutions that generate measurable ROI and competitive advantages.',
  keywords: 'GYST team, AI agency leadership, AI transformation experts, enterprise AI specialists, Rob Kloti, AI strategy consultants',
  openGraph: {
    title: 'About GYST | Premium AI Agency Leadership & Vision',
    description: 'Meet the team behind GYST\'s AI transformation success. Enterprise-grade AI solutions with proven ROI.',
    type: 'website'
  }
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              <span className="gradient-text-primary">Meet the Team</span><br />
              <span className="text-foreground">Behind Your AI Success</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              We're not just another AI agency. We're the team that turns AI experiments into 
              business-transforming systems that deliver real ROI and competitive advantages.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <div className="relative">
                {/* Replace 'your-image.jpg' with your actual image filename */}
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
                  <Image
                    src="/images/about/founder.jpg"
                    alt="Rob Kloti - GYST Founder & AI Strategy Director"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                
                {/* Optional: Add a gradient overlay or badge */}
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
                    Founder & AI Strategy Director
                  </Badge>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                    Rob Kloti
                  </h2>
                  <p className="text-xl text-muted-foreground mb-6">
                    Founder & AI Strategy Director
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    With over a decade of experience in enterprise technology and AI implementation, 
                    Rob founded GYST with a simple mission: to cut through the AI hype and deliver 
                    systems that actually work for real businesses.
                  </p>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    Before GYST, Rob worked with companies of all sizes to implement AI that actually works. 
                    He discovered that successful AI isn't about chasing the latest models—it's about 
                    understanding what your business actually needs and building systems that deliver.
                  </p>

                  <p className="text-muted-foreground leading-relaxed">
                    When he's not architecting AI solutions, Rob is probably debugging something, 
                    optimizing workflows, or explaining why your AI project needs better data before 
                    it needs better algorithms.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                    Schedule Strategy Session
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </MagneticButton>
                  <MagneticButton href="/case-studies" variant="outline" size="lg">
                    View Success Stories
                  </MagneticButton>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Our Mission & Values
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Everything we do is guided by our commitment to delivering AI solutions 
              that generate measurable business value and competitive advantages.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollReveal delay={0.1} className="text-center">
              <div className="p-8 bg-card border border-border rounded-lg shadow-elegant">
                <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-4">Results-Driven</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We measure success by your ROI, not by how impressive our technology sounds. 
                  Every AI solution we build is designed to deliver measurable business impact.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2} className="text-center">
              <div className="p-8 bg-card border border-border rounded-lg shadow-elegant">
                <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-4">Enterprise-Grade</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We understand the complexities of enterprise environments. Security, compliance, 
                  scalability, and integration aren't afterthoughts—they're built in from day one.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3} className="text-center">
              <div className="p-8 bg-card border border-border rounded-lg shadow-elegant">
                <Lightbulb className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-4">Practical Innovation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We stay at the cutting edge of AI technology, but we only implement what actually 
                  works in production. Innovation without execution is just expensive research.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Why GYST Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why Choose <span className="gradient-text-secondary">GYST</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We're not the biggest AI agency, but we might be the most effective. 
              Here's what sets us apart from the noise.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <ScrollReveal delay={0.1}>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Production-Ready from Day One
                    </h3>
                    <p className="text-muted-foreground">
                      We don't build prototypes or proofs of concept. Every solution we deliver 
                      is designed for production deployment with enterprise security and scalability.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Proven ROI Track Record
                    </h3>
                    <p className="text-muted-foreground">
                      Our clients see an average 300%+ ROI within the first year of implementation. 
                      We focus on AI applications that directly impact your bottom line.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Industry-Specific Expertise
                    </h3>
                    <p className="text-muted-foreground">
                      We understand the unique challenges of regulated industries like healthcare, 
                      finance, and government. Compliance isn't a constraint—it's a requirement we build around.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      End-to-End Implementation
                    </h3>
                    <p className="text-muted-foreground">
                      From initial strategy through deployment and optimization, we handle the complete 
                      AI transformation journey. No handoffs, no gaps, no surprises.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Transparent Communication
                    </h3>
                    <p className="text-muted-foreground">
                      We explain what we're building, why it matters, and how it will impact your business. 
                      No black boxes, no technical jargon, no inflated promises.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Long-Term Partnership
                    </h3>
                    <p className="text-muted-foreground">
                      We're not just building software—we're building relationships. Our success 
                      is measured by your continued growth and AI maturity over time.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <Award className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Ready to Get Your Stack Together?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Let's discuss how GYST can transform your business with AI solutions that actually work. 
              Schedule a strategic consultation to explore your AI potential.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                Schedule AI Strategy Session
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton href="/services" variant="outline" size="lg">
                Explore Our Services
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}