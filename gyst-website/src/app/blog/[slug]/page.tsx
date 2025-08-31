import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getInsightBySlug, sampleInsights } from '@/data/insights'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, ArrowLeft, ArrowRight, Share2, BookOpen, Target } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import MagneticButton from '@/components/motion/magnetic-button'
import ScrollReveal from '@/components/motion/scroll-reveal'
import ReactMarkdown from 'react-markdown'

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const insight = getInsightBySlug(params.slug)
  
  if (!insight) {
    return {
      title: 'Insight Not Found | GYST AI Insights',
      description: 'The requested AI insight could not be found.'
    }
  }

  return {
    title: insight.seo.metaTitle || `${insight.title} | GYST AI Insights`,
    description: insight.seo.metaDescription || insight.excerpt,
    keywords: insight.seo.keywords?.join(', ') || insight.tags.join(', '),
    openGraph: {
      title: insight.seo.metaTitle || insight.title,
      description: insight.seo.metaDescription || insight.excerpt,
      type: 'article',
      publishedTime: insight.publishedAt.toISOString(),
      modifiedTime: insight.updatedAt.toISOString(),
      authors: [insight.author.name],
      section: insight.category.name,
      tags: insight.tags,
      images: [
        {
          url: insight.seo.ogImage || insight.featuredImage,
          width: 1200,
          height: 630,
          alt: insight.title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: insight.seo.metaTitle || insight.title,
      description: insight.seo.metaDescription || insight.excerpt,
      images: [insight.seo.ogImage || insight.featuredImage]
    }
  }
}

export async function generateStaticParams() {
  return sampleInsights
    .filter(insight => insight.status === 'published')
    .map(insight => ({
      slug: insight.slug
    }))
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const insight = getInsightBySlug(params.slug)

  if (!insight || insight.status !== 'published') {
    notFound()
  }

  // Get related insights (same category, different article)
  const relatedInsights = sampleInsights
    .filter(i => 
      i.category.id === insight.category.id && 
      i.id !== insight.id && 
      i.status === 'published'
    )
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <Link href="/blog" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-8">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to AI Insights
            </Link>
            
            <div className="mb-6">
              <Badge className={`${insight.category.color}/10 text-${insight.category.color.replace('bg-', '')} border-${insight.category.color.replace('bg-', '')}/20 mb-4`}>
                {insight.category.name}
              </Badge>
              {insight.featured && (
                <Badge variant="secondary" className="ml-2">
                  Featured
                </Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-foreground mb-6">
              {insight.title}
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              {insight.excerpt}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {insight.author.avatar ? (
                    <Image
                      src={insight.author.avatar}
                      alt={insight.author.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-foreground">{insight.author.name}</div>
                  <div className="text-xs">{insight.author.role}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{insight.publishedAt.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{insight.readTime} min read</span>
                </div>
              </div>

              <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {insight.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Featured Image */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="relative h-64 sm:h-96 lg:h-[500px] rounded-lg overflow-hidden">
              <Image
                src={insight.featuredImage}
                alt={insight.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <article className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:text-primary prose-pre:bg-muted prose-pre:border prose-pre:border-border">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-3xl font-bold text-foreground mt-12 mb-6">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-2xl font-bold text-foreground mt-10 mb-5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">{children}</h3>,
                  p: ({ children }) => <p className="text-muted-foreground leading-relaxed mb-6">{children}</p>,
                  ul: ({ children }) => <ul className="text-muted-foreground space-y-2 mb-6">{children}</ul>,
                  ol: ({ children }) => <ol className="text-muted-foreground space-y-2 mb-6">{children}</ol>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary bg-primary/5 p-4 my-6 italic">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-muted border border-border rounded-lg p-4 overflow-x-auto my-6">
                      {children}
                    </pre>
                  )
                }}
              >
                {insight.content}
              </ReactMarkdown>
            </article>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <div className="bg-card border border-border rounded-lg p-8 shadow-elegant">
              <Target className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Ready to Implement These AI Strategies?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Get expert guidance on implementing the AI solutions discussed in this insight. 
                Schedule a strategic consultation to explore how these approaches can transform your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <MagneticButton href="https://link.hebedigital.io/widget/bookings/strategy-session43" variant="primary" size="lg" className="group">
                  Schedule AI Strategy Session
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </MagneticButton>
                <MagneticButton href="/case-studies" variant="outline" size="lg">
                  View Success Stories
                </MagneticButton>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Related Insights */}
      {relatedInsights.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Related AI Insights
              </h2>
              <p className="text-lg text-muted-foreground">
                Continue exploring {insight.category.name.toLowerCase()} strategies and best practices.
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedInsights.map((relatedInsight, index) => (
                <ScrollReveal key={relatedInsight.id} delay={index * 0.1}>
                  <Link href={`/blog/${relatedInsight.slug}`} className="group block">
                    <article className="bg-card border border-border rounded-lg overflow-hidden shadow-elegant hover:shadow-elegant-hover transition-all duration-300 transform hover:-translate-y-1">
                      <div className="relative h-48">
                        <Image
                          src={relatedInsight.featuredImage}
                          alt={relatedInsight.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <Clock className="w-4 h-4" />
                          <span>{relatedInsight.readTime} min read</span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {relatedInsight.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                          {relatedInsight.excerpt}
                        </p>
                        <div className="flex items-center text-primary font-medium">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Read Insight
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
    </div>
  )
}