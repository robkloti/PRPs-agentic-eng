# GYST Microservices - Context Documentation

This directory contains all the context and documentation needed to build the GYST microservices system.

## Quick Start

1. **Read first:** `00-PROJECT-OVERVIEW.md`
2. **Understand architecture:** `01-ARCHITECTURE/dual-mode-deployment.md`
3. **See complete example:** `07-EXAMPLES/dual-mode-service-complete.py`
4. **Learn methodology:** `10-WIRASM-CONTEXT/prp-methodology.md`

## Directory Structure
````
.context/
├── 00-PROJECT-OVERVIEW.md           # Start here
├── 01-ARCHITECTURE/                 # System design
│   └── dual-mode-deployment.md      # Core pattern
├── 02-INFRASTRUCTURE/               # Infrastructure docs (TBD)
├── 03-MICROSERVICES/                # Service templates
│   └── service-template-guide.md    # How to build services
├── 04-PRODUCTIZATION/               # SaaS product docs (TBD)
├── 05-DATABASE/                     # Database schemas
│   └── complete-schema.sql          # Full Supabase schema
├── 06-WORKFLOWS/                    # n8n patterns (TBD)
├── 07-EXAMPLES/                     # Working code examples
│   └── dual-mode-service-complete.py
├── 08-GOTCHAS/                      # Common issues (TBD)
├── 09-PRPS/                         # Implementation plans
│   └── prp-template.md              # Template for creating PRPs
└── 10-WIRASM-CONTEXT/               # Methodology
    └── prp-methodology.md           # How to use PRPs
````

## How to Use

### For New Service Development

1. Ask Web Claude to create a PRP for the service
2. Save PRP to `09-PRPS/service-name-prp.md`
3. In Cursor: `@.context/09-PRPS/service-name-prp.md Build this`
4. Follow PRP step-by-step

### For Quick Reference

- **Database schema:** `05-DATABASE/complete-schema.sql`
- **Service template:** `03-MICROSERVICES/service-template-guide.md`
- **Working example:** `07-EXAMPLES/dual-mode-service-complete.py`
- **Dual-mode pattern:** `01-ARCHITECTURE/dual-mode-deployment.md`

### For Understanding Concepts

- **Project overview:** `00-PROJECT-OVERVIEW.md`
- **PRP methodology:** `10-WIRASM-CONTEXT/prp-methodology.md`

## Status

### ✅ Complete
- Project overview
- Dual-mode architecture
- Database schema
- Service template guide
- Working service example
- PRP methodology

### 🚧 To Be Added
- Infrastructure setup guide
- Observability configuration
- n8n workflow patterns
- Common gotchas
- Productization guides
- Specific service PRPs (created on-demand)

## Contributing

When adding new documentation:
1. Follow existing structure
2. Use markdown format
3. Include code examples
4. Cross-reference related docs
5. Keep it practical and actionable