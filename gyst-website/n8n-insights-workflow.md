# N8N Insights CMS Workflow Setup

This document provides step-by-step instructions for setting up n8n workflows to manage your AI Insights content.

## Prerequisites

1. **n8n Instance**: Self-hosted or n8n Cloud account
2. **Webhook Secret**: Set `N8N_WEBHOOK_SECRET` in your Next.js environment variables
3. **API Access**: Your website must be accessible from n8n (localhost won't work for n8n Cloud)

## Environment Variables

Add to your `.env.local` file:

```bash
N8N_WEBHOOK_SECRET=your-secure-webhook-secret-here
```

## N8N Workflow Templates

### 1. Content Creation Workflow

**Trigger**: Manual trigger or scheduled trigger for content planning
**Nodes**:

1. **Manual Trigger** (or Schedule Trigger)
2. **Set Variables** - Configure insight data
3. **HTTP Request** - POST to `/api/insights/webhook`

**HTTP Request Configuration**:
- **Method**: POST
- **URL**: `https://yourdomain.com/api/insights/webhook`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "action": "create",
  "webhook_secret": "{{ $env.N8N_WEBHOOK_SECRET }}",
  "insight": {
    "title": "{{ $json.title }}",
    "content": "{{ $json.content }}",
    "excerpt": "{{ $json.excerpt }}",
    "author": {
      "name": "{{ $json.author_name }}",
      "role": "{{ $json.author_role }}",
      "avatar": "{{ $json.author_avatar }}"
    },
    "category": "{{ $json.category }}",
    "tags": "{{ $json.tags }}",
    "featuredImage": "{{ $json.featured_image }}",
    "status": "{{ $json.status || 'draft' }}",
    "featured": {{ $json.featured || false }},
    "seo": {
      "metaTitle": "{{ $json.meta_title }}",
      "metaDescription": "{{ $json.meta_description }}",
      "keywords": "{{ $json.keywords }}"
    }
  }
}
```

### 2. Content Publishing Workflow

**Trigger**: Webhook (for external triggers) or Manual
**Nodes**:

1. **Webhook** or **Manual Trigger**
2. **Switch** - Check action type
3. **HTTP Request** - Publish/Unpublish content

**Webhook URL**: `https://yourdomain.com/api/insights/webhook`

### 3. Automated Content Pipeline

**Trigger**: Schedule Trigger (daily/weekly)
**Nodes**:

1. **Schedule Trigger**
2. **Google Sheets** - Read content queue
3. **Loop** - Process each content item
4. **AI Content Generation** (optional - OpenAI node)
5. **HTTP Request** - Create insights
6. **Slack/Email** - Notification of completion

### 4. Content Management Dashboard Integration

**Trigger**: Webhook from external CMS (Notion, Airtable, Google Sheets)
**Nodes**:

1. **Webhook Trigger**
2. **Data Transformation** - Map CMS fields to insight format
3. **HTTP Request** - Send to insights API
4. **Error Handling** - Slack/Email notifications for failures

## Sample N8N Workflows

### Basic Content Creation

```json
{
  "name": "Create AI Insight",
  "nodes": [
    {
      "parameters": {},
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "position": [250, 300]
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "title",
              "value": "How to Implement RAG Systems in 2024"
            },
            {
              "name": "content",
              "value": "# RAG Implementation Guide\n\nRetrieval-Augmented Generation (RAG) has become essential for enterprise AI applications..."
            },
            {
              "name": "category",
              "value": "implementation"
            },
            {
              "name": "tags",
              "value": "RAG, AI Implementation, Enterprise"
            },
            {
              "name": "author_name",
              "value": "Sarah Mitchell"
            },
            {
              "name": "author_role",
              "value": "AI Implementation Specialist"
            }
          ]
        }
      },
      "name": "Set Content Data",
      "type": "n8n-nodes-base.set",
      "position": [450, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://yourdomain.com/api/insights/webhook",
        "sendHeaders": true,
        "headers": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "action",
              "value": "create"
            },
            {
              "name": "webhook_secret",
              "value": "={{ $env.N8N_WEBHOOK_SECRET }}"
            },
            {
              "name": "insight",
              "value": "={{ { title: $json.title, content: $json.content, category: $json.category, tags: $json.tags.split(',').map(t => t.trim()), author: { name: $json.author_name, role: $json.author_role }, status: 'published', featured: true } }}"
            }
          ]
        }
      },
      "name": "Create Insight",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 300]
    }
  ],
  "connections": {
    "Manual Trigger": {
      "main": [
        [
          {
            "node": "Set Content Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set Content Data": {
      "main": [
        [
          {
            "node": "Create Insight",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### Google Sheets Integration

For content managed in Google Sheets:

1. **Google Sheets Trigger** - Watch for new rows
2. **Data Processing** - Clean and format data
3. **HTTP Request** - Create insight via webhook
4. **Google Sheets Update** - Mark row as processed

### Notion Integration

For content managed in Notion:

1. **Notion Trigger** - Watch for database updates
2. **Data Mapping** - Convert Notion properties to insight format
3. **HTTP Request** - Send to webhook
4. **Notion Update** - Update status in Notion

## API Endpoints for N8N

### Webhook Endpoint
- **URL**: `https://yourdomain.com/api/insights/webhook`
- **Method**: POST
- **Actions**: `create`, `update`, `delete`, `publish`, `unpublish`

### Data Management
- **List**: `GET /api/insights`
- **Single**: `GET /api/insights/[slug]`
- **Update**: `PUT /api/insights/[slug]`

## Content Structure for N8N

### Required Fields
- `title` (string)
- `content` (string, markdown supported)

### Optional Fields
- `excerpt` (string, auto-generated if not provided)
- `slug` (string, auto-generated from title if not provided)
- `category` (string, category name or slug)
- `tags` (array or comma-separated string)
- `featuredImage` (string, URL)
- `status` ('draft' | 'published' | 'archived')
- `featured` (boolean)
- `author.name` (string)
- `author.role` (string)
- `author.avatar` (string, URL)
- `seo.metaTitle` (string)
- `seo.metaDescription` (string)
- `seo.keywords` (array)

## Error Handling

The webhook includes comprehensive error handling:
- Invalid webhook secret (401)
- Missing required fields (400)
- Content not found for updates (404)
- Server errors (500)

## Testing Your Integration

1. **Test Webhook**: `GET /api/insights/webhook` - Verify endpoint is active
2. **Create Sample Content**: Use the manual workflow to test creation
3. **Check Logs**: Monitor n8n execution logs and Next.js console for debugging

## Production Considerations

1. **Rate Limiting**: Implement rate limiting for webhook endpoints
2. **Database**: Replace sample data with actual database (PostgreSQL, MongoDB)
3. **Image Upload**: Handle image uploads for featured images and author avatars
4. **Content Validation**: Add content validation and sanitization
5. **Backup**: Implement content backup and versioning
6. **CDN**: Use CDN for images and static assets
7. **Security**: Implement proper authentication and authorization

## Next Steps

1. Set up your n8n instance
2. Configure webhook secret
3. Import workflow templates
4. Test content creation
5. Set up your preferred content source (Sheets, Notion, etc.)
6. Configure automated publishing schedules