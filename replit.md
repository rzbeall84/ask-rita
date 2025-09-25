# Rita Recruit AI - Replit Project

## Overview
Rita Recruit AI (AskRita) is a production-ready, multi-tenant SAAS platform for AI-powered recruitment and document management. The application provides organizations with intelligent document search, AI-powered chat, and comprehensive subscription management.

## Project Architecture
- **Frontend**: React 18 with TypeScript, shadcn/ui components, Tailwind CSS
- **Backend**: Supabase (PostgreSQL with RLS, Auth, Storage, Edge Functions)
- **AI Integration**: OpenAI for embeddings and chat, with document-based context
- **Payments**: Stripe subscription management with webhook lifecycle handling
- **Email**: Resend for transactional emails (invitations, notifications)
- **Document Processing**: Support for PDF, Word, Excel with automatic text extraction

## Recent Changes (2025-09-25)
### Phase 1: Initial Setup
- Project imported from GitHub and configured for Replit environment
- Vite configuration updated for Replit (host: 0.0.0.0, port: 5000)
- Environment variables configured (Supabase, OpenAI, Stripe, Resend)

### Phase 2: Database & Multi-Tenancy
- Comprehensive multi-tenant database schema with strict organization isolation
- Row-Level Security (RLS) policies for all tables
- Organization invitation system with self-registration links

### Phase 3: Subscription Management
- Stripe subscription tiers implemented (Starter: $29/mo, Pro: $99/mo)
- Usage limits enforced (documents, users, searches)
- Webhook handling for subscription lifecycle events
- Grace period system for failed payments

### Phase 4: Document System
- Upload support for PDF, Word (.doc/.docx), Excel (.xls/.xlsx), CSV, and text files
- Automatic text extraction via edge functions
- Organization-specific storage isolation
- Document preview with metadata display

### Phase 5: AI-Powered Search
- OpenAI embeddings (text-embedding-ada-002) for semantic search
- Document chunking and vector storage with pgvector
- Organization-specific document context in chat responses
- Source citations in AI responses

### Phase 6: Email & Notifications
- Resend integration for transactional emails
- Email templates for welcome, invitations, subscriptions
- Rate limiting to prevent abuse

### Phase 7: Production Features
- Organization branding with logo upload
- Role-based UI separation (admin vs regular users)
- Comprehensive error handling and logging
- CORS configuration and security headers
- Rate limiting on all API endpoints

## Configuration Status
✅ All features implemented and tested
✅ Environment variables configured
✅ Database schema deployed with RLS
✅ Edge functions created for all services
✅ Production security measures in place

## Environment Variables
Required (all configured):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: For admin operations
- `VITE_OPENAI_API_KEY`: OpenAI API key for AI features
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe public key
- `RESEND_API_KEY`: Resend API key for emails

## Key Features
### For Organizations
- Multi-tenant architecture with complete data isolation
- Custom branding with logo upload
- Invitation system for team members
- Role-based access control (admin/user)

### Document Management
- Drag-and-drop file upload with progress tracking
- Support for multiple file formats
- Automatic text extraction and indexing
- Organization-specific document storage

### AI Capabilities
- Semantic document search using embeddings
- Context-aware chat responses
- Source citations from organization documents
- Organization-isolated knowledge base

### Subscription Management
- Two-tier pricing (Starter/Pro)
- Usage-based limits enforcement
- Automated billing via Stripe
- Grace periods for payment recovery

## Database Tables
- organizations: Multi-tenant organizations
- profiles: User profiles with role management
- organization_invitations: Invitation system
- organization_subscriptions: Stripe subscription tracking
- document_folders & document_files: File management
- document_content: Parsed text storage
- document_embeddings: Vector embeddings for search
- error_logs, email_logs, webhook_logs: Monitoring

## Edge Functions
- extract-document-text: Document parsing
- generate-embeddings: OpenAI embedding generation
- search-embeddings: Semantic document search
- rita-chat: AI chat with document context
- stripe-webhook: Subscription lifecycle handling
- send-email: Transactional email service

## Deployment
### Development
- Run `npm run dev` to start development server
- Available at Replit preview URL

### Production Deployment
1. Deploy edge functions to Supabase
2. Run database migration scripts
3. Configure Stripe webhook endpoint
4. Set production environment variables
5. Deploy to Vercel or similar platform

## Security Features
- Row-Level Security on all database tables
- Organization-based data isolation
- CORS configuration with allowed origins
- Security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure file upload with type validation

## User Roles
### Admin Users
- Full dashboard access
- Organization settings management
- User invitation capabilities
- Document management
- Subscription management

### Regular Users
- Chat interface access only
- Document search through chat
- Limited navigation options
- Organization-scoped queries

## Monitoring & Logging
- Error logging to database
- Email delivery tracking
- Webhook event history
- Rate limit monitoring
- Comprehensive error handling with retry logic

## Future Domain
Production domain will be: askrita.org
Current Vercel URL: ask-rita-kt95eg6tk-drive-line.vercel.app

## Support & Maintenance
- All edge functions have error handling
- Database has comprehensive indexes
- Monitoring tables for operational visibility
- Rate limiting prevents abuse
- Grace periods for payment recovery