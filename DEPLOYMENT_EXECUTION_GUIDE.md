# 🚀 RITA RECRUIT AI - DEPLOYMENT EXECUTION GUIDE

## 📋 DEPLOYMENT STATUS: READY FOR MANUAL EXECUTION

**Target Environment**: Supabase Project `onargmygfwynbbrytkpy.supabase.co`  
**CLI Setup**: ✅ Completed (Supabase CLI v2.22.12 installed)  
**API Access**: ✅ Verified (Service role key working)  
**Deployment Method**: Manual Web Interface (As per original deployment guide)

---

## 🎯 STEP 1: DATABASE SCHEMA DEPLOYMENT

### 1.1 Access Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/onargmygfwynbbrytkpy/sql

### 1.2 Execute Database Schema
Copy the complete content from `PRODUCTION_DEPLOYMENT.sql` (845 lines) and execute in SQL Editor.

**Key Components Being Deployed:**
- ✅ Extensions: vector, pg_stat_statements
- ✅ Types: user_role enum
- ✅ 15 Core Tables: organizations, profiles, document_*, subscriptions, etc.
- ✅ RLS Policies: Complete multi-tenant security
- ✅ Functions: handle_new_user, search_document_embeddings
- ✅ Triggers: User signup, file validation
- ✅ Indexes: Performance optimization
- ✅ Storage Buckets: Document storage with security

---

## 🎯 STEP 2: EDGE FUNCTIONS DEPLOYMENT (28 Functions)

### 2.1 Access Supabase Functions Panel
Go to: https://supabase.com/dashboard/project/onargmygfwynbbrytkpy/functions

### 2.2 Deploy in Priority Order

#### Phase 1: Security Core Functions (Deploy First)
1. **create-admin-user** - Critical for admin setup
   - File: `supabase/functions/create-admin-user/index.ts`
   - JWT Required: No
   
2. **manage-user-session** - Session enforcement
   - File: `supabase/functions/manage-user-session/index.ts`
   - JWT Required: Yes
   
3. **validate-invite** - Organization invitations
   - File: `supabase/functions/validate-invite/index.ts`
   - JWT Required: No

#### Phase 2: AI Engine Functions
4. **extract-document-text** - Document processing
   - File: `supabase/functions/extract-document-text/index.ts`
   - JWT Required: Yes
   
5. **generate-embeddings** - AI embeddings
   - File: `supabase/functions/generate-embeddings/index.ts`
   - JWT Required: Yes
   
6. **search-embeddings** - Semantic search
   - File: `supabase/functions/search-embeddings/index.ts`
   - JWT Required: Yes
   
7. **rita-chat** - AI chat responses
   - File: `supabase/functions/rita-chat/index.ts`
   - JWT Required: Yes

#### Phase 3: Billing System Functions
8. **stripe-webhook** - Payment processing
   - File: `supabase/functions/stripe-webhook/index.ts`
   - JWT Required: No
   
9. **create-checkout-session** - Subscription creation
   - File: `supabase/functions/create-checkout-session/index.ts`
   - JWT Required: Yes
   
10. **customer-portal** - Billing management
    - File: `supabase/functions/customer-portal/index.ts`
    - JWT Required: Yes
    
11. **create-overage-checkout** - Usage overage billing
    - File: `supabase/functions/create-overage-checkout/index.ts`
    - JWT Required: Yes

#### Phase 4: Communication Functions
12. **send-email** - Email notifications
    - File: `supabase/functions/send-email/index.ts`
    - JWT Required: Yes
    
13. **generate-invite** - Invite generation
    - File: `supabase/functions/generate-invite/index.ts`
    - JWT Required: Yes
    
14. **join-organization** - Organization joining
    - File: `supabase/functions/join-organization/index.ts`
    - JWT Required: No

#### Phase 5: Administration Functions
15. **admin-dashboard** - Admin panel data
    - File: `supabase/functions/admin-dashboard/index.ts`
    - JWT Required: Yes
    
16. **setup-query-usage** - Usage tracking setup
    - File: `supabase/functions/setup-query-usage/index.ts`
    - JWT Required: Yes
    
17. **setup-user-sessions** - Session management setup
    - File: `supabase/functions/setup-user-sessions/index.ts`
    - JWT Required: Yes
    
18. **setup-org-integrations** - Organization integrations
    - File: `supabase/functions/setup-org-integrations/index.ts`
    - JWT Required: Yes

#### Phase 6: Remaining Functions
19. **check-subscription** - Subscription validation
    - File: `supabase/functions/check-subscription/index.ts`
    - JWT Required: Yes
    
20. **encrypt-quickbase-token** - Token encryption
    - File: `supabase/functions/encrypt-quickbase-token/index.ts`
    - JWT Required: Yes
    
21. **schedule-quickbase-sync** - Sync scheduling
    - File: `supabase/functions/schedule-quickbase-sync/index.ts`
    - JWT Required: Yes
    
22. **sync-quickbase-data** - Data synchronization
    - File: `supabase/functions/sync-quickbase-data/index.ts`
    - JWT Required: Yes
    
23. **test-quickbase-connection** - Connection testing
    - File: `supabase/functions/test-quickbase-connection/index.ts`
    - JWT Required: Yes
    
24. **update-database-schema** - Schema updates
    - File: `supabase/functions/update-database-schema/index.ts`
    - JWT Required: Yes
    
25. **update-promo-codes** - Promotion management
    - File: `supabase/functions/update-promo-codes/index.ts`
    - JWT Required: Yes

---

## 🎯 STEP 3: ENVIRONMENT VARIABLES CONFIGURATION

### 3.1 Access Supabase Settings
Go to: https://supabase.com/dashboard/project/onargmygfwynbbrytkpy/settings/edge-functions

### 3.2 Required Environment Variables
```bash
# Generate secure admin code
ADMIN_CREATION_CODE=[Use: openssl rand -hex 32]

# AI Functionality
OPENAI_API_KEY=[Required for document processing and chat]

# Email Service
RESEND_API_KEY=[Required for notifications]

# Stripe Integration
STRIPE_SECRET_KEY=[Required for billing]
STRIPE_PUBLISHABLE_KEY=[Required for payments]
STRIPE_WEBHOOK_SECRET=[Required for webhook processing]
```

---

## 🎯 STEP 4: VERIFICATION PROTOCOL

### 4.1 Database Verification
Execute in SQL Editor:
```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Verify extensions
SELECT extname FROM pg_extension;
```

### 4.2 Functions Verification
Check all 28 functions are listed in: https://supabase.com/dashboard/project/onargmygfwynbbrytkpy/functions

### 4.3 API Testing
Test critical endpoints:
```bash
# Test admin user creation function
curl -X POST https://onargmygfwynbbrytkpy.supabase.co/functions/v1/create-admin-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -d '{"email":"admin@test.com","password":"test123","firstName":"Admin","lastName":"User","adminCode":"[ADMIN_CODE]"}'

# Test chat function
curl -X POST https://onargmygfwynbbrytkpy.supabase.co/functions/v1/rita-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [USER_JWT]" \
  -d '{"message":"Hello Rita","sessionId":"test-session"}'
```

---

## 🎯 STEP 5: POST-DEPLOYMENT CHECKLIST

### ✅ Database Deployment Complete
- [ ] All 15+ tables created successfully
- [ ] RLS policies active on all tables
- [ ] Database functions and triggers working
- [ ] Vector extension enabled for AI search
- [ ] Storage buckets created with proper security

### ✅ Edge Functions Deployment Complete
- [ ] Security functions (3) deployed and accessible
- [ ] AI engine functions (4) deployed and accessible
- [ ] Billing functions (4) deployed and accessible
- [ ] Communication functions (3) deployed and accessible
- [ ] Administration functions (4) deployed and accessible
- [ ] Remaining functions (10) deployed and accessible

### ✅ Configuration Complete
- [ ] All environment variables set in Supabase dashboard
- [ ] Admin creation code generated and secure
- [ ] API keys configured for external services

### ✅ System Ready
- [ ] Database schema fully operational
- [ ] All 28 edge functions responding
- [ ] Multi-tenant isolation verified
- [ ] Admin account creation ready
- [ ] Production environment live

---

## 🚨 IMPORTANT SECURITY NOTES

1. **Generate Secure Admin Code**: Use `openssl rand -hex 32` to create ADMIN_CREATION_CODE
2. **Protect Service Keys**: Never expose SUPABASE_SERVICE_ROLE_KEY in client-side code
3. **Verify RLS**: Ensure all tables have Row Level Security enabled
4. **Test Isolation**: Verify organizations cannot access each other's data

---

## 📞 DEPLOYMENT SUMMARY

**Manual Deployment Required**: Due to CLI authentication limitations, deployment must be completed via Supabase web interface as originally specified in deployment documentation.

**Estimated Time**: 2-3 hours for complete deployment
**Critical Path**: Database schema → Security functions → AI functions → Remaining functions
**Production Ready**: Upon completion of all verification steps

---

*Generated: September 26, 2025*  
*Status: Ready for manual execution via Supabase Dashboard*