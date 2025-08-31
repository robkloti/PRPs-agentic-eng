export interface Insight {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: {
    name: string
    role: string
    avatar?: string
  }
  category: InsightCategory
  tags: string[]
  featuredImage: string
  readTime: number
  publishedAt: Date
  updatedAt: Date
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  seo: {
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
    ogImage?: string
  }
}

export interface InsightCategory {
  id: string
  name: string
  slug: string
  description: string
  color: string
}

export interface InsightFilters {
  category?: string
  tag?: string
  author?: string
  featured?: boolean
  status?: 'draft' | 'published' | 'archived'
  limit?: number
  offset?: number
  search?: string
}

export interface InsightsResponse {
  insights: Insight[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  categories: InsightCategory[]
  popularTags: string[]
}

// N8N Webhook payload structure
export interface N8NInsightPayload {
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish'
  insight: Partial<Insight>
  webhook_secret?: string
}