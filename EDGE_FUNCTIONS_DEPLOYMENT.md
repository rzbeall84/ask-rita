# Edge Functions Deployment Guide - Rita Recruit AI

## 🚀 Manual Deployment Instructions for Supabase Dashboard

Since we cannot deploy via CLI, here are the exact steps to deploy each of the 28 edge functions manually through the Supabase Dashboard.

---

## 📋 Function-by-Function Deployment Instructions

### Go to: https://supabase.com/dashboard/project/onargmygfwynbbrytkpy/functions

For each function below:
1. Click "Create Function"
2. Use the exact function name provided
3. Copy the entire file content from the specified path
4. Set JWT verification as indicated
5. Deploy the function

---

## 🔐 Critical Security Functions (Deploy First)

### 1. create-admin-user
- **File**: `supabase/functions/create-admin-user/index.ts`
- **JWT Required**: No (handles own auth with admin code)
- **Description**: Secure admin account creation
- **Critical**: This must be deployed first for admin setup

### 2. manage-user-session  
- **File**: `supabase/functions/manage-user-session/index.ts`
- **JWT Required**: Yes
- **Description**: User session management and enforcement

### 3. validate-invite
- **File**: `supabase/functions/validate-invite/index.ts`
- **JWT Required**: No
- **Description**: Organization invitation validation

---

## 🤖 AI & Document Processing Functions

### 4. extract-document-text
- **File**: `supabase/functions/extract-document-text/index.ts`
- **JWT Required**: Yes
- **Description**: Document text extraction and processing

### 5. generate-embeddings
- **File**: `supabase/functions/generate-embeddings/index.ts`
- **JWT Required**: Yes  
- **Description**: Generate AI embeddings for document search

### 6. search-embeddings
- **File**: `supabase/functions/search-embeddings/index.ts`
- **JWT Required**: Yes
- **Description**: Semantic search functionality

### 7. rita-chat
- **File**: `supabase/functions/rita-chat/index.ts`
- **JWT Required**: Yes
- **Description**: AI chat with document context (CORE FEATURE)

---

## 💳 Subscription & Billing Functions

### 8. create-checkout-session
- **File**: `supabase/functions/create-checkout-session/index.ts`
- **JWT Required**: Yes
- **Description**: Stripe checkout session creation

### 9. create-overage-checkout
- **File**: `supabase/functions/create-overage-checkout/index.ts`
- **JWT Required**: Yes
- **Description**: Usage overage billing

### 10. customer-portal
- **File**: `supabase/functions/customer-portal/index.ts`
- **JWT Required**: Yes
- **Description**: Stripe customer portal access

### 11. stripe-webhook
- **File**: `supabase/functions/stripe-webhook/index.ts`
- **JWT Required**: No (uses Stripe signature verification)
- **Description**: Handle Stripe webhook events

### 12. check-subscription
- **File**: `supabase/functions/check-subscription/index.ts`
- **JWT Required**: Yes
- **Description**: Check user subscription status

---

## 👥 User & Organization Management

### 13. generate-invite
- **File**: `supabase/functions/generate-invite/index.ts`
- **JWT Required**: Yes
- **Description**: Generate organization invitations

### 14. join-organization
- **File**: `supabase/functions/join-organization/index.ts`
- **JWT Required**: No (uses invite token)
- **Description**: Join organization via invitation

### 15. setup-user-sessions
- **File**: `supabase/functions/setup-user-sessions/index.ts`
- **JWT Required**: No
- **Description**: Initialize user session system

---

## 📊 Administration & Monitoring

### 16. admin-dashboard
- **File**: `supabase/functions/admin-dashboard/index.ts`
- **JWT Required**: Yes
- **Description**: Admin dashboard data and analytics

### 17. setup-query-usage
- **File**: `supabase/functions/setup-query-usage/index.ts`
- **JWT Required**: No
- **Description**: Initialize query usage tracking

### 18. setup-org-integrations
- **File**: `supabase/functions/setup-org-integrations/index.ts`
- **JWT Required**: Yes
- **Description**: Setup organization integrations

---

## 📧 Communication Functions

### 19. send-email
- **File**: `supabase/functions/send-email/index.ts`
- **JWT Required**: Yes
- **Description**: Transactional email service

---

## 🔗 QuickBase Integration (Optional)

### 20. encrypt-quickbase-token
- **File**: `supabase/functions/encrypt-quickbase-token/index.ts`
- **JWT Required**: Yes
- **Description**: Encrypt QuickBase authentication tokens

### 21. schedule-quickbase-sync
- **File**: `supabase/functions/schedule-quickbase-sync/index.ts`
- **JWT Required**: Yes
- **Description**: Schedule QuickBase data synchronization

### 22. sync-quickbase-data
- **File**: `supabase/functions/sync-quickbase-data/index.ts`
- **JWT Required**: Yes
- **Description**: Synchronize data from QuickBase

### 23. test-quickbase-connection
- **File**: `supabase/functions/test-quickbase-connection/index.ts`
- **JWT Required**: Yes
- **Description**: Test QuickBase API connection

---

## 🛠 Utility Functions

### 24. update-database-schema
- **File**: `supabase/functions/update-database-schema/index.ts`
- **JWT Required**: No
- **Description**: Update database schema

### 25. update-promo-codes
- **File**: `supabase/functions/update-promo-codes/index.ts`
- **JWT Required**: No
- **Description**: Update promotional codes

---

## 📚 Shared Utility Files

These are imported by other functions, deploy them first:

### 26. _shared/cors.ts
- **File**: `supabase/functions/_shared/cors.ts`
- **Type**: Shared utility (not a standalone function)
- **Description**: CORS headers and security configuration

### 27. _shared/rateLimiter.ts
- **File**: `supabase/functions/_shared/rateLimiter.ts`
- **Type**: Shared utility (not a standalone function)
- **Description**: Rate limiting functionality

### 28. _shared/session-validator.ts
- **File**: `supabase/functions/_shared/session-validator.ts`
- **Type**: Shared utility (not a standalone function)
- **Description**: Session validation utilities

---

## 🚨 Important Notes

### Deployment Order Priority:
1. **Shared utilities first** (_shared/*.ts)
2. **Security functions** (create-admin-user, manage-user-session)
3. **Core features** (rita-chat, extract-document-text, generate-embeddings)
4. **Subscription management** (Stripe functions)
5. **Optional features** (QuickBase integration)

### Critical Environment Variables:
Ensure these are set in Supabase before deploying functions:
- `ADMIN_CREATION_CODE`: d4f7e8b9c2a1f6e3d8c5b7a9f4e2d6c1b8a5f3e7d9c4b6a8f1e5d2c7b9a6f4e3d8
- `OPENAI_API_KEY`: Required for AI functions
- `STRIPE_SECRET_KEY`: Required for billing functions
- `RESEND_API_KEY`: Required for email functions

### Function Testing:
After each deployment, test the function using:
```bash
curl -X POST https://onargmygfwynbbrytkpy.supabase.co/functions/v1/FUNCTION_NAME \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## ✅ Deployment Checklist

- [ ] All 28 functions deployed successfully
- [ ] Environment variables configured
- [ ] Admin account creation tested
- [ ] Core AI functionality verified
- [ ] Subscription system operational
- [ ] Email notifications working
- [ ] Security measures active

---

*Complete this deployment to enable full Rita Recruit AI functionality*