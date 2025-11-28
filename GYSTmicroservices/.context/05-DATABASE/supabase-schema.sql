-- ============================================================================
-- GYST Microservices - Complete Database Schema
-- ============================================================================
-- 
-- This schema supports:
-- 1. Service catalog (microservices registry)
-- 2. Multi-tenant customer system (for SaaS products)
-- 3. Usage tracking & billing
-- 4. Service health monitoring
--
-- Deploy to Supabase
-- ============================================================================

-- ============================================================================
-- PART 1: SERVICE CATALOG (For Internal Service Discovery)
-- ============================================================================

-- Main services registry
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Service Identity
    service_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'active', -- active, deprecated, maintenance, offline
    
    -- Deployment Info
    base_url TEXT NOT NULL,
    internal_url TEXT, -- URL for internal instance (if different)
    external_url TEXT, -- URL for external instance (if different)
    health_endpoint TEXT DEFAULT '/health',
    metrics_endpoint TEXT DEFAULT '/metrics',
    
    -- Service Metadata
    category TEXT, -- 'processing', 'integration', 'ai', 'storage'
    tags TEXT[],
    
    -- Operational Info
    avg_response_time_ms INTEGER,
    uptime_percentage DECIMAL(5,2),
    last_health_check TIMESTAMPTZ,
    
    -- Pricing (for cost tracking)
    estimated_cost_per_call DECIMAL(10,4),
    compute_tier TEXT, -- 'light', 'medium', 'heavy'
    
    -- Ownership
    owner_team TEXT,
    documentation_url TEXT,
    
    -- Configuration
    requires_auth BOOLEAN DEFAULT true,
    rate_limit_per_minute INTEGER,
    timeout_seconds INTEGER DEFAULT 30
);

-- Service endpoints
CREATE TABLE IF NOT EXISTS service_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Endpoint Details
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    endpoint_name TEXT NOT NULL,
    description TEXT,
    
    -- Schema
    input_schema JSONB,
    output_schema JSONB,
    
    -- Operational
    is_async BOOLEAN DEFAULT false,
    idempotency_supported BOOLEAN DEFAULT true,
    
    -- Examples
    example_request JSONB,
    example_response JSONB,
    
    -- Versioning
    version TEXT DEFAULT '1.0.0',
    deprecated BOOLEAN DEFAULT false,
    
    UNIQUE(service_id, path, method)
);

-- Events registry
CREATE TABLE IF NOT EXISTS service_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    event_name TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    description TEXT,
    payload_schema JSONB,
    example_payload JSONB,
    category TEXT,
    tags TEXT[]
);

-- Event publishers
CREATE TABLE IF NOT EXISTS service_event_publishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL REFERENCES service_events(event_name) ON DELETE CASCADE,
    published_count BIGINT DEFAULT 0,
    last_published TIMESTAMPTZ,
    UNIQUE(service_id, event_name)
);

-- Event subscribers
CREATE TABLE IF NOT EXISTS service_event_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL REFERENCES service_events(event_name) ON DELETE CASCADE,
    handler_endpoint TEXT,
    is_active BOOLEAN DEFAULT true,
    consumed_count BIGINT DEFAULT 0,
    last_consumed TIMESTAMPTZ,
    UNIQUE(service_id, event_name)
);

-- Service dependencies
CREATE TABLE IF NOT EXISTS service_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    depends_on_service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL, -- 'required', 'optional', 'fallback'
    description TEXT,
    
    UNIQUE(service_id, depends_on_service_id),
    CHECK (service_id != depends_on_service_id)
);

-- Health check logs
CREATE TABLE IF NOT EXISTS service_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checked_at TIMESTAMPTZ DEFAULT now(),
    
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    is_healthy BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB
);

-- ============================================================================
-- PART 2: CUSTOMER SYSTEM (For SaaS Products - External Mode)
-- ============================================================================

-- Customers (external SaaS users)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Account Info
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    company TEXT,
    
    -- Authentication
    password_hash TEXT,
    google_id TEXT,
    microsoft_id TEXT,
    
    -- API Access
    api_key TEXT UNIQUE NOT NULL,
    api_key_prefix TEXT, -- First 8 chars for display
    api_key_created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Plan & Status
    plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'enterprise'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
    
    -- Billing
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    
    -- Usage Limits (JSON for flexibility per service)
    limits JSONB DEFAULT '{
        "transcripts_per_month": 10,
        "embeddings_per_month": 1000,
        "lead_qualifications_per_month": 50,
        "content_generations_per_month": 1
    }'::jsonb,
    
    -- Metadata
    last_login_at TIMESTAMPTZ,
    metadata JSONB
);

-- Usage events (every API call tracked here)
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Service Info
    service_name TEXT NOT NULL,
    service_action TEXT NOT NULL,
    
    -- Usage Details
    quantity INT DEFAULT 1,
    unit TEXT, -- 'request', 'token', 'minute', 'hour'
    
    -- Cost
    cost_usd DECIMAL(10,4),
    
    -- Request Details
    request_id TEXT,
    response_time_ms INT,
    status TEXT, -- 'success', 'error'
    
    -- Metadata
    metadata JSONB
);

-- Monthly usage summaries (pre-aggregated for fast queries)
CREATE TABLE IF NOT EXISTS usage_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- '2024-01'
    
    -- Service-specific counts
    transcripts_count INT DEFAULT 0,
    transcripts_cost DECIMAL(10,2) DEFAULT 0,
    
    embeddings_count INT DEFAULT 0,
    embeddings_cost DECIMAL(10,2) DEFAULT 0,
    
    lead_qualifications_count INT DEFAULT 0,
    lead_qualifications_cost DECIMAL(10,2) DEFAULT 0,
    
    content_generations_count INT DEFAULT 0,
    content_generations_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Totals
    total_requests INT DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Billing
    invoice_id TEXT,
    invoice_status TEXT, -- 'pending', 'paid', 'failed'
    invoice_date TIMESTAMPTZ,
    
    UNIQUE(customer_id, month)
);

-- ============================================================================
-- PART 3: ACTUAL DATA (Created by Services)
-- ============================================================================

-- Transcripts (from transcript-processor-svc)
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- CRITICAL: Customer isolation
    customer_id UUID NOT NULL,
    
    -- Transcript Data
    transcript_text TEXT NOT NULL,
    audio_url TEXT,
    storage_url TEXT, -- Where transcript text file is stored
    
    -- Metadata
    language TEXT,
    duration_seconds DECIMAL(10,2),
    word_count INT,
    
    -- Additional fields
    metadata JSONB
);

-- Vector embeddings (from embedding-svc)
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- CRITICAL: Customer isolation
    customer_id UUID NOT NULL,
    
    -- Source
    source_id UUID, -- Could be transcript_id or other source
    source_type TEXT, -- 'transcript', 'document', 'webpage'
    
    -- Embedding
    embedding vector(1536), -- OpenAI embeddings are 1536 dimensions
    
    -- Content
    chunk_text TEXT,
    chunk_index INT,
    
    -- Metadata
    metadata JSONB
);

-- Lead qualifications (from lead-qualifier-svc)
CREATE TABLE IF NOT EXISTS lead_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- CRITICAL: Customer isolation
    customer_id UUID NOT NULL,
    
    -- Lead Info
    lead_id TEXT NOT NULL, -- From CRM
    email TEXT,
    phone TEXT,
    
    -- Qualification
    score DECIMAL(5,2), -- 0-100
    tier TEXT, -- 'hot', 'warm', 'cold', 'unqualified'
    reasons JSONB, -- Array of reasons for score
    
    -- Source
    transcript_id UUID REFERENCES transcripts(id),
    
    -- Metadata
    metadata JSONB
);

-- Content generations (from content-generator-svc)
CREATE TABLE IF NOT EXISTS content_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- CRITICAL: Customer isolation
    customer_id UUID NOT NULL,
    
    -- Source
    source_url TEXT,
    source_type TEXT, -- 'podcast', 'video', 'article'
    
    -- Outputs
    outputs JSONB, -- Array of generated content pieces
    
    -- Status
    status TEXT, -- 'processing', 'completed', 'failed'
    
    -- Metadata
    metadata JSONB
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Services
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_tags ON services USING GIN(tags);

-- Service endpoints
CREATE INDEX IF NOT EXISTS idx_endpoints_service ON service_endpoints(service_id);

-- Service events
CREATE INDEX IF NOT EXISTS idx_publishers_service ON service_event_publishers(service_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_service ON service_event_subscribers(service_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_event ON service_event_subscribers(event_name);

-- Service health
CREATE INDEX IF NOT EXISTS idx_health_service_date ON service_health_logs(service_id, checked_at DESC);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_api_key ON customers(api_key);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_stripe ON customers(stripe_customer_id);

-- Usage events
CREATE INDEX IF NOT EXISTS idx_usage_customer_date ON usage_events(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_service ON usage_events(service_name, created_at DESC);

-- Usage summaries
CREATE INDEX IF NOT EXISTS idx_summaries_customer ON usage_summaries(customer_id, month DESC);

-- Transcripts
CREATE INDEX IF NOT EXISTS idx_transcripts_customer ON transcripts(customer_id, created_at DESC);

-- Embeddings (for vector similarity search)
CREATE INDEX IF NOT EXISTS idx_embeddings_customer ON embeddings(customer_id);
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Lead qualifications
CREATE INDEX IF NOT EXISTS idx_qualifications_customer ON lead_qualifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qualifications_tier ON lead_qualifications(tier);

-- Content generations
CREATE INDEX IF NOT EXISTS idx_content_customer ON content_generations(customer_id, created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to increment usage (called by services)
CREATE OR REPLACE FUNCTION increment_usage(
    p_customer_id UUID,
    p_month TEXT,
    p_service TEXT,
    p_count INT DEFAULT 1,
    p_cost DECIMAL DEFAULT 0
)
RETURNS void AS $$
BEGIN
    INSERT INTO usage_summaries (
        customer_id,
        month,
        transcripts_count,
        transcripts_cost,
        total_requests,
        total_cost
    )
    VALUES (
        p_customer_id,
        p_month,
        CASE WHEN p_service = 'transcript' THEN p_count ELSE 0 END,
        CASE WHEN p_service = 'transcript' THEN p_cost ELSE 0 END,
        p_count,
        p_cost
    )
    ON CONFLICT (customer_id, month) DO UPDATE SET
        transcripts_count = CASE 
            WHEN p_service = 'transcript' 
            THEN usage_summaries.transcripts_count + p_count 
            ELSE usage_summaries.transcripts_count 
        END,
        transcripts_cost = CASE 
            WHEN p_service = 'transcript' 
            THEN usage_summaries.transcripts_cost + p_cost 
            ELSE usage_summaries.transcripts_cost 
        END,
        total_requests = usage_summaries.total_requests + p_count,
        total_cost = usage_summaries.total_cost + p_cost;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - CRITICAL FOR DATA ISOLATION
-- ============================================================================

-- Enable RLS on customer data tables
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generations ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can only see their own data
-- Note: In production, you'd set app.customer_id via SET LOCAL in your service
CREATE POLICY customer_isolation_transcripts ON transcripts
    FOR ALL
    USING (customer_id = current_setting('app.customer_id', true)::uuid);

CREATE POLICY customer_isolation_embeddings ON embeddings
    FOR ALL
    USING (customer_id = current_setting('app.customer_id', true)::uuid);

CREATE POLICY customer_isolation_qualifications ON lead_qualifications
    FOR ALL
    USING (customer_id = current_setting('app.customer_id', true)::uuid);

CREATE POLICY customer_isolation_content ON content_generations
    FOR ALL
    USING (customer_id = current_setting('app.customer_id', true)::uuid);

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample service
INSERT INTO services (
    service_name,
    display_name,
    description,
    base_url,
    internal_url,
    external_url,
    category,
    tags,
    compute_tier
) VALUES (
    'transcript-processor',
    'Transcript Processor',
    'Processes audio files and generates transcripts using Whisper API',
    'https://transcript.gyst.com',
    'https://internal.transcript.gyst.com',
    'https://api.transcriptai.com',
    'processing',
    ARRAY['voice', 'ai', 'transcription'],
    'medium'
) ON CONFLICT (service_name) DO NOTHING;

-- Insert sample customer (for testing)
INSERT INTO customers (
    email,
    name,
    api_key,
    api_key_prefix,
    plan,
    limits
) VALUES (
    'test@example.com',
    'Test User',
    'gyst_sk_test_' || gen_random_uuid()::text,
    'gyst_sk_',
    'starter',
    '{
        "transcripts_per_month": 100,
        "embeddings_per_month": 10000,
        "lead_qualifications_per_month": 500
    }'::jsonb
) ON CONFLICT (email) DO NOTHING;