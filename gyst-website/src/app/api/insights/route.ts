import { NextRequest, NextResponse } from 'next/server'
import { sampleInsights, insightCategories } from '@/data/insights'
import { InsightFilters, InsightsResponse } from '@/types/insights'

// GET /api/insights - Fetch insights with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const filters: InsightFilters = {
      category: searchParams.get('category') || undefined,
      tag: searchParams.get('tag') || undefined,
      author: searchParams.get('author') || undefined,
      featured: searchParams.get('featured') === 'true' || undefined,
      status: (searchParams.get('status') as 'draft' | 'published' | 'archived') || 'published',
      limit: parseInt(searchParams.get('limit') || '10'),
      offset: parseInt(searchParams.get('offset') || '0'),
      search: searchParams.get('search') || undefined
    }

    // Filter insights based on criteria
    let filteredInsights = sampleInsights.filter(insight => {
      // Status filter
      if (filters.status && insight.status !== filters.status) return false
      
      // Category filter
      if (filters.category && insight.category.slug !== filters.category) return false
      
      // Tag filter
      if (filters.tag && !insight.tags.some(tag => 
        tag.toLowerCase().includes(filters.tag!.toLowerCase())
      )) return false
      
      // Author filter
      if (filters.author && !insight.author.name.toLowerCase().includes(
        filters.author.toLowerCase()
      )) return false
      
      // Featured filter
      if (filters.featured !== undefined && insight.featured !== filters.featured) return false
      
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        return (
          insight.title.toLowerCase().includes(searchTerm) ||
          insight.excerpt.toLowerCase().includes(searchTerm) ||
          insight.content.toLowerCase().includes(searchTerm) ||
          insight.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        )
      }
      
      return true
    })

    // Sort by published date (most recent first)
    filteredInsights.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

    // Apply pagination
    const total = filteredInsights.length
    const paginatedInsights = filteredInsights.slice(
      filters.offset || 0, 
      (filters.offset || 0) + (filters.limit || 10)
    )

    // Get popular tags (top 10 most used)
    const tagCounts = sampleInsights
      .filter(insight => insight.status === 'published')
      .flatMap(insight => insight.tags)
      .reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const popularTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag)

    const response: InsightsResponse = {
      insights: paginatedInsights,
      pagination: {
        total,
        limit: filters.limit || 10,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 10) < total
      },
      categories: insightCategories,
      popularTags
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

// POST /api/insights - Create new insight (for n8n webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhook_secret, insight } = body

    // Verify webhook secret (you'll want to set this as an environment variable)
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET
    if (expectedSecret && webhook_secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!insight.title || !insight.content || !insight.author?.name) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, and author.name are required' },
        { status: 400 }
      )
    }

    // Generate slug from title if not provided
    const slug = insight.slug || insight.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Create new insight object
    const newInsight = {
      id: Date.now().toString(),
      title: insight.title,
      slug,
      excerpt: insight.excerpt || insight.content.slice(0, 200) + '...',
      content: insight.content,
      author: {
        name: insight.author.name,
        role: insight.author.role || 'Content Contributor',
        avatar: insight.author.avatar
      },
      category: insight.category || insightCategories[0], // Default to first category
      tags: insight.tags || [],
      featuredImage: insight.featuredImage || '/images/insights/default.jpg',
      readTime: insight.readTime || Math.ceil(insight.content.split(' ').length / 200),
      publishedAt: new Date(insight.publishedAt || Date.now()),
      updatedAt: new Date(),
      status: insight.status || 'draft',
      featured: insight.featured || false,
      seo: {
        metaTitle: insight.seo?.metaTitle || `${insight.title} | GYST AI Insights`,
        metaDescription: insight.seo?.metaDescription || insight.excerpt,
        keywords: insight.seo?.keywords || insight.tags,
        ogImage: insight.seo?.ogImage || insight.featuredImage
      }
    }

    // In a real implementation, you'd save this to your database
    // For now, we'll just return the created insight
    console.log('New insight created via n8n:', newInsight)

    return NextResponse.json({
      success: true,
      insight: newInsight,
      message: 'Insight created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating insight:', error)
    return NextResponse.json(
      { error: 'Failed to create insight' },
      { status: 500 }
    )
  }
}