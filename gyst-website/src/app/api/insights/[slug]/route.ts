import { NextRequest, NextResponse } from 'next/server'
import { getInsightBySlug, sampleInsights } from '@/data/insights'

interface RouteParams {
  params: {
    slug: string
  }
}

// GET /api/insights/[slug] - Fetch specific insight by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = params
    const insight = getInsightBySlug(slug)

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      )
    }

    // Get related insights (same category, different article)
    const relatedInsights = sampleInsights
      .filter(i => 
        i.category.id === insight.category.id && 
        i.id !== insight.id && 
        i.status === 'published'
      )
      .slice(0, 3)

    return NextResponse.json({
      insight,
      relatedInsights
    })
  } catch (error) {
    console.error('Error fetching insight:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insight' },
      { status: 500 }
    )
  }
}

// PUT /api/insights/[slug] - Update specific insight (for n8n webhook)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = params
    const body = await request.json()
    const { webhook_secret, insight: updateData } = body

    // Verify webhook secret
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET
    if (expectedSecret && webhook_secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    // Find existing insight
    const existingInsight = getInsightBySlug(slug)
    if (!existingInsight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      )
    }

    // Update insight (in a real implementation, you'd update the database)
    const updatedInsight = {
      ...existingInsight,
      ...updateData,
      updatedAt: new Date(),
      // Ensure some fields are properly handled
      publishedAt: updateData.publishedAt ? new Date(updateData.publishedAt) : existingInsight.publishedAt,
      author: updateData.author ? { ...existingInsight.author, ...updateData.author } : existingInsight.author,
      seo: updateData.seo ? { ...existingInsight.seo, ...updateData.seo } : existingInsight.seo
    }

    console.log('Insight updated via n8n:', updatedInsight)

    return NextResponse.json({
      success: true,
      insight: updatedInsight,
      message: 'Insight updated successfully'
    })

  } catch (error) {
    console.error('Error updating insight:', error)
    return NextResponse.json(
      { error: 'Failed to update insight' },
      { status: 500 }
    )
  }
}

// DELETE /api/insights/[slug] - Delete specific insight (for n8n webhook)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = params
    const body = await request.json()
    const { webhook_secret } = body

    // Verify webhook secret
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET
    if (expectedSecret && webhook_secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    // Find existing insight
    const existingInsight = getInsightBySlug(slug)
    if (!existingInsight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      )
    }

    // In a real implementation, you'd delete from the database
    console.log('Insight deleted via n8n:', slug)

    return NextResponse.json({
      success: true,
      message: 'Insight deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting insight:', error)
    return NextResponse.json(
      { error: 'Failed to delete insight' },
      { status: 500 }
    )
  }
}