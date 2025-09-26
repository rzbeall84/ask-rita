# 🔧 RITA RECRUIT AI - ENVIRONMENT VARIABLES SETUP

## 📍 Setup Location
**Supabase Dashboard**: https://supabase.com/dashboard/project/onargmygfwynbbrytkpy/settings/edge-functions

## 🔐 Required Environment Variables

### 🚨 CRITICAL: Admin Security
```bash
ADMIN_CREATION_CODE=c0da15c3b5c434f37796ecfb937053d539e0b7e9cc8e49cb7b868595675048b5
```

### 🤖 AI Functionality
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 📧 Email Service
```bash
RESEND_API_KEY=re_your-resend-api-key-here
```

### 💳 Stripe Integration
```bash
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key-here
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key-here  
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
```

### 📊 QuickBase Integration (Optional)
```bash
QUICKBASE_APP_ID=your-quickbase-app-id
QUICKBASE_USER_TOKEN=your-quickbase-user-token
```

## 🎯 Setup Instructions

1. Navigate to: https://supabase.com/dashboard/project/onargmygfwynbbrytkpy/settings/edge-functions
2. Click "Add Environment Variable" for each variable above
3. Enter the variable name exactly as shown
4. Enter your actual API key/token values
5. Save each variable

## ✅ Verification

After setting up environment variables, they will be available to all edge functions automatically.