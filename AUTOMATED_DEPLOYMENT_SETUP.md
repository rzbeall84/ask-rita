# 🚀 Automated Supabase Edge Functions Deployment Setup

## Overview

This automated deployment system will deploy all 25 of your Supabase Edge Functions using GitHub Actions, ensuring they have the correct names and are deployed in the proper dependency order.

## 📊 Function Audit Results

Found **25 Edge Functions** in your `supabase/functions/` directory:

### ✅ Functions Ready for Deployment
1. `create-admin-user` - Creates admin user accounts
2. `manage-user-session` - Manages user sessions and authentication  
3. `validate-invite` - Validates organization invitations
4. `join-organization` - Handles organization joining
5. `generate-invite` - Creates organization invites
6. `setup-user-sessions` - Sets up user session tracking
7. `rita-chat` - Main AI chat functionality
8. `extract-document-text` - Processes uploaded documents
9. `generate-embeddings` - Creates AI embeddings for search
10. `search-embeddings` - Searches document embeddings
11. `create-checkout-session` - Stripe checkout creation
12. `create-overage-checkout` - Overage billing checkout
13. `customer-portal` - Stripe customer portal
14. `stripe-webhook` - Handles Stripe webhooks
15. `check-subscription` - Validates subscriptions
16. `setup-query-usage` - Sets up usage tracking
17. `update-promo-codes` - Manages promotional codes
18. `send-email` - Email sending functionality
19. `admin-dashboard` - Admin dashboard backend
20. `setup-org-integrations` - Organization integration setup
21. `update-database-schema` - Database schema updates
22. `encrypt-quickbase-token` - Encrypts Quickbase API tokens
23. `schedule-quickbase-sync` - Schedules data sync
24. `sync-quickbase-data` - Syncs Quickbase data
25. `test-quickbase-connection` - Tests Quickbase connectivity

## 🔧 What's Been Created

### 1. GitHub Actions Workflow
- **File**: `.github/workflows/deploy-supabase.yml`
- **Triggers**: Push to main/master branch (changes in `supabase/functions/**`) or manual trigger
- **Features**: 
  - Deploys functions in dependency order
  - Proper JWT configuration per function
  - Error handling and retry logic
  - Colored output and detailed logging
  - Force deploy option for manual runs

### 2. Deployment Script
- **File**: `.github/scripts/deploy-functions.sh`
- **Features**:
  - Advanced error handling with retry logic
  - Pre-deployment checks
  - Standalone version detection
  - Comprehensive logging
  - Deployment verification

### 3. Function Mapping Tool
- **File**: `.github/scripts/function-mapper.sh`
- **Purpose**: Audit current deployments vs intended functions
- **Usage**: `./github/scripts/function-mapper.sh`

### 4. Configuration Documentation
- **File**: `GITHUB_SECRETS_SETUP.md` - Complete secrets setup guide
- **File**: `SUPABASE_FUNCTION_AUDIT.md` - Detailed function inventory

## 🎯 Quick Setup (5 minutes)

### Step 1: Add GitHub Secret
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Account Settings → Access Tokens
2. Generate new token named "GitHub Actions Deployment"
3. Copy the token
4. In your GitHub repo: Settings → Secrets and variables → Actions → New repository secret
5. Name: `SUPABASE_ACCESS_TOKEN`, Value: [paste token]

### Step 2: Make Scripts Executable
```bash
chmod +x .github/scripts/deploy-functions.sh
chmod +x .github/scripts/function-mapper.sh
```

### Step 3: Test the Setup
Run the function mapper to see current status:
```bash
# Login to Supabase first
supabase login

# Run mapping tool
./.github/scripts/function-mapper.sh
```

### Step 4: Deploy Functions
**Option A: Automatic (Recommended)**
- Push changes to main/master branch
- GitHub Actions will automatically deploy

**Option B: Manual Trigger**
1. Go to GitHub → Actions tab
2. Select "Deploy Supabase Edge Functions"
3. Click "Run workflow"
4. Optionally check "Force deploy all functions"

## 📋 Deployment Order & Configuration

Functions deploy in 9 phases with proper dependencies:

### Phase 1: Security & Authentication
- `create-admin-user` (JWT ❌)
- `manage-user-session` (JWT ✅)
- `validate-invite` (JWT ❌)

### Phase 2: Core Infrastructure
- `setup-user-sessions` (JWT ✅)
- `setup-query-usage` (JWT ✅)
- `update-database-schema` (JWT ✅)

### Phase 3: Document Processing
- `extract-document-text` (JWT ✅)
- `generate-embeddings` (JWT ✅)
- `search-embeddings` (JWT ✅)

### Phase 4: AI Chat
- `rita-chat` (JWT ✅)

### Phase 5: Communication
- `send-email` (JWT ❌)
- `generate-invite` (JWT ✅)

### Phase 6: Billing & Subscriptions
- `stripe-webhook` (JWT ❌)
- `create-checkout-session` (JWT ✅)
- `create-overage-checkout` (JWT ✅)
- `customer-portal` (JWT ✅)
- `check-subscription` (JWT ✅)

### Phase 7: Organization Management
- `join-organization` (JWT ✅)
- `setup-org-integrations` (JWT ✅)

### Phase 8: Quickbase Integration
- `encrypt-quickbase-token` (JWT ✅)
- `test-quickbase-connection` (JWT ✅)
- `schedule-quickbase-sync` (JWT ✅)
- `sync-quickbase-data` (JWT ✅)

### Phase 9: Administrative
- `admin-dashboard` (JWT ✅)
- `update-promo-codes` (JWT ✅)

## ⚠️ Important Notes

### Functions Requiring Standalone Versions
Some functions import from `_shared/` and may need standalone versions:
- ✅ `rita-chat` (standalone version created)
- ✅ `send-email` (standalone version created)  
- ✅ `create-admin-user` (standalone version created)
- ⚠️ Other functions may need standalone versions if deployment fails

### JWT Configuration
- **JWT Disabled** (❌): Public endpoints that don't require authentication
- **JWT Enabled** (✅): Protected endpoints requiring valid user tokens

## 🔍 Monitoring & Troubleshooting

### View Deployment Progress
1. GitHub → Actions tab → "Deploy Supabase Edge Functions"
2. Click on latest run to see real-time progress
3. Expand "Deploy Edge Functions in Priority Order" for detailed logs

### Common Issues & Solutions

**1. Import Errors from _shared/**
- **Solution**: Create standalone versions with inlined dependencies
- **Files affected**: Functions importing `cors.ts`, `rateLimiter.ts`, `session-validator.ts`

**2. Permission Errors**
- **Solution**: Regenerate Supabase access token with full permissions

**3. Deployment Timeouts**
- **Solution**: Retry logic built-in (3 attempts per function)

**4. Function Not Found After Deployment**
- **Solution**: Check Supabase dashboard, may be deployment lag

### Manual Deployment (Fallback)
If GitHub Actions fails, deploy manually:
```bash
# Login and link project
supabase login
supabase link --project-ref onargmygfwynbbrytkpy

# Run deployment script
./.github/scripts/deploy-functions.sh

# Or deploy individual functions
supabase functions deploy function-name
```

## 📈 Expected Outcome

After setup completion:

✅ **All 25 functions deployed** with correct names  
✅ **Proper JWT configuration** per function requirements  
✅ **Dependency order** respected during deployment  
✅ **Automatic deployment** on code changes  
✅ **Error handling** with retry logic  
✅ **Detailed logging** for troubleshooting  

**Function URLs**: `https://onargmygfwynbbrytkpy.supabase.co/functions/v1/{function-name}`

## 🎉 Ready to Deploy!

1. ✅ Add `SUPABASE_ACCESS_TOKEN` to GitHub secrets
2. ✅ Push changes to trigger deployment
3. ✅ Monitor progress in GitHub Actions
4. ✅ Verify functions at Supabase dashboard

Your Rita Recruit AI platform will have all Edge Functions deployed automatically with zero manual clicking! 🚀