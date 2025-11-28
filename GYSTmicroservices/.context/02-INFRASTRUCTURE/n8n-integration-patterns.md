# n8n Integration Patterns

## Role of n8n in GYST Architecture

n8n serves as the **orchestration layer** for YOUR agency workflows.

### What n8n Does
- Triggers workflows from webhooks (GHL, VAPI, etc.)
- Calls microservices in sequence
- Handles retries and error handling
- Manages long-running workflows
- Updates external systems (GHL, Slack, etc.)

### What n8n Does NOT Do
- Does NOT serve as customer-facing API
- Does NOT handle external SaaS requests
- Does NOT replace microservices
- Does NOT contain business logic

## Pattern 1: Simple Service Call
```
[n8n Webhook Trigger]
    ↓
[Set Variables]
  - correlation_id
  - customer_id
    ↓
[HTTP Request] POST to transcript-processor-svc
  URL: http://transcript-svc:8000/v1/transcribe
  Headers:
    X-Internal-Token: {{$env.INTERNAL_TOKEN}}
    X-Customer-ID: client-acme
    X-Correlation-ID: {{$json.correlation_id}}
  Body:
    {
      "audio_url": "{{$json.audio_url}}",
      "language": "en"
    }
    ↓
[Store Result] Write to Supabase or GHL
    ↓
[Notify] Send Slack/Email notification
```

## Pattern 2: Multi-Service Orchestration
```
[n8n Webhook] Lead calls in via VAPI
    ↓
[HTTP Request] transcript-processor-svc
  Returns: transcript_id, text
    ↓
[HTTP Request] embedding-svc
  Input: transcript text
  Returns: embedding_id
    ↓
[HTTP Request] lead-qualifier-svc
  Input: transcript_id, embedding_id
  Returns: score, tier (hot/warm/cold)
    ↓
[IF] tier === "hot"
  ↓
  [HTTP Request] crm-sync-svc
    Update GHL with tier="hot"
  ↓
  [HTTP Request] notification-svc
    Send SMS to sales rep
    ↓
[ELSE]
  ↓
  [HTTP Request] crm-sync-svc
    Add to nurture sequence
```

## Pattern 3: Error Handling
```
[HTTP Request] Call service
    ↓
[IF] Status Code !== 200
    ↓
    [Write to Error Log] Supabase
    ↓
    [Retry] Wait 5s, try again (max 3 times)
    ↓
    [IF] Still failing
        ↓
        [Slack Alert] Notify team
        ↓
        [Move to DLQ] Dead letter queue in Supabase
```

## Pattern 4: Async Job with Polling
```
[HTTP Request] Start long job
  POST /v1/transcribe
  Returns: {"job_id": "abc-123", "status": "processing"}
    ↓
[Wait] 10 seconds
    ↓
[HTTP Request] Check status
  GET /v1/status/abc-123
    ↓
[IF] status === "processing"
  ↓
  Loop back to Wait
    ↓
[IF] status === "completed"
  ↓
  Continue workflow
```

## Internal vs External Calls

### Internal Mode (YOUR workflows):
```yaml
HTTP Request Node:
  URL: http://internal.transcript.gyst.com/v1/transcribe
  Headers:
    X-Internal-Token: secret-token-123
    X-Customer-ID: client-acme
  
  No billing
  No rate limits
  Full access
```

### External Mode (If customer uses your n8n):
```yaml
HTTP Request Node:
  URL: https://api.transcriptai.com/v1/transcribe
  Headers:
    X-API-Key: gyst_sk_live_abc123
  
  Billing enabled
  Rate limits enforced
  Metered access
```

## Best Practices

### 1. Always Use Correlation IDs
```
Set at start of workflow:
correlation_id = "lead-{{$json.lead_id}}_{{$now}}"

Pass to every service:
X-Correlation-ID: {{$json.correlation_id}}

Use for debugging:
"Find all logs for correlation_id=lead-456_20240115"
```

### 2. Store State in Supabase, Not n8n
```
❌ BAD: Store data in n8n variables
✅ GOOD: Store in Supabase, pass IDs

[HTTP Request] Create job in Supabase
  Returns: job_id
    ↓
[HTTP Request] Call service with job_id
    ↓
[HTTP Request] Update job in Supabase
```

### 3. Idempotency
```
Generate idempotency key:
idempotency_key = "{{$json.lead_id}}_transcribe_{{$now}}"

Pass to service:
Idempotency-Key: {{$json.idempotency_key}}

Service checks if already processed
```

## Queue Mode (Self-Hosted n8n)

### Why You Need It
- Handles multiple workflows concurrently
- Doesn't block on long-running tasks
- Scales horizontally

### Setup
```yaml
# docker-compose.yml for n8n with queue mode
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine

  postgres:
    image: postgres:15
```

## Week 2 n8n Tasks

### Monday-Wednesday: Update Existing Workflows
- Replace direct API calls with calls to transcript-processor-svc
- Use internal mode authentication
- Add correlation IDs
- Test with real audio

### Thursday-Friday: Build Multi-Service Flow
- Create workflow: Audio → Transcript → Lead Qualifier → CRM
- Add error handling
- Add retry logic
- Test end-to-end

## See Also
- `.context/01-ARCHITECTURE/dual-mode-deployment.md` - Why internal/external modes
- `.context/06-WORKFLOWS/` - Specific workflow examples