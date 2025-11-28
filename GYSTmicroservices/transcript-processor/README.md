# Transcript Processor Microservice

Audio transcription service for GYST. Supports dual-mode deployment (internal for agency clients, external for SaaS customers).

## Features

- **Dual-Mode Deployment**: Single codebase, two deployment modes
- **Internal Mode**: For agency client integrations (no billing, full access)
- **External Mode**: For public SaaS customers (with API key auth and billing)
- **Audio Transcription**: VAPI or Retell integration
- **Job Tracking**: Async processing with status polling
- **Multi-Tenant**: Customer isolation via customer_id
- **Observable**: Structured logging, Prometheus metrics
- **Containerized**: Docker support for production deployment

## Installation

```bash
# Clone and navigate
cd transcript-processor

# Install dependencies
pip install -e ".[dev]"

# Copy environment file
cp .env.example .env
# Edit .env with your credentials
```

## Configuration

Configuration depends on deployment mode via `DEPLOYMENT_MODE` environment variable:

```bash
# Internal mode (default)
DEPLOYMENT_MODE=internal

# External mode (SaaS)
DEPLOYMENT_MODE=external
```

Configuration files:
- `config/internal.yaml` - Internal mode settings
- `config/external.yaml` - External mode settings

## Running Locally

```bash
# Start in development
uvicorn src.transcript_processor.main:app --reload

# Or with environment
DEPLOYMENT_MODE=internal uvicorn src.transcript_processor.main:app --reload
```

## API Endpoints

### POST /transcribe
Submit audio for transcription.

**Internal Mode:**
```bash
curl -X POST http://localhost:8000/transcribe \
  -H "X-Customer-ID: client-123" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/audio.mp3",
    "language": "en"
  }'
```

**External Mode:**
```bash
curl -X POST http://localhost:8000/transcribe \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/audio.mp3",
    "language": "en"
  }'
```

### GET /status/{job_id}
Check transcription status.

```bash
curl http://localhost:8000/status/job-123 \
  -H "X-Customer-ID: client-123"  # Internal mode
  # OR
  -H "Authorization: Bearer your-api-key"  # External mode
```

### GET /health
Health check endpoint.

```bash
curl http://localhost:8000/health
```

### GET /metrics
Prometheus metrics.

```bash
curl http://localhost:8000/metrics
```

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=src/transcript_processor --cov-report=term-missing

# Run specific test
pytest tests/test_api.py::test_transcribe_internal -v

# Test both modes
DEPLOYMENT_MODE=internal pytest tests/test_api.py -v
DEPLOYMENT_MODE=external pytest tests/test_api.py -v
```

## Docker

```bash
# Build image
docker build -t transcript-processor:latest .

# Run container
docker run -p 8000:8000 \
  -e DEPLOYMENT_MODE=internal \
  -e SUPABASE_URL=... \
  -e SUPABASE_KEY=... \
  -e VAPI_API_KEY=... \
  transcript-processor:latest

# Or with docker-compose
docker-compose up
```

## Architecture

```
Request
  ↓
Auth Middleware (Internal: header, External: API key)
  ↓
Request Validation (Pydantic models)
  ↓
Call Transcription API (VAPI or Retell)
  ↓
Save to Database (Supabase with customer_id)
  ↓
Track Usage (External mode only)
  ↓
Return Response
```

## Code Structure

```
src/transcript_processor/
├── __init__.py
├── main.py           # FastAPI application
├── config.py         # Configuration loading
├── models.py         # Request/response models
├── database.py       # Supabase operations
├── transcriber.py    # VAPI/Retell integration
├── auth.py           # Authentication logic
├── billing.py        # Usage tracking
├── logging.py        # Structured logging
└── health.py         # Health checks
```

## Dual-Mode Pattern

The service supports two deployment modes controlled by `DEPLOYMENT_MODE`:

### Internal Mode
- **Authentication**: Simple X-Customer-ID header
- **Rate Limiting**: None
- **Billing**: Disabled
- **Use Case**: Agency client integrations

### External Mode
- **Authentication**: API key in Authorization header
- **Rate Limiting**: Enforced per plan
- **Billing**: Enabled (tracks usage)
- **Use Case**: SaaS customer API

**Critical**: The core transcription logic is shared between modes. Only authentication, rate limiting, and billing differ.

## Database

Requires Supabase with `transcripts` table:

```sql
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  status TEXT NOT NULL,
  text_content TEXT,
  duration_seconds FLOAT,
  word_count INT,
  confidence_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT transcripts_customer_id_idx UNIQUE(customer_id, job_id)
);

CREATE INDEX transcripts_customer_id_idx ON transcripts(customer_id);
CREATE INDEX transcripts_job_id_idx ON transcripts(job_id);
```

## Environment Variables

See `.env.example` for complete list. Required variables:

- `DEPLOYMENT_MODE` - internal or external
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase API key
- `VAPI_API_KEY` - VAPI API key (if using VAPI)

## Development

```bash
# Format code
ruff format src/

# Lint
ruff check src/

# Type check
mypy src/

# Run tests
pytest tests/ -v
```

## Deploying to Production

1. Build Docker image
2. Set environment variables
3. Deploy to container orchestrator (K8s, ECS, etc.)
4. Set DEPLOYMENT_MODE=external for public SaaS
5. Ensure Supabase is configured and accessible
6. Monitor health checks: GET /health

## Integration with n8n

The service can be triggered by n8n webhooks:

```
n8n Webhook → POST /transcribe → Transcript Processor → Save to Supabase → Poll /status
```

Example n8n flow:
1. Webhook triggers with audio URL
2. POST to /transcribe (with appropriate headers)
3. Store returned job_id
4. Poll /status/{job_id} until complete
5. Process transcript result

## Monitoring

Prometheus metrics available at `GET /metrics`:
- `transcript_processor_requests_total` - Total requests
- `transcript_processor_request_duration_seconds` - Request latency
- `transcript_processor_jobs_processed` - Jobs completed
- `transcript_processor_errors_total` - Errors encountered

## License

Proprietary - GYST Agency

## Support

For issues or questions, contact: rob@gyst.com
