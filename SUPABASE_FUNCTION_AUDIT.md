# Supabase Edge Functions Deployment Audit

## Current Function Inventory

Found **25 edge functions** in `supabase/functions/` directory:

### Security & Authentication Functions
1. `create-admin-user` - Creates admin user accounts
2. `manage-user-session` - Manages user sessions and authentication
3. `validate-invite` - Validates organization invitations
4. `join-organization` - Handles organization joining
5. `generate-invite` - Creates organization invites
6. `setup-user-sessions` - Sets up user session tracking

### AI & Document Processing Functions
7. `rita-chat` - Main AI chat functionality
8. `extract-document-text` - Processes uploaded documents
9. `generate-embeddings` - Creates AI embeddings for search
10. `search-embeddings` - Searches document embeddings

### Subscription & Billing Functions
11. `create-checkout-session` - Stripe checkout creation
12. `create-overage-checkout` - Overage billing checkout
13. `customer-portal` - Stripe customer portal
14. `stripe-webhook` - Handles Stripe webhooks
15. `check-subscription` - Validates subscriptions
16. `setup-query-usage` - Sets up usage tracking
17. `update-promo-codes` - Manages promotional codes

### Communication Functions
18. `send-email` - Email sending functionality

### Administrative Functions
19. `admin-dashboard` - Admin dashboard backend
20. `setup-org-integrations` - Organization integration setup
21. `update-database-schema` - Database schema updates

### Quickbase Integration Functions
22. `encrypt-quickbase-token` - Encrypts Quickbase API tokens
23. `schedule-quickbase-sync` - Schedules data sync
24. `sync-quickbase-data` - Syncs Quickbase data
25. `test-quickbase-connection` - Tests Quickbase connectivity

## Shared Modules
- `_shared/cors.ts` - CORS configuration
- `_shared/rateLimiter.ts` - Rate limiting functionality  
- `_shared/session-validator.ts` - Session validation

## Functions Requiring Standalone Versions
Due to Supabase Edge Function deployment limitations, functions importing from `_shared/` need standalone versions:
- `rita-chat` ✅ (standalone version created)
- `send-email` ✅ (standalone version created)
- `create-admin-user` ✅ (standalone version created)
- `manage-user-session` (needs standalone version)
- `validate-invite` (needs standalone version)
- Any other functions importing from `_shared/`

## Deployment Priority Order
1. **Security Functions** (create-admin-user, manage-user-session, validate-invite)
2. **Core Infrastructure** (setup-user-sessions, setup-query-usage, update-database-schema)
3. **Document Processing** (extract-document-text, generate-embeddings, search-embeddings)
4. **AI Chat** (rita-chat)
5. **Communication** (send-email, generate-invite)
6. **Billing** (stripe-webhook, create-checkout-session, etc.)
7. **Organization** (join-organization, setup-org-integrations)
8. **Quickbase Integration** (all quickbase functions)
9. **Administrative** (admin-dashboard, update-promo-codes)

## Current Status
- User manually deployed 11 functions with auto-generated names
- Need to deploy remaining 14+ functions with correct names
- Need automated GitHub Actions workflow