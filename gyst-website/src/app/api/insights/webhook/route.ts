import { NextRequest, NextResponse } from 'next/server'
import { N8NInsightPayload } from '@/types/insights'
import { getInsightBySlug, insightCategories } from '@/data/insights'

// POST /api/insights/webhook - Main n8n webhook endpoint for all insight operations
export async function POST(request: NextRequest) {
  try {
    const body: N8NInsightPayload = await request.json()
    const { action, insight, webhook_secret } = body

    // Verify webhook secret
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET
    if (expectedSecret && webhook_secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    console.log(`N8N Webhook: ${action} action received`, { insight: insight?.title || insight?.slug })

    switch (action) {
      case 'create':
        return await handleCreate(insight!)
      
      case 'update':
        return await handleUpdate(insight!)
      
      case 'delete':
        return await handleDelete(insight!)
      
      case 'publish':
        return await handlePublish(insight!)
      
      case 'unpublish':
        return await handleUnpublish(insight!)
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('N8N Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCreate(insightData: any) {
  // Validate required fields
  if (!insightData.title || !insightData.content) {
    return NextResponse.json(
      { error: 'Missing required fields: title and content are required' },
      { status: 400 }
    )
  }

  // Generate slug if not provided
  const slug = insightData.slug || insightData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Find category by name or slug
  let category = insightCategories[0] // Default category
  if (insightData.category) {
    const foundCategory = insightCategories.find(cat => 
      cat.name.toLowerCase() === insightData.category.toLowerCase() ||
      cat.slug === insightData.category
    )
    if (foundCategory) category = foundCategory
  }

  const newInsight = {
    id: Date.now().toString(),
    title: insightData.title,
    slug,
    excerpt: insightData.excerpt || insightData.content.slice(0, 200) + '...',
    content: insightData.content,
    author: {
      name: insightData.author?.name || 'GYST Team',
      role: insightData.author?.role || 'AI Specialist',
      avatar: insightData.author?.avatar
    },
    category,
    tags: Array.isArray(insightData.tags) ? insightData.tags : 
          typeof insightData.tags === 'string' ? insightData.tags.split(',').map((t: string) => t.trim()) : [],
    featuredImage: insightData.featuredImage || '/images/insights/default.jpg',
    readTime: insightData.readTime || Math.ceil(insightData.content.split(' ').length / 200),
    publishedAt: new Date(insightData.publishedAt || Date.now()),
    updatedAt: new Date(),
    status: insightData.status || 'draft',
    featured: Boolean(insightData.featured),
    seo: {
      metaTitle: insightData.seo?.metaTitle || `${insightData.title} | GYST AI Insights`,
      metaDescription: insightData.seo?.metaDescription || insightData.excerpt || insightData.content.slice(0, 160),
      keywords: insightData.seo?.keywords || [],
      ogImage: insightData.seo?.ogImage || insightData.featuredImage
    }
  }

  // In production, save to database here
  console.log('Creating insight:', newInsight)

  return NextResponse.json({
    success: true,
    action: 'create',
    insight: newInsight,
    message: 'Insight created successfully'
  }, { status: 201 })
}

async function handleUpdate(insightData: any) {
  if (!insightData.slug && !insightData.id) {
    return NextResponse.json(
      { error: 'Missing required field: slug or id is required for updates' },
      { status: 400 }
    )
  }

  const slug = insightData.slug || insightData.id
  const existingInsight = getInsightBySlug(slug)
  
  if (!existingInsight) {
    return NextResponse.json(
      { error: 'Insight not found' },
      { status: 404 }
    )
  }

  // Update category if provided
  let category = existingInsight.category
  if (insightData.category) {
    const foundCategory = insightCategories.find(cat => 
      cat.name.toLowerCase() === insightData.category.toLowerCase() ||
      cat.slug === insightData.category
    )
    if (foundCategory) category = foundCategory
  }

  const updatedInsight = {
    ...existingInsight,
    ...insightData,
    category,
    updatedAt: new Date(),
    publishedAt: insightData.publishedAt ? new Date(insightData.publishedAt) : existingInsight.publishedAt,
    author: insightData.author ? { ...existingInsight.author, ...insightData.author } : existingInsight.author,
    seo: insightData.seo ? { ...existingInsight.seo, ...insightData.seo } : existingInsight.seo,
    tags: insightData.tags ? 
      (Array.isArray(insightData.tags) ? insightData.tags : 
       typeof insightData.tags === 'string' ? insightData.tags.split(',').map((t: string) => t.trim()) : 
       existingInsight.tags) : 
      existingInsight.tags
  }

  // In production, update in database here
  console.log('Updating insight:', updatedInsight)

  return NextResponse.json({
    success: true,
    action: 'update',
    insight: updatedInsight,
    message: 'Insight updated successfully'
  })
}

async function handleDelete(insightData: any) {
  if (!insightData.slug && !insightData.id) {
    return NextResponse.json(
      { error: 'Missing required field: slug or id is required for deletion' },
      { status: 400 }
    )
  }

  const slug = insightData.slug || insightData.id
  const existingInsight = getInsightBySlug(slug)
  
  if (!existingInsight) {
    return NextResponse.json(
      { error: 'Insight not found' },
      { status: 404 }
    )
  }

  // In production, delete from database here
  console.log('Deleting insight:', slug)

  return NextResponse.json({
    success: true,
    action: 'delete',
    message: 'Insight deleted successfully'
  })
}

async function handlePublish(insightData: any) {
  if (!insightData.slug && !insightData.id) {
    return NextResponse.json(
      { error: 'Missing required field: slug or id is required for publishing' },
      { status: 400 }
    )
  }

  const slug = insightData.slug || insightData.id
  const existingInsight = getInsightBySlug(slug)
  
  if (!existingInsight) {
    return NextResponse.json(
      { error: 'Insight not found' },
      { status: 404 }
    )
  }

  const publishedInsight = {
    ...existingInsight,
    status: 'published' as const,
    publishedAt: new Date(),
    updatedAt: new Date()
  }

  // In production, update in database here
  console.log('Publishing insight:', slug)

  return NextResponse.json({
    success: true,
    action: 'publish',
    insight: publishedInsight,
    message: 'Insight published successfully'
  })
}

async function handleUnpublish(insightData: any) {
  if (!insightData.slug && !insightData.id) {
    return NextResponse.json(
      { error: 'Missing required field: slug or id is required for unpublishing' },
      { status: 400 }
    )
  }

  const slug = insightData.slug || insightData.id
  const existingInsight = getInsightBySlug(slug)
  
  if (!existingInsight) {
    return NextResponse.json(
      { error: 'Insight not found' },
      { status: 404 }
    )
  }

  const unpublishedInsight = {
    ...existingInsight,
    status: 'draft' as const,
    updatedAt: new Date()
  }

  // In production, update in database here
  console.log('Unpublishing insight:', slug)

  return NextResponse.json({
    success: true,
    action: 'unpublish',
    insight: unpublishedInsight,
    message: 'Insight unpublished successfully'
  })
}

// GET endpoint to verify webhook is working
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'N8N Insights webhook endpoint is operational',
    endpoints: {
      webhook: '/api/insights/webhook',
      list: '/api/insights',
      single: '/api/insights/[slug]'
    },
    supportedActions: ['create', 'update', 'delete', 'publish', 'unpublish']
  })
}