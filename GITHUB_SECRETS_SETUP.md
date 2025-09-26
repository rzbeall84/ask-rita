# GitHub Secrets Configuration for Supabase Deployment

## Required Secrets

You need to add the following secret to your GitHub repository for automated deployment:

### 1. SUPABASE_ACCESS_TOKEN

**How to get this token:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click on your profile icon (top right)
3. Select "Account Settings"
4. Navigate to "Access Tokens" tab
5. Click "Generate new token"
6. Give it a name like "GitHub Actions Deployment"
7. Copy the generated token

**How to add to GitHub:**

1. Go to your GitHub repository
2. Click "Settings" tab
3. Navigate to "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Name: `SUPABASE_ACCESS_TOKEN`
6. Value: [paste the token you copied]
7. Click "Add secret"

## Environment Variables Already Configured

The following environment variables are automatically configured in the workflow:

- `SUPABASE_PROJECT_ID`: Set to `onargmygfwynbbrytkpy`

## Workflow Triggers

The deployment workflow will automatically run when:

1. **Push to main/master branch** with changes in `supabase/functions/**`
2. **Manual trigger** via GitHub Actions tab (with optional force deploy)

## Manual Deployment

To manually trigger a deployment:

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Deploy Supabase Edge Functions" workflow
4. Click "Run workflow"
5. Optionally check "Force deploy all functions" to redeploy everything
6. Click "Run workflow"

## Deployment Order

Functions are deployed in the following priority order:

### Phase 1: Security & Authentication
- `create-admin-user` (JWT disabled)
- `manage-user-session` 
- `validate-invite` (JWT disabled)

### Phase 2: Core Infrastructure  
- `setup-user-sessions`
- `setup-query-usage`
- `update-database-schema`

### Phase 3: Document Processing
- `extract-document-text`
- `generate-embeddings`
- `search-embeddings`

### Phase 4: AI Chat
- `rita-chat`

### Phase 5: Communication
- `send-email` (JWT disabled)
- `generate-invite`

### Phase 6: Billing & Subscriptions
- `stripe-webhook` (JWT disabled)
- `create-checkout-session`
- `create-overage-checkout`
- `customer-portal`
- `check-subscription`

### Phase 7: Organization Management
- `join-organization`
- `setup-org-integrations`

### Phase 8: Quickbase Integration
- `encrypt-quickbase-token`
- `test-quickbase-connection`
- `schedule-quickbase-sync`
- `sync-quickbase-data`

### Phase 9: Administrative
- `admin-dashboard`
- `update-promo-codes`

## Functions with JWT Disabled

The following functions have JWT verification disabled (public endpoints):
- `create-admin-user`
- `validate-invite`
- `send-email`
- `stripe-webhook`

## Troubleshooting

### Common Issues

1. **Token Permission Error**
   - Make sure your Supabase access token has the necessary permissions
   - Try regenerating the token

2. **Function Import Errors**
   - Some functions may need standalone versions if they import from `_shared/`
   - Check the deployment logs for specific errors

3. **Deployment Timeout**
   - The workflow includes retry logic (3 attempts per function)
   - Check if Supabase services are experiencing issues

4. **JWT Configuration Issues**
   - Some functions require JWT disabled for public access
   - The workflow automatically handles this based on function requirements

### Viewing Deployment Logs

1. Go to "Actions" tab in your repository
2. Click on the latest "Deploy Supabase Edge Functions" run
3. Expand the deployment steps to see detailed logs
4. Check the "Deploy Edge Functions in Priority Order" step for function-specific logs

### Manual Script Execution

You can also run the deployment script manually:

```bash
# Make script executable
chmod +x .github/scripts/deploy-functions.sh

# Set environment variables
export SUPABASE_PROJECT_ID=onargmygfwynbbrytkpy

# Login to Supabase
supabase login

# Run deployment script
./.github/scripts/deploy-functions.sh
```

## Next Steps

1. ✅ Add the `SUPABASE_ACCESS_TOKEN` secret to GitHub
2. ✅ Push changes to trigger the workflow
3. ✅ Monitor the deployment in GitHub Actions
4. ✅ Verify functions are deployed at: https://onargmygfwynbbrytkpy.supabase.co/functions/v1/

## Support

If you encounter issues:
1. Check the GitHub Actions logs for detailed error messages
2. Verify your Supabase access token permissions
3. Ensure all environment variables are correctly set
4. Contact support if problems persist