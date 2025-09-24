# Rita Recruit AI - Admin Setup Guide

## 🎯 **Master Admin Account Setup**

This guide will help you set up the master admin account for Rebecca at DriveLine Solutions with full access to manage all subscribers and organizations.

## 📋 **What You're Getting**

### **Master Admin Features**
- **Full Dashboard Access**: View and manage all organizations and users
- **Unlimited Usage**: No storage or query limits for DriveLine Solutions
- **Subscription Management**: Activate/deactivate customer subscriptions
- **User Impersonation**: View the app as any organization
- **Revenue Tracking**: Monitor monthly revenue and usage statistics
- **Activity Logging**: Track all admin actions for audit purposes

### **Admin Credentials**
- **Email**: admin@drivelinesolutions.net
- **Password**: #########
- **Organization**: DriveLine Solutions (Unlimited Plan)
- **Role**: Super Admin

## 🚀 **Setup Steps**

### **1. Database Setup**
First, run the admin migration in your Supabase SQL Editor:

```sql
-- Copy and paste the content from:
-- supabase/migrations/20250924000000_setup_admin_user.sql
```

### **2. Get Service Role Key**
1. Go to your Supabase project settings
2. Navigate to **API** section
3. Copy the **service_role** key (not the anon key)
4. Add it to your `.env` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### **3. Run Admin Setup Script**
```bash
# Install dependencies if not already done
npm install @supabase/supabase-js dotenv

# Run the admin setup script
node setup-admin.js
```

### **4. Test Admin Access**
1. Visit your deployed site
2. Login with: rebecca@drivelinesolutions.net / 84Honeybun#59!
3. Navigate to `/admin` to access the master dashboard
4. Navigate to `/dashboard` for regular app usage

## 🔐 **Access Levels**

### **Super Admin (Rebecca)**
- **URL**: `/admin` - Master dashboard to manage all customers
- **Access**: Unlimited usage, all features, customer management
- **Organization**: DriveLine Solutions (your company)

### **Regular Admin (Customer Admins)**
- **URL**: `/dashboard` - Standard organization dashboard
- **Access**: Limited to their organization and subscription plan
- **Organization**: Their own company

### **Regular Users (Customer Members)**
- **URL**: `/dashboard/chat` - Chat interface only
- **Access**: Basic chat functionality within their organization

## 📊 **Admin Dashboard Features**

### **Organizations Tab**
- View all customer organizations
- See subscription status and plan types
- Monitor storage and query usage
- Activate/deactivate subscriptions
- Impersonate organizations to see their view

### **Users Tab**
- View all users across all organizations
- See user roles and last login times
- Manage user access and permissions

### **Settings Tab**
- Configure system-wide settings
- Export data and generate reports
- View DriveLine Solutions master account status

## 🔄 **Usage Flow**

### **For Managing Customers**
1. Login as rebecca@drivelinesolutions.net
2. Go to `/admin`
3. Use Organizations tab to manage customer subscriptions
4. Use Users tab to manage individual user accounts

### **For Using Rita Yourself**
1. Login as rebecca@drivelinesolutions.net
2. Go to `/dashboard` (regular app interface)
3. Use all Rita features with unlimited access
4. Upload your own documents and train your recruiters

## 🛡️ **Security Features**

- **Role-Based Access**: Only rebecca@drivelinesolutions.net can access `/admin`
- **Activity Logging**: All admin actions are logged for audit
- **Data Isolation**: Customer data remains separate and secure
- **Unlimited Access**: DriveLine Solutions bypasses all usage limits

## 🎉 **Ready to Use**

Once setup is complete, you'll have:
- ✅ Master admin access to manage all customers
- ✅ Unlimited Rita usage for DriveLine Solutions
- ✅ Full subscriber and organization management
- ✅ Revenue tracking and analytics
- ✅ Secure, role-based access control

Your Rita Recruit AI is now ready for both customer management and internal use!
