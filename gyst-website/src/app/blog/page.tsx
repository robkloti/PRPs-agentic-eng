import { Metadata } from 'next'
import { sampleInsights, insightCategories, getFeaturedInsights, getRecentInsights } from '@/data/insights'
import { Badge } from '@/components/ui/badge'
import { Search, Calendar, Clock, User, ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'

export const metadata: Metadata = {
  title: 'AI Insights Blog | Latest AI Implementation Strategies & Success Stories | GYST',
  description: 'Stay ahead with the latest AI insights, implementation strategies, case studies, and industry trends. Expert analysis and practical guidance for AI adoption and optimization.',
  keywords: 'AI insights, AI implementation, AI strategy, machine learning blog, AI case studies, AI trends, enterprise AI, AI ROI, AI optimization, artificial intelligence blog',
  openGraph: {
    title: 'AI Insights Blog | Expert AI Implementation Guidance | GYST',
    description: 'Expert AI insights, implementation strategies, and success stories. Get practical guidance for AI adoption and optimization from industry specialists.',
    type: 'website'
  }
}

export default function BlogPage() {
  const featuredInsights = getFeaturedInsights(2)
  const recentInsights = getRecentInsights(8)
  const nonFeaturedInsights = recentInsights.filter(insight => !insight.featured)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              <span className="gradient-text-primary">AI Insights</span> & Expert Analysis
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
              Stay ahead of the AI curve with expert insights, implementation strategies, and real-world success stories 
              from the frontlines of AI transformation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                Get AI Strategy Consultation
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton href="#insights" variant="outline" size="lg">
                Browse Latest Insights
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Featured Insights */}
      {featuredInsights.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Featured Insights</h2>
              </div>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Editor's picks: Deep-dive analysis and strategic guidance for AI implementation success.
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {featuredInsights.map((insight, index) => (
                <ScrollReveal key={insight.id} delay={index * 0.1} className="group">
                  <Link href={`/blog/${insight.slug}`} className="block">
                    <article className="bg-card border border-border rounded-lg overflow-hidden shadow-elegant hover:shadow-elegant-hover transition-all duration-300 transform hover:-translate-y-1">
                      <div className="relative h-64 sm:h-80">
                        <Image
                          src={insight.featuredImage}
                          alt={insight.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          priority={index < 2}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw"
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className={`${insight.category.color}/10 text-${insight.category.color.replace('bg-', '')} border-${insight.category.color.replace('bg-', '')}/20`}>
                            {insight.category.name}
                          </Badge>
                        </div>
                        <div className="absolute top-4 right-4">
                          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                            Featured
                          </Badge>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{insight.author.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{insight.publishedAt.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{insight.readTime} min read</span>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {insight.title}
                        </h3>
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {insight.excerpt}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {insight.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center text-primary font-medium">
                          Read Full Analysis
                          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </article>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Filter */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Explore by Category
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Find insights tailored to your specific AI implementation needs and industry focus.
            </p>
          </ScrollReveal>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link href="/blog" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              All Insights
            </Link>
            {insightCategories.map((category) => (
              <Link
                key={category.id}
                href={`/blog?category=${category.slug}`}
                className="px-6 py-3 rounded-full bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Insights Grid */}
      <section id="insights" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Latest AI Insights
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Fresh perspectives and actionable strategies from AI implementation experts.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {nonFeaturedInsights.slice(0, 6).map((insight, index) => (
              <ScrollReveal key={insight.id} delay={index * 0.1} className="group">
                <Link href={`/blog/${insight.slug}`} className="block">
                  <article className="bg-card border border-border rounded-lg overflow-hidden shadow-elegant hover:shadow-elegant-hover transition-all duration-300 transform hover:-translate-y-1">
                    <div className="relative h-48">
                      <Image
                        src={insight.featuredImage}
                        alt={insight.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute top-4 left-4">
                        <Badge className={`${insight.category.color}/10 text-${insight.category.color.replace('bg-', '')} border-${insight.category.color.replace('bg-', '')}/20`}>
                          {insight.category.name}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{insight.author.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{insight.readTime} min</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {insight.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm line-clamp-3">
                        {insight.excerpt}
                      </p>
                      <div className="flex items-center text-primary font-medium">
                        Read More
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </article>
                </Link>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal className="text-center mt-12">
            <MagneticButton href="/blog/archive" variant="outline" size="lg">
              View All Insights Archive
            </MagneticButton>
          </ScrollReveal>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Never Miss an AI Insight
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Get weekly AI implementation insights, case studies, and strategic analysis delivered to your inbox. 
              Join 5,000+ AI leaders and implementers staying ahead of the curve.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <MagneticButton variant="primary" size="md">
                Subscribe to Insights
                <ArrowRight className="ml-2 w-4 h-4" />
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}