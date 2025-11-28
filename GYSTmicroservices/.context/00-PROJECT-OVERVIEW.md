# GYST Microservices Project - Master Overview

## Project Vision
Build microservices using a **dual-mode architecture**:
1. **Internal Mode**: For agency client integrations (no billing, full access)
2. **External Mode**: For public SaaS products (billing, rate limits, API keys)

**Key Insight:** ONE codebase serves BOTH purposes through configuration.

## The Dual-Mode Strategy

### Why Single Codebase?
- Fix bugs once, both modes benefit
- Dogfood your own product (use internal mode for clients)
- Features battle-tested internally before public launch
- Simpler operations (one deployment pipeline)
- Easier to maintain

### How It Works
````python
# Environment variable controls behavior
DEPLOYMENT_MODE = "internal" | "external"

if DEPLOYMENT_MODE == "external":
    # Public SaaS: API keys, billing, rate limits
    customer = await validate_api_key(request)
    await check_usage_limits(customer.id)
    await track_usage(customer.id, "transcribe", cost=0.05)
else:
    # Internal: Simple token, no limits
    customer_id = request.headers["X-Customer-ID"]
    # No billing, no limits
````

### Deployment Pattern
````
Same Docker Image
    ↓
    ├→ Deploy to internal.gyst.com (DEPLOYMENT_MODE=internal)
    │  Used by: Your n8n, client systems
    │  Auth: Internal token
    │  Billing: Disabled
    │
    └→ Deploy to api.transcriptai.com (DEPLOYMENT_MODE=external)
       Used by: External developers
       Auth: API keys
       Billing: Enabled
````

## Current State
- Have existing GHL + n8n + Supabase + VAPI/RETELL infrastructure
- Services store transcripts, process leads, manage workflows
- Everything currently single-tenant (for our own use)
- Ready to add dual-mode capability

## Target State
- Single codebase per microservice
- Each service supports internal AND external deployment
- Internal mode: For agency client work (unlimited, custom features)
- External mode: For SaaS customers (metered, self-service)
- n8n orchestrates both modes seamlessly

## Architecture Decision Records

### ADR-001: Dual-Mode Services
**Decision:** Build ONE service that works in two deployment modes.
**Rationale:** 
- Avoid maintaining separate codebases
- Dogfooding ensures quality
- Features developed for clients can be productized
- Simpler operations

**Implementation:**
- Environment variable: `DEPLOYMENT_MODE`
- Config files: `config/internal.yaml` and `config/external.yaml`
- Conditional logic for auth, billing, rate limiting
- Core business logic 100% shared

### ADR-002: FastAPI for Services
**Decision:** Use FastAPI (Python 3.11+)
**Rationale:**
- Async/await native support
- Automatic OpenAPI docs
- Type hints with Pydantic
- Fast enough for our scale

### ADR-003: n8n for Orchestration
**Decision:** Self-host n8n with queue mode
**Rationale:**
- Visual workflow builder
- Queue mode for parallel execution
- Custom nodes possible
- Cheaper than n8n Cloud at scale

### ADR-004: Supabase for Data
**Decision:** Supabase (Postgres + pgvector)
**Rationale:**
- Postgres = rock solid
- pgvector for RAG
- Real-time subscriptions
- Good free tier

### ADR-005: Observability Stack
**Decision:** Grafana Cloud (free) + self-hosted Prometheus
**Rationale:**
- Zero setup with Grafana Cloud
- Free tier sufficient for start
- Can self-host later if needed

## Core Services Being Built

All services follow dual-mode pattern:

1. **transcript-processor-svc** - Audio → text transcription
   - Internal: Unlimited transcription for client projects
   - External: Metered API (TranscriptAI.com)

2. **embedding-svc** - Text → vector embeddings
   - Internal: Unlimited embeddings for RAG systems
   - External: Pay-per-token API

3. **rag-query-svc** - Semantic search over vectors
   - Internal: Client-specific knowledge bases
   - External: Multi-tenant search API

4. **lead-qualifier-svc** - AI lead scoring
   - Internal: Custom scoring rules per client
   - External: Generic scoring API (QualifyAI.com)

5. **content-generator-svc** - Long-form → multiple formats
   - Internal: Client-specific templates
   - External: Generic content API (ContentAI.com)

6. **api-gateway-svc** - Authentication + routing hub
   - Routes to appropriate service instance
   - Handles API key validation (external mode only)

7. **billing-svc** - Usage tracking + payments
   - Only used in external mode
   - Tracks usage, generates invoices

## Read This In Order

1. **Start:** This file (00-PROJECT-OVERVIEW.md)
2. **Architecture:** 01-ARCHITECTURE/dual-mode-deployment.md
3. **Methodology:** 10-WIRASM-CONTEXT/prp-methodology.md
4. **Service Template:** 03-MICROSERVICES/service-template.md
5. **First Service:** 09-PRPS/[specific PRP]

## Critical Context

### Development Philosophy (from Wirasm/Rasmus)
- **Context is King**: Include ALL necessary documentation
- **Validation Loops**: Test at each step (lint → test → manual)
- **Progressive Success**: Build simple, validate, enhance
- **Dense Information**: Use keywords from codebase
- **Concrete Examples**: Runnable code > abstract patterns

### Our Additions
- **Dual-Mode First**: Every service built for both internal & external
- **Dogfooding**: Use internal mode for real client work
- **Feature Graduation**: Internal → tested → external launch
- **Config Over Code**: Behavior controlled by env vars

## Constraints & Preferences

**Code Standards:**
- Python 3.11+ with type hints everywhere
- Pydantic for all data models
- Async/await for I/O operations
- Structured JSON logging with correlation IDs
- FastAPI for all HTTP services

**Testing Standards:**
- Unit tests for core logic
- Integration tests for API endpoints
- Test dual-mode behavior separately
- Validate multi-tenant isolation

**Deployment Standards:**
- Docker containers
- Environment variables for config
- Health check endpoint required
- Metrics endpoint required
- Separate instances for internal/external

**Documentation Standards:**
- OpenAPI docs auto-generated
- README with deployment instructions
- Config file examples provided
- Dual-mode usage documented

## Current Focus

**Phase 1: Foundation (Week 1-2)**
1. Create shared models package (gyst-models)
2. Build first service (transcript-processor) with dual-mode
3. Deploy internal instance for agency use
4. Validate with real client project

**Phase 2: Productization (Week 3-4)**
1. Deploy external instance of transcript-processor
2. Build API gateway for external auth
3. Add usage tracking & billing
4. Launch TranscriptAI.com (landing page + dashboard)

## Key Files to Reference

When building services:
- `01-ARCHITECTURE/dual-mode-deployment.md` - Core pattern
- `07-EXAMPLES/dual-mode-service-complete.py` - Complete example
- `03-MICROSERVICES/service-template.md` - Step-by-step guide

When creating PRPs:
- `10-WIRASM-CONTEXT/prp-methodology.md` - How to structure
- `09-PRPS/prp-template.md` - Template to follow

When stuck:
- `08-GOTCHAS/common-errors.md` - Known issues & solutions

## Success Metrics

**Internal Mode (Agency):**
- Client projects successfully use services
- No downtime during client integrations
- Features work as expected
- Easy to customize per client

**External Mode (SaaS):**
- Self-service signup works
- API keys authenticate properly
- Usage tracking accurate
- Billing charges correctly
- Rate limits enforce properly

**Both:**
- Same codebase for both modes
- Bug fixes applied to both
- Features available to both
- Simple to maintain