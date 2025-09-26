# Rita Recruit AI - Complete Production Deployment Guide

## 🚀 Production Deployment to Supabase Project: onargmygfwynbbrytkpy.supabase.co

This guide provides step-by-step instructions to deploy the complete Rita Recruit AI production environment.

---

## ⚠️ CRITICAL: Secure Admin Creation Code

**ADMIN_CREATION_CODE**: `d4f7e8b9c2a1f6e3d8c5b7a9f4e2d6c1b8a5f3e7d9c4b6a8f1e5d2c7b9a6f4e3d8`

**Keep this code secure and private!** This code will be required to create admin accounts.

---

## 📋 Deployment Checklist

### Phase 1: Database Schema Deployment ✅ READY

**Status**: SQL script prepared and ready for deployment

**Action Required**: 
1. Go to your Supabase project: https://supabase.com/dashboard/project/onargmygfwynbbrytkpy
2. Navigate to SQL Editor
3. Copy the entire content from `PRODUCTION_DEPLOYMENT.sql` 
4. Execute the script in the SQL Editor
5. Verify all tables are created successfully

**What this deploys**:
- ✅ All core tables with multi-tenant isolation
- ✅ Row Level Security (RLS) policies 
- ✅ Document management system
- ✅ AI embeddings with pgvector
- ✅ Subscription management
- ✅ User session enforcement
- ✅ Rate limiting system
- ✅ Comprehensive logging
- ✅ Storage bucket with security policies

---

### Phase 2: Edge Functions Deployment 🔄 IN PROGRESS

**Total Functions to Deploy**: 28 edge functions

**Manual Deployment Required** (Supabase Dashboard > Edge Functions):

#### Core Authentication & User Management
1. **create-admin-user** - Secure admin account creation
2. **manage-user-session** - Session management and enforcement
3. **setup-user-sessions** - Initialize user session system
4. **validate-invite** - Organization invitation validation
5. **join-organization** - User organization joining
6. **generate-invite** - Generate organization invitations

#### Document Management & AI
7. **extract-document-text** - Document text extraction
8. **generate-embeddings** - AI embedding generation
9. **search-embeddings** - Semantic search functionality
10. **rita-chat** - AI chat with document context

#### Subscription & Billing
11. **create-checkout-session** - Stripe checkout creation
12. **create-overage-checkout** - Usage overage billing
13. **customer-portal** - Stripe customer portal
14. **stripe-webhook** - Stripe webhook handler
15. **check-subscription** - Subscription status checking

#### Administration
16. **admin-dashboard** - Admin dashboard data
17. **setup-query-usage** - Query usage tracking
18. **setup-org-integrations** - Organization integrations

#### Email & Communication
19. **send-email** - Transactional email service

#### QuickBase Integration (Optional)
20. **encrypt-quickbase-token** - QuickBase token encryption
21. **schedule-quickbase-sync** - Sync scheduling
22. **sync-quickbase-data** - Data synchronization
23. **test-quickbase-connection** - Connection testing

#### Utility Functions
24. **update-database-schema** - Schema updates
25. **update-promo-codes** - Promo code management

#### Shared Utilities
26. **_shared/cors.ts** - CORS handling
27. **_shared/rateLimiter.ts** - Rate limiting
28. **_shared/session-validator.ts** - Session validation

**Deployment Instructions for Each Function**:
1. Go to Supabase Dashboard > Edge Functions
2. Click "Create Function" 
3. Copy the function name exactly
4. Copy the entire content from the corresponding `/supabase/functions/{name}/index.ts` file
5. Set the function as either JWT verified or not based on requirements
6. Deploy the function

---

### Phase 3: Environment Variables Configuration

**Required Environment Variables in Supabase**:

Navigate to: Project Settings > API > Environment variables

```bash
# Core Supabase (Auto-configured)
SUPABASE_URL=https://onargmygfwynbbrytkpy.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# CRITICAL: Admin Creation Security
ADMIN_CREATION_CODE=d4f7e8b9c2a1f6e3d8c5b7a9f4e2d6c1b8a5f3e7d9c4b6a8f1e5d2c7b9a6f4e3d8

# AI & Search (Required for core functionality)
OPENAI_API_KEY=your_openai_api_key

# Email Service (Required for notifications)
RESEND_API_KEY=your_resend_api_key

# Stripe Integration (Required for subscriptions)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Optional QuickBase Integration
QUICKBASE_REALM=your_quickbase_realm
QUICKBASE_USER_TOKEN=your_quickbase_token
```

---

### Phase 4: Frontend Configuration

**Update Frontend Environment Variables** (in your deployment platform):

```bash
VITE_SUPABASE_URL=https://onargmygfwynbbrytkpy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

---

## 🔐 Admin Account Setup

### Step 1: Create Master Admin Account

Once all functions are deployed, create the master admin account:

**API Endpoint**: `https://onargmygfwynbbrytkpy.supabase.co/functions/v1/create-admin-user`

**Request**:
```bash
curl -X POST https://onargmygfwynbbrytkpy.supabase.co/functions/v1/create-admin-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "email": "admin@drivelinesolutions.net",
    "password": "SecurePassword123!",
    "firstName": "Rebecca",
    "lastName": "Admin", 
    "adminCode": "d4f7e8b9c2a1f6e3d8c5b7a9f4e2d6c1b8a5f3e7d9c4b6a8f1e5d2c7b9a6f4e3d8"
  }'
```

### Step 2: Admin Login Credentials

**Admin Dashboard Access**:
- **URL**: `https://your-domain.com/admin`
- **Email**: `admin@drivelinesolutions.net`
- **Password**: `SecurePassword123!`
- **Role**: Super Admin with unlimited access

**Regular App Access** (for using Rita yourself):
- **URL**: `https://your-domain.com/dashboard`
- Same credentials, full access to all features

---

## 🧪 End-to-End Testing Plan

### Test 1: User Signup & Organization Creation
1. Visit the signup page
2. Register with promo code "HAP-PENIS" for free Pro access
3. Verify organization creation
4. Check database for proper user/org setup

### Test 2: Document Upload & Processing
1. Login as new user
2. Upload a PDF document
3. Verify text extraction via `extract-document-text` function
4. Check embedding generation via `generate-embeddings` function

### Test 3: AI Chat Functionality
1. Use Rita chat interface
2. Ask questions about uploaded documents
3. Verify contextual responses using `rita-chat` function
4. Check embedding search via `search-embeddings` function

### Test 4: Admin Dashboard Access
1. Login with admin credentials
2. Access `/admin` dashboard
3. Verify organization management capabilities
4. Test user management features

### Test 5: Subscription Management
1. Test Stripe integration
2. Verify subscription creation
3. Check usage limit enforcement
4. Test webhook handling

---

## 🚨 Security Checklist

- ✅ RLS policies enabled on all tables
- ✅ Organization-based data isolation
- ✅ Secure admin creation with unique code
- ✅ Rate limiting on all functions
- ✅ CORS properly configured
- ✅ Input validation and sanitization
- ✅ Session management and enforcement
- ✅ Webhook signature verification

---

## 📊 Production Monitoring

### Health Check Endpoints

**Database Health**:
```sql
SELECT 'Database healthy' as status, count(*) as tables_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Function Health**:
Test key functions:
- `/functions/v1/rita-chat` - AI chat functionality
- `/functions/v1/extract-document-text` - Document processing
- `/functions/v1/check-subscription` - Subscription status

### Key Metrics to Monitor
- User signups and organization creation
- Document upload and processing success rates
- AI chat query volume and response times
- Subscription conversion rates
- Error rates across all functions

---

## 🎯 Success Criteria

### Deployment Complete When:
- ✅ All 28 edge functions deployed successfully
- ✅ Database schema fully deployed with all tables
- ✅ Admin account created and accessible
- ✅ User signup flow working end-to-end
- ✅ Document upload and AI processing functional
- ✅ Rita chat providing contextual responses
- ✅ Subscription management operational
- ✅ All security measures active

### Production Ready Indicators:
- Users can sign up and create organizations
- Documents process successfully and generate embeddings
- AI chat provides accurate, context-aware responses
- Admin dashboard shows comprehensive system status
- Payment flow works without errors
- Multi-tenant data isolation verified
- Performance meets production requirements

---

## 🆘 Troubleshooting

### Common Issues:

**Database Connection Errors**:
- Verify environment variables are set correctly
- Check RLS policies are not blocking operations
- Ensure proper grants are in place

**Function Deployment Failures**:
- Check for TypeScript compilation errors
- Verify all imports and dependencies
- Ensure CORS headers are properly configured

**AI Chat Not Working**:
- Verify OpenAI API key is set and valid
- Check document embeddings are generated
- Ensure search function returns results

**Admin Access Issues**:
- Verify admin code matches exactly
- Check admin user was created successfully
- Ensure proper role assignment in database

---

## 📞 Support & Next Steps

1. **Complete database deployment** using `PRODUCTION_DEPLOYMENT.sql`
2. **Deploy all 28 edge functions** manually through Supabase Dashboard
3. **Set up environment variables** in Supabase project settings
4. **Create admin account** using the secure admin creation function
5. **Test all functionality** using the comprehensive test plan
6. **Monitor production metrics** and user activity

**Deployment Status**: Ready for immediate production deployment
**Estimated Deployment Time**: 2-3 hours for complete setup
**Production Ready**: Yes, with full multi-tenant architecture and security

---

*Rita Recruit AI - Production Deployment Guide*
*Generated: September 26, 2025*
*Project: onargmygfwynbbrytkpy.supabase.co*