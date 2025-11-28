# GYST Microservices - Development Roadmap

## Overview

This roadmap outlines the phased development of the GYST microservices platform following the dual-mode architecture strategy (internal agency use + external SaaS).

**Total Timeline:** 4 weeks
**Target Launch:** Internal mode live with real clients, External mode beta

---

## Phase 1: Foundation (Week 1)

### Goal
Establish the shared infrastructure and models that all services depend on.

### Services/Components

#### 1.1 gyst-models (Shared Package)
**Status:** PRP Ready
**Dependencies:** None
**Effort:** 2 days
**Owner:** Backend
**PRP:** `.context/09-PRPS/gyst-models-prp.md`

**What it does:**
- Pydantic models for all data structures
- Shared request/response patterns
- Event schemas

**Deliverables:**
- Python package `gyst-models` installable via `pip install -e .`
- All microservices will depend on this
- Models for: BaseResponse, Lead*, Transcript*, Event*, Customer*

**Success Criteria:**
- Package installs without errors
- All imports work
- Tests pass with >80% coverage
- Type checking passes (mypy)

**Validation:**
```bash
cd gyst-models
pip install -e ".[dev]"
ruff check src/
mypy src/
pytest tests/ -v --cov=gyst_models
```

#### 1.2 Redis Setup (Infrastructure)
**Status:** Planning
**Dependencies:** None
**Effort:** 1 day
**Owner:** DevOps/Backend

**What it does:**
- Cache layer for rate limiting, session storage
- Job queue for async tasks
- Pub/sub for internal events

**Deliverables:**
- Docker Compose config with Redis
- Redis patterns documented in `.context/02-INFRASTRUCTURE/redis-patterns.md`
- Health check endpoint

**Success Criteria:**
- Redis container starts cleanly
- Can connect from local Python
- Pub/sub works

#### 1.3 Supabase Schema (Database)
**Status:** Planning
**Dependencies:** gyst-models
**Effort:** 1.5 days
**Owner:** Backend/Data

**What it does:**
- All database schemas for microservices
- Multi-tenant isolation (customer_id on all tables)
- Migrations strategy

**Deliverables:**
- SQL schema in `.context/05-DATABASE/supabase-schema.sql`
- Service-specific tables documented
- Migration scripts

**Success Criteria:**
- Schema applies without errors
- All tables have customer_id
- Indexes on query paths
- Sample queries work

---

## Phase 2: First Service (Week 2)

### Goal
Build first microservice (transcript-processor) in both deployment modes.

### Services/Components

#### 2.1 Transcript-Processor Service
**Status:** PRP Not Yet Created
**Dependencies:** gyst-models, Supabase, Redis
**Effort:** 3 days
**Owner:** Backend
**PRP:** `.context/09-PRPS/transcript-processor-prp.md` (To be created)

**What it does:**
- Accept audio file URLs or uploads
- Call transcription API (VAPI/Retell)
- Store transcripts in Supabase
- Return job status/results

**Dual-Mode Behavior:**
- **Internal Mode:**
  - Auth: Simple X-Customer-ID header
  - Limits: None
  - Billing: Disabled
  - Used by: n8n workflows, agency clients

- **External Mode:**
  - Auth: API key validation
  - Limits: Rate limits per plan tier
  - Billing: Track usage for invoicing
  - Used by: SaaS customers

**Deliverables:**
- FastAPI service with `/transcribe`, `/status`, `/health`, `/metrics` endpoints
- Config files: `config/internal.yaml`, `config/external.yaml`
- Docker image buildable
- Full test coverage

**Success Criteria:**
- Service starts in both modes
- API endpoints work
- Database records created with customer_id
- Tests pass for both modes
- Can be called from n8n workflow

**Validation:**
```bash
# Start service
DEPLOYMENT_MODE=internal python -m uvicorn main:app

# Test endpoints
curl -X POST http://localhost:8000/transcribe \
  -H "X-Customer-ID: client-123" \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "https://..."}'

# Run tests
pytest tests/ -v --cov=transcript_processor
```

---

## Phase 3: Orchestration & API Gateway (Week 3)

### Goal
Connect services with n8n orchestration and build public API gateway.

### Services/Components

#### 3.1 API Gateway Service
**Status:** PRP Not Yet Created
**Dependencies:** gyst-models, Supabase
**Effort:** 2 days
**Owner:** Backend
**PRP:** `.context/09-PRPS/api-gateway-prp.md` (To be created)

**What it does:**
- Single entry point for external SaaS customers
- API key validation and customer routing
- Rate limiting enforcement
- Request/response logging

**Deliverables:**
- FastAPI gateway service
- API key management endpoints
- Rate limit middleware
- Routing to transcript-processor and other services

**Success Criteria:**
- API keys authenticate correctly
- Rate limits work
- Requests logged with correlation IDs
- Valid keys route to services
- Invalid keys rejected

#### 3.2 n8n Workflow Integration
**Status:** PRP Not Yet Created
**Dependencies:** Transcript-Processor Service
**Effort:** 1.5 days
**Owner:** Workflow/Automation
**PRP:** `.context/09-PRPS/n8n-workflow-integration-prp.md` (To be created)

**What it does:**
- Content pipeline: GHL leads → transcript → qualification
- Lead qualification flow
- Orchestrates microservices

**Deliverables:**
- n8n workflows in queue mode
- Custom nodes for GYST services
- Error handling and retry logic

**Success Criteria:**
- Workflows execute end-to-end
- Services called in correct order
- Error handling works
- Can be triggered by webhook

#### 3.3 Embedding Service
**Status:** PRP Not Yet Created
**Dependencies:** gyst-models, Supabase, Redis
**Effort:** 2 days
**Owner:** Backend
**PRP:** `.context/09-PRPS/embedding-svc-prp.md` (To be created)

**What it does:**
- Convert text to vector embeddings
- Store in pgvector for RAG
- Support internal + external modes

**Deliverables:**
- FastAPI service with `/embed` endpoint
- pgvector integration
- Dual-mode auth and billing

**Success Criteria:**
- Generates embeddings correctly
- Stores in Supabase pgvector
- Both modes work
- Tests pass

---

## Phase 4: Productization (Week 4)

### Goal
Launch external SaaS offering with billing and customer dashboard.

### Services/Components

#### 4.1 Billing Service
**Status:** PRP Not Yet Created
**Dependencies:** API Gateway, gyst-models
**Effort:** 2 days
**Owner:** Backend/Finance
**PRP:** `.context/09-PRPS/billing-svc-prp.md` (To be created)

**What it does:**
- Track usage events from services
- Aggregate into invoices
- Generate invoices monthly
- Track by customer and service

**Deliverables:**
- FastAPI billing service
- Usage event ingestion
- Invoice generation
- Pricing logic by plan tier

**Success Criteria:**
- Usage tracked accurately
- Invoices generated correctly
- Customer can see usage dashboard

#### 4.2 Customer Dashboard (Frontend)
**Status:** PRP Not Yet Created
**Dependencies:** API Gateway, Billing Service
**Effort:** 2 days
**Owner:** Frontend
**PRP:** `.context/09-PRPS/customer-dashboard-prp.md` (To be created)

**What it does:**
- Self-service signup
- API key management
- Usage dashboard
- Billing history

**Deliverables:**
- React/Next.js dashboard
- User authentication
- API key CRUD
- Usage charts

**Success Criteria:**
- Users can sign up
- Can generate/revoke API keys
- See usage metrics
- View invoices

#### 4.3 Public Website
**Status:** PRP Not Yet Created
**Dependencies:** None
**Effort:** 1.5 days
**Owner:** Marketing/Frontend
**PRP:** `.context/09-PRPS/public-website-prp.md` (To be created)

**What it does:**
- Landing page for TranscriptAI.com
- API documentation
- Pricing page
- Link to dashboard signup

**Deliverables:**
- Static website (Next.js)
- OpenAPI docs integration
- Pricing table
- Call-to-action to signup

**Success Criteria:**
- Site loads
- Links to dashboard work
- Docs display API specs

---

## Service Dependency Graph

```
Phase 1:
  gyst-models ──┐
  Redis         ├─→ Ready for Phase 2
  Supabase ─────┘

Phase 2:
  gyst-models
  Supabase      ├─→ transcript-processor ──┐
  Redis ────────┘                           ├─→ Ready for Phase 3
                                            │
                                     n8n (workflows)

Phase 3:
  transcript-processor ─┐
  gyst-models          ├─→ api-gateway ──┐
  Supabase ────────────┘                  ├─→ Ready for Phase 4
                                          │
  transcript-processor ─┐                 │
  Supabase             ├─→ embedding-svc ┘
  gyst-models ─────────┘

Phase 4:
  api-gateway ───┐
  gyst-models    ├─→ billing-svc ──┬──→ customer-dashboard
  Supabase ──────┘                  │
                                    └──→ public-website
```

---

## Weekly Breakdown

### Week 1: Foundation
- Monday-Tuesday: Build gyst-models package
- Tuesday-Wednesday: Set up Redis + Supabase
- Wednesday (afternoon): Create PRPs for Week 2

**Exit Criteria:**
- gyst-models package in Supabase
- Redis running locally
- All tests passing
- Ready to build first service

### Week 2: First Service
- Monday: Complete transcript-processor service (both modes)
- Tuesday-Wednesday: Full testing + integration with n8n
- Wednesday (afternoon): Create PRPs for Week 3

**Exit Criteria:**
- Transcript-processor working in internal mode
- Used by real client project
- All tests passing
- Ready for orchestration

### Week 3: Orchestration
- Monday: API Gateway service
- Tuesday: n8n workflow integration
- Tuesday-Wednesday: Embedding service
- Wednesday (afternoon): Create PRPs for Week 4

**Exit Criteria:**
- Full workflow from lead → transcript → embedding works
- API Gateway validates API keys
- Ready for SaaS launch

### Week 4: Launch
- Monday: Billing service
- Tuesday: Customer dashboard
- Wednesday: Public website
- Thursday: Final integration testing + launch prep

**Exit Criteria:**
- External SaaS live and tested
- Customers can self-serve
- Billing works
- Ready for beta customers

---

## Risk Mitigation

### High Risk Items

**Risk: Dual-Mode Logic Gets Complex**
- Mitigation: Extract mode checking into middleware
- Keep business logic mode-agnostic
- Test both modes separately at every step

**Risk: Database Schema Changes Breaking Services**
- Mitigation: Versioned migrations
- Coordinate schema changes across all services
- Test with real customer data early

**Risk: Supabase pgvector Performance**
- Mitigation: Prototype embedding indexing early (Phase 3)
- Load test with realistic data volumes

### Contingency Plan

If any phase takes longer than expected:
- Phase 1 delays → Slip all subsequent phases by same amount
- Phase 2 delays → Can still plan Phase 3 PRPs in parallel
- Phase 3 delays → Push Phase 4 but keep feature complete
- Phase 4 delays → Launch without dashboard, add later

---

## Testing Strategy

### Phase 1 Testing
- Unit tests for all Pydantic models
- Integration tests for Redis connections
- Schema validation tests for Supabase

### Phase 2 Testing
- Unit tests for business logic (transcription)
- Integration tests with actual transcription API
- Both internal and external mode tests
- n8n workflow testing

### Phase 3 Testing
- API Gateway auth/rate limit tests
- End-to-end workflow tests
- Multi-tenant isolation tests
- Embedding service accuracy tests

### Phase 4 Testing
- Customer signup flow
- API key management
- Usage tracking accuracy
- Billing calculation
- Dashboard functionality

---

## Success Metrics

### Week 1
- [ ] gyst-models installable and tested
- [ ] Supabase schema applied
- [ ] Redis running

### Week 2
- [ ] Transcript-processor handles real client transcriptions
- [ ] 0 data loss during processing
- [ ] API works in both modes
- [ ] All tests pass

### Week 3
- [ ] API Gateway validates all requests correctly
- [ ] n8n workflows complete end-to-end
- [ ] Embedding service produces consistent vectors
- [ ] Rate limiting works

### Week 4
- [ ] 10+ test customers sign up
- [ ] Billing accurate to within $0.01
- [ ] Dashboard shows correct usage
- [ ] Website loads in <3s

---

## What's Next

1. **Immediate (Today):** Create this ROADMAP.md ✅
2. **Next Step:** Fill in missing context files:
   - `.context/01-ARCHITECTURE/dual-mode-deployment.md`
   - `.context/07-EXAMPLES/dual-mode-service-complete.py`
3. **Then:** Create PRPs for Week 2+ services
4. **Finally:** Execute Week 1 (gyst-models)

---

## Notes

- All PRPs follow the Wirasm methodology
- Each PRP includes: Goal, Why, What, Context, Blueprint, Validation Loop
- Services built incrementally with validation at each step
- Both modes tested separately at every phase
- Real client usage validates internal mode before external launch
